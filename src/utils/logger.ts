/**
 * Singleton Logger System
 *
 * A comprehensive logging system that works well in both development and production environments.
 * Features:
 * - Singleton pattern for consistent logging across the application
 * - Multiple log levels (error, warn, info, debug, verbose)
 * - Environment-specific formatting (colored for dev, JSON for prod)
 * - Structured logging with metadata support
 * - Performance optimized with conditional logging
 * - Type-safe logging methods
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
  service?: string;
  requestId?: string;
  userId?: string;
  duration?: number;
  stack?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  service: string;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
  enableColors: boolean;
  enableTimestamp: boolean;
  enableMetadata: boolean;
}

class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private isProduction: boolean;

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.config = this.getDefaultConfig();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getDefaultConfig(): LoggerConfig {
    const logLevel = this.isProduction ? LogLevel.INFO : LogLevel.DEBUG;

    return {
      level: logLevel,
      service: process.env.SERVICE_NAME || 'identity-service',
      enableConsole: true,
      enableFile: this.isProduction,
      filePath: this.isProduction ? './logs/app.log' : undefined,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      enableColors: !this.isProduction,
      enableTimestamp: true,
      enableMetadata: true,
    };
  }

  public configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private formatMessage(
    level: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): string {
    const timestamp = this.config.enableTimestamp ? new Date().toISOString() : '';

    if (this.isProduction) {
      // JSON format for production
      const logEntry: LogEntry = {
        timestamp,
        level,
        message,
        service: this.config.service,
        ...(metadata && { metadata }),
      };
      return JSON.stringify(logEntry);
    } else {
      // Colored format for development
      const colors = {
        ERROR: '\x1b[31m', // Red
        WARN: '\x1b[33m', // Yellow
        INFO: '\x1b[36m', // Cyan
        DEBUG: '\x1b[35m', // Magenta
        VERBOSE: '\x1b[37m', // White
        RESET: '\x1b[0m', // Reset
        BOLD: '\x1b[1m', // Bold
        DIM: '\x1b[2m', // Dim
      };

      const levelColor = colors[level as keyof typeof colors] || colors.RESET;
      const resetColor = colors.RESET;
      const boldColor = colors.BOLD;
      const dimColor = colors.DIM;

      let formattedMessage = '';

      if (timestamp) {
        formattedMessage += `${dimColor}[${timestamp}]${resetColor} `;
      }

      formattedMessage += `${levelColor}${boldColor}[${level}]${resetColor} `;
      formattedMessage += `${message}`;

      if (metadata && Object.keys(metadata).length > 0) {
        formattedMessage += ` ${dimColor}${JSON.stringify(metadata, null, 2)}${resetColor}`;
      }

      return formattedMessage;
    }
  }

  private log(
    level: LogLevel,
    levelName: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(levelName, message, metadata);

    if (this.config.enableConsole) {
      if (level === LogLevel.ERROR) {
        console.error(formattedMessage);
      } else if (level === LogLevel.WARN) {
        console.warn(formattedMessage);
      } else {
        console.log(formattedMessage);
      }
    }

    // In production, you might want to add file logging or external logging services here
    if (this.config.enableFile && this.config.filePath) {
      // File logging implementation would go here
      // For now, we'll just use console for simplicity
    }
  }

  public error(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, 'ERROR', message, metadata);
  }

  public warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, 'WARN', message, metadata);
  }

  public info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, 'INFO', message, metadata);
  }

  public debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, metadata);
  }

  public verbose(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.VERBOSE, 'VERBOSE', message, metadata);
  }

  // Convenience methods for common logging patterns
  public logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    metadata?: Record<string, unknown>,
  ): void {
    this.info(`${method} ${url}`, {
      ...metadata,
      statusCode,
      duration: `${duration}ms`,
      type: 'request',
    });
  }

  public logError(error: Error, context?: string, metadata?: Record<string, unknown>): void {
    this.error(`Error${context ? ` in ${context}` : ''}: ${error.message}`, {
      ...metadata,
      stack: error.stack,
      name: error.name,
      type: 'error',
    });
  }

  public logDatabase(query: string, duration: number, metadata?: Record<string, unknown>): void {
    this.debug(`Database query executed`, {
      ...metadata,
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      type: 'database',
    });
  }

  public logAuth(action: string, userId?: string, metadata?: Record<string, unknown>): void {
    this.info(`Authentication: ${action}`, {
      ...metadata,
      userId,
      type: 'auth',
    });
  }

  public logBusiness(operation: string, metadata?: Record<string, unknown>): void {
    this.info(`Business operation: ${operation}`, {
      ...metadata,
      type: 'business',
    });
  }

  // Performance logging
  public time(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(label);
    }
  }

  public timeEnd(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(label);
    }
  }

  // Get current configuration
  public getConfig(): LoggerConfig {
    return { ...this.config };
  }

  // Set log level at runtime
  public setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  // Enable/disable specific log levels
  public enableLevel(level: LogLevel): void {
    if (this.config.level < level) {
      this.config.level = level;
    }
  }

  public disableLevel(level: LogLevel): void {
    if (this.config.level >= level) {
      this.config.level = level - 1;
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export the Logger class for advanced usage
export { Logger };

// Export convenience functions for quick access
export const log = {
  error: (message: string, metadata?: Record<string, unknown>) => logger.error(message, metadata),
  warn: (message: string, metadata?: Record<string, unknown>) => logger.warn(message, metadata),
  info: (message: string, metadata?: Record<string, unknown>) => logger.info(message, metadata),
  debug: (message: string, metadata?: Record<string, unknown>) => logger.debug(message, metadata),
  verbose: (message: string, metadata?: Record<string, unknown>) =>
    logger.verbose(message, metadata),
  request: (
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    metadata?: Record<string, unknown>,
  ) => logger.logRequest(method, url, statusCode, duration, metadata),
  logError: (error: Error, context?: string, metadata?: Record<string, unknown>) =>
    logger.logError(error, context, metadata),
  database: (query: string, duration: number, metadata?: Record<string, unknown>) =>
    logger.logDatabase(query, duration, metadata),
  auth: (action: string, userId?: string, metadata?: Record<string, unknown>) =>
    logger.logAuth(action, userId, metadata),
  business: (operation: string, metadata?: Record<string, unknown>) =>
    logger.logBusiness(operation, metadata),
  time: (label: string) => logger.time(label),
  timeEnd: (label: string) => logger.timeEnd(label),
};

// Default export
export default logger;
