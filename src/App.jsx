import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import {
  ensureGuestLists,
  loadGuestItems,
  createGuestList,
  addGuestItem,
  updateGuestItem,
  deleteGuestItem,
  reorderGuestItems,
  readAllGuestItems,
  clearGuestData,
  hasGuestItems,
} from './lib/guestStore'
import Auth from './components/Auth'
import GroceryForm from './components/GroceryForm'
import GroceryList from './components/GroceryList'
import ListSwitcher from './components/ListSwitcher'
import ManageMembers from './components/ManageMembers'
import Account from './components/Account'
import UserMenu from './components/UserMenu'
import MergePrompt from './components/MergePrompt'
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
  const [mergePromptOpen, setMergePromptOpen] = useState(false)
  const [merging, setMerging] = useState(false)

  const isGuest = !session

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
    if (!authChecked) return

    if (!session) {
      const guestLists = ensureGuestLists()
      setLists(guestLists)
      setListsLoaded(true)
      setProfile(null)
      setManageOpen(false)
      setView(v => (v === 'account' ? 'list' : v))
      const stored = localStorage.getItem(SELECTED_LIST_KEY)
      const preferred =
        (stored && guestLists.some(l => l.id === stored) ? stored : null) ??
        guestLists[0]?.id ??
        null
      setCurrentListId(preferred)
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

      const guestHasItems = hasGuestItems()

      const { lists: loaded, error: loadErr } = await loadLists()
      let nextLists = loaded

      if (!loadErr && nextLists.length === 0 && !joinedListId && !guestHasItems) {
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

      if (guestHasItems) setMergePromptOpen(true)
    })()
    return () => { cancelled = true }
  }, [session, authChecked, loadLists])

  useEffect(() => {
    if (currentListId) localStorage.setItem(SELECTED_LIST_KEY, currentListId)
  }, [currentListId])

  useEffect(() => {
    if (!currentListId) {
      setItems([])
      return
    }
    if (isGuest) {
      setItems(loadGuestItems(currentListId))
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
  }, [isGuest, currentListId])

  async function addItem(title, description) {
    if (!currentListId) return
    if (isGuest) {
      const item = addGuestItem(currentListId, { title, description })
      setItems(prev => [...prev, item])
      return
    }
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
    if (isGuest) {
      updateGuestItem(currentListId, id, { purchased: newPurchased })
      return
    }
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
    if (isGuest) {
      reorderGuestItems(currentListId, repositioned)
      return
    }
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
    if (isGuest) {
      deleteGuestItem(currentListId, id)
      return
    }
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
    if (isGuest) {
      const list = createGuestList(name)
      setLists(prev => [...prev, list])
      setCurrentListId(list.id)
      return
    }
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

  async function handleMergeConfirm() {
    setMerging(true)
    const guestItems = readAllGuestItems()

    let { data: targetList, error: findErr } = await supabase
      .from('lists')
      .select('id, name, owner_id, is_private, created_at')
      .eq('owner_id', session.user.id)
      .eq('is_private', true)
      .eq('name', 'My list')
      .maybeSingle()
    if (findErr) {
      console.error('Failed to find target list:', findErr)
      setNotice({ type: 'error', text: `Could not merge: ${findErr.message}` })
      setMerging(false)
      return
    }

    if (!targetList) {
      const { data: created, error: createErr } = await supabase
        .from('lists')
        .insert({ name: 'My list', owner_id: session.user.id, is_private: true })
        .select()
        .single()
      if (createErr) {
        console.error('Failed to create target list:', createErr)
        setNotice({ type: 'error', text: `Could not merge: ${createErr.message}` })
        setMerging(false)
        return
      }
      targetList = created
      setLists(prev => prev.some(l => l.id === created.id) ? prev : [...prev, created])
    }

    const { data: existing, error: existingErr } = await supabase
      .from('grocery_items')
      .select('title, position')
      .eq('list_id', targetList.id)
    if (existingErr) {
      console.error('Failed to read target items:', existingErr)
      setNotice({ type: 'error', text: `Could not merge: ${existingErr.message}` })
      setMerging(false)
      return
    }

    const existingTitles = new Set((existing ?? []).map(e => e.title.trim().toLowerCase()))
    const basePos = (existing ?? []).length > 0 ? Math.max(...existing.map(e => e.position)) : -1

    const seen = new Set(existingTitles)
    const toInsert = []
    for (const it of guestItems) {
      const key = it.title.trim().toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      toInsert.push(it)
    }

    let added = 0
    if (toInsert.length > 0) {
      const rows = toInsert.map((it, idx) => ({
        user_id: session.user.id,
        list_id: targetList.id,
        title: it.title,
        description: it.description ?? null,
        purchased: !!it.purchased,
        position: basePos + 1 + idx,
      }))
      const { error: insertErr } = await supabase.from('grocery_items').insert(rows)
      if (insertErr) {
        console.error('Failed to insert merged items:', insertErr)
        setNotice({ type: 'error', text: `Could not merge: ${insertErr.message}` })
        setMerging(false)
        return
      }
      added = rows.length
    }

    clearGuestData()
    setMerging(false)
    setMergePromptOpen(false)
    setCurrentListId(targetList.id)

    const skipped = guestItems.length - added
    setNotice({
      type: 'success',
      text:
        added === 0
          ? 'Your local items were already in your list.'
          : `Added ${added} item${added === 1 ? '' : 's'} to "My list"${skipped > 0 ? ` (${skipped} duplicate${skipped === 1 ? '' : 's'} skipped)` : ''}.`,
    })

    const { data: refreshed } = await supabase
      .from('grocery_items')
      .select('*')
      .eq('list_id', targetList.id)
      .order('position', { ascending: true })
    setItems(refreshed ?? [])
  }

  async function handleMergeDiscard() {
    clearGuestData()
    setMergePromptOpen(false)
    setNotice({ type: 'success', text: 'Local lists discarded. You\'re now using your account.' })
    if (lists.length === 0) {
      const { data, error } = await supabase
        .from('lists')
        .insert({ name: 'My list', owner_id: session.user.id, is_private: true })
        .select()
        .single()
      if (error) {
        console.error('Failed to create default list:', error)
        return
      }
      setLists([data])
      setCurrentListId(data.id)
    }
  }

  if (!authChecked) {
    return (
      <div className="app">
        <p className="empty-state">Loading…</p>
      </div>
    )
  }

  if (isGuest && view === 'auth') {
    return <Auth onBack={() => setView('list')} />
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
            {view === 'list' && !isGuest && currentList && !currentList.is_private && (
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
            {isGuest ? (
              <button
                type="button"
                className="btn-signin"
                onClick={() => setView('auth')}
              >
                Sign in
              </button>
            ) : (
              <UserMenu
                label={profile ? `${profile.username}#${profile.discriminator}` : session.user.email}
                onAccount={() => setView('account')}
                onSignOut={handleSignOut}
              />
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        {isGuest && view === 'list' && (
          <div className="guest-banner">
            <span>
              You're using Grocery List as a guest — your lists are saved on this device only.
              {' '}
              <button type="button" className="btn-link guest-banner-link" onClick={() => setView('auth')}>
                Sign in to sync across devices
              </button>
            </span>
          </div>
        )}

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

      {manageOpen && !isGuest && currentList && (
        <ManageMembers
          list={currentList}
          currentUserId={session.user.id}
          onClose={() => setManageOpen(false)}
          onLeave={handleLeaveList}
        />
      )}

      {mergePromptOpen && !isGuest && (
        <MergePrompt
          merging={merging}
          onMerge={handleMergeConfirm}
          onDiscard={handleMergeDiscard}
        />
      )}
    </div>
  )
}

export default App
