import pino from 'pino'

export const logger = pino({
  level: 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      colorizeObjects: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss'
    }
  }
})

// export a function to update log level
export function setDHLogLevel (level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent'): void {
  logger.level = level
}
