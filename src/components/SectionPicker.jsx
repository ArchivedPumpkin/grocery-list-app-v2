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
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState('')
  const [customNames, setCustomNames] = useState(() => loadCustomSectionNames())
  const rootRef = useRef(null)

  function closeMenu() {
    setOpen(false)
    setCreating(false)
    setEditing(false)
    setNewName('')
  }

  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current?.contains(e.target)) closeMenu()
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
  const deletableNames = useMemo(() => {
    const lowerSet = new Set([
      ...sections.map(s => s.name.trim().toLowerCase()),
      ...customNames.map(n => n.toLowerCase()),
    ])
    return optionNames.filter(name => lowerSet.has(name.trim().toLowerCase()))
  }, [optionNames, sections, customNames])

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
    // Leave edit mode once the last removable section is gone.
    if (deletableNames.length <= 1) setEditing(false)
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
          {editing ? (
            <>
              <div className="section-picker-manage-head">Remove sections</div>
              <ul className="section-picker-items">
                {deletableNames.map(name => (
                  <li key={name} className="section-picker-row">
                    <button
                      type="button"
                      className="section-picker-delete-row"
                      onClick={() => handleDelete(name)}
                      aria-label={`Delete section ${name}`}
                      title={`Delete “${name}”`}
                    >
                      <span className="section-picker-delete-icon" aria-hidden="true">🗑</span>
                      <span className="section-picker-delete-name">{name}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="section-picker-divider" />

              <button
                type="button"
                className="section-picker-action"
                onClick={() => setEditing(false)}
                role="menuitem"
              >
                ✓ Done
              </button>
            </>
          ) : (
            <>
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

              {deletableNames.length > 0 && (
                <button
                  type="button"
                  className="section-picker-action section-picker-manage"
                  onClick={() => setEditing(true)}
                  role="menuitem"
                >
                  ✎ Manage sections
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default SectionPicker
