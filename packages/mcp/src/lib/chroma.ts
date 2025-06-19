import { CloudClient } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";
import { z } from "zod";

// Schema for storing task examples
export const TaskExampleSchema = z.object({
  task: z.string(),
  context: z.string(),
  issues: z.string(),
});

export type TaskExample = z.infer<typeof TaskExampleSchema>;

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

export class TaskExampleStore {
  private client: CloudClient;
  private collection: any;
  private embedder: DefaultEmbeddingFunction;

  constructor() {
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

  async addExample(example: TaskExample) {
    if (!this.collection) {
      await this.initialize();
    }

    // Generate unique ID
    const id = `example_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create a comprehensive document that includes all example data
    const document = `Task: ${example.task}

Context: ${example.context}

Issues Generated: ${example.issues}`;

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
}
