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

  describe("addExample", () => {
    test("adds valid task example and returns ID", async () => {
      const example: TaskExample = {
        task: "Implement user authentication",
        context: "Building a web app with login system",
        issues: "Create login form, API endpoints, session management",
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
        issues: "Design component, implement props, add tests",
      };

      const id = await store.addExample(example);
      const results = await store.searchSimilarExamples("React component", 1);

      expect(results).toHaveLength(1);

      expect(results[0].document).toContain(example.context);
      expect(results[0].document).toContain(example.task);
      expect(results[0].document).toContain(example.issues);
    });
  });

  describe("searchSimilarExamples", () => {
    beforeEach(async () => {
      // Add test data
      await store.addExample({
        task: "Build React authentication form",
        context: "Frontend login system for web app",
        issues: "Create form validation, handle API calls, manage state",
      });

      await store.addExample({
        task: "Implement database migrations",
        context: "Backend database schema updates",
        issues: "Write migration scripts, test rollbacks, update models",
      });

      await store.addExample({
        task: "Setup React testing framework",
        context: "Testing infrastructure for React components",
        issues: "Configure Jest, write component tests, setup CI",
      });
    });

    test("returns results in relevance order", async () => {
      const results = await store.searchSimilarExamples("migrations", 10);

      expect(results.length).toEqual(3);
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
      const results = await store.searchSimilarExamples(
        '"database migrations"'
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].document).toContain("database migrations");
    });

    test("search is case insensitive", async () => {
      const upperResults = await store.searchSimilarExamples("REACT");
      const lowerResults = await store.searchSimilarExamples("react");

      expect(upperResults.length).toBe(lowerResults.length);
    });
  });
});
