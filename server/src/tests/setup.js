import mongoose from 'mongoose'
import { afterAll, beforeAll } from 'vitest'
import dotenv from 'dotenv'

// Load .env from server root
dotenv.config()

// Override to use a dedicated test database
const baseUri = process.env.MONGODB_URI || ''
const testUri = baseUri.replace(/\/spcms(\?|$)/, '/spcms_test$1')

process.env.MONGODB_URI = testUri

// Connect once before all tests, disconnect after
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(testUri)
  }
})

afterAll(async () => {
  // Drop the test database so each full run starts clean
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase()
    await mongoose.disconnect()
  }
})
