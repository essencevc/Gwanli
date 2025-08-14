import { existsSync, readFileSync, unlinkSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { homedir } from "os";
import Database from "better-sqlite3";
import type { ConvertedPage, DatabasePageRecord } from "../types/database.js";
import type { IdToSlugMap } from "../types/notion.js";
import type {
  PageObjectResponse,
  DatabaseObjectResponse,
} from "@notionhq/client/build/src/api-endpoints.js";
import { Logger, defaultLogger } from "../logging/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const initSqlPath = join(__dirname, "../sql/init.sql");
const initSql = readFileSync(initSqlPath, "utf-8");

export function initialise_db(DB_PATH: string, logger?: Logger): Database.Database {
  const log = logger || defaultLogger;
  
  // Expand ~ to home directory
  const expandedPath = DB_PATH.startsWith("~/")
    ? join(homedir(), DB_PATH.slice(2))
    : DB_PATH;

  log.debug(`Initializing database at path: ${expandedPath}`);

  // Ensure the directory exists
  const dbDir = dirname(expandedPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    log.debug(`Created directory: ${dbDir}`);
  }

  if (existsSync(expandedPath)) {
    unlinkSync(expandedPath);
    log.debug(`Removed existing database file: ${expandedPath}`);
  }
  
  let db: Database.Database;
  try {
    db = new Database(expandedPath);
    log.info(`Database initialized successfully at: ${expandedPath}`);
  } catch (error) {
    log.error("Error initialising database at path:", expandedPath, error);
    throw error;
  }

  // Execute the initialization SQL
  db.exec(initSql);

  return db;
}

export function get_db(DB_PATH: string, logger?: Logger): Database.Database {
  const log = logger || defaultLogger;
  
  // Expand ~ to home directory
  const expandedPath = DB_PATH.startsWith("~/")
    ? join(homedir(), DB_PATH.slice(2))
    : DB_PATH;

  log.debug(`Connecting to database at path: ${expandedPath}`);

  if (!existsSync(expandedPath)) {
    throw new Error(`Database file not found: ${expandedPath}`);
  }
  
  let db: Database.Database;
  try {
    db = new Database(expandedPath);
    log.debug(`Connected to database successfully at: ${expandedPath}`);
  } catch (error) {
    log.error("Error connecting to database at path:", expandedPath, error);
    throw error;
  }

  return db;
}

export function insertPages(
  db: Database.Database,
  convertedPages: ConvertedPage[],
  logger?: Logger
): void {
  const log = logger || defaultLogger;
  
  if (convertedPages.length === 0) {
    log.debug("No pages to insert");
    return;
  }

  log.debug(`Inserting ${convertedPages.length} pages into database`);

  const values = convertedPages.map(() => `(?, ?, ?, ?, ?, ?)`).join(", ");

  const sql = `
    INSERT OR REPLACE INTO page (id, title, content, slug, createdAt, lastUpdated)
    VALUES ${values}
  `;

  const params = convertedPages.flatMap((converted, index) => {
    return [
      converted.id,
      converted.title,
      converted.content,
      converted.slug,
      converted.createdAt,
      converted.lastUpdated,
    ];
  });

  try {
    const insertStmt = db.prepare(sql);
    insertStmt.run(...params);
    log.info(`Successfully inserted ${convertedPages.length} pages`);
  } catch (error) {
    log.error("Error inserting pages:", error);
    throw error;
  }
}

export function insertDatabases(
  db: Database.Database,
  databases: DatabaseObjectResponse[],
  id_to_slug: IdToSlugMap,
  logger?: Logger
): void {
  const log = logger || defaultLogger;
  
  if (databases.length === 0) {
    log.debug("No databases to insert");
    return;
  }

  log.debug(`Inserting ${databases.length} databases into database`);

  const values = databases.map(() => `(?, ?, ?, ?, ?, ?)`).join(", ");

  const sql = `
    INSERT OR REPLACE INTO database (id, title, slug, properties, createdAt, lastUpdated)
    VALUES ${values}
  `;

  const params = databases.flatMap((database) => {
    const title = database.title?.[0]?.plain_text || "Untitled";
    return [
      database.id,
      title,
      id_to_slug[database.id].slug || "",
      JSON.stringify(database.properties),
      database.created_time,
      database.last_edited_time,
    ];
  });

  try {
    const insertStmt = db.prepare(sql);
    const result = insertStmt.run(...params);
    log.info(`Successfully inserted ${databases.length} databases`);
  } catch (error) {
    log.error("Error inserting databases:", error);
    throw error;
  }
}

export function insertDatabasePages(
  db: Database.Database,
  databasePages: DatabasePageRecord[],
  logger?: Logger
): void {
  const log = logger || defaultLogger;
  
  if (databasePages.length === 0) {
    log.debug("No database pages to insert");
    return;
  }

  log.debug(`Inserting ${databasePages.length} database pages into database`);

  const values = databasePages.map(() => `(?, ?, ?, ?, ?)`).join(", ");

  const sql = `
    INSERT OR REPLACE INTO database_page (id, properties, content, createdAt, lastUpdated)
    VALUES ${values}
  `;

  const params = databasePages.flatMap((page) => {
    // Extract properties as JSON

    return [
      page.id,
      JSON.stringify(page.properties),
      page.content,
      page.createdAt,
      page.lastUpdated,
    ];
  });

  try {
    const insertStmt = db.prepare(sql);
    const result = insertStmt.run(...params);
    log.info(`Successfully inserted ${databasePages.length} database pages`);
  } catch (error) {
    log.error("Error inserting database pages:", error);
    throw error;
  }
}

export function getAllSlugs(db: Database.Database, logger?: Logger): string[] {
  const log = logger || defaultLogger;
  
  try {
    log.debug("Fetching all slugs from database");
    
    // Get slugs from page table
    const pageStmt = db.prepare("SELECT slug FROM page");
    const pageSlugs = pageStmt.all() as { slug: string }[];

    // Get slugs from database table
    const databaseStmt = db.prepare("SELECT slug FROM database");
    const databaseSlugs = databaseStmt.all() as { slug: string }[];

    // Combine and add visual indicators
    const allSlugs = [
      ...pageSlugs.map((row) => row.slug),
      ...databaseSlugs.map((row) => row.slug),
    ];

    log.debug(`Retrieved ${allSlugs.length} slugs (${pageSlugs.length} pages, ${databaseSlugs.length} databases)`);
    return allSlugs;
  } catch (error) {
    log.error("Error fetching slugs:", error);
    throw error;
  }
}

export function getPageBySlug(
  db: Database.Database,
  slug: string,
  logger?: Logger
): { id: string; title: string; content: string; slug: string; createdAt: string; lastUpdated: string; type: 'page' } | 
   { id: string; title: string; slug: string; properties: any; createdAt: string; lastUpdated: string; type: 'database' } | 
   null {
  const log = logger || defaultLogger;
  
  try {
    log.debug(`Fetching page with slug: ${slug}`);
    
    // First check the page table
    const pageStmt = db.prepare("SELECT id, title, content, slug, createdAt, lastUpdated FROM page WHERE slug = ?");
    const pageResult = pageStmt.get(slug) as any;
    
    if (pageResult) {
      log.debug(`Found page with slug: ${slug}`);
      return { ...pageResult, type: 'page' };
    }
    
    // If not found in page table, check database table
    const databaseStmt = db.prepare("SELECT id, title, slug, properties, createdAt, lastUpdated FROM database WHERE slug = ?");
    const databaseResult = databaseStmt.get(slug) as any;
    
    if (databaseResult) {
      log.debug(`Found database with slug: ${slug}`);
      return { 
        ...databaseResult, 
        properties: JSON.parse(databaseResult.properties),
        type: 'database' 
      };
    }
    
    log.debug(`No page or database found with slug: ${slug}`);
    return null;
  } catch (error) {
    log.error(`Error fetching page with slug ${slug}:`, error);
    throw error;
  }
}

export function searchPages(
  db: Database.Database,
  query: string,
  options: {
    limit?: number;
    offset?: number;
    includeContent?: boolean;
  } = {},
  logger?: Logger
): {
  results: Array<{ id: string; title: string; content?: string; slug: string; createdAt: string; lastUpdated: string; type: 'page' | 'database' | 'database_page'; rank: number }>;
  totalCount: number;
  hasMore: boolean;
} {
  const log = logger || defaultLogger;
  const { limit = 10, offset = 0, includeContent = false } = options;
  
  try {
    log.debug(`Searching pages with query: ${query}, limit: ${limit}, offset: ${offset}`);
    
    const results: any[] = [];
    
    // Search in pages
    const pageFields = includeContent ? "page.id, page.title, page.content, page.slug, page.createdAt, page.lastUpdated, page_fts.rank" : "page.id, page.title, page.slug, page.createdAt, page.lastUpdated, page_fts.rank";
    const pageStmt = db.prepare(`
      SELECT ${pageFields}, 'page' as type
      FROM page_fts 
      JOIN page ON page.id = page_fts.id 
      WHERE page_fts MATCH ? 
      ORDER BY page_fts.rank
    `);
    const pageResults = pageStmt.all(query) as any[];
    results.push(...pageResults.map(r => ({ ...r, type: 'page' as const })));
    
    // Search in databases
    const databaseStmt = db.prepare(`
      SELECT database.id, database.title, database.slug, database.createdAt, database.lastUpdated, database_fts.rank, 'database' as type
      FROM database_fts 
      JOIN database ON database.id = database_fts.id 
      WHERE database_fts MATCH ? 
      ORDER BY database_fts.rank
    `);
    const databaseResults = databaseStmt.all(query) as any[];
    results.push(...databaseResults.map(r => ({ ...r, type: 'database' as const })));
    
    // Search in database pages if includeContent is true
    if (includeContent) {
      const dbPageStmt = db.prepare(`
        SELECT database_page.id, database_page.content, database_page.createdAt, database_page.lastUpdated, database_page_fts.rank, 'database_page' as type
        FROM database_page_fts 
        JOIN database_page ON database_page.id = database_page_fts.id 
        WHERE database_page_fts MATCH ? 
        ORDER BY database_page_fts.rank
      `);
      const dbPageResults = dbPageStmt.all(query) as any[];
      results.push(...dbPageResults.map(r => ({ ...r, type: 'database_page' as const, title: '', slug: '' })));
    }
    
    // Sort by rank and apply pagination
    const sortedResults = results.sort((a, b) => a.rank - b.rank);
    const totalCount = sortedResults.length;
    const paginatedResults = sortedResults.slice(offset, offset + limit);
    const hasMore = offset + limit < totalCount;
    
    log.debug(`Found ${totalCount} results, returning ${paginatedResults.length} with offset ${offset}`);
    
    return {
      results: paginatedResults,
      totalCount,
      hasMore
    };
  } catch (error) {
    log.error(`Error searching pages with query "${query}":`, error);
    throw error;
  }
}

export function findPagesByPattern(
  db: Database.Database,
  pattern: string,
  field: 'slug' | 'title' = 'slug',
  options: {
    limit?: number;
    offset?: number;
    includeContent?: boolean;
  } = {},
  logger?: Logger
): {
  results: Array<{ id: string; title: string; content?: string; slug: string; createdAt: string; lastUpdated: string; type: 'page' | 'database'; properties?: any }>;
  totalCount: number;
  hasMore: boolean;
} {
  const log = logger || defaultLogger;
  const { limit = 10, offset = 0, includeContent = false } = options;
  
  try {
    log.debug(`Finding pages with pattern: ${pattern} in field: ${field}, limit: ${limit}, offset: ${offset}`);
    
    const results: any[] = [];
    
    // Search in pages
    const pageFields = includeContent ? "id, title, content, slug, createdAt, lastUpdated" : "id, title, slug, createdAt, lastUpdated";
    const pageStmt = db.prepare(`
      SELECT ${pageFields}, 'page' as type
      FROM page 
      WHERE ${field} GLOB ?
      ORDER BY ${field}
    `);
    const pageResults = pageStmt.all(pattern) as any[];
    results.push(...pageResults.map(r => ({ ...r, type: 'page' as const })));
    
    // Search in databases
    const databaseStmt = db.prepare(`
      SELECT id, title, slug, properties, createdAt, lastUpdated, 'database' as type
      FROM database 
      WHERE ${field} GLOB ?
      ORDER BY ${field}
    `);
    const databaseResults = databaseStmt.all(pattern) as any[];
    results.push(...databaseResults.map((r: any) => ({ 
      ...r, 
      type: 'database' as const,
      properties: JSON.parse(r.properties)
    })));
    
    // Apply pagination
    const totalCount = results.length;
    const paginatedResults = results.slice(offset, offset + limit);
    const hasMore = offset + limit < totalCount;
    
    log.debug(`Found ${totalCount} results matching pattern "${pattern}", returning ${paginatedResults.length} with offset ${offset}`);
    
    return {
      results: paginatedResults,
      totalCount,
      hasMore
    };
  } catch (error) {
    log.error(`Error finding pages with pattern "${pattern}":`, error);
    throw error;
  }
}
