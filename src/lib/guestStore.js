const KEY = 'grocery.guest'
const DEFAULT_LIST_NAME = 'My list'

function emptyState() {
  return { lists: [], items: {}, sections: {} }
}

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw)
    return {
      lists: Array.isArray(parsed.lists) ? parsed.lists : [],
      items: parsed.items && typeof parsed.items === 'object' ? parsed.items : {},
      sections: parsed.sections && typeof parsed.sections === 'object' ? parsed.sections : {},
    }
  } catch {
    return emptyState()
  }
}

function write(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

function uuid() {
  return crypto.randomUUID()
}

function nowIso() {
  return new Date().toISOString()
}

function makeList(name) {
  return {
    id: uuid(),
    name,
    owner_id: null,
    is_private: true,
    created_at: nowIso(),
  }
}

export function hasGuestItems() {
  const { items } = read()
  return Object.values(items).some(list => Array.isArray(list) && list.length > 0)
}

export function ensureGuestLists() {
  const state = read()
  if (state.lists.length === 0) {
    const list = makeList(DEFAULT_LIST_NAME)
    state.lists = [list]
    state.items[list.id] = []
    write(state)
  }
  return state.lists
}

export function loadGuestItems(listId) {
  const state = read()
  return state.items[listId] ?? []
}

export function createGuestList(name) {
  const state = read()
  const list = makeList(name)
  state.lists.push(list)
  state.items[list.id] = []
  state.sections[list.id] = []
  write(state)
  return list
}

export function loadGuestSections(listId) {
  const state = read()
  return state.sections[listId] ?? []
}

export function addGuestSection(listId, name) {
  const state = read()
  const existing = state.sections[listId] ?? []
  const position = existing.length > 0 ? Math.max(...existing.map(s => s.position)) + 1 : 0
  const section = {
    id: uuid(),
    list_id: listId,
    name,
    position,
    created_at: nowIso(),
  }
  state.sections[listId] = [...existing, section]
  write(state)
  return section
}

export function reorderGuestSections(listId, sections) {
  const state = read()
  state.sections[listId] = sections.map((s, idx) => ({ ...s, position: idx }))
  write(state)
}

export function deleteGuestSection(listId, id) {
  const state = read()
  const sections = state.sections[listId] ?? []
  state.sections[listId] = sections.filter(s => s.id !== id)
  const items = state.items[listId] ?? []
  state.items[listId] = items.map(it =>
    it.section_id === id ? { ...it, section_id: null } : it
  )
  write(state)
}

export function addGuestItem(listId, { title, description, section_id = null }) {
  const state = read()
  const existing = state.items[listId] ?? []
  const position = existing.length > 0 ? Math.max(...existing.map(i => i.position)) + 1 : 0
  const item = {
    id: uuid(),
    list_id: listId,
    title,
    description: description || null,
    section_id: section_id || null,
    purchased: false,
    position,
    created_at: nowIso(),
  }
  state.items[listId] = [...existing, item]
  write(state)
  return item
}

export function updateGuestItem(listId, id, patch) {
  const state = read()
  const list = state.items[listId] ?? []
  state.items[listId] = list.map(it => (it.id === id ? { ...it, ...patch } : it))
  write(state)
}

export function deleteGuestItem(listId, id) {
  const state = read()
  const list = state.items[listId] ?? []
  state.items[listId] = list.filter(it => it.id !== id)
  write(state)
}

export function clearGuestItems(listId) {
  const state = read()
  state.items[listId] = []
  write(state)
}

export function reorderGuestItems(listId, items) {
  const state = read()
  state.items[listId] = items.map((it, idx) => ({ ...it, position: idx }))
  write(state)
}

export function readAllGuestItems() {
  const { items } = read()
  return Object.values(items).flat()
}

export function clearGuestData() {
  localStorage.removeItem(KEY)
}
