/**
 * 🛠️ Admin Routes
 * 
 * Provides administrative endpoints with NovaSanctum security:
 * - System management
 * - Security monitoring
 * - User administration
 * 
 * @author LuxCore Team
 * @version 1.0.0
 * @since 2024-07-05
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '@/middleware/security';
import { novaSanctumService } from '@/services/novas Sanctum.service';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * 📊 Get system statistics
 */
router.get('/stats', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const securityStats = await novaSanctumService.getSecurityStats();
    
    res.json({
      message: 'System statistics',
      security: securityStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get system stats failed:', error);
    res.status(500).json({
      error: 'Failed to get system statistics'
    });
  }
});

export default router; 