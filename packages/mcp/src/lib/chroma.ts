import { CloudClient } from "chromadb";
import { TaskExampleStorage } from "./storage-interface.js";
import { TaskExample, SearchResult } from "./types.js";
import { isChromaConfig, validateEnv } from "./env.js";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";

export class ChromaTaskExampleStore extends TaskExampleStorage {
  private client: CloudClient;
  private collection: any;
  private embedder: OpenAIEmbeddingFunction;

  constructor() {
    super();

    const { config } = validateEnv();

    if (!isChromaConfig(config)) {
      throw new Error("Invalid Chroma configuration.");
    }
    const { OPENAI_API_KEY, CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE } =
      config;

    // Configure ChromaDB Cloud client
    this.client = new CloudClient({
      apiKey: CHROMA_API_KEY,
      tenant: CHROMA_TENANT,
      database: CHROMA_DATABASE,
    });

    // Initialize embedding function
    this.embedder = new OpenAIEmbeddingFunction({
      apiKey: OPENAI_API_KEY,
      modelName: "text-embedding-3-small",
    });
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

  async searchSimilarExamples(
    query: string,
    nExamples: number = 3
  ): Promise<SearchResult[]> {
    if (!this.collection) {
      await this.initialize();
    }

    const results = await this.collection.query({
      queryTexts: [query],
      nResults: nExamples,
    });

    if (!results.documents || !results.documents[0]) {
      return [];
    }

    return results.documents[0].map((doc: string, index: number) => ({
      document: doc,
      similarity: results.distances?.[0]?.[index] ?? 0,
      metadata: results.metadatas?.[0]?.[index] ?? {},
    }));
  }
}
