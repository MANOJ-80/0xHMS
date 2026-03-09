import dotenv from 'dotenv'

dotenv.config()

const requiredKeys = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']

for (const key of requiredKeys) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongodbUri: process.env.MONGODB_URI,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Notification settings
  notificationDefaultChannel: process.env.NOTIFICATION_DEFAULT_CHANNEL || 'system',
  smsProviderEnabled: process.env.SMS_PROVIDER_ENABLED === 'true',
  whatsappProviderEnabled: process.env.WHATSAPP_PROVIDER_ENABLED === 'true',
  smsFromNumber: process.env.SMS_FROM_NUMBER || '',
  whatsappFromNumber: process.env.WHATSAPP_FROM_NUMBER || '',
}
