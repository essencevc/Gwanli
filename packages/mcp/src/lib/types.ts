import { z } from "zod";

// Schema for storing task examples
export const TaskExampleSchema = z.object({
  task: z.string(),
  context: z.string(),
  issues: z.string(),
});

// Inferred type from Zod schema
export type TaskExample = z.infer<typeof TaskExampleSchema>;

// Search result schema for storage implementations
export const SearchResultSchema = z.object({
  document: z.string(),
  similarity: z.number(),
  metadata: z.record(z.any()).optional(),
});

// Inferred type from Zod schema
export type SearchResult = z.infer<typeof SearchResultSchema>;
