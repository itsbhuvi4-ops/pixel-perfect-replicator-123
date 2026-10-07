import { AuthConfig } from "convex/server";

const supabaseUrl = process.env.SUPABASE_URL;

const providers = supabaseUrl
  ? [
      {
        type: "customJwt" as const,
        applicationID: "authenticated",
        issuer: `${supabaseUrl}/auth/v1`,
        jwks: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
        algorithm: "ES256" as const,
      },
      {
        type: "customJwt" as const,
        applicationID: "authenticated",
        issuer: `${supabaseUrl}/auth/v1`,
        jwks: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
        algorithm: "RS256" as const,
      },
    ]
  : [];

export default { providers } satisfies AuthConfig;
