import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import GroceryItem from './GroceryItem'

function GroceryList({ items, onToggle, onReorder, onDelete }) {
  const sensors = useSensors(useSensor(PointerSensor))

  if (items.length === 0) {
    return <p className="empty-state">Your list is empty. Add an item above.</p>
  }

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  const unpurchased = items.filter(item => !item.purchased)
  const purchased = items.filter(item => item.purchased)

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grocery-list-wrapper">
        {unpurchased.length > 0 && (
          <SortableContext items={unpurchased.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="grocery-list" aria-label="Items to buy">
              {unpurchased.map(item => (
                <GroceryItem
                  key={item.id}
                  item={item}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </SortableContext>
        )}

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
