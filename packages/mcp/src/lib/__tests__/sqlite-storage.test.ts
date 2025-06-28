import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import { SqliteTaskExampleStore } from "../sqlite-storage.js";
import { TaskExample } from "../types.js";

describe("SqliteTaskExampleStore", () => {
  let store: SqliteTaskExampleStore;
  const testDbPath = "./test-examples.db";

  beforeEach(async () => {
    // Clean up any existing test database
    if (existsSync(testDbPath)) {
      await unlink(testDbPath);
    }
    store = new SqliteTaskExampleStore(testDbPath);
    await store.initialize();
  });

  afterEach(async () => {
    // Clean up test database
    if (existsSync(testDbPath)) {
      await unlink(testDbPath);
    }
  });

  describe("initialization", () => {
    test("creates database and tables on initialize", async () => {
      expect(existsSync(testDbPath)).toBe(true);
    });

    test("can initialize multiple times without error", async () => {
      await store.initialize();
      await store.initialize();
      expect(existsSync(testDbPath)).toBe(true);
    });
  });

  describe("addExample", () => {
    test("adds valid task example and returns ID", async () => {
      const example: TaskExample = {
        task: "Implement user authentication",
        context: "Building a web app with login system",
        issues: "Create login form, API endpoints, session management"
      };

      const id = await store.addExample(example);
      expect(id).toMatch(/^example_\d+_[a-z0-9]+$/);
    });

    test("validates example schema before adding", async () => {
      const invalidExample = {
        task: "Test task",
        // missing context and issues
      } as TaskExample;

      await expect(store.addExample(invalidExample)).rejects.toThrow();
    });

    test("stores example data correctly", async () => {
      const example: TaskExample = {
        task: "Build React component",
        context: "Frontend development for dashboard",
        issues: "Design component, implement props, add tests"
      };

      const id = await store.addExample(example);
      const results = await store.searchSimilarExamples("React component", 1);
      
      expect(results).toHaveLength(1);
      expect(results[0].document).toContain("Build React component");
      expect(results[0].document).toContain("Frontend development");
      expect(results[0].document).toContain("Design component");
    });
  });

  describe("searchSimilarExamples", () => {
    beforeEach(async () => {
      // Add test data
      await store.addExample({
        task: "Build React authentication form",
        context: "Frontend login system for web app",
        issues: "Create form validation, handle API calls, manage state"
      });

      await store.addExample({
        task: "Implement database migrations",
        context: "Backend database schema updates",
        issues: "Write migration scripts, test rollbacks, update models"
      });

      await store.addExample({
        task: "Setup React testing framework",
        context: "Testing infrastructure for React components",
        issues: "Configure Jest, write component tests, setup CI"
      });
    });

    test("returns relevant results for keyword search", async () => {
      const results = await store.searchSimilarExamples("React", 10);
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.document.toLowerCase()).toContain("react");
      });
    });

    test("returns results in relevance order", async () => {
      const results = await store.searchSimilarExamples("React authentication", 10);
      
      expect(results.length).toBeGreaterThan(0);
      // Most relevant should contain both "React" and "authentication"
      expect(results[0].document).toContain("React authentication");
    });

    test("limits results to nExamples parameter", async () => {
      const results = await store.searchSimilarExamples("React", 1);
      expect(results).toHaveLength(1);
    });

    test("defaults to 3 results when nExamples not specified", async () => {
      const results = await store.searchSimilarExamples("test");
      expect(results.length).toBeLessThanOrEqual(3);
    });

    test("returns empty array for no matches", async () => {
      const results = await store.searchSimilarExamples("nonexistent keyword");
      expect(results).toEqual([]);
    });

    test("handles phrase searches correctly", async () => {
      const results = await store.searchSimilarExamples('"database migrations"');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].document).toContain("database migrations");
    });

    test("search is case insensitive", async () => {
      const upperResults = await store.searchSimilarExamples("REACT");
      const lowerResults = await store.searchSimilarExamples("react");
      
      expect(upperResults.length).toBe(lowerResults.length);
    });

    test("returns similarity scores", async () => {
      const results = await store.searchSimilarExamples("React");
      
      results.forEach(result => {
        expect(result.similarity).toBeGreaterThanOrEqual(0);
        expect(result.similarity).toBeLessThanOrEqual(1);
      });
    });

    test("includes metadata in results", async () => {
      const results = await store.searchSimilarExamples("React");
      
      if (results.length > 0) {
        expect(results[0].metadata).toBeDefined();
        expect(results[0].metadata?.created_at).toBeDefined();
      }
    });
  });

  describe("full text search functionality", () => {
    beforeEach(async () => {
      await store.addExample({
        task: "Optimize database queries",
        context: "Performance improvement for slow API endpoints",
        issues: "Analyze query plans, add indexes, refactor N+1 queries"
      });
    });

    test("searches across all fields (task, context, issues)", async () => {
      // Search for term in task field
      let results = await store.searchSimilarExamples("database");
      expect(results.length).toBeGreaterThan(0);

      // Search for term in context field
      results = await store.searchSimilarExamples("Performance");
      expect(results.length).toBeGreaterThan(0);

      // Search for term in issues field
      results = await store.searchSimilarExamples("indexes");
      expect(results.length).toBeGreaterThan(0);
    });

    test("supports partial word matching", async () => {
      const results = await store.searchSimilarExamples("optim");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].document).toContain("Optimize");
    });

    test("supports multi-word searches", async () => {
      const results = await store.searchSimilarExamples("database performance");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    test("handles database connection errors gracefully", async () => {
      const invalidStore = new SqliteTaskExampleStore("/invalid/path/db.sqlite");
      await expect(invalidStore.initialize()).rejects.toThrow();
    });

    test("handles malformed search queries", async () => {
      const results = await store.searchSimilarExamples('invalid"quote');
      expect(results).toEqual([]);
    });

    test("handles empty search queries", async () => {
      const results = await store.searchSimilarExamples("");
      expect(results).toEqual([]);
    });
  });

  describe("concurrency", () => {
    test("handles concurrent writes", async () => {
      const examples: TaskExample[] = Array.from({ length: 10 }, (_, i) => ({
        task: `Task ${i}`,
        context: `Context ${i}`,
        issues: `Issues ${i}`
      }));

      const promises = examples.map(example => store.addExample(example));
      const ids = await Promise.all(promises);

      expect(ids).toHaveLength(10);
      expect(new Set(ids).size).toBe(10); // All IDs should be unique
    });

    test("handles concurrent reads", async () => {
      await store.addExample({
        task: "Test concurrent reads",
        context: "Testing database concurrency",
        issues: "Ensure thread safety"
      });

      const promises = Array.from({ length: 5 }, () => 
        store.searchSimilarExamples("concurrent")
      );
      
      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });
});
