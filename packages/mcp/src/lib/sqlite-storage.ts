import { TaskExampleStorage } from "./storage-interface.js";
import { TaskExample, SearchResult } from "./types.js";
import Database from 'better-sqlite3';

export class SqliteTaskExampleStore extends TaskExampleStorage {
  private dbPath: string;
  private db: Database.Database | null = null;

  constructor(dbPath: string = "./task-examples.db") {
    super();
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    this.db = new Database(this.dbPath);
    
    // Create FTS5 table for better search
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS task_examples_fts 
      USING fts5(id, task, context, issues, document, created_at);
    `);
  }

  async addExample(example: TaskExample): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
    const validatedExample = this.validateExample(example);
    const id = this.generateId();
    const createdAt = new Date().toISOString();
    
    const document = `Task: ${validatedExample.task}

Context: ${validatedExample.context}

Issues Generated: ${validatedExample.issues}`;

    const stmt = this.db.prepare(`
      INSERT INTO task_examples_fts (id, task, context, issues, document, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, validatedExample.task, validatedExample.context, validatedExample.issues, document, createdAt);

    return id;
  }

  async searchSimilarExamples(query: string, nExamples: number = 3): Promise<SearchResult[]> {
    if (!this.db) throw new Error('Database not initialized');
    if (!query.trim()) return [];

    // First try FTS5 search for exact matches
    const ftsStmt = this.db.prepare(`
      SELECT document, bm25(task_examples_fts) as score, created_at
      FROM task_examples_fts
      WHERE task_examples_fts MATCH ?
      ORDER BY bm25(task_examples_fts)
      LIMIT ?
    `);
    
    const ftsResults = ftsStmt.all(query, nExamples);
    
    // If we have enough results, return them
    if (ftsResults.length >= nExamples) {
      return ftsResults.map(row => ({
        document: row.document,
        similarity: Math.max(0.1, 1.0 / (1.0 + Math.abs(row.score))),
        metadata: { created_at: row.created_at }
      }));
    }

    // If not enough exact matches, fall back to broader search
    const allStmt = this.db.prepare(`
      SELECT document, created_at
      FROM task_examples_fts
      ORDER BY created_at DESC
      LIMIT ?
    `);
    
    const allResults = allStmt.all(nExamples);
    const queryWords = query.toLowerCase().split(/\s+/);
    
    return allResults.map(row => {
      const documentLower = row.document.toLowerCase();
      const wordsFound = queryWords.filter(word => documentLower.includes(word));
      const similarity = wordsFound.length > 0 
        ? (wordsFound.length / queryWords.length) * 0.8 
        : 0.1; // Minimum similarity for fallback results
      
      return {
        document: row.document,
        similarity,
        metadata: { created_at: row.created_at }
      };
    }).sort((a, b) => b.similarity - a.similarity);
  }
}
