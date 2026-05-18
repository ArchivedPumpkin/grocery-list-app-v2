import { useEffect, useRef, useState } from 'react'

function UserMenu({ label, onAccount, onSignOut }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  function choose(fn) {
    setOpen(false)
    fn?.()
  }

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-handle"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="user-handle-name">{label}</span>
        <span className="list-switcher-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="user-menu-panel" role="menu">
          <button
            type="button"
            className="list-switcher-action"
            onClick={() => choose(onAccount)}
            role="menuitem"
          >
            My Account
          </button>
          <button
            type="button"
            className="list-switcher-action"
            onClick={() => choose(onSignOut)}
            role="menuitem"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
