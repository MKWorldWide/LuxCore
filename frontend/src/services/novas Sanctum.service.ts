/**
 * NovaSanctum Frontend Service
 * 
 * This module provides client-side NovaSanctum security integration.
 * Handles authentication, token management, secure storage, and security validation.
 * 
 * Features:
 * - Secure token storage and management
 * - Authentication state management
 * - Security header generation
 * - Token validation and refresh
 * - Secure local storage
 * - Session management
 * - Security monitoring
 */

/**
 * Authentication state interface
 */
interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

/**
 * Login credentials interface
 */
interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaToken?: string;
}

/**
 * Token refresh response interface
 */
interface TokenRefreshResponse {
  success: boolean;
  accessToken?: string;
  expiresIn?: number;
  error?: string;
}

/**
 * Security headers interface
 */
interface SecurityHeaders {
  'X-NovaSanctum-Version': string;
  'X-NovaSanctum-Client': string;
  'X-NovaSanctum-Timestamp': string;
  'X-NovaSanctum-Signature'?: string;
}

/**
 * NovaSanctum Frontend Service class
 */
class NovaSanctumFrontendService {
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null
  };

  private readonly STORAGE_KEYS = {
    ACCESS_TOKEN: 'novas Sanctum_access_token',
    REFRESH_TOKEN: 'novas Sanctum_refresh_token',
    USER_DATA: 'novas Sanctum_user_data',
    EXPIRES_AT: 'novas Sanctum_expires_at'
  };

  private readonly SECURITY_CONFIG = {
    VERSION: '1.0.0',
    CLIENT_ID: 'luxcore-frontend',
    TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes
    MAX_RETRY_ATTEMPTS: 3
  };

  constructor() {
    this.initializeFromStorage();
    this.setupTokenRefreshTimer();
  }

  /**
   * Initialize authentication state from secure storage
   */
  private initializeFromStorage(): void {
    try {
      const accessToken = this.getSecureStorage(this.STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = this.getSecureStorage(this.STORAGE_KEYS.REFRESH_TOKEN);
      const userData = this.getSecureStorage(this.STORAGE_KEYS.USER_DATA);
      const expiresAt = this.getSecureStorage(this.STORAGE_KEYS.EXPIRES_AT);

      if (accessToken && refreshToken && userData && expiresAt) {
        const expiresAtNum = parseInt(expiresAt);
        
        if (expiresAtNum > Date.now()) {
          this.authState = {
            isAuthenticated: true,
            user: JSON.parse(userData),
            accessToken,
            refreshToken,
            expiresAt: expiresAtNum
          };
        } else {
          // Tokens expired, clear storage
          this.clearSecureStorage();
        }
      }
    } catch (error) {
      console.error('Failed to initialize from storage:', error);
      this.clearSecureStorage();
    }
  }

  /**
   * Setup automatic token refresh timer
   */
  private setupTokenRefreshTimer(): void {
    setInterval(() => {
      this.checkAndRefreshToken();
    }, 60000); // Check every minute
  }

  /**
   * Check if token needs refresh and refresh if necessary
   */
  private async checkAndRefreshToken(): Promise<void> {
    if (!this.authState.isAuthenticated || !this.authState.expiresAt) {
      return;
    }

    const timeUntilExpiry = this.authState.expiresAt - Date.now();
    
    if (timeUntilExpiry <= this.SECURITY_CONFIG.TOKEN_REFRESH_THRESHOLD) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Authenticate user with NovaSanctum
   */
  async authenticateUser(credentials: LoginCredentials): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // Make API call to backend authentication endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await this.getSecurityHeaders())
        },
        credentials: 'include',
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (data.success && data.data) {
        const { user, tokens } = data.data;
        
        // Update authentication state
        this.authState = {
          isAuthenticated: true,
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: Date.now() + (tokens.expiresIn * 1000)
        };

        // Store in secure storage
        this.saveToSecureStorage();

        return { success: true, user };
      } else {
        return { success: false, error: data.message || 'Authentication failed' };
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<TokenRefreshResponse> {
    try {
      if (!this.authState.refreshToken) {
        return { success: false, error: 'No refresh token available' };
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await this.getSecurityHeaders())
        },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: this.authState.refreshToken })
      });

      const data = await response.json();

      if (data.success && data.data) {
        const { accessToken, expiresIn } = data.data;
        
        // Update authentication state
        this.authState.accessToken = accessToken;
        this.authState.expiresAt = Date.now() + (expiresIn * 1000);

        // Update secure storage
        this.saveToSecureStorage();

        return { success: true, accessToken, expiresIn };
      } else {
        // Refresh failed, logout user
        this.logout();
        return { success: false, error: data.message || 'Token refresh failed' };
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
      return { success: false, error: 'Token refresh failed' };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint
      if (this.authState.accessToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.authState.accessToken}`,
            ...(await this.getSecurityHeaders())
          },
          credentials: 'include'
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear authentication state
      this.authState = {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null
      };

      // Clear secure storage
      this.clearSecureStorage();
    }
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated && 
           !!this.authState.accessToken && 
           !!this.authState.expiresAt && 
           this.authState.expiresAt > Date.now();
  }

  /**
   * Get current user
   */
  getCurrentUser(): any | null {
    return this.authState.user;
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return this.authState.accessToken;
  }

  /**
   * Set access token (for external token management)
   */
  setAccessToken(token: string): void {
    this.authState.accessToken = token;
    this.saveToSecureStorage();
  }

  /**
   * Clear access token
   */
  clearAccessToken(): void {
    this.authState.accessToken = null;
    this.saveToSecureStorage();
  }

  /**
   * Get security headers for API requests
   */
  async getSecurityHeaders(): Promise<SecurityHeaders> {
    const timestamp = Date.now().toString();
    const signature = await this.generateSignature(timestamp);

    return {
      'X-NovaSanctum-Version': this.SECURITY_CONFIG.VERSION,
      'X-NovaSanctum-Client': this.SECURITY_CONFIG.CLIENT_ID,
      'X-NovaSanctum-Timestamp': timestamp,
      ...(signature && { 'X-NovaSanctum-Signature': signature })
    };
  }

  /**
   * Generate security signature
   */
  private async generateSignature(timestamp: string): Promise<string | null> {
    try {
      // In a real implementation, this would use a client-side key
      // For now, we'll use a simple hash of the timestamp
      const encoder = new TextEncoder();
      const data = encoder.encode(timestamp + this.SECURITY_CONFIG.CLIENT_ID);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Failed to generate signature:', error);
      return null;
    }
  }

  /**
   * Save data to secure storage
   */
  private saveToSecureStorage(): void {
    try {
      if (this.authState.accessToken) {
        this.setSecureStorage(this.STORAGE_KEYS.ACCESS_TOKEN, this.authState.accessToken);
      }
      if (this.authState.refreshToken) {
        this.setSecureStorage(this.STORAGE_KEYS.REFRESH_TOKEN, this.authState.refreshToken);
      }
      if (this.authState.user) {
        this.setSecureStorage(this.STORAGE_KEYS.USER_DATA, JSON.stringify(this.authState.user));
      }
      if (this.authState.expiresAt) {
        this.setSecureStorage(this.STORAGE_KEYS.EXPIRES_AT, this.authState.expiresAt.toString());
      }
    } catch (error) {
      console.error('Failed to save to secure storage:', error);
    }
  }

  /**
   * Clear secure storage
   */
  private clearSecureStorage(): void {
    try {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Failed to clear secure storage:', error);
    }
  }

  /**
   * Set secure storage (prefer sessionStorage for sensitive data)
   */
  private setSecureStorage(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      // Fallback to localStorage if sessionStorage fails
      localStorage.setItem(key, value);
    }
  }

  /**
   * Get secure storage
   */
  private getSecureStorage(key: string): string | null {
    try {
      return sessionStorage.getItem(key) || localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate token format and structure
   */
  validateToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Basic JWT format validation
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    try {
      // Validate header and payload are valid base64
      atob(parts[0] || '');
      atob(parts[1] || '');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): number | null {
    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1] || ''));
      return payload.exp ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    return expiration ? expiration <= Date.now() : true;
  }

  /**
   * Update user data
   */
  updateUserData(userData: any): void {
    this.authState.user = { ...this.authState.user, ...userData };
    this.saveToSecureStorage();
  }

  /**
   * Get security configuration
   */
  getSecurityConfig(): typeof this.SECURITY_CONFIG {
    return { ...this.SECURITY_CONFIG };
  }
}

// Create singleton instance
const novaSanctumFrontend = new NovaSanctumFrontendService();

export { novaSanctumFrontend, NovaSanctumFrontendService };
export default novaSanctumFrontend; 