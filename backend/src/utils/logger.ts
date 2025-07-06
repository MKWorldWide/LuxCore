/**
 * 📝 Logger Utility
 * 
 * Provides comprehensive logging functionality with:
 * - Multiple log levels (error, warn, info, debug)
 * - Structured logging with metadata
 * - File and console output
 * - Request/response logging
 * - Performance monitoring
 * 
 * @author LuxCore Team
 * @version 1.0.0
 * @since 2024-07-05
 */

import winston from 'winston';
import { Request, Response } from 'express';

// 📋 Log levels configuration
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// 🎨 Log colors for console output
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

// 🔧 Winston configuration
winston.addColors(logColors);

/**
 * 📝 Logger Class
 * 
 * Provides structured logging with metadata and performance tracking
 */
export class Logger {
  private logger: winston.Logger;
  private context: string;

  constructor(context: string = 'Application') {
    this.context = context;
    
    // 🔧 Create Winston logger instance
    this.logger = winston.createLogger({
      levels: logLevels,
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { 
        service: 'luxcore-backend',
        context: this.context 
      },
      transports: [
        // 📄 File transport for all logs
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // 🖥️ Console transport for development
        ...(process.env.NODE_ENV !== 'production' ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            )
          })
        ] : [])
      ],
    });

    // 🚀 Log initialization
    this.info('Logger initialized', { context: this.context });
  }

  /**
   * ❌ Log error message
   * 
   * @param message - Error message
   * @param meta - Additional metadata
   */
  error(message: string, meta?: Record<string, any>): void {
    this.logger.error(message, {
      ...meta,
      timestamp: new Date().toISOString(),
      level: 'error'
    });
  }

  /**
   * ⚠️ Log warning message
   * 
   * @param message - Warning message
   * @param meta - Additional metadata
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, {
      ...meta,
      timestamp: new Date().toISOString(),
      level: 'warn'
    });
  }

  /**
   * ℹ️ Log info message
   * 
   * @param message - Info message
   * @param meta - Additional metadata
   */
  info(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, {
      ...meta,
      timestamp: new Date().toISOString(),
      level: 'info'
    });
  }

  /**
   * 🐛 Log debug message
   * 
   * @param message - Debug message
   * @param meta - Additional metadata
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, {
      ...meta,
      timestamp: new Date().toISOString(),
      level: 'debug'
    });
  }

  /**
   * 📊 Log performance metrics
   * 
   * @param operation - Operation name
   * @param duration - Duration in milliseconds
   * @param meta - Additional metadata
   */
  performance(operation: string, duration: number, meta?: Record<string, any>): void {
    this.logger.info(`Performance: ${operation}`, {
      ...meta,
      operation,
      duration,
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'performance'
    });
  }

  /**
   * 🔐 Log security events
   * 
   * @param event - Security event
   * @param meta - Additional metadata
   */
  security(event: string, meta?: Record<string, any>): void {
    this.logger.warn(`Security: ${event}`, {
      ...meta,
      event,
      timestamp: new Date().toISOString(),
      level: 'warn',
      type: 'security'
    });
  }

  /**
   * 🌐 Log HTTP request
   * 
   * @param req - Express request object
   * @param res - Express response object
   * @param duration - Request duration in milliseconds
   */
  httpRequest(req: Request, res: Response, duration: number): void {
    const meta = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'http'
    };

    // 📊 Log based on status code
    if (res.statusCode >= 400) {
      this.logger.error(`HTTP ${req.method} ${req.url}`, meta);
    } else {
      this.logger.info(`HTTP ${req.method} ${req.url}`, meta);
    }
  }

  /**
   * 🔍 Log database operations
   * 
   * @param operation - Database operation
   * @param table - Table name
   * @param duration - Operation duration
   * @param meta - Additional metadata
   */
  database(operation: string, table: string, duration: number, meta?: Record<string, any>): void {
    this.logger.debug(`Database: ${operation} on ${table}`, {
      ...meta,
      operation,
      table,
      duration,
      timestamp: new Date().toISOString(),
      level: 'debug',
      type: 'database'
    });
  }

  /**
   * 📧 Log email operations
   * 
   * @param operation - Email operation
   * @param recipient - Email recipient
   * @param meta - Additional metadata
   */
  email(operation: string, recipient: string, meta?: Record<string, any>): void {
    this.logger.info(`Email: ${operation} to ${recipient}`, {
      ...meta,
      operation,
      recipient,
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'email'
    });
  }

  /**
   * 🔄 Log background job operations
   * 
   * @param job - Job name
   * @param status - Job status
   * @param meta - Additional metadata
   */
  job(job: string, status: string, meta?: Record<string, any>): void {
    this.logger.info(`Job: ${job} - ${status}`, {
      ...meta,
      job,
      status,
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'job'
    });
  }

  /**
   * 🧹 Clean up logger resources
   */
  async close(): Promise<void> {
    await this.logger.end();
  }
}

// 🚀 Export default logger instance
export const logger = new Logger('Application');

// 📋 Export logger types
export interface LogMeta {
  [key: string]: any;
}

export interface PerformanceLog {
  operation: string;
  duration: number;
  meta?: LogMeta;
}

export interface SecurityLog {
  event: string;
  meta?: LogMeta;
}

export interface HttpLog {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  ip: string;
  userAgent?: string;
}

export interface DatabaseLog {
  operation: string;
  table: string;
  duration: number;
  meta?: LogMeta;
} 