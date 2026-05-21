import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    username: string
    role: string
  }
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    res.status(401).json({ message: 'No se proporcionó token de autenticación.' })
    return
  }

  const token = authHeader.split(' ')[1] // Bearer <token>

  if (!token) {
    res.status(401).json({ message: 'Formato de token de autenticación inválido.' })
    return
  }

  try {
    const secret = process.env.JWT_SECRET || 'super-secret-key-yoyo-track-2026-dynamic-token-auth'
    const decoded = jwt.verify(token, secret) as {
      id: string
      username: string
      role: string
    }

    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ message: 'Token de autenticación expirado o inválido.' })
  }
}
