// Common grocery sections offered as built-in options in the section dropdown.
export const PREDEFINED_SECTIONS = [
  'Dairy & Eggs',
  'Meat & Seafood',
  'Bakery',
  'Frozen',
  'Pantry',
  'Beverages',
  'Household',
]

// User-written section names are remembered so they appear as options going forward,
// just like the predefined ones. Stored device-wide (independent of any single list).
const CUSTOM_KEY = 'grocery.customSections'

export function loadCustomSectionNames() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter(n => typeof n === 'string') : []
  } catch {
    return []
  }
}

export function addCustomSectionName(name) {
  const trimmed = name.trim()
  if (!trimmed) return
  const names = loadCustomSectionNames()
  if (names.some(n => n.toLowerCase() === trimmed.toLowerCase())) return
  names.push(trimmed)
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(names))
}

export function removeCustomSectionName(name) {
  const lower = name.trim().toLowerCase()
  const names = loadCustomSectionNames().filter(n => n.toLowerCase() !== lower)
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(names))
}
