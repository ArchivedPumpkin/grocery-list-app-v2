# Grocery List

A shared grocery list that stays in sync in real time. Built with React and Vite, backed by Supabase (Postgres, auth, row-level security, Realtime). It can be installed as a PWA, and the app shell works offline.

This is the second version of the project, hence `v2`.

## Features

**Lists and items**
- Multiple lists per user, switched from a dropdown in the header.
- Items have a title, an optional description and an optional section. Checked-off items move to a separate "Purchased" group.
- Items can be reordered by drag and drop (`@dnd-kit`), with a mouse, touch or the keyboard.
- "Clear list" removes every item after a confirmation dialog.

**Sections**
- Items can be grouped into sections such as Dairy & Eggs, Bakery or Frozen. Sections can be reordered by dragging too.
- Dragging an item into another section moves it there. Empty sections show a drop zone.
- The section picker offers a built-in set of names plus any names typed before. Custom names and hidden built-ins are stored in `localStorage`, so they belong to the device, not the account.

**Sharing and real-time sync**
- Lists that aren't private can have members. Add someone by email (they need an existing account) or send an invite link (`?invite=<token>`). Links can be revoked at any time.
- Members can leave a list. The owner can remove other members.
- When several people have the same list open, adding, editing, checking off, reordering, moving or deleting items and sections shows up on every screen straight away. After a lost connection, the app reloads the list once to catch up.

**Guest mode**
- The app works without an account. Guest lists, items and sections are stored in `localStorage` under `grocery.guest`, using the same shape as the Supabase tables, so the same UI code handles both.
- On first sign-in, if guest data exists, the app offers to merge it into the account's private "My list" (items with duplicate titles are skipped) or discard it.

**Accounts**
- Email and password sign-in through Supabase.
- Users are identified by a Discord-style handle, `username#1234`. Usernames don't have to be unique; the four-digit tag makes the pair unique. Changing a username goes through the `update_username` RPC, which assigns a new tag and rejects the name if all its tags are taken.
- Passwords can be changed in the app. Changing an email address isn't available yet.

**Look and offline support**
- Light and dark themes. The default follows the system setting, and the user's choice is saved in `localStorage`.
- A web app manifest and a service worker. Page loads try the network first and fall back to the cached shell; static assets are served from cache and refreshed in the background. Requests to Supabase (API, auth, Realtime) are never cached.

## Getting started

Requirements: Node.js and a Supabase project with the schema described under [Backend](#backend).

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create `.env.local` in the project root (it is gitignored):

   ```sh
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```

   `src/lib/supabase.js` throws at startup if either value is missing.

3. Turn on Realtime for the tables that sync. Run this once in the Supabase SQL Editor:

   ```sql
   alter publication supabase_realtime add table public.grocery_items, public.sections;
   ```

   Without it the app still works, but other people's changes only appear after a refresh.

4. Start the dev server:

   ```sh
   npm run dev
   ```

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## Project layout

```
src/
  App.jsx              state, data loading, real-time sync, guest/signed-in branching
  components/          Auth, Account, UserMenu, ListSwitcher, ManageMembers,
                       MergePrompt, ConfirmModal, GroceryForm, SectionPicker,
                       GroceryList, GroceryItem
  lib/
    supabase.js        Supabase client, configured from VITE_SUPABASE_* variables
    guestStore.js      localStorage copy of the Supabase data model
    sections.js        built-in and remembered section names
public/
  sw.js, manifest.webmanifest, favicon.svg
```

`App.jsx` holds all list, item and section state. For each operation it calls either Supabase or `guestStore`, depending on whether the user is signed in. The components only display data and don't know which backend is in use.

Changes are optimistic: the screen updates first, and the change is rolled back if the request fails.

For signed-in users, `App.jsx` also subscribes to a Supabase Realtime channel for the open list. Inserts and updates are filtered by `list_id`. Supabase can't filter delete events by column, so the app receives the ids of all deleted rows and ignores those that aren't on screen. The app's own changes also come back on this channel; they are merged by id, so nothing is duplicated.

## Backend

Everything runs from the client with the anon key. Row-level security controls who can read and change what.

**Tables**
- `profiles`: id, username, discriminator
- `lists`: owner_id, is_private
- `list_members`
- `list_invites`: token, revoked
- `sections`: list_id, name, position
- `grocery_items`: list_id, user_id, title, description, section_id, purchased, position

**RPCs:** `join_list_with_token`, `add_member_by_email`, `list_member_emails` and `update_username`. These handle the operations that need to read across users or enforce rules that RLS alone can't.

**Realtime:** `grocery_items` and `sections` are in the `supabase_realtime` publication. Realtime respects the same RLS policies, so people only receive changes for lists they can read.

The schema and policies live in the Supabase project, not in this repo.

## Limitations

- Changes to lists themselves (new lists, renames, membership) don't sync live. Other members see them after a refresh.
- Guest data stays in one browser and never syncs.
- There are no automated tests.

## Stack

React 19, Vite 8, `@supabase/supabase-js` v2, `@dnd-kit`, `react-icons` and ESLint 10. Plain CSS with no framework. JavaScript, no TypeScript.
