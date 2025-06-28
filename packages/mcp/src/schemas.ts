import { z } from "zod";

// Input validation schemas for tools
export const SuggestIssuesInputSchema = z.object({
  taskDescription: z.string().min(1, "Task description is required"),
  context: z.string().optional().default(""),
});

export const SaveTaskExampleInputSchema = z.object({
  task: z.string().min(1, "Task is required"),
  context: z.string().min(1, "Context is required"),
  issues: z.string().min(1, "Issues are required"),
});

// Export inferred types for type safety
export type SuggestIssuesInput = z.infer<typeof SuggestIssuesInputSchema>;
export type SaveTaskExampleInput = z.infer<typeof SaveTaskExampleInputSchema>;
