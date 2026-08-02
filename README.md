```markdown
# My Spreadsheet

A real-time collaborative spreadsheet supporting concurrent multi-user editing. The grid handles 26 columns × 50 rows (1,300 cells) simultaneously with live data synchronization and presence cursors. The primary engineering focus is on rendering performance and minimizing database read/write bottlenecks.

## Quick Start

### Prerequisites
* Node.js v18+
* npm
* A Firebase project (Firestore and Google Auth enabled)

### Setup

```bash
# 1. Clone the repo
git clone [https://github.com/msasama/my_spreadsheet.git](https://github.com/msasama/my_spreadsheet.git)
cd my_spreadsheet

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local

```

Fill in `.env.local` with your Firebase credentials:

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

### Firebase Setup

* Enable Google OAuth in Firebase Authentication.
* Initialize a Firestore database (test mode for local development).
* The application handles initial document and collection structuring automatically on first load.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI | React 19 |
| Language | TypeScript (Strict) |
| Styling | Tailwind CSS 4 |
| Database | Firebase Firestore |
| Auth | Firebase Auth (Google OAuth) |
| Formula Engine | math.js |
| Testing | Vitest |

## Architecture & Performance Optimization

Rendering 1,300 active inputs simultaneously requires strict control over the React component lifecycle to prevent global re-renders.

### Rendering Control

* **React.memo:** The `<Cell>` component is wrapped in `React.memo`. By passing stable references using `useCallback` for all event handlers, the shallow comparison allows unaffected cells to bypass the reconciliation process entirely. Editing a single cell only re-renders that specific component.
* **Diffing Incoming State:** The `setRenderData` function diffs incoming Firestore snapshots against local state. If the incoming formula matches the current state, it returns the previous object reference (`prev`). This forces React to bail out of rendering the entire Grid when Firestore pushes metadata-only updates.

### State Management & Concurrency

* **useRef for Local State:** Overwriting local state with server data while a user is typing causes cursor jumping. `lastServerFormula` is tracked via `useRef`. On blur, the local formula is compared against this ref to determine if a network write is necessary.
* **Focus Isolation:** The active cell ID is stored in `activeCellRef`. Updating the active cell does not trigger a render of the Grid component, keeping the read/write paths separate.

## Real-Time Collaboration

### Presence & Live Cursors

* Cursor colors are assigned deterministically by hashing the user's Firebase UID.
* Cell focus events trigger a debounced (150ms) Firestore write to broadcast the active cell. This prevents rate-limiting during rapid keyboard navigation.

### Stale User Cleanup

A heartbeat mechanism runs every 8 seconds, executing a lightweight `updateDoc` that updates a `lastSeen` server timestamp. The frontend presence listener automatically filters out users with timestamps older than 30 seconds to handle dirty disconnects (e.g., closed tabs, network drops).

### Conflict Resolution

The app uses a Last-Write-Wins (LWW) strategy with local priority. If a remote update targets a cell currently focused by the local user, the remote update is ignored to preserve local keystrokes. Upon blur, the local value is pushed to Firestore, overriding concurrent edits.

## Formula Parser

Built around `mathjs` with a custom preprocessing layer to handle spreadsheet-specific syntax.

| Feature | Example |
| --- | --- |
| Basic Math | `=10+20*2` → `50` |
| Cell References | `=A1` |
| Range Expansion | `=SUM(A1:A3)` |
| Supported Functions | `SUM`, `AVERAGE`, `MIN`, `MAX`, `ABS`, `SQRT`, `ROUND`, `CEIL`, `FLOOR`, `LOG`, `POW`, `MOD` |
| Recursion | Resolves nested references (e.g., `=A1` referencing `=B1+5`) |
| Cycle Detection | Halts at depth 10, returning `#ERR_CYCLE` for circular dependencies |

## Formatting

Text formatting (Bold, Italic, Color) is stored in a dedicated Firestore subcollection (`docs/{docId}/formats/{cellId}`). Decoupling formatting from cell data allows aesthetic changes to sync globally without triggering data evaluation or read conflicts.

## Application Features

* **Offline Handling:** A custom `useIsOffline` hook tracks network status. Upon disconnection, the grid switches to read-only mode to prevent silent write failures.
* **Write Acknowledgement:** The header utilizes Firestore's `hasPendingWrites` metadata to display accurate "Saving..." and "Saved to cloud" states.
* **Input Validation:** Clipboard paste events are intercepted. Inputs containing newlines, tabs, or exceeding 2,000 characters are blocked to preserve grid integrity.
* **Resource Cleanup:** All `onSnapshot` listeners, intervals, and event listeners are strictly cleared in `useEffect` cleanup functions. Firebase is initialized as a singleton to prevent duplicate instances during Next.js hot module replacement.

## Data Schema (Firestore)

```text
docs/
  {docId}/
    title, ownerId, ownerName, updatedAt
    rows/
      "1" → { cells: { A: { value: "..." }, B: { value: "..." } } }
      "2" → { cells: { ... } }
    presence/
      {uid} → { name, color, activeCell, lastSeen }
    formats/
      "A1" → { bold: true, color: "#ef4444" }

```

**Design Choice:** The grid is structured using per-row documents rather than a single large grid document. This limits write contention to the row level and significantly reduces bandwidth overhead, as Firestore charges per document read. Initial grid creation is handled via a single atomic `writeBatch`.

## Project Structure

```text
src/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── layout.tsx            # AuthProvider layout
│   └── sheet/[docId]/
│       └── page.tsx          # Main spreadsheet view
├── components/
│   ├── Cell.tsx              # Local editing logic, paste guards
│   ├── Grid.tsx              # Firestore sync, diffing engine
│   └── Toolbar.tsx           # Formatting controls
├── hooks/
│   ├── usePresence.ts        # Heartbeat and cursor tracking
│   ├── useIsOffline.ts       # Network status
│   └── useFormatting.ts      # Formatting sync
├── lib/
│   ├── firebase.ts           # Singleton initialization
│   ├── sync.ts               # Cell CRUD, row subscriptions
│   ├── parser.ts             # Formula evaluation and cycle detection
│   ├── presence.ts           # Presence queries
│   ├── formatting.ts         # Formatting queries
│   ├── documents.ts          # Document metadata CRUD
│   └── colors.ts             # UID hashing
├── context/
│   └── AuthContext.tsx       # Google OAuth
└── config/
    └── constants.ts          # Limits, timings, configs

```

## Scripts

| Command | Action |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Compile production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run check:ts` | Execute TypeScript type checking |
| `npm test` | Run Vitest suite (parser logic, cycle detection) |

```

```
