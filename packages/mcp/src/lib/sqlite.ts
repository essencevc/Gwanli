// @ts-expect-error - bun:sqlite types not available in development
import { Database } from 'bun:sqlite';
import { TaskExampleStorage } from "./storage-interface.js";
import { TaskExample, SearchResult } from "./types.js";
import { dirname } from 'path';
import { mkdir } from 'fs/promises';

export class SqliteTaskExampleStore extends TaskExampleStorage {
  private db: Database;

  constructor(dbPath: string) {
    super();
    
    // Ensure directory exists
    const dbDir = dirname(dbPath);
    mkdir(dbDir, { recursive: true }).catch(() => {
      // Ignore error if directory already exists
    });
    
    this.db = new Database(dbPath);
  }

  async initialize(): Promise<void> {
    // Create FTS5 table for full-text search
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS task_examples (
        id TEXT PRIMARY KEY,
        task TEXT NOT NULL,
        context TEXT NOT NULL,
        issues TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create FTS5 virtual table for full-text search
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS task_examples_fts USING fts5(
        id UNINDEXED,
        task,
        context,
        issues,
        content='task_examples',
        content_rowid='rowid'
      )
    `);

    // Create triggers to keep FTS table in sync
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS task_examples_ai AFTER INSERT ON task_examples BEGIN
        INSERT INTO task_examples_fts(rowid, id, task, context, issues) 
        VALUES (new.rowid, new.id, new.task, new.context, new.issues);
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS task_examples_ad AFTER DELETE ON task_examples BEGIN
        INSERT INTO task_examples_fts(task_examples_fts, rowid, id, task, context, issues) 
        VALUES('delete', old.rowid, old.id, old.task, old.context, old.issues);
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS task_examples_au AFTER UPDATE ON task_examples BEGIN
        INSERT INTO task_examples_fts(task_examples_fts, rowid, id, task, context, issues) 
        VALUES('delete', old.rowid, old.id, old.task, old.context, old.issues);
        INSERT INTO task_examples_fts(rowid, id, task, context, issues) 
        VALUES (new.rowid, new.id, new.task, new.context, new.issues);
      END;
    `);
  }

  async addExample(example: TaskExample): Promise<string> {
    const validatedExample = this.validateExample(example);
    const id = this.generateId();
    
    const stmt = this.db.prepare(`
      INSERT INTO task_examples (id, task, context, issues)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(id, validatedExample.task, validatedExample.context, validatedExample.issues);
    
    return id;
  }

  async searchSimilarExamples(query: string, nExamples: number = 3): Promise<SearchResult[]> {
    // Use FTS5 MATCH for full-text search
    const stmt = this.db.prepare(`
      SELECT 
        task_examples.task,
        task_examples.context, 
        task_examples.issues,
        task_examples_fts.rank as similarity,
        task_examples.created_at
      FROM task_examples_fts 
      JOIN task_examples ON task_examples.rowid = task_examples_fts.rowid
      WHERE task_examples_fts MATCH ?
      ORDER BY task_examples_fts.rank
      LIMIT ?
    `);
    
    const rows = stmt.all(query, nExamples) as Array<{
      task: string;
      context: string;
      issues: string;
      similarity: number;
      created_at: string;
    }>;
    
    return rows.map(row => ({
      document: `Task: ${row.task}\n\nContext: ${row.context}\n\nIssues Generated: ${row.issues}`,
      similarity: Math.abs(row.similarity), // FTS5 rank is negative, make it positive
      metadata: {
        created_at: row.created_at,
        task: row.task,
        context: row.context,
        issues: row.issues,
      }
    }));
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}
