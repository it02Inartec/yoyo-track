import { Response } from 'express'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import prisma from '../db'
import { AuthenticatedRequest } from '../middlewares/auth.middleware'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-yoyo-track-2026-dynamic-token-auth'

export async function login(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { username, password } = req.body

  if (!username || !password) {
    res.status(400).json({ message: 'Nombre de usuario y contraseña son obligatorios.' })
    return
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    })

    if (!user) {
      res.status(401).json({ message: 'Usuario o contraseña incorrectos.' })
      return
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordValid) {
      res.status(401).json({ message: 'Usuario o contraseña incorrectos.' })
      return
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        recoveryToken: user.recoveryToken,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Error interno al iniciar sesión.' })
  }
}

export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'No autenticado.' })
    return
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    })

    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado.' })
      return
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      recoveryToken: user.recoveryToken,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error interno al obtener el perfil.' })
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'No autenticado.' })
    return
  }

  const { oldPassword, newPassword } = req.body

  if (!oldPassword || !newPassword) {
    res.status(400).json({ message: 'Se requiere la contraseña actual y la nueva contraseña.' })
    return
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    })

    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado.' })
      return
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash)

    if (!isPasswordValid) {
      res.status(400).json({ message: 'La contraseña actual ingresada es incorrecta.' })
      return
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' })
      return
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newPasswordHash },
    })

    res.json({ message: 'Contraseña actualizada correctamente.' })
  } catch (error) {
    res.status(500).json({ message: 'Error interno al cambiar la contraseña.' })
  }
}

export async function verifyRecovery(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { username, recoveryToken } = req.body

  if (!username || !recoveryToken) {
    res.status(400).json({ message: 'Se requiere el nombre de usuario y el código de recuperación maestro.' })
    return
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    })

    if (!user) {
      res.status(404).json({ message: 'El usuario no existe.' })
      return
    }

    const normalizedToken = recoveryToken.trim().toUpperCase()
    const matches = user.recoveryToken.trim().toUpperCase() === normalizedToken

    if (!matches) {
      res.status(400).json({ message: 'Código de recuperación maestro incorrecto.' })
      return
    }

    res.json({ success: true, message: 'Código de recuperación verificado correctamente.' })
  } catch (error) {
    res.status(500).json({ message: 'Error al verificar el código de recuperación.' })
  }
}

export async function resetPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { username, recoveryToken, newPassword } = req.body

  if (!username || !recoveryToken || !newPassword) {
    res.status(400).json({ message: 'Todos los campos son obligatorios.' })
    return
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    })

    if (!user) {
      res.status(404).json({ message: 'El usuario no existe.' })
      return
    }

    const normalizedToken = recoveryToken.trim().toUpperCase()
    const matches = user.recoveryToken.trim().toUpperCase() === normalizedToken

    if (!matches) {
      res.status(400).json({ message: 'Código de recuperación maestro incorrecto.' })
      return
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' })
      return
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Al restablecer la contraseña, generamos un NUEVO token de recuperación para mantener la seguridad.
    const newRecoveryToken = `REC-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-YOYO`

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        recoveryToken: newRecoveryToken,
      },
    })

    res.json({
      message: 'Contraseña restablecida correctamente.',
      newRecoveryToken,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error interno al restablecer la contraseña.' })
  }
}
