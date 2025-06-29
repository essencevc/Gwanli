import { z } from 'zod';
import { homedir } from 'os';
import { join } from 'path';

// Base configuration - always required
const baseConfigSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
});

// ChromaDB embedding search configuration
const chromaConfigSchema = baseConfigSchema.extend({
  CHROMA_API_KEY: z.string().min(1, 'CHROMA_API_KEY is required when using ChromaDB'),
  CHROMA_TENANT: z.string().min(1, 'CHROMA_TENANT is required when using ChromaDB'),  
  CHROMA_DATABASE: z.string().min(1, 'CHROMA_DATABASE is required when using ChromaDB'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required when using ChromaDB for embeddings'),
});

// SQLite FTS configuration  
const sqliteConfigSchema = baseConfigSchema.extend({
  SQLITE_PATH: z.string().optional().default(join(homedir(), '.vibeall', 'db.sqlite')),
});

// Union of the two search configurations
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
 * Validates environment variables and returns the appropriate search configuration
 * @param env - Environment object (defaults to process.env)
 * @returns Validated environment configuration
 * @throws Error if environment validation fails
 */
export function validateEnv(env: Record<string, string | undefined> = process.env): ValidatedEnv {
  // First try ChromaDB embedding search configuration
  const chromaResult = chromaConfigSchema.safeParse(env);
  if (chromaResult.success) {
    return {
      config: chromaResult.data,
      type: 'chroma'
    };
  }

  // Then try SQLite FTS configuration  
  const sqliteResult = sqliteConfigSchema.safeParse(env);
  if (sqliteResult.success) {
    return {
      config: sqliteResult.data,
      type: 'sqlite'
    };
  }

  // If both fail, throw detailed error
  const errors = [
    'Environment validation failed. You must provide:',
    '',
    'REQUIRED (always):',
    '  - ANTHROPIC_API_KEY',
    '',
    'CHOOSE ONE search method:',
    '',
    '1. ChromaDB embedding search:',
    '   - CHROMA_API_KEY',
    '   - CHROMA_TENANT', 
    '   - CHROMA_DATABASE',
    '   - OPENAI_API_KEY (for embeddings)',
    '',
    '2. SQLite full-text search:',
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
  return 'SQLITE_PATH' in config || !('CHROMA_API_KEY' in config);
}
