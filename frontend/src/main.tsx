/**
 * Main Entry Point
 * 
 * This is the main entry point for the LuxCore frontend application.
 * Initializes React, NovaSanctum, and global configurations.
 * 
 * Features:
 * - React 18 with concurrent features
 * - NovaSanctum security initialization
 * - Global CSS and styling
 * - Error handling
 * - Performance monitoring
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { novaSanctumFrontend } from './services/novas Sanctum.service';

// Import global styles
import './styles/globals.css';
import './styles/tailwind.css';

// Import main App component
import App from './App';

// Initialize NovaSanctum security
const initializeNovaSanctum = async () => {
  try {
    // Initialize security headers
    await novaSanctumFrontend.getSecurityHeaders();
    
    // Check for existing authentication
    const isAuth = novaSanctumFrontend.isAuthenticated();
    
    if (isAuth) {
      console.log('NovaSanctum: User is authenticated');
    } else {
      console.log('NovaSanctum: User is not authenticated');
    }
  } catch (error) {
    console.error('NovaSanctum initialization error:', error);
  }
};

// Initialize the application
const initializeApp = async () => {
  try {
    // Initialize NovaSanctum first
    await initializeNovaSanctum();
    
    // Get the root element
    const container = document.getElementById('root');
    
    if (!container) {
      throw new Error('Root element not found');
    }
    
    // Create React root
    const root = createRoot(container);
    
    // Render the app
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log('LuxCore application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    
    // Show error message to user
    const container = document.getElementById('root');
    if (container) {
      container.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-family: system-ui, -apple-system, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          padding: 2rem;
        ">
          <h1 style="font-size: 2rem; margin-bottom: 1rem;">LuxCore</h1>
          <p style="font-size: 1.1rem; margin-bottom: 2rem;">
            Failed to initialize application. Please refresh the page or contact support.
          </p>
          <button 
            onclick="window.location.reload()"
            style="
              background: rgba(255, 255, 255, 0.2);
              border: 1px solid rgba(255, 255, 255, 0.3);
              color: white;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              cursor: pointer;
              font-size: 1rem;
              transition: all 0.2s;
            "
            onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
            onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'"
          >
            Refresh Page
          </button>
        </div>
      `;
    }
  }
};

// Start the application
initializeApp();

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Handle global errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

// Export for development tools
if (process.env.NODE_ENV === 'development') {
  (window as any).novaSanctum = novaSanctumFrontend;
} 