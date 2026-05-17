import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import GroceryForm from './components/GroceryForm'
import GroceryList from './components/GroceryList'
import ListSwitcher from './components/ListSwitcher'
import ManageMembers from './components/ManageMembers'
import Account from './components/Account'
import './App.css'

const SELECTED_LIST_KEY = 'grocery.selectedListId'
const THEME_KEY = 'grocery.theme'

function initialTheme() {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function App() {
  const [session, setSession] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [lists, setLists] = useState([])
  const [listsLoaded, setListsLoaded] = useState(false)
  const [currentListId, setCurrentListId] = useState(() => localStorage.getItem(SELECTED_LIST_KEY))
  const [items, setItems] = useState([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [notice, setNotice] = useState(null)
  const [theme, setTheme] = useState(initialTheme)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('list')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

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
    if (!session) return
    let cancelled = false
    supabase
      .from('profiles')
      .select('id, username, discriminator')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Failed to load profile:', error)
          return
        }
        setProfile(data)
      })
    return () => { cancelled = true }
  }, [session])

  const loadLists = useCallback(async () => {
    const { data, error } = await supabase
      .from('lists')
      .select('id, name, owner_id, is_private, created_at')
      .order('created_at', { ascending: true })
    if (error) {
      console.error('Failed to load lists:', error)
      return { lists: [], error }
    }
    return { lists: data ?? [], error: null }
  }, [])

  useEffect(() => {
    if (!session) {
      setLists([])
      setListsLoaded(false)
      setCurrentListId(null)
      setItems([])
      setProfile(null)
      setView('list')
      return
    }
    let cancelled = false
    ;(async () => {
      const params = new URLSearchParams(window.location.search)
      const inviteToken = params.get('invite')

      let joinedListId = null
      if (inviteToken) {
        const { data, error } = await supabase.rpc('join_list_with_token', { p_token: inviteToken })
        if (error) {
          setNotice({ type: 'error', text: 'Invite link is invalid or has been revoked.' })
        } else {
          joinedListId = data
          setNotice({ type: 'success', text: 'You joined the list.' })
        }
        params.delete('invite')
        const query = params.toString()
        const url = window.location.pathname + (query ? `?${query}` : '')
        window.history.replaceState({}, '', url)
      }

      const { lists: loaded, error: loadErr } = await loadLists()
      let nextLists = loaded

      if (!loadErr && nextLists.length === 0 && !joinedListId) {
        const { data, error } = await supabase
          .from('lists')
          .insert({ name: 'My list', owner_id: session.user.id, is_private: true })
          .select()
          .single()
        if (error) {
          console.error('Failed to create default list:', error)
          setNotice({ type: 'error', text: `Could not create default list: ${error.message}` })
        } else if (data) {
          nextLists = [data]
        }
      } else if (loadErr) {
        setNotice({ type: 'error', text: `Could not load lists: ${loadErr.message}` })
      }

      if (cancelled) return
      setLists(nextLists)
      setListsLoaded(true)

      const stored = localStorage.getItem(SELECTED_LIST_KEY)
      const preferred =
        joinedListId ??
        (stored && nextLists.some(l => l.id === stored) ? stored : null) ??
        nextLists[0]?.id ??
        null
      setCurrentListId(preferred)
    })()
    return () => { cancelled = true }
  }, [session, loadLists])

  useEffect(() => {
    if (currentListId) localStorage.setItem(SELECTED_LIST_KEY, currentListId)
  }, [currentListId])

  useEffect(() => {
    if (!session || !currentListId) {
      setItems([])
      return
    }
    let cancelled = false
    setItemsLoading(true)
    supabase
      .from('grocery_items')
      .select('*')
      .eq('list_id', currentListId)
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        setItemsLoading(false)
        if (error) {
          console.error('Failed to load items:', error)
          return
        }
        setItems(data ?? [])
      })
    return () => { cancelled = true }
  }, [session, currentListId])

  async function addItem(title, description) {
    if (!currentListId) return
    const position = items.length > 0
      ? Math.max(...items.map(i => i.position)) + 1
      : 0
    const { data, error } = await supabase
      .from('grocery_items')
      .insert({
        user_id: session.user.id,
        list_id: currentListId,
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

  async function createList(name) {
    const { data, error } = await supabase
      .from('lists')
      .insert({ name, owner_id: session.user.id, is_private: false })
      .select()
      .single()
    if (error) {
      console.error('Failed to create list:', error)
      setNotice({ type: 'error', text: `Could not create list: ${error.message}` })
      return
    }
    setLists(prev => [...prev, data])
    setCurrentListId(data.id)
  }

  async function handleLeaveList() {
    setManageOpen(false)
    const remaining = lists.filter(l => l.id !== currentListId)
    setLists(remaining)
    setCurrentListId(remaining[0]?.id ?? null)
  }

  async function handleSignOut() {
    localStorage.removeItem(SELECTED_LIST_KEY)
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

  const currentList = lists.find(l => l.id === currentListId)

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-row">
          <div className="header-title">
            <h1>Grocery List</h1>
            {view === 'list' && listsLoaded && (
              <ListSwitcher
                lists={lists}
                currentListId={currentListId}
                onSelect={setCurrentListId}
                onCreate={createList}
              />
            )}
            {view === 'list' && currentList && !currentList.is_private && (
              <button
                type="button"
                className="btn-add-members"
                onClick={() => setManageOpen(true)}
              >
                Add members
              </button>
            )}
          </div>
          <div className="header-user">
            <button
              className="btn-theme"
              onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <button
              type="button"
              className="user-handle"
              onClick={() => setView('account')}
              title="Account settings"
            >
              {profile ? `${profile.username}#${profile.discriminator}` : session.user.email}
            </button>
            <button className="btn-signout" onClick={handleSignOut}>Sign out</button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {notice && (
          <div className={`notice notice-${notice.type}`}>
            <span>{notice.text}</span>
            <button className="btn-link" onClick={() => setNotice(null)}>Dismiss</button>
          </div>
        )}

        {view === 'account' ? (
          <Account
            session={session}
            profile={profile}
            onProfileChange={setProfile}
            onBack={() => setView('list')}
          />
        ) : !listsLoaded ? (
          <p className="empty-state">Loading lists…</p>
        ) : !currentList ? (
          <p className="empty-state">You don't belong to any lists yet. Use the <strong>Grocery List ▾</strong> menu above to create one.</p>
        ) : (
          <>
            <GroceryForm onAdd={addItem} />
            {itemsLoading ? (
              <p className="empty-state">Loading items…</p>
            ) : (
              <GroceryList
                items={items}
                onToggle={togglePurchased}
                onReorder={reorderItems}
                onDelete={deleteItem}
              />
            )}
          </>
        )}
      </main>

      {manageOpen && currentList && (
        <ManageMembers
          list={currentList}
          currentUserId={session.user.id}
          onClose={() => setManageOpen(false)}
          onLeave={handleLeaveList}
        />
      )}
    </div>
  )
}

export default App
