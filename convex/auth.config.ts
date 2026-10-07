import { AuthConfig } from "convex/server";

const supabaseUrl = process.env.SUPABASE_URL;

export default {
  providers: supabaseUrl
    ? [{
        type: "customJwt",
        applicationID: "authenticated",
        issuer: `${supabaseUrl}/auth/v1`,
        jwks: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
        algorithm: "RS256",
      }]
    : [],
} satisfies AuthConfig;
