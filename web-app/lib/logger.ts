export type LogLevel = 'info' | 'warn' | 'error'

interface Logger {
  info(message: string, ...args: any[]): void
  warn(message: string, ...args: any[]): void
  error(message: string, ...args: any[]): void
}

export class ConsoleLogger implements Logger {
  private isProduction: boolean

  constructor(isProduction?: boolean) {
    this.isProduction = isProduction ?? process.env.NODE_ENV === 'production'
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    if (this.isProduction) {
      const payload = {
        level,
        message,
        timestamp: new Date().toISOString(),
        details: args.length > 0 ? args.map(arg => this.serializeArg(arg)) : undefined
      }

      try {
        const json = JSON.stringify(payload)
        if (level === 'error') {
          console.error(json)
        } else {
          console.log(json)
        }
      } catch (error) {
        // Fallback for circular references or other stringify errors
        const fallbackPayload = {
          level,
          message,
          timestamp: new Date().toISOString(),
          details: ['[Circular or non-serializable content]']
        }
        console.error(JSON.stringify(fallbackPayload))
      }
    } else {
      const timestamp = new Date().toLocaleTimeString()
      switch (level) {
        case 'info':
          console.log(`[INFO ${timestamp}] ${message}`, ...args)
          break
        case 'warn':
          console.warn(`[WARN ${timestamp}] ${message}`, ...args)
          break
        case 'error':
          console.error(`[ERROR ${timestamp}] ${message}`, ...args)
          break
      }
    }
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

  private serializeArg(arg: any): any {
    if (arg instanceof Error) {
      return {
        name: arg.name,
        message: arg.message,
        stack: arg.stack,
        cause: arg.cause ? this.serializeArg(arg.cause) : undefined
      }
    }
    return arg
  }
}

export const logger = new ConsoleLogger()
