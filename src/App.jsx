import { useState } from 'react'
import GroceryForm from './components/GroceryForm'
import GroceryList from './components/GroceryList'
import './App.css'

function App() {
  const [items, setItems] = useState([])

  function addItem(title, description) {
    setItems(prev => [
      ...prev,
      { id: crypto.randomUUID(), title, description, purchased: false },
    ])
  }

  function togglePurchased(id) {
    setItems(prev =>
      prev.map(item => item.id === id ? { ...item, purchased: !item.purchased } : item)
    )
  }

  function reorderItems(newItems) {
    setItems(newItems)
  }

  function deleteItem(id) {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Grocery List</h1>
      </header>
      <main className="app-main">
        <GroceryForm onAdd={addItem} />
        <GroceryList
          items={items}
          onToggle={togglePurchased}
          onReorder={reorderItems}
          onDelete={deleteItem}
        />
      </main>
    </div>
  )
}

export default App
