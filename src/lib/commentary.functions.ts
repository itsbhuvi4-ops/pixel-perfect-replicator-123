import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  style: z.enum(["hype", "analytical", "calm"]),
  notes: z.string().trim().max(600).default(""),
  player: z
    .object({
      name: z.string().max(80),
      uid: z.string().max(40),
      primaryRole: z.string().max(40),
      secondaryRole: z.string().max(40).nullable(),
      teamName: z.string().max(80).nullable(),
      experience: z.string().max(300).nullable(),
    })
    .nullable(),
  auction: z.object({
    status: z.string().max(20),
    biddingOpen: z.boolean(),
    currentBid: z.number().nullable(),
    basePrice: z.number(),
    leadingTeam: z.string().max(80).nullable(),
    bidCount: z.number(),
    recentEvents: z.array(z.string().max(200)).max(8),
  }),
});

export const generateCommentary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const allowed = (roles ?? []).some((r: { role: string }) => r.role === "caster" || r.role === "admin");
    if (!allowed) return { success: false as const, error: "Only casters can generate commentary." };

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { success: false as const, error: "AI is not configured for this app." };

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const system =
      "You are a live esports auction caster for a Free Fire player auction called BidX. " +
      "Write 2-3 short punchy sentences (max 60 words total) the caster can read aloud right now. " +
      "Amounts are points (pts), never currency. Use only the facts given; never invent stats, ranks or names. " +
      `Tone: ${data.style === "hype" ? "high-energy hype" : data.style === "analytical" ? "sharp tactical analysis" : "calm, composed broadcast"}. ` +
      "Plain text only, no lists, no hashtags, no emojis.";

    const prompt = JSON.stringify({ player: data.player, auction: data.auction, casterNotes: data.notes || null });

    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        system,
        prompt,
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      const text = (await result.text).trim();
      if (!text) return { success: false as const, error: "The AI returned no commentary. Try again later." };
      return { success: true as const, text };
    } catch (e: unknown) {
      const status = (e as { statusCode?: number })?.statusCode;
      console.error("[commentary] gateway error", status);
      if (status === 429) return { success: false as const, error: "Too many requests — wait a moment and try again." };
      if (status === 402) return { success: false as const, error: "AI credits are used up. Add credits to keep generating commentary." };
      if (status === 403) return { success: false as const, error: "AI access is blocked for this workspace." };
      return { success: false as const, error: "Couldn't generate commentary right now." };
    }
  });
