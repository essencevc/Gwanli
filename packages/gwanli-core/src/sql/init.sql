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
  title TEXT,
  properties JSON NOT NULL,
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