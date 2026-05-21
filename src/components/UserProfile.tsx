import React, { useState, type FormEvent, useEffect } from 'react'
import './UserProfile.css'

type UserProfileProps = {
  onClose: () => void
  onLogout: () => void
  username: string
}

export function UserProfile({ onClose, onLogout, username }: UserProfileProps) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [recoveryToken, setRecoveryToken] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const API_URL = `http://${window.location.hostname}:3001/api`

  useEffect(() => {
    // Cargar información del perfil (incluyendo token maestro de recuperación)
    async function loadProfile() {
      const token = localStorage.getItem('yoyo_token')
      if (!token) return

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setRecoveryToken(data.recoveryToken || '')
        }
      } catch (err) {
        console.error('Error al cargar perfil:', err)
      }
    }

    loadProfile()
  }, [])

  async function handleChangePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Por favor, completa todos los campos de contraseña.')
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
    setSuccess(null)

    const token = localStorage.getItem('yoyo_token')

    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Error al cambiar la contraseña.')
      }

      setSuccess('¡Contraseña cambiada con éxito!')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="profile-backdrop" role="dialog" aria-modal="true">
      <div className="profile-modal">
        <header className="profile-modal__header">
          <h3 className="profile-modal__title">Ajustes de Seguridad</h3>
          <button className="profile-modal__close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </header>

        <section className="profile-info-section">
          <div className="profile-avatar">
            <span className="profile-avatar__text">{username.substring(0, 2).toUpperCase()}</span>
          </div>
          <div className="profile-details">
            <h4 className="profile-details__username">{username}</h4>
            <span className="profile-details__role-badge">Administrador</span>
          </div>
        </section>

        {recoveryToken && (
          <section className="profile-recovery-section">
            <h4 className="profile-section-title">Código Maestro de Recuperación</h4>
            <p className="profile-section-text">
              Guarda este código en un lugar seguro. Te servirá para restablecer tu cuenta si olvidas la contraseña.
            </p>
            <div className="profile-token-box">
              <code>{recoveryToken}</code>
            </div>
          </section>
        )}

        <section className="profile-change-pw-section">
          <h4 className="profile-section-title">Cambiar Contraseña</h4>

          {error && <div className="profile-alert profile-alert--danger">{error}</div>}
          {success && <div className="profile-alert profile-alert--success">{success}</div>}

          <form className="profile-form" onSubmit={handleChangePasswordSubmit} noValidate>
            <div className="profile-form__group">
              <label htmlFor="old-password">Contraseña actual</label>
              <input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Ingresa tu contraseña actual"
                disabled={isLoading}
                required
              />
            </div>

            <div className="profile-form__group">
              <label htmlFor="new-password">Nueva contraseña</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={isLoading}
                required
              />
            </div>

            <div className="profile-form__group">
              <label htmlFor="confirm-password">Confirmar nueva contraseña</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirma tu nueva contraseña"
                disabled={isLoading}
                required
              />
            </div>

            <button
              className="profile-form__submit-btn"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Actualizando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        </section>

        <footer className="profile-modal__footer">
          <button className="profile-logout-btn" type="button" onClick={onLogout}>
            Cerrar Sesión
          </button>
          <button className="profile-close-btn" type="button" onClick={onClose}>
            Cerrar Ventana
          </button>
        </footer>
      </div>
    </div>
  )
}

export default UserProfile
