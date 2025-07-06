/**
 * Database Configuration
 * 
 * This module handles database configuration and connection management
 * with NovaSanctum security integration for secure database operations.
 * 
 * Features:
 * - Prisma client configuration with connection pooling
 * - NovaSanctum security layer for database access
 * - Environment-based configuration
 * - Connection health monitoring
 * - Secure credential management
 */

import { PrismaClient } from '@prisma/client';
import { NovaSanctumService } from '../services/novas Sanctum.service';

// Initialize NovaSanctum service for database security
const novaSanctum = new NovaSanctumService();

/**
 * Database configuration interface
 */
interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  acquireTimeout: number;
  ssl: boolean;
  logging: boolean;
}

/**
 * Get database configuration from environment variables
 */
const getDatabaseConfig = (): DatabaseConfig => {
  return {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/luxcore',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
    ssl: process.env.NODE_ENV === 'production',
    logging: process.env.NODE_ENV === 'development'
  };
};

/**
 * Create Prisma client with NovaSanctum security integration
 */
const createPrismaClient = () => {
  const config = getDatabaseConfig();
  
  return new PrismaClient({
    datasources: {
      db: {
        url: config.url
      }
    },
    log: config.logging ? ['query', 'info', 'warn', 'error'] : ['error'],
    errorFormat: 'pretty'
  });
};

/**
 * Database connection manager with NovaSanctum security
 */
class DatabaseManager {
  private prisma: PrismaClient;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private readonly maxRetries: number = 5;

  constructor() {
    this.prisma = createPrismaClient();
  }

  /**
   * Initialize database connection with security validation
   */
  async connect(): Promise<void> {
    try {
      // Validate database connection with NovaSanctum security
      await novaSanctum.validateDatabaseConnection();
      
      await this.prisma.$connect();
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      console.log('✅ Database connected successfully with NovaSanctum security');
    } catch (error) {
      this.connectionAttempts++;
      console.error(`❌ Database connection failed (attempt ${this.connectionAttempts}):`, error);
      
      if (this.connectionAttempts < this.maxRetries) {
        console.log(`🔄 Retrying database connection in 5 seconds...`);
        setTimeout(() => this.connect(), 5000);
      } else {
        throw new Error('Failed to connect to database after maximum retries');
      }
    }
  }

  /**
   * Get Prisma client instance
   */
  getClient(): PrismaClient {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.prisma;
  }

  /**
   * Check database connection health
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Gracefully disconnect from database
   */
  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      console.log('✅ Database disconnected gracefully');
    } catch (error) {
      console.error('❌ Error disconnecting from database:', error);
    }
  }

  /**
   * Get connection status
   */
  isConnectedStatus(): boolean {
    return this.isConnected;
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

export { databaseManager, DatabaseManager, getDatabaseConfig };
export default databaseManager; 