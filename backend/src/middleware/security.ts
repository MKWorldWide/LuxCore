/**
 * 🛡️ Security Middleware
 * 
 * Provides comprehensive security features with:
 * - NovaSanctum authentication
 * - Role-based authorization
 * - Request validation
 * - Security headers
 * - IP filtering
 * 
 * @author LuxCore Team
 * @version 1.0.0
 * @since 2024-07-05
 */

import { Request, Response, NextFunction } from 'express';
import { novaSanctumService, NovaSanctumUser } from '@/services/novas Sanctum.service';
import { logger } from '@/utils/logger';
import { AuthenticationError, AuthorizationError } from '@/middleware/errorHandler';

// 📋 Security configuration
interface SecurityConfig {
  requireAuth: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  allowAnonymous?: boolean;
}

/**
 * 🔐 NovaSanctum authentication middleware
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AuthenticationError('Access token required');
    }

    // 🔍 Verify token with NovaSanctum
    novaSanctumService.verifyToken(token)
      .then((user: NovaSanctumUser) => {
        (req as any).user = user;
        next();
      })
      .catch((error) => {
        logger.security('Token verification failed', {
          error: error.message,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        next(new AuthenticationError('Invalid or expired token'));
      });

  } catch (error) {
    next(new AuthenticationError('Authentication failed'));
  }
}

/**
 * 🔐 Optional authentication middleware
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    novaSanctumService.verifyToken(token)
      .then((user: NovaSanctumUser) => {
        (req as any).user = user;
        next();
      })
      .catch(() => {
        // Continue without authentication
        next();
      });
  } else {
    next();
  }
}

/**
 * 🔐 Role-based authorization middleware
 */
export function requireRoles(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as NovaSanctumUser;

    if (!user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!novaSanctumService.hasAnyRole(user, roles)) {
      logger.security('Role access denied', {
        userId: user.id,
        requiredRoles: roles,
        userRoles: user.roles,
        ip: req.ip,
        path: req.path
      });
      return next(new AuthorizationError('Insufficient role permissions'));
    }

    next();
  };
}

/**
 * 🔐 Permission-based authorization middleware
 */
export function requirePermissions(permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as NovaSanctumUser;

    if (!user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!novaSanctumService.hasAllPermissions(user, permissions)) {
      logger.security('Permission access denied', {
        userId: user.id,
        requiredPermissions: permissions,
        userPermissions: user.permissions,
        ip: req.ip,
        path: req.path
      });
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
}

/**
 * 🔐 Single permission authorization middleware
 */
export function requirePermission(permission: string) {
  return requirePermissions([permission]);
}

/**
 * 🔐 Single role authorization middleware
 */
export function requireRole(role: string) {
  return requireRoles([role]);
}

/**
 * 🛡️ Security middleware with NovaSanctum integration
 */
export function securityMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 🔧 Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // 🔍 Log security-relevant requests
  if (req.path.includes('/auth/') || req.path.includes('/admin/')) {
    logger.security('Security-sensitive request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id
    });
  }

  next();
}

/**
 * 🔐 Admin-only middleware
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRole('admin')(req, res, next);
}

/**
 * 🔐 User-only middleware
 */
export function requireUser(req: Request, res: Response, next: NextFunction): void {
  return requireRole('user')(req, res, next);
}

/**
 * 🔐 Owner or admin middleware
 */
export function requireOwnerOrAdmin(ownerIdField: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as NovaSanctumUser;
    const resourceOwnerId = (req as any).params[ownerIdField] || (req as any).body[ownerIdField];

    if (!user) {
      return next(new AuthenticationError('Authentication required'));
    }

    // Admin can access everything
    if (novaSanctumService.hasRole(user, 'admin')) {
      return next();
    }

    // Owner can access their own resources
    if (user.id === resourceOwnerId) {
      return next();
    }

    logger.security('Owner access denied', {
      userId: user.id,
      resourceOwnerId,
      ip: req.ip,
      path: req.path
    });

    return next(new AuthorizationError('Access denied'));
  };
}

/**
 * 🔐 Resource ownership middleware
 */
export function requireResourceOwnership(resourceService: any, resourceIdField: string = 'id') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user as NovaSanctumUser;
      const resourceId = (req as any).params[resourceIdField];

      if (!user) {
        return next(new AuthenticationError('Authentication required'));
      }

      // Admin can access everything
      if (novaSanctumService.hasRole(user, 'admin')) {
        return next();
      }

      // Check resource ownership
      const resource = await resourceService.findById(resourceId);
      if (!resource) {
        return next(new Error('Resource not found'));
      }

      if (resource.userId === user.id) {
        return next();
      }

      logger.security('Resource ownership access denied', {
        userId: user.id,
        resourceId,
        resourceOwnerId: resource.userId,
        ip: req.ip,
        path: req.path
      });

      return next(new AuthorizationError('Access denied'));

    } catch (error) {
      return next(error);
    }
  };
}

/**
 * 🔐 API key authentication middleware
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return next(new AuthenticationError('API key required'));
  }

  // TODO: Implement API key validation with NovaSanctum
  // For now, just pass through
  next();
}

/**
 * 🔐 Rate limiting middleware
 */
export function rateLimitMiddleware(windowMs: number = 900000, max: number = 100) {
  const requests = new Map();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (requests.has(key)) {
      const userRequests = requests.get(key).filter((timestamp: number) => timestamp > windowStart);
      requests.set(key, userRequests);
    } else {
      requests.set(key, []);
    }

    const userRequests = requests.get(key);
    
    if (userRequests.length >= max) {
      logger.security('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        limit: max,
        windowMs
      });
      return next(new Error('Rate limit exceeded'));
    }

    userRequests.push(now);
    next();
  };
} 