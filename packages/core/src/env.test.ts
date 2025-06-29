import { describe, test, expect } from 'bun:test';
import { validateEnv, isChromaConfig, isSqliteConfig } from './env.js';

describe('Environment validation', () => {
  test('validates ChromaDB configuration', () => {
    const chromaEnv = {
      CHROMA_API_KEY: 'test-key',
      CHROMA_TENANT: 'test-tenant',
      CHROMA_DATABASE: 'test-db',
      OPENAI_API_KEY: 'test-openai-key',
    };

    const result = validateEnv(chromaEnv);
    
    expect(result.type).toBe('chroma');
    expect(isChromaConfig(result.config)).toBe(true);
    expect(isSqliteConfig(result.config)).toBe(false);
  });

  test('validates SQLite configuration with default path', () => {
    const sqliteEnv = {
      ANTHROPIC_API_KEY: 'test-anthropic-key',
    };

    const result = validateEnv(sqliteEnv);
    
    expect(result.type).toBe('sqlite');
    expect(isSqliteConfig(result.config)).toBe(true);
    expect(isChromaConfig(result.config)).toBe(false);
    expect(result.config.SQLITE_PATH).toMatch(/\.vibeall\/db\.sqlite$/);
  });

  test('validates SQLite configuration with custom path', () => {
    const sqliteEnv = {
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      SQLITE_PATH: '/custom/path/db.sqlite',
    };

    const result = validateEnv(sqliteEnv);
    
    expect(result.type).toBe('sqlite');
    expect(result.config.SQLITE_PATH).toBe('/custom/path/db.sqlite');
  });

  test('throws error when no valid configuration is provided', () => {
    const invalidEnv = {
      RANDOM_VAR: 'value',
    };

    expect(() => validateEnv(invalidEnv)).toThrow(/Environment validation failed/);
  });

  test('throws error when ChromaDB configuration is incomplete', () => {
    const incompleteChromaEnv = {
      CHROMA_API_KEY: 'test-key',
      // Missing CHROMA_TENANT, CHROMA_DATABASE, OPENAI_API_KEY
    };

    expect(() => validateEnv(incompleteChromaEnv)).toThrow(/Environment validation failed/);
  });

  test('throws error when SQLite configuration is incomplete', () => {
    const incompleteSqliteEnv = {
      SQLITE_PATH: '/path/to/db.sqlite',
      // Missing ANTHROPIC_API_KEY
    };

    expect(() => validateEnv(incompleteSqliteEnv)).toThrow(/Environment validation failed/);
  });
});
