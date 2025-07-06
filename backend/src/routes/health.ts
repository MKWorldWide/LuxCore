/**
 * 🏥 Health Check Routes
 * 
 * Provides health monitoring endpoints for:
 * - API status
 * - Database connectivity
 * - NovaSanctum security status
 * - System metrics
 * 
 * @author LuxCore Team
 * @version 1.0.0
 * @since 2024-07-05
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { novaSanctumService } from '@/services/novas Sanctum.service';

const router = Router();
const prisma = new PrismaClient();

/**
 * 🏥 Basic health check
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'LuxCore Backend API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      novaSanctum: 'active'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

/**
 * 🔗 Database health check
 */
router.get('/database', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    const duration = Date.now() - startTime;
    
    res.json({
      status: 'healthy',
      database: 'connected',
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 🛡️ NovaSanctum security health check
 */
router.get('/security', async (req: Request, res: Response) => {
  try {
    const stats = await novaSanctumService.getSecurityStats();
    
    res.json({
      status: 'healthy',
      novaSanctum: 'active',
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Security health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      novaSanctum: 'inactive',
      error: 'Security service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 📊 Detailed health check
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Check database
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbDuration = Date.now() - dbStart;
    
    // Check NovaSanctum
    const securityStart = Date.now();
    const securityStats = await novaSanctumService.getSecurityStats();
    const securityDuration = Date.now() - securityStart;
    
    const totalDuration = Date.now() - startTime;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'LuxCore Backend API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: `${totalDuration}ms`,
      checks: {
        database: {
          status: 'healthy',
          responseTime: `${dbDuration}ms`
        },
        novaSanctum: {
          status: 'healthy',
          responseTime: `${securityDuration}ms`,
          stats: securityStats
        }
      }
    });
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 