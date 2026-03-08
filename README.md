# My Spreadsheet

A real-time collaborative spreadsheet built from scratch — not a tutorial copy-paste, but a ground-up implementation where every architectural decision was made deliberately. The focus here wasn't on cramming in features, but on making the core experience **fast, snappy, and reliable** — the kind of stuff you only notice when it's missing.

> **26 columns × 50 rows = 1,300 cells** rendered simultaneously, with real-time sync, live cursors, and zero unnecessary re-renders.

---

## Quick Start (for recruiters / reviewers)

Want to run this locally and poke around? Here's everything you need:

### Prerequisites

- **Node.js** v18+
- **npm**
- A **Firebase project** with Firestore and Google Auth enabled

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/msasama/my_spreadsheet.git
cd my_spreadsheet

# 2. Install dependencies
npm install

# 3. Set up environment variables
#    Copy the example file and fill in your Firebase config
cp .env.example .env.local
```

Open `.env.local` and fill in your Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
```

```bash
# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with Google, and you're in.

### Firebase Setup Notes

- Enable **Google sign-in** under Firebase Authentication → Sign-in method
- Create a **Firestore database** (start in test mode for quick testing)
- The app auto-creates the grid structure on first load — no manual collection setup needed

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 |
| Database | Firebase Firestore (real-time) |
| Auth | Firebase Auth (Google OAuth) |
| Formula Engine | mathjs |
| Testing | Vitest |

---

## The Thought Process — Why It's Built This Way

### The Core Problem: 1,300 Cells on Screen

Here's the thing — a spreadsheet renders a **lot** of cells. Like, a LOT. 26 columns × 50 rows = 1,300 individual components all on screen at the same time. And every time someone types into one cell, the naive approach would re-render **all** 1,300 of them.

That's obviously not going to fly. So the entire architecture is designed around one idea: **only touch what actually changed.**

---

### `React.memo` — The Foundation of Performance

Every single `<Cell>` component is wrapped in `React.memo`. But it's not just slapping `.memo` on a component and calling it a day — you have to understand what memo actually does under the hood.

React's fiber tree keeps a reference to the previous props of every component. When a re-render is triggered, `React.memo` walks through the new props and does a **shallow comparison** against the old ones. If nothing changed — same `initialFormula`, same `gridData` reference, same `format` object — the component bails out entirely. No virtual DOM diff, no reconciliation, nothing. It's skipped.

This is why every callback passed to `<Cell>` is wrapped in `useCallback` — to keep stable references. If I passed inline arrow functions as props, React would see a "new" function on every render, `.memo` would think something changed, and we'd be right back to re-rendering everything.

The result: when you type in cell A1, only A1 re-renders. The other 1,299 cells don't even blink.

### `useRef` — Tracking Without Re-rendering

There's a tricky scenario: the user is editing a cell, and at the same time, a remote update comes in from Firestore for that same cell. If I blindly overwrite the local state with the server value, the user's cursor jumps, their half-typed formula disappears — terrible UX.

The fix: I use `useRef` to track the last known server formula (`lastServerFormula`). When the user finishes editing and blurs the cell, I compare their local formula against this ref. If it's different, I send the update. If it's the same — meaning they typed something, then undid it — **nothing gets sent**. No wasted write, no wasted bandwidth.

And on the receiving end, the cell checks: "am I currently being edited?" If yes, it ignores incoming server updates for that specific cell. No state collision, no flicker.

### Compare-Before-Write in the Grid

The `setRenderData` updater function doesn't just blindly replace the entire grid state when Firestore sends new data. It loops through incoming cells and does a **diff**:

```
if (currentCell.formula !== incomingCell.formula) → update
else → skip
```

If nothing actually changed, it returns the **same object reference** (`prev`), which means React sees the same state, and the entire component tree below skips re-rendering. This is a big deal when Firestore sends snapshots that include metadata changes (like `hasPendingWrites` toggling) but no actual data changes.

### Focus Isolation with `activeCellRef`

When the Grid processes incoming Firestore updates, it skips the cell that's currently being edited:

```
if (id === activeCellRef.current) continue;
```

This is stored in a `useRef`, not `useState`, because I don't want changing the active cell to trigger a re-render of the Grid itself. The ref is read-only during the snapshot callback — it's a read path, not a render path. That distinction matters.

---

## Real-Time Collaboration

### Live Presence & Cursors

When you open a spreadsheet, other users see your cursor on the cell you're focused on — in real time, with color-coded highlights and name labels. Here's how it works:

- Each user gets a **stable color** derived from hashing their Firebase UID. Same person, same color, every time — no random assignment that changes on refresh.
- When you click into a cell, a **debounced** Firestore write (150ms) broadcasts your active cell to everyone else. Debounced, because you don't want to fire a write for every cell you tab through.
- Other users' cursors render as colored borders around cells with their first name floating above.

### Heartbeat & Stale User Cleanup

Presence systems have a classic problem: if someone closes their tab, their "online" status just sits there forever. You need a way to clean up ghosts.

The solution: every 8 seconds, each client sends a **heartbeat** — a lightweight `updateDoc` that only touches the `lastSeen` timestamp using `serverTimestamp()`. On the receiving end, when the presence listener fires, it filters out any user whose `lastSeen` is older than 30 seconds. If your heartbeat stops (tab closed, internet died, laptop closed), you fade out within half a minute.

The heartbeat is deliberately lightweight — it only updates `lastSeen`, not the full presence doc. This avoids accidentally wiping out the `activeCell` field.

### Contention — Who Wins?

What happens when two people edit the same cell at the same time? The approach here is **last-write-wins with local priority**:

- While you're editing a cell, incoming server updates for **that specific cell** are ignored. You see your own keystrokes in real time with zero lag.
- When you blur (finish editing), your value gets pushed to Firestore. If someone else also edited it, the last person to blur wins.
- Everyone else gets the final value through the real-time Firestore listener.

This is intentional. Building a full OT (Operational Transform) or CRDT system would be a massive undertaking, and for a spreadsheet where cells are independent values (not collaborative text documents), last-write-wins is the right trade-off. The focus was on making the **experience** feel right — no flicker, no cursor jumps, no lost keystrokes — rather than implementing conflict resolution that you'd rarely need.

---

## Formula Parser

The formula engine supports:

| Feature | Example |
|---|---|
| Basic math | `=10+20*2` → `50` |
| Cell references | `=A1` returns the value in A1 |
| Range expansion | `=SUM(A1:A3)` sums all cells from A1 to A3 |
| Functions | `SUM`, `AVERAGE`, `MIN`, `MAX`, `ABS`, `SQRT`, `ROUND`, `CEIL`, `FLOOR`, `LOG`, `POW`, `MOD` |
| Nested references | `=A1` where A1 contains `=B1+5` — resolves recursively |
| Cycle detection | `A1→B1→A1` returns `#ERR_CYCLE` (capped at depth 10) |

### Why Not a Full-Blown Parser?

I deliberately didn't build a Pratt parser or a full AST engine. Here's why: the core challenge of this project was never about parsing — it was about the **real-time sync**, the **live collaboration**, the **performance at scale**, and making the whole thing feel **snappy**. A basic parser that handles the above covers 95% of real spreadsheet use cases, and the remaining 5% (nested parentheses edge cases, custom function definitions) wasn't worth the time trade-off against getting the sync, contention, and performance absolutely right.

The parser runs through `mathjs` for the actual math evaluation, with a preprocessing layer that handles cell references, range expansion (`A1:C3` → individual cell list), and spreadsheet function names mapped to their mathjs equivalents.

---

## Formatting

Each cell supports:

- **Bold** — toggle via toolbar
- **Italic** — toggle via toolbar
- **Text color** — color picker in toolbar

Formatting is stored separately from cell data in its own Firestore subcollection (`docs/{docId}/formats/{cellId}`), which means formatting changes sync in real-time across all users without touching the cell data at all. The formatting map is subscribed to via `onSnapshot` and gets passed down as a simple lookup — cell ID → format object.

---

## Offline UX

The app doesn't just break when the connection drops. A custom `useIsOffline` hook listens to `navigator.onLine` and browser `online`/`offline` events. When you go offline:

- A red **"Offline"** badge appears in the header
- All cells become **read-only** (grayed out, `cursor-not-allowed`) so you can't make edits that would silently fail
- Presence updates stop (no point broadcasting when you can't reach Firestore)
- When connection comes back, the badge flips to **"Synced"** and editing re-enables instantly

---

## Saving / Saved Indicator

The header shows a real-time **"Saving..."** / **"Saved to cloud ☁️"** indicator. This is driven by Firestore's `hasPendingWrites` metadata — when a local write hasn't been acknowledged by the server yet, it shows "Saving...", and flips to "Saved" the moment the server confirms. It uses `serverTimestamp()` so the timestamp is always the server's clock, not the client's.

---

## Paste Protection

Pasting into a cell is guarded: if the clipboard content contains newlines, tabs, or exceeds 2,000 characters, the paste is **blocked** with an alert. This prevents users from accidentally flooding a single cell with multi-line content or a wall of text that would break the grid layout.

---

## Memory Leak Prevention

Every Firestore listener (`onSnapshot`) returns an unsubscribe function, and every single one is cleaned up in the corresponding `useEffect` return. Same for the presence heartbeat interval (`clearInterval`), the `beforeunload` event listener (`removeEventListener`), and the online/offline listeners. Nothing leaks.

The Firebase app itself is initialized as a singleton — on hot reloads during development, it checks `getApps().length` before calling `initializeApp`, so you don't end up with duplicate Firebase instances.

---

## Data Architecture (Firestore)

```
docs/
  {docId}/
    title, ownerId, ownerName, updatedAt
    rows/
      "1" → { cells: { A: { value: "hello" }, B: { value: "=A1+10" }, ... } }
      "2" → { cells: { ... } }
      ...
    presence/
      {uid} → { name, color, activeCell, lastSeen }
    formats/
      "A1" → { bold: true, color: "#ef4444" }
      "B3" → { italic: true }
```

### Why Per-Row Documents?

Each row is its own Firestore document. This is intentional:

- **Concurrency**: Two users editing different rows don't cause write conflicts at all — they're writing to completely separate documents.
- **Granular listeners**: Firestore charges per document read. Having the entire grid in one giant document means every tiny cell change re-downloads everything. Per-row docs mean only the changed row's document fires in the snapshot.
- **Atomic batch init**: The 50 rows are created in a single `writeBatch` on first load — one network round trip, fully atomic.

---

## Document Management

- **Dashboard**: Lists all your spreadsheets, sorted by last modified
- **Create**: One-click creation with auto-generated Firestore ID, auto-redirect to the new sheet
- **Editable titles**: Click the title in the header to rename inline, saved to Firestore on blur/enter
- **Back navigation**: Simple `← Back` link to return to dashboard

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Dashboard — list & create spreadsheets
│   ├── layout.tsx            # Root layout with AuthProvider
│   └── sheet/[docId]/
│       └── page.tsx          # Spreadsheet view — header, presence, grid
├── components/
│   ├── Cell.tsx              # Individual cell — React.memo, local editing, paste guard
│   ├── Grid.tsx              # 26×50 grid — Firestore sync, compare-before-write
│   └── Toolbar.tsx           # Bold / Italic / Color controls
├── hooks/
│   ├── usePresence.ts        # Heartbeat, stale user cleanup, cursor broadcast
│   ├── useIsOffline.ts       # Online/offline detection
│   └── useFormatting.ts      # Real-time formatting subscription
├── lib/
│   ├── firebase.ts           # Singleton Firebase init
│   ├── sync.ts               # Cell read/write, row subscription, batch init
│   ├── parser.ts             # Formula evaluation, cell refs, ranges, cycle detection
│   ├── parser.test.ts        # Vitest unit tests for the parser
│   ├── presence.ts           # Firestore presence CRUD
│   ├── formatting.ts         # Firestore formatting CRUD + subscription
│   ├── documents.ts          # Document metadata CRUD
│   └── colors.ts             # Stable user color from UID hash
├── context/
│   └── AuthContext.tsx        # Google OAuth context provider
└── config/
    └── constants.ts           # Debounce, heartbeat, character limits
```

---

## Running Tests

```bash
npm test
```

Runs the Vitest suite — currently covers the formula parser (basic math, cell references, range expansion, string pass-through, cycle detection).

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
| `npm run check:ts` | TypeScript type check (no emit) |
| `npm test` | Run Vitest tests |
