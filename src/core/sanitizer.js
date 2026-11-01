/**
 * Input sanitization to prevent XSS attacks
 */

const UNSAFE_TAGS = /<script|<iframe|<object|<embed|<link|<style|javascript:/gi;
const UNSAFE_ATTRS = /on\w+\s*=/gi;

/**
 * Sanitize user input to prevent XSS
 * Removes script tags and event handlers
 */
export function sanitize(input, maxLength = 255) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .substring(0, maxLength)
    .replace(UNSAFE_TAGS, '')
    .replace(UNSAFE_ATTRS, '')
    .trim();
}

/**
 * Escape HTML special characters
 * Safe for rendering user content in HTML
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') {
    return '';
  }

  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sanitize object properties
 * Useful for form data
 */
export function sanitizeObject(obj) {
  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitize(value);
    } else if (typeof value === 'number') {
      sanitized[key] = value;
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    }
    // Ignore other types
  }

  return sanitized;
}
