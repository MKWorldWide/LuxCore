/**
 * Authentication Controller
 * 
 * This module handles authentication operations with NovaSanctum security integration.
 * Provides secure login, logout, token refresh, and user authentication functionality.
 * 
 * Features:
 * - NovaSanctum-powered authentication
 * - Secure token management
 * - Session handling
 * - Audit logging
 * - Rate limiting protection
 * - Multi-factor authentication support
 */

import { Request, Response } from 'express';
import { NovaSanctumService } from '../services/novas Sanctum.service';
import { logger } from '../utils/logger';
import { databaseManager } from '../config/database';

// Initialize NovaSanctum service
const novaSanctum = new NovaSanctumService();

/**
 * Authentication request interface
 */
interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaToken?: string;
}

/**
 * Authentication response interface
 */
interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: any;
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
  error?: string;
}

/**
 * Login user with NovaSanctum security
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, rememberMe, mfaToken }: LoginRequest = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required',
        error: 'VALIDATION_ERROR'
      });
      return;
    }

    // Log authentication attempt
    logger.info('Authentication attempt', {
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Authenticate with NovaSanctum
    const authResult = await novaSanctum.authenticateUser(email, password, {
      rememberMe,
      mfaToken,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (!authResult.success) {
      logger.warn('Authentication failed', {
        email,
        reason: authResult.error,
        ip: req.ip
      });

      res.status(401).json({
        success: false,
        message: authResult.error || 'Authentication failed',
        error: 'AUTHENTICATION_ERROR'
      });
      return;
    }

    // Set secure cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 30 days or 1 day
    };

    res.cookie('refreshToken', authResult.tokens.refreshToken, cookieOptions);
    res.cookie('accessToken', authResult.tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    // Log successful authentication
    logger.info('Authentication successful', {
      userId: authResult.user.id,
      email: authResult.user.email,
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        user: authResult.user,
        tokens: {
          accessToken: authResult.tokens.accessToken,
          refreshToken: authResult.tokens.refreshToken,
          expiresIn: 15 * 60 // 15 minutes in seconds
        }
      }
    });

  } catch (error) {
    logger.error('Login error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Logout user with NovaSanctum security
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const accessToken = req.cookies.accessToken || req.headers.authorization?.replace('Bearer ', '');
    const refreshToken = req.cookies.refreshToken;

    if (accessToken) {
      // Invalidate tokens with NovaSanctum
      await novaSanctum.invalidateTokens(accessToken, refreshToken);
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    // Log logout
    logger.info('User logged out', {
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Refresh access token with NovaSanctum security
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required',
        error: 'VALIDATION_ERROR'
      });
      return;
    }

    // Refresh token with NovaSanctum
    const refreshResult = await novaSanctum.refreshAccessToken(refreshToken, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (!refreshResult.success) {
      logger.warn('Token refresh failed', {
        reason: refreshResult.error,
        ip: req.ip
      });

      res.status(401).json({
        success: false,
        message: refreshResult.error || 'Token refresh failed',
        error: 'TOKEN_REFRESH_ERROR'
      });
      return;
    }

    // Set new secure cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const
    };

    res.cookie('accessToken', refreshResult.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    // Log successful token refresh
    logger.info('Token refreshed successfully', {
      userId: refreshResult.userId,
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: refreshResult.accessToken,
        expiresIn: 15 * 60 // 15 minutes in seconds
      }
    });

  } catch (error) {
    logger.error('Token refresh error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
        error: 'UNAUTHORIZED'
      });
      return;
    }

    // Get fresh user data from database
    const prisma = databaseManager.getClient();
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: { user }
    });

  } catch (error) {
    logger.error('Get current user error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Change user password with NovaSanctum security
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
        error: 'VALIDATION_ERROR'
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
        error: 'UNAUTHORIZED'
      });
      return;
    }

    // Change password with NovaSanctum
    const result = await novaSanctum.changePassword(req.user.id, currentPassword, newPassword, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.error || 'Password change failed',
        error: 'PASSWORD_CHANGE_ERROR'
      });
      return;
    }

    // Log password change
    logger.info('Password changed successfully', {
      userId: req.user.id,
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Change password error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
}; 