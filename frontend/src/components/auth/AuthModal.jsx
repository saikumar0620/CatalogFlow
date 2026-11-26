import { useState } from 'react'
import { fetchCurrentUser, loginUser, registerUser } from '../../api/products'
import Icon from '../common/Icon'

export default function AuthModal({ open, onClose, onSuccess }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const isRegister = mode === 'register'

  function resetFields() {
    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      let signedInUser
      if (isRegister) {
        const data = await registerUser({
          name: name.trim(),
          email: trimmedEmail,
          password,
          confirmPassword,
        })
        signedInUser = data.user
      } else {
        await loginUser(trimmedEmail, password)
        signedInUser = await fetchCurrentUser()
      }

      resetFields()
      const displayName = signedInUser.name || signedInUser.email || signedInUser.username
      onSuccess(
        signedInUser,
        isRegister ? `Welcome, ${displayName}! Your account is ready.` : `Signed in as ${displayName}.`,
      )
      onClose()
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow">ACCOUNT ACCESS <span /></div>
            <h2 id="auth-modal-title">{isRegister ? 'Create account' : 'Sign in'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="product-form">
          {isRegister && (
            <label>
              Name
              <input
                required
                autoFocus
                minLength="2"
                maxLength="80"
                placeholder="Enter your full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          <label>
            {isRegister ? 'Email' : 'Email or username'}
            <input
              required
              autoFocus={!isRegister}
              type={isRegister ? 'email' : 'text'}
              maxLength="120"
              placeholder={isRegister ? 'you@example.com' : 'you@example.com'}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              minLength={isRegister ? 8 : 4}
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {isRegister && (
            <label>
              Confirm password
              <input
                required
                type="password"
                minLength="8"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setMode(isRegister ? 'login' : 'register')
                setError('')
              }}
            >
              {isRegister ? 'Have an account? Sign in' : 'Need an account? Register'}
            </button>
            <div style={{ display: 'flex', gap: '9px' }}>
              <button type="button" className="secondary-button" onClick={onClose}>
                Cancel
              </button>
              <button className="primary-button" disabled={submitting}>
                {submitting ? 'Please wait…' : isRegister ? 'Register' : 'Sign in'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}
