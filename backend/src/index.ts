/**
 * 🚀 LuxCore Backend Server
 * 
 * Main entry point for the LuxCore backend API with:
 * - Express server setup
 * - NovaSanctum security integration
 * - Middleware configuration
 * - Route registration
 * - Error handling
 * - Health monitoring
 * 
 * @author LuxCore Team
 * @version 1.0.0
 * @since 2024-07-05
 */

import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { novaSanctumService } from '@/services/novas Sanctum.service';

// 📋 Import middleware
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { securityMiddleware } from '@/middleware/security';

// 📋 Import routes
import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import adminRoutes from '@/routes/admin';
import healthRoutes from '@/routes/health';

// 🔧 Environment configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3001';

/**
 * 🚀 LuxCore Backend Application Class
 */
class LuxCoreBackend {
  private app: express.Application;
  private prisma: PrismaClient;
  private server: any;

  constructor() {
    this.app = express();
    this.prisma = new PrismaClient();
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSecurity();
  }

  /**
   * 🔧 Initialize Express middleware
   */
  private initializeMiddleware(): void {
    // 🔒 Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // 🌐 CORS configuration
    this.app.use(cors({
      origin: CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // 📦 Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 🗜️ Compression middleware
    this.app.use(compression());

    // 📝 Request logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim())
      }
    }));

    // 📊 Custom request logger
    this.app.use(requestLogger);

    // 🛡️ Security middleware
    this.app.use(securityMiddleware);

    // 🚫 Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // 🔐 Stricter rate limiting for auth endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 requests per windowMs
      message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/auth/', authLimiter);

    logger.info('Middleware initialized successfully');
  }

  /**
   * 🛣️ Initialize API routes
   */
  private initializeRoutes(): void {
    // 🏠 Health check endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: '🚀 LuxCore Backend API',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        novaSanctum: 'integrated'
      });
    });

    // 📋 API routes
    this.app.use('/api/health', healthRoutes);
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/admin', adminRoutes);

    // 🔍 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });

    logger.info('Routes initialized successfully');
  }

  /**
   * ❌ Initialize error handling
   */
  private initializeErrorHandling(): void {
    // 🔧 Global error handler
    this.app.use(errorHandler);

    // 🚨 Unhandled promise rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', { promise, reason });
      this.gracefulShutdown();
    });

    // 🚨 Uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.gracefulShutdown();
    });

    // 🛑 SIGTERM handler
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.gracefulShutdown();
    });

    // 🛑 SIGINT handler
    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.gracefulShutdown();
    });

    logger.info('Error handling initialized successfully');
  }

  /**
   * 🛡️ Initialize security features
   */
  private initializeSecurity(): void {
    // 🔄 Clean up expired sessions every hour
    setInterval(async () => {
      try {
        await novaSanctumService.cleanupExpiredSessions();
      } catch (error) {
        logger.error('Failed to cleanup expired sessions:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    // 📊 Log security statistics every 6 hours
    setInterval(async () => {
      try {
        const stats = await novaSanctumService.getSecurityStats();
        logger.info('Security statistics:', stats);
      } catch (error) {
        logger.error('Failed to get security statistics:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    logger.info('Security features initialized successfully');
  }

  /**
   * 🚀 Start the server
   */
  async start(): Promise<void> {
    try {
      // 🔗 Test database connection
      await this.prisma.$connect();
      logger.info('Database connection established');

      // 🚀 Start HTTP server
      this.server = this.app.listen(PORT, () => {
        logger.info(`🚀 LuxCore Backend server running on port ${PORT}`);
        logger.info(`🌍 Environment: ${NODE_ENV}`);
        logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
        logger.info(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
        logger.info(`🛡️ NovaSanctum Security: Active`);
      });

      // 🔧 Graceful shutdown handling
      this.server.on('close', () => {
        logger.info('HTTP server closed');
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * 🛑 Graceful shutdown
   */
  async gracefulShutdown(): Promise<void> {
    logger.info('Starting graceful shutdown...');

    try {
      // 🛑 Close HTTP server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            logger.info('HTTP server closed');
            resolve();
          });
        });
      }

      // 🔗 Close database connection
      await this.prisma.$disconnect();
      logger.info('Database connection closed');

      // 📝 Close logger
      await logger.close();
      logger.info('Logger closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);

    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * 🔍 Get application instance (for testing)
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * 🔗 Get Prisma client instance
   */
  getPrisma(): PrismaClient {
    return this.prisma;
  }
}

// 🚀 Create and start the application
const app = new LuxCoreBackend();

// 🚀 Start the server if this file is run directly
if (require.main === module) {
  app.start().catch((error) => {
    logger.error('Failed to start application:', error);
    process.exit(1);
  });
}

// 📤 Export for testing
export default app; 