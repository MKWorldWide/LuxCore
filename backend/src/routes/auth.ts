/**
 * 🔐 Authentication Routes
 * 
 * Provides authentication endpoints with NovaSanctum integration:
 * - User login/logout
 * - Token refresh
 * - Password reset
 * - Email verification
 * 
 * @author LuxCore Team
 * @version 1.0.0
 * @since 2024-07-05
 */

import { Router, Request, Response } from 'express';
import { novaSanctumService } from '@/services/novas Sanctum.service';
import { authenticateToken } from '@/middleware/security';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * 🔐 User login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent') || 'unknown';

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    const tokens = await novaSanctumService.authenticateUser(email, password, ipAddress, userAgent);

    res.json({
      message: 'Login successful',
      tokens,
      user: {
        email,
        // Don't include sensitive user data here
      }
    });

  } catch (error) {
    logger.error('Login failed:', error);
    res.status(401).json({
      error: 'Invalid credentials'
    });
  }
});

/**
 * 🔄 Refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const ipAddress = req.ip;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required'
      });
    }

    const tokens = await novaSanctumService.refreshToken(refreshToken, ipAddress);

    res.json({
      message: 'Token refreshed successfully',
      tokens
    });

  } catch (error) {
    logger.error('Token refresh failed:', error);
    res.status(401).json({
      error: 'Invalid refresh token'
    });
  }
});

/**
 * 🚪 User logout
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const user = (req as any).user;
    const ipAddress = req.ip;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required'
      });
    }

    await novaSanctumService.logoutUser(user.id, refreshToken, ipAddress);

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout failed:', error);
    res.status(500).json({
      error: 'Logout failed'
    });
  }
});

/**
 * 🔍 Get current user
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        roles: user.roles,
        permissions: user.permissions,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    logger.error('Get current user failed:', error);
    res.status(500).json({
      error: 'Failed to get user information'
    });
  }
});

export default router; 