import { useState } from 'react'
import SectionPicker from './SectionPicker'

function GroceryForm({ onAdd, sections = [], onDeleteSection }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sectionName, setSectionName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onAdd(title.trim(), description.trim(), sectionName || null)
    setTitle('')
    setDescription('')
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
          <SectionPicker
            id="item-section"
            sections={sections}
            value={sectionName}
            onChange={setSectionName}
            onDeleteSection={onDeleteSection}
          />
        </div>
      </div>

      <button type="submit" className="btn-add">Add to list</button>
    </form>
  )
}

export default GroceryForm
