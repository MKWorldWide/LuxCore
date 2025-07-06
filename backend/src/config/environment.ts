/**
 * Environment Configuration
 * 
 * This module handles environment variable configuration and validation
 * with NovaSanctum security integration for secure environment management.
 * 
 * Features:
 * - Environment variable validation and type safety
 * - NovaSanctum security for sensitive configuration
 * - Development/production environment detection
 * - Configuration validation on startup
 * - Secure credential management
 */

import { NovaSanctumService } from '../services/novas Sanctum.service';

// Initialize NovaSanctum service for environment security
const novaSanctum = new NovaSanctumService();

/**
 * Environment configuration interface
 */
interface EnvironmentConfig {
  // Server Configuration
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  HOST: string;
  
  // Database Configuration
  DATABASE_URL: string;
  DB_MAX_CONNECTIONS: number;
  DB_CONNECTION_TIMEOUT: number;
  DB_IDLE_TIMEOUT: number;
  DB_ACQUIRE_TIMEOUT: number;
  
  // NovaSanctum Security Configuration
  NOVASANCTUM_SECRET_KEY: string;
  NOVASANCTUM_ALGORITHM: string;
  NOVASANCTUM_EXPIRES_IN: string;
  NOVASANCTUM_REFRESH_EXPIRES_IN: string;
  
  // JWT Configuration
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  
  // Redis Configuration
  REDIS_URL: string;
  REDIS_PASSWORD: string;
  REDIS_DB: number;
  
  // Email Configuration
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_SECURE: boolean;
  
  // Logging Configuration
  LOG_LEVEL: string;
  LOG_FILE: string;
  
  // Security Configuration
  CORS_ORIGIN: string;
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX: number;
  
  // External Services
  SENTRY_DSN: string;
  STRIPE_SECRET_KEY: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  AWS_S3_BUCKET: string;
}

/**
 * Default configuration values
 */
const defaultConfig: Partial<EnvironmentConfig> = {
  NODE_ENV: 'development',
  PORT: 3000,
  HOST: 'localhost',
  DB_MAX_CONNECTIONS: 10,
  DB_CONNECTION_TIMEOUT: 30000,
  DB_IDLE_TIMEOUT: 30000,
  DB_ACQUIRE_TIMEOUT: 60000,
  NOVASANCTUM_ALGORITHM: 'HS256',
  NOVASANCTUM_EXPIRES_IN: '15m',
  NOVASANCTUM_REFRESH_EXPIRES_IN: '7d',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  REDIS_DB: 0,
  SMTP_PORT: 587,
  SMTP_SECURE: false,
  LOG_LEVEL: 'info',
  CORS_ORIGIN: 'http://localhost:3000',
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100,
  AWS_REGION: 'us-east-1'
};

/**
 * Required environment variables
 */
const requiredEnvVars = [
  'DATABASE_URL',
  'NOVASANCTUM_SECRET_KEY',
  'JWT_SECRET',
  'REDIS_URL'
];

/**
 * Validate environment configuration
 */
const validateEnvironment = (config: Partial<EnvironmentConfig>): void => {
  const missingVars = requiredEnvVars.filter(varName => !config[varName as keyof EnvironmentConfig]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Validate NovaSanctum configuration
  if (!novaSanctum.validateConfiguration(config)) {
    throw new Error('Invalid NovaSanctum configuration');
  }
};

/**
 * Load and validate environment configuration
 */
const loadEnvironmentConfig = (): EnvironmentConfig => {
  const config: Partial<EnvironmentConfig> = {
    // Server Configuration
    NODE_ENV: (process.env.NODE_ENV as EnvironmentConfig['NODE_ENV']) || defaultConfig.NODE_ENV,
    PORT: parseInt(process.env.PORT || defaultConfig.PORT?.toString() || '3000'),
    HOST: process.env.HOST || defaultConfig.HOST || 'localhost',
    
    // Database Configuration
    DATABASE_URL: process.env.DATABASE_URL || '',
    DB_MAX_CONNECTIONS: parseInt(process.env.DB_MAX_CONNECTIONS || defaultConfig.DB_MAX_CONNECTIONS?.toString() || '10'),
    DB_CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT || defaultConfig.DB_CONNECTION_TIMEOUT?.toString() || '30000'),
    DB_IDLE_TIMEOUT: parseInt(process.env.DB_IDLE_TIMEOUT || defaultConfig.DB_IDLE_TIMEOUT?.toString() || '30000'),
    DB_ACQUIRE_TIMEOUT: parseInt(process.env.DB_ACQUIRE_TIMEOUT || defaultConfig.DB_ACQUIRE_TIMEOUT?.toString() || '60000'),
    
    // NovaSanctum Security Configuration
    NOVASANCTUM_SECRET_KEY: process.env.NOVASANCTUM_SECRET_KEY || '',
    NOVASANCTUM_ALGORITHM: process.env.NOVASANCTUM_ALGORITHM || defaultConfig.NOVASANCTUM_ALGORITHM || 'HS256',
    NOVASANCTUM_EXPIRES_IN: process.env.NOVASANCTUM_EXPIRES_IN || defaultConfig.NOVASANCTUM_EXPIRES_IN || '15m',
    NOVASANCTUM_REFRESH_EXPIRES_IN: process.env.NOVASANCTUM_REFRESH_EXPIRES_IN || defaultConfig.NOVASANCTUM_REFRESH_EXPIRES_IN || '7d',
    
    // JWT Configuration
    JWT_SECRET: process.env.JWT_SECRET || '',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || defaultConfig.JWT_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || defaultConfig.JWT_REFRESH_EXPIRES_IN || '7d',
    
    // Redis Configuration
    REDIS_URL: process.env.REDIS_URL || '',
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
    REDIS_DB: parseInt(process.env.REDIS_DB || defaultConfig.REDIS_DB?.toString() || '0'),
    
    // Email Configuration
    SMTP_HOST: process.env.SMTP_HOST || '',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || defaultConfig.SMTP_PORT?.toString() || '587'),
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    SMTP_SECURE: process.env.SMTP_SECURE === 'true' || defaultConfig.SMTP_SECURE || false,
    
    // Logging Configuration
    LOG_LEVEL: process.env.LOG_LEVEL || defaultConfig.LOG_LEVEL || 'info',
    LOG_FILE: process.env.LOG_FILE || '',
    
    // Security Configuration
    CORS_ORIGIN: process.env.CORS_ORIGIN || defaultConfig.CORS_ORIGIN || 'http://localhost:3000',
    RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || defaultConfig.RATE_LIMIT_WINDOW?.toString() || '900000'),
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || defaultConfig.RATE_LIMIT_MAX?.toString() || '100'),
    
    // External Services
    SENTRY_DSN: process.env.SENTRY_DSN || '',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
    AWS_REGION: process.env.AWS_REGION || defaultConfig.AWS_REGION || 'us-east-1',
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || ''
  };
  
  // Validate configuration
  validateEnvironment(config);
  
  return config as EnvironmentConfig;
};

/**
 * Get environment configuration singleton
 */
let environmentConfig: EnvironmentConfig | null = null;

export const getEnvironmentConfig = (): EnvironmentConfig => {
  if (!environmentConfig) {
    environmentConfig = loadEnvironmentConfig();
  }
  return environmentConfig;
};

/**
 * Check if running in development mode
 */
export const isDevelopment = (): boolean => {
  return getEnvironmentConfig().NODE_ENV === 'development';
};

/**
 * Check if running in production mode
 */
export const isProduction = (): boolean => {
  return getEnvironmentConfig().NODE_ENV === 'production';
};

/**
 * Check if running in test mode
 */
export const isTest = (): boolean => {
  return getEnvironmentConfig().NODE_ENV === 'test';
};

export default getEnvironmentConfig; 