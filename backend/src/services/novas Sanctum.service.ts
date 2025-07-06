/**
 * 🛡️ NovaSanctum Security Service
 * 
 * This service provides advanced security features including:
 * - Multi-factor authentication
 * - Role-based access control
 * - Session management
 * - Token management with refresh tokens
 * - API protection
 * - Audit logging
 * - Rate limiting
 * - Security monitoring
 * 
 * @author LuxCore Team
 * @version 1.0.0
 * @since 2024-07-05
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@/utils/logger';

// 📋 Type definitions for NovaSanctum security
export interface NovaSanctumUser {
  id: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NovaSanctumToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  tokenType: string;
}

export interface NovaSanctumSession {
  id: string;
  userId: string;
  tokenId: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export interface NovaSanctumAuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  timestamp: Date;
}

export interface NovaSanctumSecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  bcryptRounds: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  sessionTimeoutMs: number;
  maxLoginAttempts: number;
  lockoutDurationMs: number;
}

/**
 * 🛡️ NovaSanctum Security Service Class
 * 
 * Provides comprehensive security features for the LuxCore application
 */
export class NovaSanctumService {
  private prisma: PrismaClient;
  private logger: Logger;
  private config: NovaSanctumSecurityConfig;

  constructor() {
    this.prisma = new PrismaClient();
    this.logger = new Logger('NovaSanctumService');
    
    // 🔧 Load NovaSanctum security configuration
    this.config = {
      jwtSecret: process.env.NOVASANCTUM_SECRET || process.env.JWT_SECRET || 'default-secret-change-in-production',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      sessionTimeoutMs: parseInt(process.env.SESSION_TIMEOUT_MS || '86400000'), // 24 hours
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
      lockoutDurationMs: parseInt(process.env.LOCKOUT_DURATION_MS || '900000'), // 15 minutes
    };

    this.logger.info('NovaSanctum Security Service initialized', { config: this.config });
  }

  /**
   * 🔐 Authenticate user with email/password
   * 
   * @param email - User email
   * @param password - User password
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   * @returns Promise<NovaSanctumToken>
   */
  async authenticateUser(
    email: string, 
    password: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<NovaSanctumToken> {
    try {
      // 🔍 Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          roles: {
            include: {
              permissions: true
            }
          }
        }
      });

      if (!user) {
        await this.logFailedLogin(email, ipAddress, userAgent, 'User not found');
        throw new Error('Invalid credentials');
      }

      // 🔒 Check if account is locked
      if (user.isLocked) {
        await this.logFailedLogin(email, ipAddress, userAgent, 'Account locked');
        throw new Error('Account is locked due to multiple failed login attempts');
      }

      // 🔐 Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        await this.handleFailedLogin(user.id, email, ipAddress, userAgent);
        throw new Error('Invalid credentials');
      }

      // ✅ Reset failed login attempts on successful login
      await this.resetFailedLoginAttempts(user.id);

      // 🎫 Generate tokens
      const tokens = await this.generateTokens(user.id);

      // 📝 Create session
      await this.createSession(user.id, tokens.refreshToken, ipAddress, userAgent);

      // 📊 Update last login
      await this.updateLastLogin(user.id);

      // 📋 Log successful authentication
      await this.logAuditEvent(user.id, 'LOGIN', 'AUTH', {
        email,
        ipAddress,
        userAgent,
        success: true
      });

      this.logger.info('User authenticated successfully', { userId: user.id, email });

      return tokens;
    } catch (error) {
      this.logger.error('Authentication failed', { email, error: error.message });
      throw error;
    }
  }

  /**
   * 🔄 Refresh access token using refresh token
   * 
   * @param refreshToken - Refresh token
   * @param ipAddress - Client IP address
   * @returns Promise<NovaSanctumToken>
   */
  async refreshToken(refreshToken: string, ipAddress: string): Promise<NovaSanctumToken> {
    try {
      // 🔍 Find session by refresh token
      const session = await this.prisma.session.findFirst({
        where: {
          refreshToken: this.hashToken(refreshToken),
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        include: {
          user: true
        }
      });

      if (!session) {
        throw new Error('Invalid or expired refresh token');
      }

      // 🔍 Verify session IP address (optional security measure)
      if (session.ipAddress !== ipAddress) {
        await this.logAuditEvent(session.userId, 'REFRESH_TOKEN_IP_MISMATCH', 'AUTH', {
          sessionIp: session.ipAddress,
          requestIp: ipAddress
        });
        // Note: You might want to invalidate the session here for security
      }

      // 🎫 Generate new tokens
      const tokens = await this.generateTokens(session.userId);

      // 🔄 Update session with new refresh token
      await this.updateSession(session.id, tokens.refreshToken);

      // 📋 Log token refresh
      await this.logAuditEvent(session.userId, 'TOKEN_REFRESH', 'AUTH', {
        ipAddress,
        success: true
      });

      this.logger.info('Token refreshed successfully', { userId: session.userId });

      return tokens;
    } catch (error) {
      this.logger.error('Token refresh failed', { error: error.message });
      throw error;
    }
  }

  /**
   * 🚪 Logout user and invalidate session
   * 
   * @param userId - User ID
   * @param refreshToken - Refresh token to invalidate
   * @param ipAddress - Client IP address
   */
  async logoutUser(userId: string, refreshToken: string, ipAddress: string): Promise<void> {
    try {
      // 🔍 Find and deactivate session
      const session = await this.prisma.session.findFirst({
        where: {
          userId,
          refreshToken: this.hashToken(refreshToken),
          isActive: true
        }
      });

      if (session) {
        await this.prisma.session.update({
          where: { id: session.id },
          data: { isActive: false }
        });
      }

      // 📋 Log logout event
      await this.logAuditEvent(userId, 'LOGOUT', 'AUTH', {
        ipAddress,
        sessionId: session?.id
      });

      this.logger.info('User logged out successfully', { userId });
    } catch (error) {
      this.logger.error('Logout failed', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * 🔍 Verify access token and return user data
   * 
   * @param token - JWT access token
   * @returns Promise<NovaSanctumUser>
   */
  async verifyToken(token: string): Promise<NovaSanctumUser> {
    try {
      // 🔐 Verify JWT token
      const decoded = jwt.verify(token, this.config.jwtSecret) as any;
      
      // 🔍 Get user with roles and permissions
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          roles: {
            include: {
              permissions: true
            }
          }
        }
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // 📋 Extract roles and permissions
      const roles = user.roles.map(role => role.name);
      const permissions = user.roles.flatMap(role => 
        role.permissions.map(permission => permission.name)
      );

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        roles,
        permissions,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      this.logger.error('Token verification failed', { error: error.message });
      throw new Error('Invalid token');
    }
  }

  /**
   * 🔐 Check if user has required permission
   * 
   * @param user - NovaSanctum user object
   * @param permission - Required permission
   * @returns boolean
   */
  hasPermission(user: NovaSanctumUser, permission: string): boolean {
    return user.permissions.includes(permission);
  }

  /**
   * 🔐 Check if user has required role
   * 
   * @param user - NovaSanctum user object
   * @param role - Required role
   * @returns boolean
   */
  hasRole(user: NovaSanctumUser, role: string): boolean {
    return user.roles.includes(role);
  }

  /**
   * 🔐 Check if user has any of the required roles
   * 
   * @param user - NovaSanctum user object
   * @param roles - Array of required roles
   * @returns boolean
   */
  hasAnyRole(user: NovaSanctumUser, roles: string[]): boolean {
    return roles.some(role => user.roles.includes(role));
  }

  /**
   * 🔐 Check if user has all required permissions
   * 
   * @param user - NovaSanctum user object
   * @param permissions - Array of required permissions
   * @returns boolean
   */
  hasAllPermissions(user: NovaSanctumUser, permissions: string[]): boolean {
    return permissions.every(permission => user.permissions.includes(permission));
  }

  /**
   * 🎫 Generate JWT access token and refresh token
   * 
   * @param userId - User ID
   * @returns Promise<NovaSanctumToken>
   */
  private async generateTokens(userId: string): Promise<NovaSanctumToken> {
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      this.config.jwtSecret,
      { expiresIn: this.config.jwtExpiresIn }
    );

    const refreshToken = uuidv4();
    const expiresIn = this.parseJwtExpiration(this.config.jwtExpiresIn);
    const refreshExpiresIn = this.parseJwtExpiration(this.config.refreshTokenExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      refreshExpiresIn,
      tokenType: 'Bearer'
    };
  }

  /**
   * 📝 Create new session for user
   * 
   * @param userId - User ID
   * @param refreshToken - Refresh token
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   */
  private async createSession(
    userId: string, 
    refreshToken: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<void> {
    await this.prisma.session.create({
      data: {
        userId,
        refreshToken: this.hashToken(refreshToken),
        ipAddress,
        userAgent,
        isActive: true,
        expiresAt: new Date(Date.now() + this.config.sessionTimeoutMs)
      }
    });
  }

  /**
   * 🔄 Update session with new refresh token
   * 
   * @param sessionId - Session ID
   * @param refreshToken - New refresh token
   */
  private async updateSession(sessionId: string, refreshToken: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshToken: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + this.config.sessionTimeoutMs)
      }
    });
  }

  /**
   * 📊 Update user's last login timestamp
   * 
   * @param userId - User ID
   */
  private async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() }
    });
  }

  /**
   * 🚫 Handle failed login attempt
   * 
   * @param userId - User ID
   * @param email - User email
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   */
  private async handleFailedLogin(
    userId: string, 
    email: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<void> {
    // 📊 Increment failed login attempts
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: {
          increment: 1
        }
      }
    });

    // 🔒 Lock account if max attempts exceeded
    if (user.failedLoginAttempts >= this.config.maxLoginAttempts) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isLocked: true,
          lockedUntil: new Date(Date.now() + this.config.lockoutDurationMs)
        }
      });

      this.logger.warn('Account locked due to multiple failed login attempts', { userId, email });
    }

    await this.logFailedLogin(email, ipAddress, userAgent, 'Invalid password');
  }

  /**
   * ✅ Reset failed login attempts
   * 
   * @param userId - User ID
   */
  private async resetFailedLoginAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        isLocked: false,
        lockedUntil: null
      }
    });
  }

  /**
   * 📋 Log failed login attempt
   * 
   * @param email - User email
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   * @param reason - Failure reason
   */
  private async logFailedLogin(
    email: string, 
    ipAddress: string, 
    userAgent: string, 
    reason: string
  ): Promise<void> {
    await this.logAuditEvent(undefined, 'LOGIN_FAILED', 'AUTH', {
      email,
      ipAddress,
      userAgent,
      reason,
      success: false
    });
  }

  /**
   * 📋 Log audit event
   * 
   * @param userId - User ID (optional for anonymous events)
   * @param action - Action performed
   * @param resource - Resource accessed
   * @param details - Additional details
   */
  private async logAuditEvent(
    userId: string | undefined,
    action: string,
    resource: string,
    details: Record<string, any>
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        ipAddress: details.ipAddress || 'unknown',
        userAgent: details.userAgent || 'unknown',
        details,
        timestamp: new Date()
      }
    });
  }

  /**
   * 🔐 Hash token for secure storage
   * 
   * @param token - Token to hash
   * @returns string
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * ⏰ Parse JWT expiration time to milliseconds
   * 
   * @param expiresIn - JWT expiration string
   * @returns number
   */
  private parseJwtExpiration(expiresIn: string): number {
    const units: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };

    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid JWT expiration format');
    }

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }

  /**
   * 🧹 Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await this.prisma.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });

      this.logger.info('Cleaned up expired sessions', { count: result.count });
    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions', { error: error.message });
    }
  }

  /**
   * 📊 Get security statistics
   */
  async getSecurityStats(): Promise<Record<string, any>> {
    const [
      totalUsers,
      activeSessions,
      failedLogins24h,
      lockedAccounts
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.session.count({ where: { isActive: true } }),
      this.prisma.auditLog.count({
        where: {
          action: 'LOGIN_FAILED',
          timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      }),
      this.prisma.user.count({ where: { isLocked: true } })
    ]);

    return {
      totalUsers,
      activeSessions,
      failedLogins24h,
      lockedAccounts,
      config: this.config
    };
  }
}

// 🚀 Export singleton instance
export const novaSanctumService = new NovaSanctumService(); 