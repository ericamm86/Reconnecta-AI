import dotenv from "dotenv";

dotenv.config();

function isPlaceholderDatabaseUrl(value = "") {
  return value.includes("abcdefghijklmnopqrst") || value.includes("YOUR-PASSWORD");
}

function resolveDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL
  ];

  return candidates.find((value) => value && !isPlaceholderDatabaseUrl(value)) || "";
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4100),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  databaseUrl: resolveDatabaseUrl(),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini"
};
