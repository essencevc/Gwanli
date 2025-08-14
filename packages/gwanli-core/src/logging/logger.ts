import pino from "pino";
import type { Logger as PinoLogger } from "pino";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { GWANLI_HOME } from "../constants.js";

/**
 * Simple Logger that mimics console but handles CLI vs MCP context
 */
export class Logger {
  private pino: PinoLogger;
  private enableConsole: boolean;

  constructor(logDir?: string, prefix?: string, enableConsole: boolean = false) {
    this.enableConsole = enableConsole;
    this.pino = this.initPino(logDir, prefix);
    this.pino.debug(`Logger initialized with console output: ${this.enableConsole}`);
  }

  /**
   * Initialize Pino logger
   */
  private initPino(logDir?: string, prefix?: string): PinoLogger {
    const defaultLogPath = join(GWANLI_HOME, "logs", "app.log");
    const logPath = logDir ? join(logDir, "app.log") : defaultLogPath;

    // Create directory if it doesn't exist
    try {
      mkdirSync(dirname(logPath), { recursive: true });
    } catch (error) {
      // Ignore error if directory already exists
    }

    return pino({
      level: "debug",
      formatters: prefix
        ? {
            log: (object) => ({
              ...object,
              msg: `${prefix} ${object.msg || ""}`.trim(),
            }),
          }
        : undefined,
      transport: {
        target: "pino-pretty",
        options: {
          destination: logPath,
          colorize: false,
          translateTime: "yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
    });
  }

  /**
   * Console output only - no Pino logging (for UI/interactive messages)
   */
  console(message?: any, ...optionalParams: any[]): void {
    if (this.enableConsole) {
      console.log(message, ...optionalParams);
    }
  }

  /**
   * Log info message - both console and Pino (for meaningful logs)
   */
  log(message?: any, ...optionalParams: any[]): void {
    // Console output only when enabled
    if (this.enableConsole) {
      this.console(message, ...optionalParams);
    }

    // Pino logging
    this.pino.info(message, ...optionalParams);
  }

  /**
   * Log error message (like console.error)
   */
  error(message?: any, ...optionalParams: any[]): void {
    // Console output only when enabled
    if (this.enableConsole) {
      console.error(message, ...optionalParams);
    }

    // Pino logging
    this.pino.error(message, ...optionalParams);
  }

  /**
   * Alias for log (like console.info)
   */
  info(message?: any, ...optionalParams: any[]): void {
    this.log(message, ...optionalParams);
  }

  /**
   * Debug logging
   */
  debug(message?: any, ...optionalParams: any[]): void {
    // Console output
    if (this.enableConsole) {
      console.log("[DEBUG]", message, ...optionalParams);
    }

    // Pino logging
    this.pino.debug(message, ...optionalParams);
  }
}

// Default logger instance for convenience (console disabled by default)
export const defaultLogger = new Logger();

// CLI logger instance with console output enabled
export const cliLogger = new Logger(undefined, undefined, true);
