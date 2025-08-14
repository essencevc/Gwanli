-- Simple Notion-like page tracking database schema
-- SQLite compatible

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Regular pages table
CREATE TABLE IF NOT EXISTS page (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT NOT NULL,
  slug TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  lastUpdated TEXT NOT NULL
);

-- Database pages table
CREATE TABLE IF NOT EXISTS database_page (
  id TEXT PRIMARY KEY,
  properties JSON NOT NULL,
  content TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  lastUpdated TEXT NOT NULL
);

-- Databases table
CREATE TABLE IF NOT EXISTS database (
  id TEXT PRIMARY KEY,
  title TEXT,
  slug TEXT NOT NULL,
  properties JSON NOT NULL,
  createdAt TEXT NOT NULL,
  lastUpdated TEXT NOT NULL
);

-- FTS virtual tables for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS page_fts USING fts5(
  id UNINDEXED,
  title,
  content,
  slug
);

CREATE VIRTUAL TABLE IF NOT EXISTS database_fts USING fts5(
  id UNINDEXED,
  title,
  slug
);

CREATE VIRTUAL TABLE IF NOT EXISTS database_page_fts USING fts5(
  id UNINDEXED,
  content
);

-- Triggers to keep FTS tables in sync
CREATE TRIGGER IF NOT EXISTS page_ai AFTER INSERT ON page BEGIN
  INSERT INTO page_fts(id, title, content, slug) VALUES (new.id, new.title, new.content, new.slug);
END;

CREATE TRIGGER IF NOT EXISTS page_ad AFTER DELETE ON page BEGIN
  DELETE FROM page_fts WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS page_au AFTER UPDATE ON page BEGIN
  DELETE FROM page_fts WHERE id = old.id;
  INSERT INTO page_fts(id, title, content, slug) VALUES (new.id, new.title, new.content, new.slug);
END;

CREATE TRIGGER IF NOT EXISTS database_ai AFTER INSERT ON database BEGIN
  INSERT INTO database_fts(id, title, slug) VALUES (new.id, new.title, new.slug);
END;

CREATE TRIGGER IF NOT EXISTS database_ad AFTER DELETE ON database BEGIN
  DELETE FROM database_fts WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS database_au AFTER UPDATE ON database BEGIN
  DELETE FROM database_fts WHERE id = old.id;
  INSERT INTO database_fts(id, title, slug) VALUES (new.id, new.title, new.slug);
END;

CREATE TRIGGER IF NOT EXISTS database_page_ai AFTER INSERT ON database_page BEGIN
  INSERT INTO database_page_fts(id, content) VALUES (new.id, new.content);
END;

CREATE TRIGGER IF NOT EXISTS database_page_ad AFTER DELETE ON database_page BEGIN
  DELETE FROM database_page_fts WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS database_page_au AFTER UPDATE ON database_page BEGIN
  DELETE FROM database_page_fts WHERE id = old.id;
  INSERT INTO database_page_fts(id, content) VALUES (new.id, new.content);
END;
