import { useState, useMemo } from 'react'
import {
  PREDEFINED_SECTIONS,
  loadCustomSectionNames,
  addCustomSectionName,
} from '../lib/sections'

const CUSTOM_OPTION = '__custom__'

function GroceryForm({ onAdd, sections = [] }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sectionName, setSectionName] = useState('')
  const [customMode, setCustomMode] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customNames, setCustomNames] = useState(() => loadCustomSectionNames())

  // Dropdown options: predefined variants, remembered custom names, and this list's
  // existing sections — deduped by name (case-insensitive), predefined first.
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

  function rememberCustom(name) {
    if (!optionNames.some(n => n.toLowerCase() === name.toLowerCase())) {
      addCustomSectionName(name)
      setCustomNames(prev => [...prev, name])
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    let name = sectionName
    // If a custom name was typed but not yet confirmed, use it on submit.
    if (customMode && customName.trim()) {
      name = customName.trim()
      rememberCustom(name)
      setSectionName(name)
      setCustomMode(false)
      setCustomName('')
    }
    onAdd(title.trim(), description.trim(), name || null)
    setTitle('')
    setDescription('')
  }

  function handleSectionChange(e) {
    const value = e.target.value
    if (value === CUSTOM_OPTION) {
      setCustomMode(true)
      return
    }
    setCustomMode(false)
    setSectionName(value)
  }

  function confirmCustom() {
    const name = customName.trim()
    if (!name) return
    const match = optionNames.find(n => n.toLowerCase() === name.toLowerCase())
    rememberCustom(name)
    setSectionName(match ?? name)
    setCustomName('')
    setCustomMode(false)
  }

  return (
    <form className="grocery-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="item-title">Item</label>
          <input
            id="item-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Apples"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="item-description">Note</label>
          <input
            id="item-description"
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. 6 red ones"
          />
        </div>
        <div className="form-group">
          <label htmlFor="item-section">Section</label>
          <select
            id="item-section"
            className="section-select"
            value={customMode ? CUSTOM_OPTION : sectionName}
            onChange={handleSectionChange}
          >
            <option value="">No section</option>
            {optionNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
            <option value={CUSTOM_OPTION}>Write your own…</option>
          </select>
        </div>
      </div>

      {customMode && (
        <div className="section-create-row">
          <input
            type="text"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            placeholder="New section name"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                confirmCustom()
              }
            }}
          />
          <button type="button" className="btn-add" onClick={confirmCustom}>
            Save
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { setCustomMode(false); setCustomName('') }}
          >
            Cancel
          </button>
        </div>
      )}

      <button type="submit" className="btn-add">Add to list</button>
    </form>
  )
}

export default GroceryForm
