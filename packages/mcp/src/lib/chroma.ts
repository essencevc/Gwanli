import { ChromaClient } from 'chromadb';
import { OpenAI } from 'openai';
import { z } from 'zod';

// Schema for storing task examples
export const TaskExampleSchema = z.object({
  task: z.string(),
  context: z.string(), 
  issues: z.string()
});

export type TaskExample = z.infer<typeof TaskExampleSchema>;

// Environment variables for ChromaDB configuration
const CHROMA_URL = process.env.CHROMA_URL;
const CHROMA_AUTH_TOKEN = process.env.CHROMA_AUTH_TOKEN;

if (!CHROMA_URL) {
  throw new Error('CHROMA_URL environment variable is required. Please set up your Chroma Cloud account.');
}

if (!CHROMA_AUTH_TOKEN) {
  throw new Error('CHROMA_AUTH_TOKEN environment variable is required. Please set up your Chroma Cloud account.');
}

// OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export class TaskExampleStore {
  private client: ChromaClient;
  private collection: any;

  constructor() {
    // Configure client for Chroma Cloud
    this.client = new ChromaClient({
      path: CHROMA_URL,
      auth: {
        provider: "token",
        credentials: CHROMA_AUTH_TOKEN,
        tokenHeaderType: "AUTHORIZATION"
      }
    });
  }

  async initialize() {
    try {
      this.collection = await this.client.createCollection({
        name: "task_examples",
        metadata: { "hnsw:space": "cosine" }
      });
    } catch (error) {
      // Collection might already exist
      this.collection = await this.client.getCollection({
        name: "task_examples"
      });
    }
  }

  async addExample(example: TaskExample) {
    if (!this.collection) {
      await this.initialize();
    }

    // Create embedding for the task description
    const embedding = await this.createEmbedding(example.task);
    
    // Generate unique ID
    const id = `example_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.collection.add({
      ids: [id],
      embeddings: [embedding],
      metadatas: [{
        task: example.task,
        context: example.context,
        issues: example.issues,
        created_at: new Date().toISOString()
      }],
      documents: [example.task] // Store task as document for search
    });

    return id;
  }

  private async createEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    
    return response.data[0].embedding;
  }
}
