/**
 * Development-only logger
 * All console logs are stripped in production builds
 */

const isDevelopment = import.meta.env.DEV

class Logger {
  log(...args: any[]) {
    if (isDevelopment) {
      console.log(...args)
    }
  }

  error(...args: any[]) {
    if (isDevelopment) {
      console.error(...args)
    }
  }

  warn(...args: any[]) {
    if (isDevelopment) {
      console.warn(...args)
    }
  }

  info(...args: any[]) {
    if (isDevelopment) {
      console.info(...args)
    }
  }

  debug(...args: any[]) {
    if (isDevelopment) {
      console.debug(...args)
    }
  }

  table(...args: any[]) {
    if (isDevelopment) {
      console.table(...args)
    }
  }

  group(...args: any[]) {
    if (isDevelopment) {
      console.group(...args)
    }
  }

  groupEnd() {
    if (isDevelopment) {
      console.groupEnd()
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Also export as default for easier imports
export default logger
