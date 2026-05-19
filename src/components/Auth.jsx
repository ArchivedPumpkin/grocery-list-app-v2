import { useState } from 'react'
import { supabase } from '../lib/supabase'

function Auth({ onBack }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  function switchMode() {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setError(null)
    setMessage(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Grocery List</h1>
      </header>
      <main className="app-main">
        {onBack && (
          <button type="button" className="btn-link" onClick={onBack}>
            ← Continue as guest
          </button>
        )}
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2 className="auth-heading">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h2>
          <p className="auth-subtle">
            Sign in to sync your lists across devices and share them with others. Any lists
            you've created as a guest can be merged into your account.
          </p>
          <div className="form-group">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-message">{message}</p>}
          <button type="submit" className="btn-add" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
          <button type="button" className="btn-link" onClick={switchMode}>
            {mode === 'signin'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </form>
      </main>
    </div>
  )
}

export default Auth
