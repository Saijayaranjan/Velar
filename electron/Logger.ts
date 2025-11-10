import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { app } from 'electron';
import os from 'os';

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Sensitive data patterns to filter
const SENSITIVE_PATTERNS = [
  /api[_-]?key[s]?[\s:=]+['"]?([a-zA-Z0-9_\-]+)['"]?/gi,
  /token[s]?[\s:=]+['"]?([a-zA-Z0-9_\-\.]+)['"]?/gi,
  /password[s]?[\s:=]+['"]?([^\s'"]+)['"]?/gi,
  /secret[s]?[\s:=]+['"]?([a-zA-Z0-9_\-]+)['"]?/gi,
  /authorization[\s:=]+['"]?bearer\s+([a-zA-Z0-9_\-\.]+)['"]?/gi,
];

class Logger {
  private logger: winston.Logger;
  private logDir: string;
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Set log directory to ~/.velar/logs/
    this.logDir = path.join(os.homedir(), '.velar', 'logs');
    
    // Create winston logger
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const logLevel = this.isProduction ? LogLevel.WARN : LogLevel.DEBUG;

    // Custom format to filter sensitive data
    const sensitiveDataFilter = winston.format((info) => {
      if (typeof info.message === 'string') {
        info.message = this.filterSensitiveData(info.message);
      }
      
      // Filter metadata as well
      if (info.meta && typeof info.meta === 'object') {
        info.meta = JSON.parse(this.filterSensitiveData(JSON.stringify(info.meta)));
      }
      
      return info;
    });

    const transports: winston.transport[] = [];

    // Console transport for development
    if (!this.isProduction) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${level}]: ${message} ${metaStr}`;
            })
          ),
        })
      );
    }

    // File transport for errors (always enabled)
    transports.push(
      new DailyRotateFile({
        filename: path.join(this.logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: LogLevel.ERROR,
        maxFiles: '7d',
        maxSize: '20m',
        format: winston.format.combine(
          sensitiveDataFilter(),
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );

    // File transport for all logs
    transports.push(
      new DailyRotateFile({
        filename: path.join(this.logDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxFiles: '7d',
        maxSize: '20m',
        format: winston.format.combine(
          sensitiveDataFilter(),
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );

    return winston.createLogger({
      level: logLevel,
      transports,
      exitOnError: false,
    });
  }

  private filterSensitiveData(text: string): string {
    let filtered = text;
    
    SENSITIVE_PATTERNS.forEach(pattern => {
      filtered = filtered.replace(pattern, (match) => {
        // Replace the sensitive part with [REDACTED]
        return match.replace(/[a-zA-Z0-9_\-\.]{8,}/g, '[REDACTED]');
      });
    });
    
    return filtered;
  }

  public error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  public logError(error: Error, context?: string): void {
    this.logger.error(error.message, {
      context,
      stack: error.stack,
      name: error.name,
    });
  }

  public setLogLevel(level: LogLevel): void {
    this.logger.level = level;
  }
}

// Export singleton instance
export const logger = new Logger();
