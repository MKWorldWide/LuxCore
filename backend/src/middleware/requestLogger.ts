/**
 * 📝 Request Logger Middleware
 * 
 * Provides comprehensive request logging with:
 * - Request/response tracking
 * - Performance metrics
 * - User context
 * - Security monitoring
 * - NovaSanctum integration
 * 
 * @author LuxCore Team
 * @version 1.0.0
 * @since 2024-07-05
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

// 📋 Request context interface
interface RequestContext {
  requestId: string;
  startTime: number;
  method: string;
  url: string;
  ip: string;
  userAgent?: string;
  userId?: string;
}

/**
 * 📝 Request logger middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // 🆔 Generate unique request ID
  const requestId = uuidv4();
  const startTime = Date.now();

  // 📋 Create request context
  const context: RequestContext = {
    requestId,
    startTime,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id
  };

  // 🔧 Attach context to request
  (req as any).requestId = requestId;
  (req as any).context = context;

  // 📊 Log request start
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id
  });

  // 📝 Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // 📊 Log request completion
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
      contentLength: res.get('Content-Length')
    });

    // 📈 Log performance metrics
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.url,
        duration,
        threshold: 1000
      });
    }

    // 🔐 Log security events
    if (res.statusCode === 401 || res.statusCode === 403) {
      logger.security('Security event', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id
      });
    }

    // 📤 Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
} 