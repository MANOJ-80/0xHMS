import mongoose from 'mongoose'
import { env } from './env.js'

const MAX_RETRIES = 5
const RETRY_DELAY_MS = 3000

export async function connectDatabase() {
  mongoose.set('strictQuery', true)

  let lastError
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(env.mongodbUri)
      console.log(`[DB] Connected to MongoDB successfully`)
      return mongoose.connection
    } catch (error) {
      lastError = error
      console.error(`[DB] Connection attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`)

      if (attempt < MAX_RETRIES) {
        console.log(`[DB] Retrying in ${RETRY_DELAY_MS / 1000} seconds...`)
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }
  }

  throw new Error(`[DB] Failed to connect after ${MAX_RETRIES} attempts: ${lastError?.message}`)
}
