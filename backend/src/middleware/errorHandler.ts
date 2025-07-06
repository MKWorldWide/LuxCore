/**
 * ❌ Error Handler Middleware
 * 
 * Provides comprehensive error handling with:
 * - Error logging and monitoring
 * - Structured error responses
 * - Security error handling
 * - Performance tracking
 * - NovaSanctum integration
 * 
 * @author LuxCore Team
 * @version 1.0.0
 * @since 2024-07-05
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { novaSanctumService } from '@/services/novas Sanctum.service';

// 📋 Error types and interfaces
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  details?: any;
}

export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
    requestId?: string;
    details?: any;
  };
}

/**
 * 🔧 Create custom application error
 */
export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 🔧 Create specific error types
 */
export class ValidationError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

export class DatabaseError extends CustomError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export class ExternalServiceError extends CustomError {
  constructor(message: string = 'External service error') {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
  }
}

/**
 * 🔍 Determine if error is operational
 */
function isOperationalError(error: AppError): boolean {
  if (error instanceof CustomError) {
    return error.isOperational;
  }
  return false;
}

/**
 * 📊 Log error with context
 */
function logError(error: AppError, req: Request): void {
  const errorContext = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
      requestId: (req as any).requestId
    },
    timestamp: new Date().toISOString()
  };

  // 📝 Log based on error severity
  if (error.statusCode && error.statusCode >= 500) {
    logger.error('Server Error:', errorContext);
  } else if (error.statusCode && error.statusCode >= 400) {
    logger.warn('Client Error:', errorContext);
  } else {
    logger.info('Application Error:', errorContext);
  }

  // 🔐 Log security-related errors
  if (error.code === 'AUTHENTICATION_ERROR' || error.code === 'AUTHORIZATION_ERROR') {
    logger.security('Security Error:', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id
    });
  }
}

/**
 * 🛡️ Handle NovaSanctum security errors
 */
async function handleSecurityError(error: AppError, req: Request): Promise<void> {
  try {
    if (error.code === 'AUTHENTICATION_ERROR' || error.code === 'AUTHORIZATION_ERROR') {
      // 📋 Log security event
      await novaSanctumService.logAuditEvent(
        (req as any).user?.id,
        'SECURITY_ERROR',
        'AUTH',
        {
          error: error.message,
          code: error.code,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method
        }
      );
    }
  } catch (securityError) {
    logger.error('Failed to handle security error:', securityError);
  }
}

/**
 * 📋 Format error response
 */
function formatErrorResponse(error: AppError, req: Request): ErrorResponse {
  const response: ErrorResponse = {
    error: {
      message: error.message,
      statusCode: error.statusCode || 500,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId: (req as any).requestId
    }
  };

  // 🔧 Add error code if available
  if (error.code) {
    response.error.code = error.code;
  }

  // 📋 Add details if available and in development
  if (error.details && process.env.NODE_ENV === 'development') {
    response.error.details = error.details;
  }

  // 🔒 Sanitize sensitive information in production
  if (process.env.NODE_ENV === 'production') {
    if (error.statusCode === 500) {
      response.error.message = 'Internal server error';
    }
  }

  return response;
}

/**
 * 🚫 Handle specific error types
 */
function handleSpecificErrors(error: AppError): AppError {
  // 🔍 Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    return new DatabaseError('Database operation failed');
  }

  if (error.name === 'PrismaClientValidationError') {
    return new ValidationError('Invalid data provided');
  }

  if (error.name === 'PrismaClientInitializationError') {
    return new DatabaseError('Database connection failed');
  }

  // 🔐 JWT errors
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }

  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }

  if (error.name === 'NotBeforeError') {
    return new AuthenticationError('Token not active');
  }

  // 🔍 Validation errors
  if (error.name === 'ValidationError') {
    return new ValidationError(error.message);
  }

  // 🔐 Cast errors (MongoDB)
  if (error.name === 'CastError') {
    return new ValidationError('Invalid ID format');
  }

  // 🔍 Duplicate key errors
  if (error.code === 'P2002') {
    return new ConflictError('Resource already exists');
  }

  if (error.code === 'P2025') {
    return new NotFoundError('Resource not found');
  }

  return error;
}

/**
 * ❌ Global error handler middleware
 */
export function errorHandler(
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 🔧 Handle specific error types
  const handledError = handleSpecificErrors(error);

  // 📊 Log error
  logError(handledError, req);

  // 🛡️ Handle security errors
  handleSecurityError(handledError, req).catch((securityError) => {
    logger.error('Failed to handle security error:', securityError);
  });

  // 📋 Format error response
  const errorResponse = formatErrorResponse(handledError, req);

  // 📤 Send error response
  res.status(handledError.statusCode || 500).json(errorResponse);

  // 🚨 Handle unhandled errors
  if (!isOperationalError(handledError)) {
    logger.error('Unhandled error detected:', {
      error: handledError.message,
      stack: handledError.stack
    });

    // 🔄 Gracefully shutdown in production
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

/**
 * 🔧 Async error wrapper
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 🔍 404 handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  
  logError(error, req);
  
  const errorResponse = formatErrorResponse(error, req);
  res.status(404).json(errorResponse);
}

/**
 * 🚫 Method not allowed handler
 */
export function methodNotAllowedHandler(req: Request, res: Response): void {
  const error = new CustomError(
    `Method ${req.method} not allowed`,
    405,
    'METHOD_NOT_ALLOWED'
  );
  
  logError(error, req);
  
  const errorResponse = formatErrorResponse(error, req);
  res.status(405).json(errorResponse);
} 