/**
 * Main Application Component
 * 
 * Root component that sets up the application with all necessary providers
 * and NovaSanctum security integration.
 * 
 * Features:
 * - Context providers (Auth, Theme)
 * - Error boundary
 * - Basic layout structure
 * - NovaSanctum integration
 */

import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ErrorBoundaryComponent from '@/components/UI/ErrorBoundary';
import LoadingSpinner from '@/components/UI/LoadingSpinner';
import './styles/globals.css';

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Please refresh the page</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        }
        onError={(error, errorInfo) => {
          console.error('App error boundary caught an error:', error, errorInfo);
        }}
      >
        <ThemeProvider>
          <AuthProvider>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
              <div className="container mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-8">
                  Welcome to LuxCore
                </h1>
                <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
                  Powered by NovaSanctum Security Technology
                </p>
                <div className="max-w-md mx-auto">
                  <LoadingSpinner size="lg" text="Initializing..." />
                </div>
              </div>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App; 