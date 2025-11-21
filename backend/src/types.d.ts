import { Server as SocketIOServer } from 'socket.io'

declare namespace Express {
  export interface Request {
    userId?: string
    io?: SocketIOServer
  }
}

