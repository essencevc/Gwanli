import { z } from 'zod';
import { homedir } from 'os';
import { join } from 'path';

// ChromaDB configuration schema
const chromaConfigSchema = z.object({
  CHROMA_API_KEY: z.string().min(1, 'CHROMA_API_KEY is required when using ChromaDB'),
  CHROMA_TENANT: z.string().min(1, 'CHROMA_TENANT is required when using ChromaDB'),  
  CHROMA_DATABASE: z.string().min(1, 'CHROMA_DATABASE is required when using ChromaDB'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required when using ChromaDB'),
});

// SQLite configuration schema  
const sqliteConfigSchema = z.object({
  SQLITE_PATH: z.string().optional().default(join(homedir(), '.vibeall', 'db.sqlite')),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
});

// Union of the two configurations
const envSchema = z.union([
  chromaConfigSchema,
  sqliteConfigSchema,
]);

export type EnvConfig = z.infer<typeof envSchema>;
export type ChromaConfig = z.infer<typeof chromaConfigSchema>;
export type SqliteConfig = z.infer<typeof sqliteConfigSchema>;

export interface ValidatedEnv {
  config: EnvConfig;
  type: 'chroma' | 'sqlite';
}

/**
 * Validates environment variables and returns the appropriate configuration
 * @param env - Environment object (defaults to process.env)
 * @returns Validated environment configuration
 * @throws Error if environment validation fails
 */
export function validateEnv(env: Record<string, string | undefined> = process.env): ValidatedEnv {
  // First try ChromaDB configuration
  const chromaResult = chromaConfigSchema.safeParse(env);
  if (chromaResult.success) {
    return {
      config: chromaResult.data,
      type: 'chroma'
    };
  }

  // Then try SQLite configuration  
  const sqliteResult = sqliteConfigSchema.safeParse(env);
  if (sqliteResult.success) {
    return {
      config: sqliteResult.data,
      type: 'sqlite'
    };
  }

  // If both fail, throw detailed error
  const errors = [
    'Environment validation failed. You must provide either:',
    '',
    '1. ChromaDB configuration:',
    '   - CHROMA_API_KEY',
    '   - CHROMA_TENANT', 
    '   - CHROMA_DATABASE',
    '   - OPENAI_API_KEY',
    '',
    '2. SQLite configuration:',
    '   - ANTHROPIC_API_KEY (required)',
    '   - SQLITE_PATH (optional, defaults to ~/.vibeall/db.sqlite)',
    '',
    'ChromaDB validation errors:',
    ...chromaResult.error.issues.map(issue => `  - ${issue.path.join('.')}: ${issue.message}`),
    '',
    'SQLite validation errors:',
    ...sqliteResult.error.issues.map(issue => `  - ${issue.path.join('.')}: ${issue.message}`),
  ];

  throw new Error(errors.join('\n'));
}

/**
 * Type guard to check if config is ChromaDB configuration
 */
export function isChromaConfig(config: EnvConfig): config is ChromaConfig {
  return 'CHROMA_API_KEY' in config;
}

/**
 * Type guard to check if config is SQLite configuration  
 */
export function isSqliteConfig(config: EnvConfig): config is SqliteConfig {
  return 'ANTHROPIC_API_KEY' in config;
}
