export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface Logger {
  debug(message: string, ...args: any[]): void
  info(message: string, ...args: any[]): void
  warn(message: string, ...args: any[]): void
  error(message: string, ...args: any[]): void
}

class ConsoleLogger implements Logger {
  private isProduction = process.env.NODE_ENV === 'production'

  private formatError(error: Error): any {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      ...(error as any), // Include any custom properties
    }
  }

  private serializeMetadata(args: any[]): any[] {
    return args.map(arg => {
      if (arg instanceof Error) {
        return this.formatError(arg)
      }
      if (typeof arg === 'object' && arg !== null) {
        // Handle nested errors in objects if necessary, but keep it simple for now
        // A deep clone/traverse could be expensive.
        // Let's just do a shallow check for top-level errors in arrays/objects if needed,
        // but typically errors are passed directly as args.
        return arg
      }
      return arg
    })
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    if (this.isProduction) {
      // Structured logging for production
      const logEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        metadata: args.length > 0 ? this.serializeMetadata(args) : undefined,
      }
      console.log(JSON.stringify(logEntry))
    } else {
      // Human-readable logging for development
      const prefix = `[${level.toUpperCase()}]`
      if (level === 'error') {
        console.error(prefix, message, ...args)
      } else if (level === 'warn') {
        console.warn(prefix, message, ...args)
      } else {
        console.log(prefix, message, ...args)
      }
    }
  }

  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args)
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args)
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args)
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args)
  }
}

export const logger = new ConsoleLogger()
