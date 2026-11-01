/**
 * Global error handling and recovery
 * Catches unhandled errors and provides user feedback
 */

import { logger } from './logger.js';

let errorHandlersReady = false;

/**
 * Initialize global error handlers
 * Call this once at app startup
 */
export function setupGlobalErrorHandling() {
  if (errorHandlersReady) {
    return;
  }

  errorHandlersReady = true;

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));

    logger.error('Unhandled Promise Rejection:', error.message);
    event.preventDefault();

    // Notify user
    showErrorNotification(
      'An unexpected error occurred. Please try again.',
      'error'
    );

    // Report to error tracking service
    reportErrorToServer(error, 'unhandledrejection');
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    logger.error('Uncaught Error:', event.message);

    // Report to error tracking service
    reportErrorToServer(event.error, 'uncaught');
  });

  // Handle resource loading errors
  window.addEventListener('error', (event) => {
    if (event.target !== window && event.target.src) {
      const resource = event.target.src || event.target.href;
      const errorMsg = `Failed to load resource: ${resource}`;
      logger.warn(errorMsg);
      reportErrorToServer(new Error(errorMsg), 'resource-load');
    }
  }, true);

  logger.info('Global error handling initialized');
}

/**
 * Show error notification to user
 */
function showErrorNotification(message, type = 'error') {
  // Check if there's a toast/notification function available
  if (typeof window.toastError === 'function') {
    window.toastError(message);
  } else if (typeof window.toast === 'function') {
    window.toast(message, type);
  } else {
    // Fallback to alert
    console.error('[Notification]', message);
  }
}

/**
 * Report error to server for monitoring
 */
async function reportErrorToServer(error, type = 'unknown') {
  try {
    if (import.meta.env.VITE_APP_ENV !== 'production') {
      return; // Don't report errors in development
    }

    // This would be implemented with your error tracking service
    // await fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     message: error.message,
    //     stack: error.stack,
    //     type,
    //     userAgent: navigator.userAgent,
    //     timestamp: new Date().toISOString(),
    //   }),
    // });
  } catch (err) {
    // Silently fail - don't create infinite error loop
    console.error('Failed to report error to server:', err);
  }
}
