import pino from 'pino';
import type { Logger as PinoLogger } from 'pino';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { detectRuntime, Runtime } from './runtime.js';

/**
 * Simple Logger that mimics console but handles CLI vs MCP context
 */
export class Logger {
  private static pino: PinoLogger | null = null;
  private static runtime = detectRuntime();

  /**
   * Initialize Pino logger
   */
  private static initPino(): PinoLogger {
    if (this.pino) return this.pino;
    
    const logPath = process.env.GWANLI_LOG_PATH || `${process.env.HOME}/.gwanli/logs/app.log`;
    
    // Create directory if it doesn't exist
    try {
      mkdirSync(dirname(logPath), { recursive: true });
    } catch (error) {
      // Ignore error if directory already exists
    }
    
    this.pino = pino({
      level: 'debug',
      transport: {
        target: 'pino/file',
        options: {
          destination: logPath,
        },
      },
    });
    
    return this.pino;
  }

  /**
   * Console output only - no Pino logging (for UI/interactive messages)
   */
  static console(message?: any, ...optionalParams: any[]): void {
    if (this.runtime === Runtime.CLI) {
      console.log(message, ...optionalParams);
    } else {
      // MCP mode: use console.error to avoid stdio conflicts
      console.error(message, ...optionalParams);
    }
  }

  /**
   * Log info message - both console and Pino (for meaningful logs)
   */
  static log(message?: any, ...optionalParams: any[]): void {
    // Console output
    this.console(message, ...optionalParams);
    
    // Pino logging
    this.initPino().info(message, ...optionalParams);
  }

  /**
   * Log error message (like console.error)
   */
  static error(message?: any, ...optionalParams: any[]): void {
    // Console output (always stderr)
    console.error(message, ...optionalParams);
    
    // Pino logging
    this.initPino().error(message, ...optionalParams);
  }

  /**
   * Alias for log (like console.info)
   */
  static info(message?: any, ...optionalParams: any[]): void {
    this.log(message, ...optionalParams);
  }

  /**
   * Debug logging
   */
  static debug(message?: any, ...optionalParams: any[]): void {
    // Console output
    if (this.runtime === Runtime.CLI) {
      console.log('[DEBUG]', message, ...optionalParams);
    } else {
      console.error('[DEBUG]', message, ...optionalParams);
    }
    
    // Pino logging
    this.initPino().debug(message, ...optionalParams);
  }
}
