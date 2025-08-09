/**
 * Shared types for database records
 */

export interface PageRecord {
  id: string;
  title: string;
  content: string;
  slug: string;
  createdAt: string;
  lastUpdated: string;
}

export interface DatabasePageRecord {
  id: string;
  properties: Record<string, string>;
  content: string;
  createdAt: string;
  lastUpdated: string;
}

export interface DatabaseRecord {
  id: string;
  title: string;
  slug: string;
  properties: Record<string, any>;
  createdAt: string;
  lastUpdated: string;
}

// For backwards compatibility, export ConvertedPage as an alias to PageRecord
export type ConvertedPage = PageRecord;
