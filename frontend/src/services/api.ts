/**
 * API Service
 * 
 * This module handles HTTP requests with NovaSanctum security integration.
 * Provides secure communication with the backend API, authentication handling,
 * and request/response interceptors.
 * 
 * Features:
 * - NovaSanctum-powered API communication
 * - Automatic token management
 * - Request/response interceptors
 * - Error handling and retry logic
 * - Rate limiting protection
 * - Secure header management
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { NovaSanctumService } from './novas Sanctum.service';

// Initialize NovaSanctum service for frontend
const novaSanctum = new NovaSanctumService();

/**
 * API configuration interface
 */
interface ApiConfig {
  baseURL: string;
  timeout: number;
  withCredentials: boolean;
  headers: Record<string, string>;
}

/**
 * API response interface
 */
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * API error interface
 */
interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: any;
}

/**
 * Default API configuration
 */
const defaultConfig: ApiConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

/**
 * API Service class with NovaSanctum integration
 */
class ApiService {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor(config: Partial<ApiConfig> = {}) {
    const finalConfig = { ...defaultConfig, ...config };
    
    this.axiosInstance = axios.create(finalConfig);
    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Add NovaSanctum security headers
        const securityHeaders = await novaSanctum.getSecurityHeaders();
        config.headers = { ...config.headers, ...securityHeaders };

        // Add authentication token if available
        const token = novaSanctum.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Wait for token refresh to complete
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(() => {
              return this.axiosInstance(originalRequest);
            }).catch((err) => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            // Attempt to refresh token
            const refreshResult = await novaSanctum.refreshAccessToken();
            
            if (refreshResult.success) {
              // Retry failed requests in queue
              this.failedQueue.forEach(({ resolve }) => {
                resolve();
              });
              this.failedQueue = [];

              // Retry original request
              return this.axiosInstance(originalRequest);
            } else {
              // Refresh failed, redirect to login
              novaSanctum.logout();
              window.location.href = '/login';
              return Promise.reject(error);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            novaSanctum.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Make a POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Make a PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Make a PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.patch<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): ApiResponse {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      return {
        success: false,
        message: data?.message || `HTTP ${status} error`,
        error: data?.error || 'API_ERROR'
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        success: false,
        message: 'No response from server',
        error: 'NETWORK_ERROR'
      };
    } else {
      // Something else happened
      return {
        success: false,
        message: error.message || 'Unknown error',
        error: 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile<T = any>(
    url: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await this.axiosInstance.post<ApiResponse<T>>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        }
      });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Download file
   */
  async downloadFile(url: string, filename?: string): Promise<void> {
    try {
      const response = await this.axiosInstance.get(url, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    novaSanctum.setAccessToken(token);
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    novaSanctum.clearAccessToken();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return novaSanctum.isAuthenticated();
  }

  /**
   * Get current user
   */
  getCurrentUser(): any {
    return novaSanctum.getCurrentUser();
  }
}

// Create singleton instance
const apiService = new ApiService();

export { apiService, ApiService, type ApiResponse, type ApiError };
export default apiService; 