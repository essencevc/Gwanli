import { TaskExample, TaskExampleSchema, SearchResult } from "./types.js";

/**
 * Abstract base class for task example storage implementations.
 * This provides the contract that all storage backends must implement.
 * 
 * In TypeScript, this is the equivalent of Python's ABC (Abstract Base Class).
 * We use abstract class with abstract methods to enforce implementation.
 */
export abstract class TaskExampleStorage {
  /**
   * Initialize the storage backend.
   * This method should set up any necessary connections, databases, or collections.
   */
  abstract initialize(): Promise<void>;

  /**
   * Add a new task example to storage.
   * 
   * @param example - The task example to store
   * @returns Promise resolving to a unique identifier for the stored example
   */
  abstract addExample(example: TaskExample): Promise<string>;

  /**
   * Search for similar task examples based on a query.
   * 
   * @param query - The search query string
   * @param nExamples - Number of examples to return (default: 3)
   * @returns Promise resolving to an array of search results, ordered by similarity
   */
  abstract searchSimilarExamples(query: string, nExamples?: number): Promise<SearchResult[]>;

  /**
   * Validate that a task example conforms to the expected schema.
   * This is a concrete method that all implementations can use.
   */
  protected validateExample(example: TaskExample): TaskExample {
    return TaskExampleSchema.parse(example);
  }

  /**
   * Generate a unique ID for an example.
   * This is a concrete helper method that implementations can use.
   */
  protected generateId(): string {
    return `example_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }
}
