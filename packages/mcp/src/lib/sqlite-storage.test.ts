import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteTaskExampleStorage } from './sqlite-storage.js';
import { TaskExample } from './types.js';
import { promises as fs } from 'fs';

describe('SQLiteTaskExampleStorage', () => {
  let storage: SQLiteTaskExampleStorage;
  const testDbPath = './test-examples.db';

  beforeEach(async () => {
    storage = new SQLiteTaskExampleStorage(testDbPath);
    await storage.initialize();
  });

  afterEach(async () => {
    if (storage) {
      await storage.close();
    }
    // Clean up test database file
    try {
      await fs.unlink(testDbPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  it('should initialize successfully', async () => {
    const newStorage = new SQLiteTaskExampleStorage('./test-init.db');
    await expect(newStorage.initialize()).resolves.not.toThrow();
    await newStorage.close();
    await fs.unlink('./test-init.db').catch(() => {});
  });

  it('should add and retrieve task examples', async () => {
    const example: TaskExample = {
      task: 'Create a login form',
      context: 'Building a React web application',
      issues: 'Design form components, implement validation, add authentication'
    };

    const id = await storage.addExample(example);
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('should search for similar examples using FTS', async () => {
    // Add test examples
    const examples: TaskExample[] = [
      {
        task: 'Create a login form with React',
        context: 'Building a web application',
        issues: 'Design form, validate inputs, authenticate users'
      },
      {
        task: 'Build a dashboard component',
        context: 'Creating admin interface',
        issues: 'Display metrics, add charts, implement filters'
      },
      {
        task: 'Implement user authentication',
        context: 'Security for web app',
        issues: 'Login flow, JWT tokens, session management'
      }
    ];

    for (const example of examples) {
      await storage.addExample(example);
    }

    // Search for login-related examples
    const results = await storage.searchSimilarExamples('login form', 2);
    
    expect(results).toHaveLength(2);
    expect(results[0].document).toContain('login');
    expect(results[0].similarity).toBeGreaterThan(0);
  });

  it('should return empty results for non-matching search', async () => {
    const example: TaskExample = {
      task: 'Build a calculator',
      context: 'Math application',
      issues: 'Basic operations, UI design'
    };

    await storage.addExample(example);

    const results = await storage.searchSimilarExamples('quantum physics', 5);
    expect(results).toHaveLength(0);
  });
});
