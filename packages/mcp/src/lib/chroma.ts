import { CloudClient } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";
import { TaskExampleStorage, TaskExample, SearchResult } from "./storage-interface.js";

// Environment variables for ChromaDB configuration
const CHROMA_API_KEY = process.env.CHROMA_API_KEY;
const CHROMA_TENANT = process.env.CHROMA_TENANT;
const CHROMA_DATABASE = process.env.CHROMA_DATABASE;

if (!CHROMA_API_KEY) {
  throw new Error(
    "CHROMA_API_KEY environment variable is required. Please set up your Chroma Cloud account."
  );
}

if (!CHROMA_TENANT) {
  throw new Error(
    "CHROMA_TENANT environment variable is required. Please set up your Chroma Cloud account."
  );
}

if (!CHROMA_DATABASE) {
  throw new Error(
    "CHROMA_DATABASE environment variable is required. Please set up your Chroma Cloud account."
  );
}

export class ChromaTaskExampleStore extends TaskExampleStorage {
  private client: CloudClient;
  private collection: any;
  private embedder: DefaultEmbeddingFunction;

  constructor() {
    super();
    
    // Configure ChromaDB Cloud client
    this.client = new CloudClient({
      apiKey: CHROMA_API_KEY,
      tenant: CHROMA_TENANT,
      database: CHROMA_DATABASE,
    });

    // Initialize embedding function
    this.embedder = new DefaultEmbeddingFunction();
  }

  async initialize() {
    try {
      this.collection = await this.client.createCollection({
        name: "task_examples",
        metadata: { "hnsw:space": "cosine" },
        embeddingFunction: this.embedder,
      });
    } catch (error) {
      // Collection might already exist
      this.collection = await this.client.getCollection({
        name: "task_examples",
        embeddingFunction: this.embedder,
      });
    }
  }

  async addExample(example: TaskExample): Promise<string> {
    const validatedExample = this.validateExample(example);
    
    if (!this.collection) {
      await this.initialize();
    }

    const id = this.generateId();

    // Create a comprehensive document that includes all example data
    const document = `Task: ${validatedExample.task}

Context: ${validatedExample.context}

Issues Generated: ${validatedExample.issues}`;

    await this.collection.add({
      ids: [id],
      metadatas: [
        {
          created_at: new Date().toISOString(),
        },
      ],
      documents: [document], // Store entire example as searchable document
    });

    return id;
  }

  async searchSimilarExamples(query: string, nExamples: number = 3): Promise<SearchResult[]> {
    // TODO: Implement actual ChromaDB search functionality
    // For now, return empty results as a mock implementation
    return [];
  }
}
