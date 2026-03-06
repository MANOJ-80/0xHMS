import http from 'http'
import { Server } from 'socket.io'
import { createApp } from './app.js'
import { connectDatabase } from './config/db.js'
import { env } from './config/env.js'

const app = createApp()

// ── Database connection (shared by both local and serverless) ──────────
let dbReady = false

async function ensureDatabase() {
  if (!dbReady) {
    await connectDatabase()
    dbReady = true
  }
}

// ── Serverless export (Vercel) ─────────────────────────────────────────
// Vercel imports this file and calls the default export as a request handler.
// Socket.IO is NOT available in serverless — controllers already handle
// missing `io` gracefully via socketService.js (line: `if (!io) return`).
export default async function handler(req, res) {
  await ensureDatabase()
  app(req, res)
}

// ── Local development server ───────────────────────────────────────────
// Only start the long-lived HTTP server when run directly (`node src/server.js`).
// In Vercel, this file is imported as a module — `bootstrap()` is never called.
const isDirectRun =
  process.argv[1]?.endsWith('server.js') ||
  process.argv[1]?.endsWith('server')

if (isDirectRun) {
  ;(async function bootstrap() {
    const server = http.createServer(app)

    const allowedOrigins = env.clientUrl
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)

    const io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
      },
    })

    app.set('io', io)

    io.on('connection', (socket) => {
      socket.on('join:department', (departmentId) => {
        socket.join(`department:${departmentId}`)
      })

      socket.on('join:doctor', (doctorId) => {
        socket.join(`doctor:${doctorId}`)
      })

      socket.on('join:patient', (patientId) => {
        socket.join(`patient:${patientId}`)
      })
    })

    await ensureDatabase()

    server.listen(env.port, () => {
      console.log(`SPCMS API running on port ${env.port}`)
    })
  })().catch((error) => {
    console.error('Failed to start server', error)
    process.exit(1)
  })
}
