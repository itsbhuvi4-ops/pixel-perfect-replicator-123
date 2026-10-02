import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CHANNEL = "ambassador-presence";

/** Ambassadors call this while logged in so staff can see who is online. */
export function useAmbassadorPresence(ambassadorId: string | undefined, teamName: string | undefined) {
  useEffect(() => {
    if (!ambassadorId) return;
    const channel = supabase.channel(CHANNEL, { config: { presence: { key: ambassadorId } } });
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ team: teamName ?? "", at: Date.now() });
      }
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [ambassadorId, teamName]);
}

/** Caster/admin check screen: live map of online ambassadors (id -> team). */
export function useOnlineAmbassadors() {
  const [online, setOnline] = useState<Record<string, { team: string }>>({});
  useEffect(() => {
    const channel = supabase.channel(CHANNEL);
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ team: string }>();
        const next: Record<string, { team: string }> = {};
        for (const [key, metas] of Object.entries(state)) {
          next[key] = metas[0] ?? { team: "" };
        }
        setOnline(next);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);
  return online;
}
