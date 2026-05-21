import React, { useState, type FormEvent } from 'react'
import './Login.css'

type LoginProps = {
  onLoginSuccess: (token: string, username: string) => void
}

type Mode = 'login' | 'verify-recovery' | 'reset-password'

export function Login({ onLoginSuccess }: LoginProps) {
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryToken, setRecoveryToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newGeneratedToken, setNewGeneratedToken] = useState<string | null>(null)

  const API_URL = `http://${window.location.hostname}:3001/api`

  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Por favor, ingresa el usuario y la contraseña.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión.')
      }

      // Guardar token y avisar al App.tsx
      localStorage.setItem('yoyo_token', data.token)
      localStorage.setItem('yoyo_username', data.user.username)
      onLoginSuccess(data.token, data.user.username)
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerifyRecovery(e: FormEvent) {
    e.preventDefault()
    if (!username.trim() || !recoveryToken.trim()) {
      setError('Por favor, ingresa tu usuario y el código de recuperación maestro.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/auth/verify-recovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          recoveryToken: recoveryToken.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Código maestro inválido.')
      }

      // Avanzar al paso de cambio de clave
      setMode('reset-password')
      setSuccess('Código verificado con éxito. Ingresa tu nueva contraseña.')
    } catch (err: any) {
      setError(err.message || 'Error al verificar el código.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault()
    if (!newPassword || !confirmPassword) {
      setError('Por favor, completa todos los campos.')
      return
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          recoveryToken: recoveryToken.trim(),
          newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Error al restablecer la contraseña.')
      }

      setNewGeneratedToken(data.newRecoveryToken)
      setSuccess('Contraseña restablecida con éxito.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleBackToLogin() {
    setMode('login')
    setError(null)
    setSuccess(null)
    setNewGeneratedToken(null)
    setPassword('')
    setRecoveryToken('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="login-container">
      <div className="login-backdrop-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="login-card">
        <header className="login-card__header">
          <h2 className="login-card__title">Yoyo Track</h2>
          <p className="login-card__subtitle">
            {mode === 'login' && 'Ingresa tus credenciales para acceder'}
            {mode === 'verify-recovery' && 'Recuperación de contraseña'}
            {mode === 'reset-password' && 'Crear nueva contraseña'}
          </p>
        </header>

        {error && (
          <div className="login-alert login-alert--danger" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="login-alert login-alert--success" role="alert">
            {success}
          </div>
        )}

        {newGeneratedToken && (
          <div className="login-token-reveal">
            <p className="login-token-reveal__warning">
              ⚠️ <strong>¡IMPORTANTE! Guarda tu nuevo código maestro:</strong>
            </p>
            <div className="login-token-reveal__box">
              <code>{newGeneratedToken}</code>
            </div>
            <p className="login-token-reveal__hint">
              Lo necesitarás si vuelves a olvidar tu contraseña en el futuro.
            </p>
          </div>
        )}

        {mode === 'login' && (
          <form className="login-form" onSubmit={handleLoginSubmit} noValidate>
            <div className="login-form__group">
              <label htmlFor="login-username">Usuario</label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej. admin"
                disabled={isLoading}
                required
              />
            </div>

            <div className="login-form__group">
              <label htmlFor="login-password">Contraseña</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                required
              />
            </div>

            <button
              className="login-form__btn"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>

            <button
              className="login-form__link-btn"
              type="button"
              onClick={() => {
                setMode('verify-recovery')
                setError(null)
                setSuccess(null)
              }}
              disabled={isLoading}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}

        {mode === 'verify-recovery' && (
          <form className="login-form" onSubmit={handleVerifyRecovery} noValidate>
            <p className="login-form__text">
              Ingresa el nombre del usuario y el código de recuperación maestro de 16 caracteres para restablecer tu cuenta.
            </p>

            <div className="login-form__group">
              <label htmlFor="recovery-username">Usuario</label>
              <input
                id="recovery-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nombre de tu usuario"
                disabled={isLoading}
                required
              />
            </div>

            <div className="login-form__group">
              <label htmlFor="recovery-token">Código de recuperación maestro</label>
              <input
                id="recovery-token"
                type="text"
                value={recoveryToken}
                onChange={(e) => setRecoveryToken(e.target.value)}
                placeholder="REC-XXXX-XXXX-YOYO"
                disabled={isLoading}
                required
              />
            </div>

            <button
              className="login-form__btn"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Verificando...' : 'Verificar código'}
            </button>

            <button
              className="login-form__link-btn"
              type="button"
              onClick={handleBackToLogin}
              disabled={isLoading}
            >
              Volver al inicio de sesión
            </button>
          </form>
        )}

        {mode === 'reset-password' && (
          <form className="login-form" onSubmit={handleResetPassword} noValidate>
            <div className="login-form__group">
              <label htmlFor="reset-new-password">Nueva contraseña</label>
              <input
                id="reset-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={isLoading || !!newGeneratedToken}
                required
              />
            </div>

            <div className="login-form__group">
              <label htmlFor="reset-confirm-password">Confirmar nueva contraseña</label>
              <input
                id="reset-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                disabled={isLoading || !!newGeneratedToken}
                required
              />
            </div>

            {!newGeneratedToken ? (
              <button
                className="login-form__btn"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Guardando...' : 'Restablecer contraseña'}
              </button>
            ) : (
              <button
                className="login-form__btn login-form__btn--success"
                type="button"
                onClick={handleBackToLogin}
              >
                Ir a Iniciar Sesión
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

export default Login
