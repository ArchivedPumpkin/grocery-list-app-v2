import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function ManageMembers({ list, currentUserId, onClose, onLeave }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [invite, setInvite] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const isOwner = list.owner_id === currentUserId

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadAll().finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.id])

  async function loadAll() {
    await Promise.all([loadMembers(), loadActiveInvite()])
  }

  async function loadMembers() {
    const { data, error } = await supabase.rpc('list_member_emails', { p_list_id: list.id })
    if (error) { setError(error.message); return }
    setMembers(data ?? [])
  }

  async function loadActiveInvite() {
    const { data, error } = await supabase
      .from('list_invites')
      .select('id, token, revoked, created_at')
      .eq('list_id', list.id)
      .eq('revoked', false)
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) { setError(error.message); return }
    setInvite(data?.[0] ?? null)
  }

  async function handleAddByEmail(e) {
    e.preventDefault()
    const value = email.trim()
    if (!value) return
    setAdding(true)
    setError(null)
    const { error } = await supabase.rpc('add_member_by_email', {
      p_list_id: list.id,
      p_email: value,
    })
    setAdding(false)
    if (error) {
      const msg = error.message.includes('user_not_found')
        ? 'No account with that email.'
        : error.message
      setError(msg)
      return
    }
    setEmail('')
    await loadMembers()
  }

  async function handleRemove(userId) {
    setError(null)
    const { error } = await supabase
      .from('list_members')
      .delete()
      .eq('list_id', list.id)
      .eq('user_id', userId)
    if (error) { setError(error.message); return }
    if (userId === currentUserId) {
      onLeave?.()
      return
    }
    await loadMembers()
  }

  async function handleGenerateInvite() {
    setGenerating(true)
    setError(null)
    const token = crypto.randomUUID().replace(/-/g, '')
    const { data, error } = await supabase
      .from('list_invites')
      .insert({ list_id: list.id, token, created_by: currentUserId })
      .select()
      .single()
    setGenerating(false)
    if (error) { setError(error.message); return }
    setInvite(data)
  }

  async function handleRevokeInvite() {
    if (!invite) return
    setError(null)
    const { error } = await supabase
      .from('list_invites')
      .update({ revoked: true })
      .eq('id', invite.id)
    if (error) { setError(error.message); return }
    setInvite(null)
  }

  function inviteUrl() {
    if (!invite) return ''
    const base = window.location.origin + window.location.pathname
    return `${base}?invite=${invite.token}`
  }

  async function handleCopy() {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(inviteUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Could not copy to clipboard.')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Manage members" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Members of "{list.name}"</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </header>

        {error && <p className="auth-error">{error}</p>}

        <section className="modal-section">
          <h3 className="section-heading">People</h3>
          {loading ? (
            <p className="empty-state">Loading…</p>
          ) : (
            <ul className="member-list">
              {members.map(m => {
                const isYou = m.user_id === currentUserId
                const isListOwner = m.user_id === list.owner_id
                const canRemove = isYou || (isOwner && !isListOwner)
                return (
                  <li key={m.user_id} className="member-row">
                    <div className="member-info">
                      <span className="member-email">{m.email}</span>
                      {isListOwner && <span className="member-badge">owner</span>}
                      {isYou && !isListOwner && <span className="member-badge">you</span>}
                    </div>
                    {canRemove && (
                      <button
                        className="btn-icon btn-delete"
                        onClick={() => handleRemove(m.user_id)}
                        aria-label={isYou ? 'Leave list' : 'Remove member'}
                        title={isYou ? 'Leave list' : 'Remove member'}
                      >
                        ✕
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="modal-section">
          <h3 className="section-heading">Add by email</h3>
          <form className="add-member-form" onSubmit={handleAddByEmail}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="friend@example.com"
              required
            />
            <button type="submit" className="btn-add" disabled={adding}>
              {adding ? 'Adding…' : 'Add'}
            </button>
          </form>
          <p className="modal-hint">They must already have an account.</p>
        </section>

        <section className="modal-section">
          <h3 className="section-heading">Invite link</h3>
          {invite ? (
            <div className="invite-row">
              <input className="invite-link" type="text" readOnly value={inviteUrl()} onFocus={e => e.target.select()} />
              <button className="btn-icon" onClick={handleCopy} aria-label="Copy link" title="Copy link">
                {copied ? '✓' : '⧉'}
              </button>
              <button className="btn-icon btn-delete" onClick={handleRevokeInvite} aria-label="Revoke link" title="Revoke link">
                ✕
              </button>
            </div>
          ) : (
            <button className="btn-add" onClick={handleGenerateInvite} disabled={generating}>
              {generating ? 'Generating…' : 'Generate invite link'}
            </button>
          )}
          <p className="modal-hint">Anyone signed in who opens the link joins this list.</p>
        </section>
      </div>
    </div>
  )
}

export default ManageMembers
