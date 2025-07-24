-- Simple PAGE table creation

CREATE TABLE IF NOT EXISTS PAGE (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    content TEXT NOT NULL,
    parent_id TEXT
);

-- Database table for organizing page collections
CREATE TABLE IF NOT EXISTS database (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fields TEXT NOT NULL,
    preview TEXT
);

-- Database pages with foreign key relationship and ordering
CREATE TABLE IF NOT EXISTS DATABASE_PAGE (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    content TEXT NOT NULL,
    database_parent INTEGER,
    order_id INTEGER DEFAULT 0,
    FOREIGN KEY (database_parent) REFERENCES database(id)
);
