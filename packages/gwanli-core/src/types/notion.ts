/**
 * Shared types for Notion-related functionality
 */

export interface SlugMapping {
  slug: string;
  name: string;
}

export type IdToSlugMap = Record<string, SlugMapping>;
