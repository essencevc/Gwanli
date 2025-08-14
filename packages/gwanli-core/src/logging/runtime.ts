/**
 * Runtime detection for logging context
 */
export enum Runtime {
  CLI = 'CLI',
  MCP = 'MCP',
}

/**
 * Detect the current runtime context
 */
export function detectRuntime(): Runtime {
  // Explicit environment variable takes precedence
  if (process.env.GWANLI_RUNTIME === 'MCP') return Runtime.MCP;
  if (process.env.GWANLI_RUNTIME === 'CLI') return Runtime.CLI;
  
  // Default to CLI if not set
  return Runtime.CLI;
}
