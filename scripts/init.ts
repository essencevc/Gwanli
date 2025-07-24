import { readFileSync, existsSync, unlinkSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const Database = require("@tursodatabase/turso");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initializeDatabase() {
  // Try setting environment variable for experimental features
  process.env.TURSO_EXPERIMENTAL_INDEXES = "1";

  // Delete existing database file if it exists
  const dbPath = "my-database.db";
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
    console.log("✓ Deleted existing database");
  }

  // Create or open a database file
  const db = new Database(dbPath);

  // Read and execute init.sql
  const initSql = readFileSync(join(__dirname, "init.sql"), "utf-8");

  // Execute the entire SQL file as one statement
  try {
    db.exec(initSql);
    console.log("✓ Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    return;
  }

  // Insert sample data into PAGE table
  const insertPageStmt = db.prepare(
    "INSERT INTO PAGE (content, parent_id) VALUES (?, ?)"
  );

  try {
    const result1 = insertPageStmt.run(
      "First page content about TypeScript development",
      null
    );
    console.log(`✓ Inserted page 1 with ID: ${result1.lastInsertRowid}`);

    const result2 = insertPageStmt.run(
      "Second page content about React components",
      null
    );
    console.log(`✓ Inserted page 2 with ID: ${result2.lastInsertRowid}`);
  } catch (error) {
    console.error("Error inserting page data:", error);
    return;
  }

  // Insert sample data into database table
  const insertDbStmt = db.prepare(
    "INSERT INTO database (fields, preview) VALUES (?, ?)"
  );

  try {
    const dbResult1 = insertDbStmt.run(
      "title,content,tags",
      "Documentation database for TypeScript guides"
    );
    console.log(`✓ Inserted database 1 with ID: ${dbResult1.lastInsertRowid}`);

    const dbResult2 = insertDbStmt.run(
      "name,description,code",
      "React component examples and tutorials"
    );
    console.log(`✓ Inserted database 2 with ID: ${dbResult2.lastInsertRowid}`);

    // Insert sample DATABASE_PAGE entries with foreign keys
    const insertDbPageStmt = db.prepare(
      "INSERT INTO DATABASE_PAGE (content, database_parent, order_id) VALUES (?, ?, ?)"
    );

    const dbPageResult1 = insertDbPageStmt.run(
      "TypeScript basics: variables and types",
      1,
      1
    );
    console.log(
      `✓ Inserted database page 1 with ID: ${dbPageResult1.lastInsertRowid}`
    );

    const dbPageResult2 = insertDbPageStmt.run(
      "Advanced TypeScript: generics and utility types",
      1,
      2
    );
    console.log(
      `✓ Inserted database page 2 with ID: ${dbPageResult2.lastInsertRowid}`
    );

    const dbPageResult3 = insertDbPageStmt.run(
      "React hooks: useState and useEffect examples",
      2,
      1
    );
    console.log(
      `✓ Inserted database page 3 with ID: ${dbPageResult3.lastInsertRowid}`
    );
  } catch (error) {
    console.error("Error inserting database data:", error);
    return;
  }

  // Query the data back to verify
  try {
    const selectStmt = db.prepare("SELECT * FROM PAGE");
    const rows = selectStmt.all();

    console.log("\n--- PAGE table data ---");
    rows.forEach((row) => {
      console.log(`ID: ${row.id}, Content: ${row.content.substring(0, 50)}...`);
    });
  } catch (error) {
    console.error("Error querying PAGE data:", error);
  }

  // Query database table
  try {
    const selectDbStmt = db.prepare("SELECT * FROM database");
    const dbRows = selectDbStmt.all();

    console.log("\n--- DATABASE table data ---");
    dbRows.forEach((row) => {
      console.log(
        `ID: ${row.id}, Fields: ${row.fields}, Preview: ${row.preview}`
      );
    });
  } catch (error) {
    console.error("Error querying database data:", error);
  }

  // Query DATABASE_PAGE with JOIN to show foreign key relationship
  try {
    const joinStmt = db.prepare(`
      SELECT dp.id, dp.content, dp.order_id, d.fields as db_fields, d.preview as db_preview
      FROM DATABASE_PAGE dp
      JOIN database d ON dp.database_parent = d.id
      ORDER BY dp.database_parent, dp.order_id
    `);
    const joinRows = joinStmt.all();

    console.log("\n--- DATABASE_PAGE with foreign key relationships ---");
    joinRows.forEach((row) => {
      console.log(`Page ID: ${row.id}, Order: ${row.order_id}`);
      console.log(`  Content: ${row.content}`);
      console.log(`  Database: ${row.db_preview} (${row.db_fields})`);
      console.log("");
    });
  } catch (error) {
    console.error("Error querying joined data:", error);
  }

  // Test LIKE-based text search queries
  console.log("\n--- Testing LIKE-based text search ---");

  const searchQueries = [
    { term: "React", pattern: "%React%" },
    { term: "TypeScript", pattern: "%TypeScript%" },
    { term: "Script", pattern: "%Script%" },
    { term: "development", pattern: "%development%" },
    { term: "content", pattern: "%content%" },
  ];

  for (const search of searchQueries) {
    console.log(`\nSearching for: "${search.term}"`);

    try {
      const searchStmt = db.prepare(`
        SELECT id, content 
        FROM PAGE 
        WHERE content LIKE ?
      `);

      const results = searchStmt.all(search.pattern);

      if (results.length > 0) {
        results.forEach((result) => {
          console.log(
            `  - ID ${result.id}: ${result.content.substring(0, 60)}...`
          );
        });
      } else {
        console.log("  No results found");
      }
    } catch (error) {
      console.error(`  Error searching for "${search.term}":`, error.message);
    }
  }

  console.log("\n✓ Database initialization and testing complete!");
}

// Run the initialization
initializeDatabase().catch(console.error);
