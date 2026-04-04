import { useEffect, useRef } from 'react'
import { connectSocket } from './socket'

const POLL_INTERVAL = import.meta.env.VITE_POLL_INTERVAL
  ? Number(import.meta.env.VITE_POLL_INTERVAL)
  : 15000

/**
 * Hybrid real-time hook — uses Socket.IO when available (local dev),
 * falls back to periodic REST polling for serverless deployments (Vercel).
 *
 * @param {Function} onUpdate - callback invoked when data should be refetched
 * @param {Object} opts
 * @param {string} [opts.room]       - Socket.IO room type ('department' | 'doctor' | 'patient')
 * @param {string|string[]} [opts.ids]  - ID(s) to join (single string or array)
 */
export function useQueuePolling(onUpdate, { room, ids } = {}) {
  const callbackRef = useRef(onUpdate)
  callbackRef.current = onUpdate

  useEffect(() => {
    let interval = null
    let socketConnected = false

    // Normalise ids to an array
    const idList = ids ? (Array.isArray(ids) ? ids : [ids]) : []

    // Try Socket.IO first
    try {
      const socket = connectSocket()

      // Give the socket 3 seconds to connect; if it doesn't, start polling
      const socketTimeout = setTimeout(() => {
        if (!socket.connected) {
          startPolling()
        }
      }, 3000)

      const handleConnect = () => {
        socketConnected = true
        clearTimeout(socketTimeout)

        // Stop polling if it was started as a bridge
        if (interval) {
          clearInterval(interval)
          interval = null
        }

        // Join requested rooms
        if (room && idList.length > 0) {
          for (const id of idList) {
            socket.emit(`join:${room}`, id)
          }
        }
      }

      const handleDisconnect = () => {
        socketConnected = false
        startPolling()
      }

      const handleQueueUpdate = () => callbackRef.current()

      socket.on('connect', handleConnect)
      socket.on('disconnect', handleDisconnect)
      socket.on('queue:updated', handleQueueUpdate)

      function startPolling() {
        if (!interval) {
          interval = setInterval(() => callbackRef.current(), POLL_INTERVAL)
        }
      }

      return () => {
        clearTimeout(socketTimeout)
        socket.off('queue:updated', handleQueueUpdate)
        socket.off('connect', handleConnect)
        socket.off('disconnect', handleDisconnect)
        if (interval) clearInterval(interval)
      }
    } catch {
      // Socket.IO not available at all — pure polling mode
      interval = setInterval(() => callbackRef.current(), POLL_INTERVAL)

      return () => {
        if (interval) clearInterval(interval)
      }
    }
  }, [room, JSON.stringify(ids)])
}
