import { useState } from 'react'
import { supabase } from '../lib/supabase'

function Account({ session, profile, onProfileChange, onBack }) {
  const [username, setUsername] = useState(profile?.username ?? '')
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState(null)
  const [nameErr, setNameErr] = useState(null)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwdMsg, setPwdMsg] = useState(null)
  const [pwdErr, setPwdErr] = useState(null)

  const handle = profile ? `${profile.username}#${profile.discriminator}` : '—'

  async function handleUsernameSubmit(e) {
    e.preventDefault()
    setNameMsg(null)
    setNameErr(null)
    const next = username.trim()
    if (!next) { setNameErr('Username cannot be empty.'); return }
    setSavingName(true)
    const { data, error } = await supabase.rpc('update_username', { p_username: next })
    setSavingName(false)
    if (error) {
      setNameErr(prettyError(error.message))
      return
    }
    onProfileChange?.(data)
    setUsername(data.username)
    setNameMsg(`Saved as ${data.username}#${data.discriminator}`)
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setPwdMsg(null)
    setPwdErr(null)
    if (password.length < 6) { setPwdErr('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setPwdErr('Passwords do not match.'); return }
    setSavingPwd(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSavingPwd(false)
    if (error) { setPwdErr(error.message); return }
    setPassword('')
    setConfirm('')
    setPwdMsg('Password updated.')
  }

  return (
    <div className="account-page">
      <div className="account-header">
        <button className="btn-link" onClick={onBack}>← Back to lists</button>
        <h2 className="account-title">Account</h2>
      </div>

      <section className="account-section">
        <div className="account-handle">
          <span className="handle-label">Your handle</span>
          <span className="handle-value">{handle}</span>
        </div>
        <p className="modal-hint">
          Your handle is your username plus a 4-digit tag. Multiple people can pick the same
          username — the tag keeps each handle unique.
        </p>
      </section>

      <section className="account-section">
        <h3 className="section-heading">Username</h3>
        <form className="account-form" onSubmit={handleUsernameSubmit}>
          <div className="form-group">
            <label htmlFor="account-username">New username</label>
            <input
              id="account-username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              minLength={2}
              maxLength={32}
              pattern="[A-Za-z0-9_\-]+"
              autoComplete="off"
              required
            />
          </div>
          {nameErr && <p className="auth-error">{nameErr}</p>}
          {nameMsg && <p className="auth-message">{nameMsg}</p>}
          <button type="submit" className="btn-add" disabled={savingName}>
            {savingName ? 'Saving…' : 'Save username'}
          </button>
        </form>
      </section>

      <section className="account-section account-section-disabled" aria-disabled="true">
        <div className="section-heading-row">
          <h3 className="section-heading">Email</h3>
          <span className="coming-soon-badge">Coming soon</span>
        </div>
        <div className="form-group">
          <label htmlFor="account-email">Email address</label>
          <input
            id="account-email"
            type="email"
            value={session.user.email ?? ''}
            disabled
            readOnly
          />
        </div>
        <button type="button" className="btn-add" disabled>
          Change email
        </button>
      </section>

      <section className="account-section">
        <h3 className="section-heading">Password</h3>
        <form className="account-form" onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label htmlFor="account-password">New password</label>
            <input
              id="account-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="account-password-confirm">Confirm new password</label>
            <input
              id="account-password-confirm"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              minLength={6}
              autoComplete="new-password"
              required
            />
          </div>
          {pwdErr && <p className="auth-error">{pwdErr}</p>}
          {pwdMsg && <p className="auth-message">{pwdMsg}</p>}
          <button type="submit" className="btn-add" disabled={savingPwd}>
            {savingPwd ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </section>
    </div>
  )
}

function prettyError(msg) {
  if (msg.includes('username_length')) return 'Username must be 2-32 characters.'
  if (msg.includes('username_chars')) return 'Use only letters, numbers, _ or -.'
  if (msg.includes('username_full')) return 'That username is full — try another.'
  return msg
}

export default Account
