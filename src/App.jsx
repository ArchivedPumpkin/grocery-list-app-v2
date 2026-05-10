import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import GroceryForm from './components/GroceryForm'
import GroceryList from './components/GroceryList'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [items, setItems] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setItems([])
      return
    }
    let cancelled = false
    supabase
      .from('grocery_items')
      .select('*')
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Failed to load items:', error)
          return
        }
        setItems(data ?? [])
      })
    return () => { cancelled = true }
  }, [session])

  async function addItem(title, description) {
    const position = items.length > 0
      ? Math.max(...items.map(i => i.position)) + 1
      : 0
    const { data, error } = await supabase
      .from('grocery_items')
      .insert({
        user_id: session.user.id,
        title,
        description: description || null,
        position,
      })
      .select()
      .single()
    if (error) {
      console.error('Failed to add item:', error)
      return
    }
    setItems(prev => [...prev, data])
  }

  async function togglePurchased(id) {
    const item = items.find(i => i.id === id)
    if (!item) return
    const newPurchased = !item.purchased
    setItems(prev =>
      prev.map(i => i.id === id ? { ...i, purchased: newPurchased } : i)
    )
    const { error } = await supabase
      .from('grocery_items')
      .update({ purchased: newPurchased })
      .eq('id', id)
    if (error) {
      console.error('Failed to toggle item:', error)
      setItems(prev =>
        prev.map(i => i.id === id ? { ...i, purchased: !newPurchased } : i)
      )
    }
  }

  async function reorderItems(newItems) {
    const previous = items
    const repositioned = newItems.map((item, index) => ({ ...item, position: index }))
    setItems(repositioned)
    const results = await Promise.all(
      repositioned.map(item =>
        supabase.from('grocery_items').update({ position: item.position }).eq('id', item.id)
      )
    )
    const failure = results.find(r => r.error)
    if (failure) {
      console.error('Failed to reorder items:', failure.error)
      setItems(previous)
    }
  }

  async function deleteItem(id) {
    const previous = items
    setItems(prev => prev.filter(item => item.id !== id))
    const { error } = await supabase
      .from('grocery_items')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Failed to delete item:', error)
      setItems(previous)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (!authChecked) {
    return (
      <div className="app">
        <p className="empty-state">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-row">
          <h1>Grocery List</h1>
          <div className="header-user">
            <span className="user-email">{session.user.email}</span>
            <button className="btn-signout" onClick={handleSignOut}>Sign out</button>
          </div>
        </div>
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
