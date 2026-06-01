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
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import GroceryItem from './GroceryItem'

const OTHER_KEY = '__other__'
const SECTION_PREFIX = 'section:'

function ItemList({ items, label, onToggle, onDelete }) {
  return (
    <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
      <ul className="grocery-list" aria-label={label}>
        {items.map(item => (
          <GroceryItem key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />
        ))}
      </ul>
    </SortableContext>
  )
}

function SortableSection({ section, items, onToggle, onDelete, onDeleteSection }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: SECTION_PREFIX + section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  }

  return (
    <section ref={setNodeRef} style={style} className="grocery-section">
      <div className="section-heading-row">
        <span
          className="drag-handle section-drag-handle"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder section ${section.name}`}
        >
          ⠿
        </span>
        <h2 className="section-heading">{section.name}</h2>
        {onDeleteSection && (
          <button
            type="button"
            className="btn-icon btn-delete-section"
            onClick={() => onDeleteSection(section.id)}
            aria-label={`Delete section ${section.name}`}
            title="Delete section"
          >
            ✕
          </button>
        )}
      </div>
      <ItemList items={items} label={section.name} onToggle={onToggle} onDelete={onDelete} />
    </section>
  )
}

function GroceryList({
  items,
  sections = [],
  onToggle,
  onReorder,
  onReorderSections,
  onDelete,
  onDeleteSection,
}) {
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

  // Display groups for unpurchased items: each section (with items) then "Other".
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

  const sectionSortableIds = groups
    .filter(g => g.section)
    .map(g => SECTION_PREFIX + g.section.id)

  function groupKeyOf(itemId) {
    const item = items.find(i => i.id === itemId)
    if (!item) return null
    return item.section_id && sectionIds.has(item.section_id) ? item.section_id : OTHER_KEY
  }

  // Restrict collisions to like-with-like: when dragging a section, only other
  // sections are drop targets; when dragging an item, only items in the same group.
  // Without this, the large section containers and items in other groups fight over
  // the drop target and the list jumps around.
  function collisionDetection(args) {
    const activeId = String(args.active.id)
    const draggingSection = activeId.startsWith(SECTION_PREFIX)
    const activeGroup = draggingSection ? null : groupKeyOf(activeId)
    const droppableContainers = args.droppableContainers.filter(c => {
      const isSection = String(c.id).startsWith(SECTION_PREFIX)
      if (draggingSection) return isSection
      if (isSection) return false
      return groupKeyOf(c.id) === activeGroup
    })
    return closestCenter({ ...args, droppableContainers })
  }

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeIsSection = String(active.id).startsWith(SECTION_PREFIX)
    const overIsSection = String(over.id).startsWith(SECTION_PREFIX)

    // Reordering whole sections.
    if (activeIsSection && overIsSection) {
      const activeId = String(active.id).slice(SECTION_PREFIX.length)
      const overId = String(over.id).slice(SECTION_PREFIX.length)
      const oldIndex = orderedSections.findIndex(s => s.id === activeId)
      const newIndex = orderedSections.findIndex(s => s.id === overId)
      if (oldIndex === -1 || newIndex === -1) return
      onReorderSections(arrayMove(orderedSections, oldIndex, newIndex))
      return
    }

    // Never mix the two kinds of drag.
    if (activeIsSection !== overIsSection) return

    // Reordering items within a single section group.
    if (groupKeyOf(active.id) !== groupKeyOf(over.id)) return
    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
      <div className="grocery-list-wrapper">
        <SortableContext items={sectionSortableIds} strategy={verticalListSortingStrategy}>
          {groups.map(group =>
            group.section ? (
              <SortableSection
                key={group.key}
                section={group.section}
                items={group.items}
                onToggle={onToggle}
                onDelete={onDelete}
                onDeleteSection={onDeleteSection}
              />
            ) : (
              <section key={group.key} className="grocery-section">
                {groups.length > 1 && <h2 className="section-heading">Other</h2>}
                <ItemList items={group.items} label="Items to buy" onToggle={onToggle} onDelete={onDelete} />
              </section>
            )
          )}
        </SortableContext>

        {purchased.length > 0 && (
          <section className="purchased-section">
            <h2 className="section-heading">Purchased ({purchased.length})</h2>
            <ItemList items={purchased} label="Purchased items" onToggle={onToggle} onDelete={onDelete} />
          </section>
        )}
      </div>
    </DndContext>
  )
}

export default GroceryList
