import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:5000'

let socket = null

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('accessToken')
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      auth: token ? { token } : {},
    })
  }
  return socket
}

export const connectSocket = () => {
  const s = getSocket()
  // Update auth token before connecting in case it changed since socket was created
  const token = localStorage.getItem('accessToken')
  s.auth = token ? { token } : {}
  if (!s.connected) {
    s.connect()
  }
  return s
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
