/**
 * User Controller
 * 
 * This module handles user management operations with NovaSanctum security integration.
 * Provides secure user CRUD operations, profile management, and administrative functions.
 * 
 * Features:
 * - NovaSanctum-powered user management
 * - Secure profile operations
 * - Admin user management
 * - Role-based access control
 * - Audit logging
 * - Data validation
 */

import { Request, Response } from 'express';
import { NovaSanctumService } from '../services/novas Sanctum.service';
import { logger } from '../utils/logger';
import { databaseManager } from '../config/database';

// Initialize NovaSanctum service
const novaSanctum = new NovaSanctumService();

/**
 * User creation request interface
 */
interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

/**
 * User update request interface
 */
interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check admin permissions
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required',
        error: 'FORBIDDEN'
      });
      return;
    }

    const prisma = databaseManager.getClient();
    const { page = 1, limit = 10, search, role, isActive } = req.query;

    // Build query filters
    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Calculate pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    // Log admin action
    logger.info('Admin retrieved users', {
      adminId: req.user.id,
      totalUsers: total,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    logger.error('Get all users error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check permissions (users can only view their own profile, admins can view any)
    if (!req.user || (req.user.role !== 'admin' && req.user.id !== id)) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
        error: 'FORBIDDEN'
      });
      return;
    }

    const prisma = databaseManager.getClient();
    const user = await prisma.user.findUnique({
      where: { id },
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
    logger.error('Get user by ID error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      targetUserId: req.params.id
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Create new user (admin only)
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check admin permissions
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required',
        error: 'FORBIDDEN'
      });
      return;
    }

    const { email, password, firstName, lastName, role = 'user' }: CreateUserRequest = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        message: 'Email, password, firstName, and lastName are required',
        error: 'VALIDATION_ERROR'
      });
      return;
    }

    const prisma = databaseManager.getClient();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'User with this email already exists',
        error: 'USER_EXISTS'
      });
      return;
    }

    // Create user with NovaSanctum
    const createResult = await novaSanctum.createUser({
      email,
      password,
      firstName,
      lastName,
      role
    });

    if (!createResult.success) {
      res.status(400).json({
        success: false,
        message: createResult.error || 'Failed to create user',
        error: 'USER_CREATION_ERROR'
      });
      return;
    }

    // Log admin action
    logger.info('Admin created user', {
      adminId: req.user.id,
      newUserId: createResult.user.id,
      newUserEmail: email
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: createResult.user }
    });

  } catch (error) {
    logger.error('Create user error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Update user
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateUserRequest = req.body;

    // Check permissions (users can only update their own profile, admins can update any)
    if (!req.user || (req.user.role !== 'admin' && req.user.id !== id)) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
        error: 'FORBIDDEN'
      });
      return;
    }

    // Non-admins cannot change role or isActive
    if (req.user.role !== 'admin') {
      delete updateData.role;
      delete updateData.isActive;
    }

    const prisma = databaseManager.getClient();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
      return;
    }

    // Update user with NovaSanctum
    const updateResult = await novaSanctum.updateUser(id, updateData);

    if (!updateResult.success) {
      res.status(400).json({
        success: false,
        message: updateResult.error || 'Failed to update user',
        error: 'USER_UPDATE_ERROR'
      });
      return;
    }

    // Log action
    logger.info('User updated', {
      updatedBy: req.user.id,
      targetUserId: id,
      changes: Object.keys(updateData)
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user: updateResult.user }
    });

  } catch (error) {
    logger.error('Update user error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      updatedBy: req.user?.id,
      targetUserId: req.params.id
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Delete user (admin only)
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check admin permissions
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required',
        error: 'FORBIDDEN'
      });
      return;
    }

    // Prevent admin from deleting themselves
    if (req.user.id === id) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete your own account',
        error: 'SELF_DELETE_ERROR'
      });
      return;
    }

    const prisma = databaseManager.getClient();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
      return;
    }

    // Delete user with NovaSanctum
    const deleteResult = await novaSanctum.deleteUser(id);

    if (!deleteResult.success) {
      res.status(400).json({
        success: false,
        message: deleteResult.error || 'Failed to delete user',
        error: 'USER_DELETE_ERROR'
      });
      return;
    }

    // Log admin action
    logger.info('Admin deleted user', {
      adminId: req.user.id,
      deletedUserId: id,
      deletedUserEmail: existingUser.email
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    logger.error('Delete user error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      adminId: req.user?.id,
      targetUserId: req.params.id
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
        error: 'UNAUTHORIZED'
      });
      return;
    }

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
      message: 'Profile retrieved successfully',
      data: { user }
    });

  } catch (error) {
    logger.error('Get user profile error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
        error: 'UNAUTHORIZED'
      });
      return;
    }

    const { firstName, lastName, email } = req.body;

    // Validate input
    if (!firstName || !lastName || !email) {
      res.status(400).json({
        success: false,
        message: 'firstName, lastName, and email are required',
        error: 'VALIDATION_ERROR'
      });
      return;
    }

    const prisma = databaseManager.getClient();

    // Check if email is already taken by another user
    if (email !== req.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'Email already in use',
          error: 'EMAIL_EXISTS'
        });
        return;
      }
    }

    // Update profile with NovaSanctum
    const updateResult = await novaSanctum.updateUser(req.user.id, {
      firstName,
      lastName,
      email
    });

    if (!updateResult.success) {
      res.status(400).json({
        success: false,
        message: updateResult.error || 'Failed to update profile',
        error: 'PROFILE_UPDATE_ERROR'
      });
      return;
    }

    // Log profile update
    logger.info('User updated profile', {
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updateResult.user }
    });

  } catch (error) {
    logger.error('Update user profile error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
}; 