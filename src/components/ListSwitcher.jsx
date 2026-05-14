import { useEffect, useRef, useState } from 'react'

function ListSwitcher({ lists, currentListId, onSelect, onCreate }) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const rootRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false)
        setCreating(false)
        setNewName('')
      }
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  async function handleCreate(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    await onCreate(name)
    setNewName('')
    setCreating(false)
    setOpen(false)
  }

  return (
    <div className="list-switcher" ref={rootRef}>
      <button
        type="button"
        className="list-switcher-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="list-switcher-name">
          {lists.find(l => l.id === currentListId)?.name ?? 'Select a list'}
        </span>
        <span className="list-switcher-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="list-switcher-menu" role="menu">
          <ul className="list-switcher-items">
            {lists.map(list => (
              <li key={list.id}>
                <button
                  type="button"
                  className={`list-switcher-item${list.id === currentListId ? ' active' : ''}`}
                  onClick={() => { onSelect(list.id); setOpen(false) }}
                  role="menuitem"
                >
                  {list.name}
                </button>
              </li>
            ))}
          </ul>

          <div className="list-switcher-divider" />

          {creating ? (
            <form className="list-switcher-create" onSubmit={handleCreate}>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="List name"
                autoFocus
              />
              <button type="submit" className="btn-add">Create</button>
            </form>
          ) : (
            <button
              type="button"
              className="list-switcher-action"
              onClick={() => setCreating(true)}
              role="menuitem"
            >
              + New list
            </button>
          )}

        </div>
      )}
    </div>
  )
}

export default ListSwitcher
