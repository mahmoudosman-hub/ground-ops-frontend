/**
 * Centralized logging service
 * Use this instead of console.log for all logging
 * Production environment only shows warnings and errors
 */

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const MIN_LEVEL = LOG_LEVELS[import.meta.env.VITE_LOG_LEVEL?.toUpperCase() || 'INFO'];

export const logger = {
  debug: (msg, ...args) => {
    if (MIN_LEVEL <= LOG_LEVELS.DEBUG) {
      console.debug(`[DEBUG] ${msg}`, ...args);
    }
  },

  info: (msg, ...args) => {
    if (MIN_LEVEL <= LOG_LEVELS.INFO) {
      console.log(`[INFO] ${msg}`, ...args);
    }
  },

  warn: (msg, ...args) => {
    if (MIN_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(`[WARN] ${msg}`, ...args);
    }
  },

  error: (msg, ...args) => {
    console.error(`[ERROR] ${msg}`, ...args);
    // TODO: Send to Sentry/Crashlytics in production
    if (import.meta.env.VITE_APP_ENV === 'production') {
      reportErrorToServer(msg, ...args);
    }
  },
};

async function reportErrorToServer(msg, ...args) {
  try {
    // Will be implemented with error tracking service
    // await fetch('/api/errors', { method: 'POST', body: JSON.stringify({...}) });
  } catch (err) {
    // Silently fail - don't create error reporting loop
  }
}
