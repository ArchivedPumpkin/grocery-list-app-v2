# Grocery List

A shared grocery list web app. React + Vite on the front end, Supabase (Postgres, auth, row-level security) on the back end. Installable as a PWA and usable offline for the app shell.

Second take on the idea — hence `v2`.

## What it does

**Lists and items**
- Multiple lists per user, switched from a dropdown in the header.
- Items have a title and an optional description, and get checked off into a separate "Purchased" group.
- Drag-and-drop reordering of items (`@dnd-kit`), with pointer and keyboard sensors.
- "Clear list" wipes all items behind a confirmation dialog.

**Sections**
- Items can be filed under sections (Dairy & Eggs, Bakery, Frozen, …) that are themselves reorderable by dragging.
- Dragging an item into another section works live — empty sections render a drop zone so they can receive items.
- The section picker offers a built-in set plus any names typed before; both the custom names and the hidden built-ins live in `localStorage`, so the picker is per-device rather than per-account.

**Guest mode**
- The app is fully usable without an account. Lists, items and sections are kept in `localStorage` under `grocery.guest` in the same shape the Supabase tables use, so the same UI code drives both paths.
- On first sign-in, if local data exists, a prompt offers to merge it into the account's private "My list" (duplicate titles are skipped) or discard it.

**Sharing**
- Non-private lists can have members. Add by email (the account must already exist) or generate a single-use-per-person invite link (`?invite=<token>`), revocable at any time.
- Members can remove themselves (leave) or, if they own the list, remove others.

**Accounts**
- Email/password auth via Supabase.
- Identity is a Discord-style handle: `username#1234`. Usernames aren't unique; the 4-digit discriminator makes the pair unique. Changing a username goes through the `update_username` RPC, which reassigns a tag and rejects a username whose tag space is full.
- Password changes in-app. Email changes are stubbed as "coming soon".

**Presentation**
- Light/dark theme, defaulting to `prefers-color-scheme` and remembered in `localStorage`.
- Web app manifest and a service worker: network-first for navigation with a cached shell fallback, stale-while-revalidate for static assets, and cross-origin requests (Supabase API, auth, realtime) never cached.

## Layout

```
src/
  App.jsx              state, data flow, guest/authenticated branching
  components/          Auth, Account, UserMenu, ListSwitcher, ManageMembers,
                       MergePrompt, ConfirmModal, GroceryForm, SectionPicker,
                       GroceryList, GroceryItem
  lib/
    supabase.js        client, reads VITE_SUPABASE_* from the environment
    guestStore.js      localStorage mirror of the Supabase data model
    sections.js        predefined + remembered section names
public/
  sw.js, manifest.webmanifest, favicon.svg
```

`App.jsx` holds all the list/item/section state and picks between the Supabase and `guestStore` implementations per operation; the components below it are presentational and don't know which backend is in play. Mutations are optimistic — local state updates first and rolls back if the request fails.

## Backend shape

Supabase, driven entirely from the client through the anon key and RLS.

Tables: `profiles` (id, username, discriminator), `lists` (owner_id, is_private), `list_members`, `list_invites` (token, revoked), `sections` (list_id, name, position), `grocery_items` (list_id, user_id, title, description, section_id, purchased, position).

RPCs: `join_list_with_token`, `add_member_by_email`, `list_member_emails`, `update_username` — the operations that need to read across users or enforce invariants that RLS alone can't.

Schema and policies live in the Supabase project, not in this repo.

## Config

`.env.local` (gitignored) supplies `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; `lib/supabase.js` throws at startup if either is missing.

## Stack

React 19, Vite 8, `@supabase/supabase-js` v2, `@dnd-kit`, `react-icons`, ESLint 10. Plain CSS, no framework. JavaScript, no TypeScript, no tests.
