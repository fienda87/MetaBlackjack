const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  info: (message: string, data?: any) => {
    if (isDev) console.log(`ℹ️ ${message}`, data)
  },
  warn: (message: string, data?: any) => {
    console.warn(`⚠️ ${message}`, data)
  },
  error: (message: string, error?: any) => {
    console.error(`❌ ${message}`, error)
  },
  debug: (message: string, data?: any) => {
    if (isDev && process.env.DEBUG === 'true') {
      console.debug(`🐛 ${message}`, data)
    }
  }
}