import Database from 'better-sqlite3';
import { TaskExampleStorage } from './storage-interface.js';
import { TaskExample, SearchResult } from './types.js';

/**
 * SQLite-based implementation of TaskExampleStorage using FTS (Full Text Search).
 * This provides local storage without external dependencies.
 */
export class SQLiteTaskExampleStorage extends TaskExampleStorage {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string = './task-examples.db') {
    super();
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    this.db = new Database(this.dbPath);
    
    // Enable FTS5 extension
    this.db.pragma('journal_mode = WAL');
    
    // Create the main table for task examples
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS task_examples (
        id TEXT PRIMARY KEY,
        task TEXT NOT NULL,
        context TEXT NOT NULL,
        issues TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
        VALUES (NEW.rowid, NEW.id, NEW.task, NEW.context, NEW.issues);
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS task_examples_ad AFTER DELETE ON task_examples BEGIN
        INSERT INTO task_examples_fts(task_examples_fts, rowid, id, task, context, issues)
        VALUES('delete', OLD.rowid, OLD.id, OLD.task, OLD.context, OLD.issues);
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS task_examples_au AFTER UPDATE ON task_examples BEGIN
        INSERT INTO task_examples_fts(task_examples_fts, rowid, id, task, context, issues)
        VALUES('delete', OLD.rowid, OLD.id, OLD.task, OLD.context, OLD.issues);
        INSERT INTO task_examples_fts(rowid, id, task, context, issues)
        VALUES (NEW.rowid, NEW.id, NEW.task, NEW.context, NEW.issues);
      END
    `);
  }

  async addExample(example: TaskExample): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

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
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    if (!query.trim()) {
      return [];
    }

    // Use FTS5 search with highlighting and ranking
    const stmt = this.db.prepare(`
      SELECT 
        te.id,
        te.task,
        te.context,
        te.issues,
        fts.rank,
        highlight(task_examples_fts, 1, '<b>', '</b>') as task_highlight,
        highlight(task_examples_fts, 2, '<b>', '</b>') as context_highlight,
        highlight(task_examples_fts, 3, '<b>', '</b>') as issues_highlight
      FROM task_examples_fts fts
      JOIN task_examples te ON te.rowid = fts.rowid
      WHERE task_examples_fts MATCH ?
      ORDER BY fts.rank
      LIMIT ?
    `);

    // Prepare the search query for FTS5
    const searchQuery = query
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => `"${term.replace(/"/g, '""')}"`)
      .join(' OR ');

    const rows = stmt.all(searchQuery, nExamples) as Array<{
      id: string;
      task: string;
      context: string;
      issues: string;
      rank: number;
      task_highlight: string;
      context_highlight: string;
      issues_highlight: string;
    }>;

    return rows.map(row => ({
      document: `Task: ${row.task}\nContext: ${row.context}\nIssues: ${row.issues}`,
      similarity: this.calculateSimilarity(row.rank),
      metadata: {
        id: row.id,
        task: row.task,
        context: row.context,
        issues: row.issues,
        task_highlight: row.task_highlight,
        context_highlight: row.context_highlight,
        issues_highlight: row.issues_highlight
      }
    }));
  }

  /**
   * Convert FTS5 rank to a similarity score between 0 and 1.
   * FTS5 rank is negative, with higher absolute values being better matches.
   */
  private calculateSimilarity(rank: number): number {
    // Convert negative rank to positive similarity score
    // Higher absolute rank values become higher similarity scores
    const absRank = Math.abs(rank);
    // Normalize to 0-1 range (this is a simple heuristic)
    return Math.min(1, absRank / 10);
  }

  /**
   * Close the database connection.
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
