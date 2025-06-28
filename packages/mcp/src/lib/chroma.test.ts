import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChromaTaskExampleStore } from './chroma.js';
import { TaskExample } from './storage-interface.js';

// Mock ChromaDB dependencies
vi.mock('chromadb', () => ({
  CloudClient: vi.fn().mockImplementation(() => ({
    createCollection: vi.fn(),
    getCollection: vi.fn()
  }))
}));

vi.mock('@chroma-core/default-embed', () => ({
  DefaultEmbeddingFunction: vi.fn()
}));

// Mock environment variables
const mockEnv = {
  CHROMA_API_KEY: 'test-api-key',
  CHROMA_TENANT: 'test-tenant',
  CHROMA_DATABASE: 'test-database'
};

describe('ChromaTaskExampleStore', () => {
  let store: ChromaTaskExampleStore;
  let mockCollection: any;

  beforeEach(() => {
    // Set up environment variables
    Object.assign(process.env, mockEnv);
    
    // Create mock collection
    mockCollection = {
      add: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue({
        documents: [['test document 1', 'test document 2']],
        distances: [[0.1, 0.3]],
        metadatas: [[{ created_at: '2023-01-01' }, { created_at: '2023-01-02' }]]
      })
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  it('should create instance without throwing when env vars are set', () => {
    expect(() => new ChromaTaskExampleStore()).not.toThrow();
  });

  it('should validate task examples before storing', async () => {
    store = new ChromaTaskExampleStore();
    
    // Mock the collection to be available
    (store as any).collection = mockCollection;

    const validExample: TaskExample = {
      task: 'Test task',
      context: 'Test context',
      issues: 'Test issues'
    };

    const id = await store.addExample(validExample);
    
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^example_\d+_[a-z0-9]+$/);
    expect(mockCollection.add).toHaveBeenCalledWith({
      ids: [id],
      metadatas: [{ created_at: expect.any(String) }],
      documents: [expect.stringContaining('Test task')]
    });
  });

  it('should reject invalid task examples', async () => {
    store = new ChromaTaskExampleStore();
    
    const invalidExample = {
      task: 'Test task',
      context: 'Test context'
      // Missing 'issues' field
    } as TaskExample;

    await expect(store.addExample(invalidExample)).rejects.toThrow();
  });

  it('should search for similar examples and return properly formatted results', async () => {
    store = new ChromaTaskExampleStore();
    (store as any).collection = mockCollection;

    const results = await store.searchSimilarExamples('test query', 2);

    expect(mockCollection.query).toHaveBeenCalledWith({
      queryTexts: ['test query'],
      nResults: 2
    });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      document: 'test document 1',
      similarity: 0.9, // 1 - 0.1
      metadata: { created_at: '2023-01-01' }
    });
    expect(results[1]).toEqual({
      document: 'test document 2',
      similarity: 0.7, // 1 - 0.3
      metadata: { created_at: '2023-01-02' }
    });
  });

  it('should use default nExamples when not specified', async () => {
    store = new ChromaTaskExampleStore();
    (store as any).collection = mockCollection;

    await store.searchSimilarExamples('test query');

    expect(mockCollection.query).toHaveBeenCalledWith({
      queryTexts: ['test query'],
      nResults: 3 // default value
    });
  });

  it('should handle empty search results gracefully', async () => {
    store = new ChromaTaskExampleStore();
    
    const emptyCollection = {
      query: vi.fn().mockResolvedValue({
        documents: [[]],
        distances: [[]],
        metadatas: [[]]
      })
    };
    
    (store as any).collection = emptyCollection;

    const results = await store.searchSimilarExamples('test query');
    
    expect(results).toEqual([]);
  });

  it('should format document correctly when adding examples', async () => {
    store = new ChromaTaskExampleStore();
    (store as any).collection = mockCollection;

    const example: TaskExample = {
      task: 'Create user authentication',
      context: 'Web application with React frontend',
      issues: 'Setup JWT, create login form, handle errors'
    };

    await store.addExample(example);

    expect(mockCollection.add).toHaveBeenCalledWith({
      ids: [expect.any(String)],
      metadatas: [{ created_at: expect.any(String) }],
      documents: [
        'Task: Create user authentication\n\nContext: Web application with React frontend\n\nIssues Generated: Setup JWT, create login form, handle errors'
      ]
    });
  });
});
