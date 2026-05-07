import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function GroceryItem({ item, onToggle, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`grocery-item${item.purchased ? ' purchased' : ''}`}
    >
      <span
        className="drag-handle"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        ⠿
      </span>

      <button
        className="btn-check"
        onClick={() => onToggle(item.id)}
        aria-label={item.purchased ? 'Mark as not purchased' : 'Mark as purchased'}
        aria-pressed={item.purchased}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          {item.purchased && (
            <polyline points="4,10 8,14 16,6" />
          )}
        </svg>
      </button>

      <div className="item-content">
        <span className="item-title">{item.title}</span>
        {item.description && (
          <span className="item-description">{item.description}</span>
        )}
      </div>

      <div className="item-actions">
        <button
          className="btn-icon btn-delete"
          onClick={() => onDelete(item.id)}
          aria-label="Delete item"
        >
          ✕
        </button>
      </div>
    </li>
  )
}

export default GroceryItem
