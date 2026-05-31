import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import GroceryItem from './GroceryItem'

const OTHER_KEY = '__other__'

function GroceryList({ items, sections = [], onToggle, onReorder, onDelete, onDeleteSection }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  if (items.length === 0) {
    return <p className="empty-state">Your list is empty. Add an item above.</p>
  }

  const unpurchased = items.filter(item => !item.purchased)
  const purchased = items.filter(item => item.purchased)

  const sectionIds = new Set(sections.map(s => s.id))
  const orderedSections = [...sections].sort((a, b) => a.position - b.position)

  // Build display groups for unpurchased items: each section (with items) then "Other".
  const groups = []
  for (const section of orderedSections) {
    const groupItems = unpurchased.filter(i => i.section_id === section.id)
    if (groupItems.length > 0) {
      groups.push({ key: section.id, section, items: groupItems })
    }
  }
  const otherItems = unpurchased.filter(i => !i.section_id || !sectionIds.has(i.section_id))
  if (otherItems.length > 0) {
    groups.push({ key: OTHER_KEY, section: null, items: otherItems })
  }

  function groupKeyOf(itemId) {
    const item = items.find(i => i.id === itemId)
    if (!item) return null
    return item.section_id && sectionIds.has(item.section_id) ? item.section_id : OTHER_KEY
  }

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    // Only reorder within the same section group.
    if (groupKeyOf(active.id) !== groupKeyOf(over.id)) return
    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grocery-list-wrapper">
        {groups.map(group => (
          <section key={group.key} className="grocery-section">
            {group.section ? (
              <div className="section-heading-row">
                <h2 className="section-heading">{group.section.name}</h2>
                {onDeleteSection && (
                  <button
                    type="button"
                    className="btn-icon btn-delete-section"
                    onClick={() => onDeleteSection(group.section.id)}
                    aria-label={`Delete section ${group.section.name}`}
                    title="Delete section"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : groups.length > 1 ? (
              <h2 className="section-heading">Other</h2>
            ) : null}
            <SortableContext items={group.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <ul className="grocery-list" aria-label={group.section ? group.section.name : 'Items to buy'}>
                {group.items.map(item => (
                  <GroceryItem
                    key={item.id}
                    item={item}
                    onToggle={onToggle}
                    onDelete={onDelete}
                  />
                ))}
              </ul>
            </SortableContext>
          </section>
        ))}

        {purchased.length > 0 && (
          <section className="purchased-section">
            <h2 className="section-heading">Purchased ({purchased.length})</h2>
            <SortableContext items={purchased.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <ul className="grocery-list" aria-label="Purchased items">
                {purchased.map(item => (
                  <GroceryItem
                    key={item.id}
                    item={item}
                    onToggle={onToggle}
                    onDelete={onDelete}
                  />
                ))}
              </ul>
            </SortableContext>
          </section>
        )}
      </div>
    </DndContext>
  )
}

export default GroceryList
