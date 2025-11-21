// Error handling service for better error management
interface ErrorInfo {
  message: string
  code?: string
  status?: number
  timestamp: Date
  context?: string
  stack?: string
}

interface ErrorHandler {
  (error: ErrorInfo): void
}

class ErrorService {
  private handlers: ErrorHandler[] = []
  private errors: ErrorInfo[] = []

  // Add error handler
  addHandler(handler: ErrorHandler) {
    this.handlers.push(handler)
  }

  // Remove error handler
  removeHandler(handler: ErrorHandler) {
    const index = this.handlers.indexOf(handler)
    if (index > -1) {
      this.handlers.splice(index, 1)
    }
  }

  // Handle error
  handleError(error: Error | string | ErrorInfo, context?: string) {
    let errorInfo: ErrorInfo
    
    if (typeof error === 'object' && 'timestamp' in error) {
      // Already an ErrorInfo object
      errorInfo = error as ErrorInfo
    } else {
      // Convert Error or string to ErrorInfo
      errorInfo = {
        message: typeof error === 'string' ? error : error.message,
        code: typeof error === 'object' && 'code' in error ? String(error.code) : undefined,
        status: typeof error === 'object' && 'status' in error ? Number(error.status) : undefined,
        timestamp: new Date(),
        context,
        stack: typeof error === 'object' ? error.stack : undefined
      }
    }

    // Add to errors array
    this.errors.push(errorInfo)

    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100)
    }

    // Notify all handlers
    this.handlers.forEach(handler => {
      try {
        handler(errorInfo)
      } catch (handlerError) {
        console.error('Error handler failed:', handlerError)
      }
    })

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error handled:', errorInfo)
    }
  }

  // Get all errors
  getErrors(): ErrorInfo[] {
    return [...this.errors]
  }

  // Get errors by context
  getErrorsByContext(context: string): ErrorInfo[] {
    return this.errors.filter(error => error.context === context)
  }

  // Clear all errors
  clearErrors() {
    this.errors = []
  }

  // Clear errors by context
  clearErrorsByContext(context: string) {
    this.errors = this.errors.filter(error => error.context !== context)
  }

  // Create API error handler
  createApiErrorHandler(context: string) {
    return (error: any) => {
      let message = 'An unexpected error occurred'
      let code: string | undefined
      let status: number | undefined

      if (error.response) {
        // Server responded with error status
        status = error.response.status
        message = error.response.data?.message || error.response.statusText || message
        code = error.response.data?.code
      } else if (error.request) {
        // Request was made but no response received
        message = 'Network error - please check your connection'
        code = 'NETWORK_ERROR'
      } else {
        // Something else happened
        message = error.message || message
        code = error.code
      }

      this.handleError({
        message,
        code,
        status,
        timestamp: new Date(),
        context,
        stack: error.stack
      })
    }
  }

  // Create validation error handler
  createValidationErrorHandler(context: string) {
    return (errors: Record<string, string[]>) => {
      const message = Object.entries(errors)
        .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
        .join('; ')

      this.handleError({
        message: `Validation failed: ${message}`,
        code: 'VALIDATION_ERROR',
        timestamp: new Date(),
        context
      })
    }
  }
}

// Create and export a singleton instance
export const errorService = new ErrorService()
export default errorService

// Global error handler for unhandled errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorService.handleError(event.error, 'global')
  })

  window.addEventListener('unhandledrejection', (event) => {
    errorService.handleError(event.reason, 'promise')
  })
}




