import { z } from 'zod';

/**
 * Job status enum
 */
export enum JobStatus {
  Started = 'started',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
}

/**
 * Zod schema for IndexJob validation
 */
export const IndexJobSchema = z.object({
  /** Timestamp-based unique identifier (ISO string) */
  id: z.string().min(1),

  /** Current status of the indexing job */
  status: z.nativeEnum(JobStatus),

  /** Last update timestamp (ISO string) */
  lastUpdate: z.string().datetime(),

  /** When the job was started (ISO string) */
  startedAt: z.string().datetime(),

  /** When the job finished (ISO string), undefined if still running */
  endedAt: z.string().datetime().optional(),

  /** Error message if job failed */
  error: z.string().optional(),
});

/**
 * TypeScript interface inferred from Zod schema
 */
export type IndexJob = z.infer<typeof IndexJobSchema>;
