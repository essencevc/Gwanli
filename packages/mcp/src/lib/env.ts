import { z } from "zod";

// Environment validation schemas
const ChromaConfigSchema = z.object({
  CHROMA_URL: z.string().url(),
  CHROMA_COLLECTION: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
});

const SqliteConfigSchema = z.object({
  SQLITE_PATH: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
});

// Union of possible configurations
const EnvConfigSchema = z.union([ChromaConfigSchema, SqliteConfigSchema]);

type ChromaConfig = z.infer<typeof ChromaConfigSchema>;
type SqliteConfig = z.infer<typeof SqliteConfigSchema>;
type EnvConfig = z.infer<typeof EnvConfigSchema>;

// Type guards
export function isChromaConfig(config: EnvConfig): config is ChromaConfig {
  return "CHROMA_URL" in config && "CHROMA_COLLECTION" in config;
}

export function isSqliteConfig(config: EnvConfig): config is SqliteConfig {
  return "SQLITE_PATH" in config;
}

// Environment validation function
export function validateEnv() {
  const env = process.env;
  
  // Try Chroma configuration first
  try {
    const chromaConfig = ChromaConfigSchema.parse(env);
    return { config: chromaConfig, type: "chroma" as const };
  } catch (chromaError) {
    // Try SQLite configuration
    try {
      const sqliteConfig = SqliteConfigSchema.parse(env);
      return { config: sqliteConfig, type: "sqlite" as const };
    } catch (sqliteError) {
      // Both failed, provide helpful error message
      throw new Error(
        "Environment validation failed. Please provide either:\n" +
        "1. Chroma config: CHROMA_URL, CHROMA_COLLECTION, ANTHROPIC_API_KEY\n" +
        "2. SQLite config: SQLITE_PATH, ANTHROPIC_API_KEY\n\n" +
        `Chroma validation error: ${chromaError instanceof Error ? chromaError.message : String(chromaError)}\n` +
        `SQLite validation error: ${sqliteError instanceof Error ? sqliteError.message : String(sqliteError)}`
      );
    }
  }
}

export type { ChromaConfig, SqliteConfig, EnvConfig };
