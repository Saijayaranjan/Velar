/**
 * Logging Utility
 * Provides structured logging with levels and context
 */

import { LOG_LEVELS, type LogLevel } from '../constants/app.constants';
import { config } from '../constants/config';

/** Log entry interface */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  error?: Error;
}

/** Logger configuration */
interface LoggerConfig {
  level: LogLevel;
  enabled: boolean;
  fileLogging: boolean;
  consoleLogging: boolean;
}

/**
 * Logger class for structured logging
 */
class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000;

  constructor() {
    this.config = {
      level: (config.logging.level as LogLevel) || LOG_LEVELS.INFO,
      enabled: config.logging.enabled,
      fileLogging: config.logging.fileLogging,
      consoleLogging: true,
    };
  }

  /**
   * Set logging configuration
   */
  configure(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;

    const levels: LogLevel[] = [
      LOG_LEVELS.ERROR,
      LOG_LEVELS.WARN,
      LOG_LEVELS.INFO,
      LOG_LEVELS.DEBUG,
    ];

    const currentLevelIndex = levels.indexOf(this.config.level);
    const targetLevelIndex = levels.indexOf(level);

    return targetLevelIndex <= currentLevelIndex;
  }

  /**
   * Create log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date(),
      context,
      error,
    };
  }

  /**
   * Add log entry to history
   */
  private addToHistory(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Format log message for console
   */
  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    let message = `[${timestamp}] [${level}] ${entry.message}`;

    if (entry.context) {
      message += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }

    if (entry.error) {
      message += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        message += `\n  Stack: ${entry.error.stack}`;
      }
    }

    return message;
  }

  /**
   * Get console method for log level
   */
  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case LOG_LEVELS.ERROR:
        return console.error;
      case LOG_LEVELS.WARN:
        return console.warn;
      case LOG_LEVELS.INFO:
        return console.info;
      case LOG_LEVELS.DEBUG:
        return console.debug;
      default:
        return console.log;
    }
  }

  /**
   * Write log entry
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, context, error);
    this.addToHistory(entry);

    // Console logging
    if (this.config.consoleLogging) {
      const consoleMethod = this.getConsoleMethod(level);
      consoleMethod(this.formatMessage(entry));
    }

    // File logging (delegated to Electron main process)
    if (this.config.fileLogging && window.electronAPI) {
      window.electronAPI.invoke('write-log', entry).catch((err: Error) => {
        console.error('Failed to write log to file:', err);
      });
    }
  }

  /**
   * Log error message
   */
  error(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log(LOG_LEVELS.ERROR, message, context, error);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LOG_LEVELS.WARN, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LOG_LEVELS.INFO, message, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LOG_LEVELS.DEBUG, message, context);
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear log history
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Search logs by message
   */
  searchLogs(query: string): LogEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.logs.filter((log) =>
      log.message.toLowerCase().includes(lowerQuery)
    );
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private marks = new Map<string, number>();

  /**
   * Start performance measurement
   */
  start(label: string): void {
    this.marks.set(label, performance.now());
  }

  /**
   * End performance measurement and log result
   */
  end(label: string, context?: Record<string, unknown>): number {
    const startTime = this.marks.get(label);
    if (!startTime) {
      logger.warn(`Performance mark "${label}" not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(label);

    logger.debug(`Performance: ${label}`, {
      ...context,
      durationMs: duration.toFixed(2),
    });

    return duration;
  }

  /**
   * Measure async operation
   */
  async measure<T>(
    label: string,
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    this.start(label);
    try {
      const result = await operation();
      this.end(label, { ...context, status: 'success' });
      return result;
    } catch (error) {
      this.end(label, { ...context, status: 'error' });
      throw error;
    }
  }
}

/**
 * Singleton logger instance
 */
export const logger = new Logger();

/**
 * Singleton performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Export for convenience
 */
export default logger;
