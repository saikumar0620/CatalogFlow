import { useState } from 'react'
import { fetchCurrentUser, loginUser, registerUser } from '../../api/products'
import Icon from '../common/Icon'

export default function AuthModal({ open, onClose, onSuccess }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const isRegister = mode === 'register'

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const trimmedUser = username.trim()
    try {
      if (isRegister) {
        await registerUser(trimmedUser, password)
      }
      await loginUser(trimmedUser, password)
      const user = await fetchCurrentUser()
      setUsername('')
      setPassword('')
      onSuccess(user, isRegister ? 'Account created and signed in.' : `Signed in as ${user.username}.`)
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
          <label>
            Username
            <input
              required
              autoFocus
              minLength="2"
              placeholder="Enter username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              minLength="4"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
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
