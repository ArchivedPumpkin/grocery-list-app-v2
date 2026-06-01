import { useEffect, useMemo, useRef, useState } from 'react'
import {
  PREDEFINED_SECTIONS,
  loadCustomSectionNames,
  addCustomSectionName,
  removeCustomSectionName,
} from '../lib/sections'

function SectionPicker({ id, sections = [], value = '', onChange, onDeleteSection }) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [customNames, setCustomNames] = useState(() => loadCustomSectionNames())
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

  // Options: predefined variants, remembered custom names, and this list's existing
  // sections — deduped by name (case-insensitive), predefined first.
  const optionNames = useMemo(() => {
    const seen = new Set()
    const result = []
    const push = name => {
      const key = name.trim().toLowerCase()
      if (!key || seen.has(key)) return
      seen.add(key)
      result.push(name)
    }
    PREDEFINED_SECTIONS.forEach(push)
    customNames.forEach(push)
    sections.forEach(s => push(s.name))
    return result
  }, [customNames, sections])

  // Built-in predefined names aren't removable; custom names and real sections are.
  function isDeletable(name) {
    const lower = name.trim().toLowerCase()
    return (
      sections.some(s => s.name.trim().toLowerCase() === lower) ||
      customNames.some(n => n.toLowerCase() === lower)
    )
  }

  function handleSelect(name) {
    onChange(name)
    setOpen(false)
  }

  function handleDelete(name) {
    const lower = name.trim().toLowerCase()
    const existing = sections.find(s => s.name.trim().toLowerCase() === lower)
    if (existing) onDeleteSection?.(existing.id)
    if (customNames.some(n => n.toLowerCase() === lower)) {
      removeCustomSectionName(name)
      setCustomNames(prev => prev.filter(n => n.toLowerCase() !== lower))
    }
    if (value.trim().toLowerCase() === lower) onChange('')
  }

  function handleCreate(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    const match = optionNames.find(n => n.toLowerCase() === name.toLowerCase())
    if (!match) {
      addCustomSectionName(name)
      setCustomNames(prev => [...prev, name])
    }
    onChange(match ?? name)
    setNewName('')
    setCreating(false)
    setOpen(false)
  }

  return (
    <div className="section-picker" ref={rootRef}>
      <button
        type="button"
        id={id}
        className="section-picker-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="section-picker-value">{value || 'No section'}</span>
        <span className="section-picker-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="section-picker-menu" role="menu">
          <ul className="section-picker-items">
            <li className="section-picker-row">
              <button
                type="button"
                className={`section-picker-item${!value ? ' active' : ''}`}
                onClick={() => handleSelect('')}
                role="menuitem"
              >
                No section
              </button>
            </li>
            {optionNames.map(name => (
              <li key={name} className="section-picker-row">
                <button
                  type="button"
                  className={`section-picker-item${value.trim().toLowerCase() === name.toLowerCase() ? ' active' : ''}`}
                  onClick={() => handleSelect(name)}
                  role="menuitem"
                >
                  {name}
                </button>
                {isDeletable(name) && (
                  <button
                    type="button"
                    className="btn-icon btn-delete-section section-picker-delete"
                    onClick={() => handleDelete(name)}
                    aria-label={`Delete section ${name}`}
                    title="Delete section"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="section-picker-divider" />

          {creating ? (
            <form className="section-picker-create" onSubmit={handleCreate}>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Section name"
                autoFocus
              />
              <button type="submit" className="btn-add">Add</button>
            </form>
          ) : (
            <button
              type="button"
              className="section-picker-action"
              onClick={() => setCreating(true)}
              role="menuitem"
            >
              + Write your own
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default SectionPicker
