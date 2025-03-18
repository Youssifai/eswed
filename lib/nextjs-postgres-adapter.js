/**
 * Next.js adapter for postgres to fix module resolution errors
 * This adapter helps with the "Module not found: Can't resolve 'net'" error
 */

// This empty adapter file helps webpack resolve the 'net' module error
// We're working around a common issue with server components in Next.js
// where certain Node.js modules are not available in the browser environment

export default {}; 