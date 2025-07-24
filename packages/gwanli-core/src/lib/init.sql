-- Create page table
CREATE TABLE IF NOT EXISTS page (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT NOT NULL,
  lastUpdated TEXT NOT NULL
);

-- Create database page table
CREATE TABLE IF NOT EXISTS database_page (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT NOT NULL,
  lastUpdated TEXT NOT NULL,
  database_order INTEGER
);

-- Create database table
CREATE TABLE IF NOT EXISTS database (
  id TEXT PRIMARY KEY,
  title TEXT,
  lastUpdated TEXT NOT NULL,
  properties TEXT NOT NULL
);
