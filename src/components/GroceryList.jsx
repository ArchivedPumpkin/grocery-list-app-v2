import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
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
const DROPZONE_PREFIX = 'dropzone:'

// Placeholder for a section with no items. Doubles as a drop target so items
// can be dragged into otherwise-empty sections.
function EmptyDropZone({ id }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`section-dropzone${isOver ? ' over' : ''}`}
      aria-hidden="true"
    >
      Drag items here
    </div>
  )
}

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
      {items.length > 0 ? (
        <ItemList items={items} label={section.name} onToggle={onToggle} onDelete={onDelete} />
      ) : (
        <EmptyDropZone id={DROPZONE_PREFIX + section.id} />
      )}
    </section>
  )
}

function GroceryList({
  items,
  sections = [],
  onToggle,
  onReorder,
  onReorderSections,
  onMoveItem,
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
  // While dragging an item across sections we keep an optimistic working copy so
  // the target section's items can part to make room (each section is its own
  // SortableContext, so the dragged item must actually join it to animate).
  const [overrideItems, setOverrideItems] = useState(null)
  const displayItems = overrideItems ?? items

  if (items.length === 0 && sections.length === 0) {
    return <p className="empty-state">Your list is empty. Add an item above.</p>
  }

  const unpurchased = displayItems.filter(item => !item.purchased)
  const purchased = displayItems.filter(item => item.purchased)

  const sectionIds = new Set(sections.map(s => s.id))
  const orderedSections = [...sections].sort((a, b) => a.position - b.position)

  // Display groups for unpurchased items: every section (shown even when empty,
  // as a drop zone) then "Other". Empty sections can be removed from the form's
  // section picker.
  const groups = []
  for (const section of orderedSections) {
    const groupItems = unpurchased.filter(i => i.section_id === section.id)
    groups.push({ key: section.id, section, items: groupItems })
  }
  const otherItems = unpurchased.filter(i => !i.section_id || !sectionIds.has(i.section_id))
  if (otherItems.length > 0 || orderedSections.length > 0) {
    groups.push({ key: OTHER_KEY, section: null, items: otherItems })
  }

  const sectionSortableIds = groups
    .filter(g => g.section)
    .map(g => SECTION_PREFIX + g.section.id)

  function groupKeyOf(itemId) {
    const item = displayItems.find(i => i.id === itemId)
    if (!item) return null
    return item.section_id && sectionIds.has(item.section_id) ? item.section_id : OTHER_KEY
  }

  function purchasedOf(itemId) {
    const item = displayItems.find(i => i.id === itemId)
    return item ? !!item.purchased : null
  }

  // Restrict collisions to like-with-like: when dragging a section, only other
  // sections are drop targets; when dragging an item, only items sharing its
  // purchased status (so items can move freely between section groups, but the
  // unpurchased and purchased lists never fight over the same drop target).
  function collisionDetection(args) {
    const activeId = String(args.active.id)
    const draggingSection = activeId.startsWith(SECTION_PREFIX)
    const activePurchased = draggingSection ? null : purchasedOf(activeId)
    const droppableContainers = args.droppableContainers.filter(c => {
      const id = String(c.id)
      const isSection = id.startsWith(SECTION_PREFIX)
      const isDropzone = id.startsWith(DROPZONE_PREFIX)
      if (draggingSection) return isSection
      if (isSection) return false
      // Empty-section drop zones only apply to unpurchased items.
      if (isDropzone) return activePurchased === false
      return purchasedOf(c.id) === activePurchased
    })
    return closestCenter({ ...args, droppableContainers })
  }

  // Resolve the section group a drop target belongs to (an item, an empty
  // section's drop zone, or nothing).
  function targetGroupOf(overId) {
    if (overId.startsWith(DROPZONE_PREFIX)) return overId.slice(DROPZONE_PREFIX.length)
    if (overId.startsWith(SECTION_PREFIX)) return null
    return groupKeyOf(overId)
  }

  // Move an unpurchased item between sections live, so the destination section
  // animates open. Within-section reordering is handled by the sortable itself.
  function handleDragOver(event) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    if (activeId.startsWith(SECTION_PREFIX)) return

    const base = overrideItems ?? items
    const activeItem = base.find(i => i.id === activeId)
    if (!activeItem || activeItem.purchased) return

    const overId = String(over.id)
    const targetGroup = targetGroupOf(overId)
    if (targetGroup === null && !overId.startsWith(DROPZONE_PREFIX)) return
    if (groupKeyOf(activeId) === targetGroup) return

    const oldIndex = base.findIndex(i => i.id === activeId)
    const overIndex = overId.startsWith(DROPZONE_PREFIX)
      ? base.length - 1
      : base.findIndex(i => i.id === overId)
    if (overIndex === -1) return

    const targetSectionId = targetGroup === OTHER_KEY ? null : targetGroup
    const next = arrayMove(base, oldIndex, overIndex).map(it =>
      it.id === activeId ? { ...it, section_id: targetSectionId } : it
    )
    setOverrideItems(next)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    const working = overrideItems
    setOverrideItems(null)
    if (!over) return

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
    if (activeIsSection) return

    // The item crossed sections during the drag: commit the working copy, with a
    // final reorder so it lands exactly where it was dropped within the section.
    if (working) {
      const oldIndex = working.findIndex(i => i.id === active.id)
      if (oldIndex === -1) return
      const overId = String(over.id)
      let finalItems = working
      if (!overId.startsWith(DROPZONE_PREFIX) && !overIsSection) {
        const newIndex = working.findIndex(i => i.id === over.id)
        if (newIndex !== -1) finalItems = arrayMove(working, oldIndex, newIndex)
      }
      onMoveItem(finalItems, active.id)
      return
    }

    // No section change (or a keyboard drag with no drag-over): plain reorder.
    if (active.id === over.id) return
    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setOverrideItems(null)}
    >
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
                {group.items.length > 0 ? (
                  <ItemList items={group.items} label="Items to buy" onToggle={onToggle} onDelete={onDelete} />
                ) : (
                  <EmptyDropZone id={DROPZONE_PREFIX + OTHER_KEY} />
                )}
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
