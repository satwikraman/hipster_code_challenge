# SPA Booking System — Architecture & Technical Documentation

## 1. Architecture Overview

```
src/
├── api/             # API layer — fetch wrappers + localStorage fallback
│   ├── auth.js      # Login / logout
│   ├── bookings.js  # CRUD + check-in / checkout
│   └── client.js    # Token storage, localStorage helpers
├── components/
│   ├── calendar/    # Calendar grid and rendering
│   │   ├── CalendarGrid.js    # Dual-axis virtualised grid shell
│   │   ├── TherapistColumn.js # Per-therapist column (Redux slice selector)
│   │   ├── BookingBlock.js    # Individual booking card
│   │   ├── TimeGutter.js      # Sticky left time labels
│   │   └── DragDropLayer.js   # Visual drag overlay
│   ├── panels/
│   │   └── BookingPanel.js    # Right-side detail / edit panel (lazy)
│   ├── modals/
│   │   └── CancelBookingModal.js  # Cancel / delete flow (lazy)
│   ├── layout/
│   │   ├── Navbar.js          # Top nav with auth state + logout
│   │   ├── CalSubheader.js    # Date navigation, client search dropdown, filter toggle (Redux-connected)
│   │   └── FilterPanel.js     # Filter panel — booking status, therapist group + individual selection
│   ├── auth/
│   │   └── LoginCard.js       # Login form
│   └── ErrorBoundary.js       # Functional error boundary (react-error-boundary)
├── data/
│   └── therapists.js          # Static therapist list (id, number, name, gender)
├── hooks/
│   └── useBookingHandlers.js  # Custom hook — all booking state + CRUD callbacks
├── store/
│   ├── index.js               # Redux store configuration
│   ├── slices/
│   │   ├── authSlice.js       # Authentication state
│   │   ├── bookingsSlice.js   # Normalised bookings + async thunks
│   │   └── uiSlice.js         # Selected date, panel state, toast
│   └── selectors/
│       ├── authSelectors.js     # selectIsAuthenticated, selectAuthUser, selectAuthStatus, selectAuthError
│       ├── bookingSelectors.js  # createSelector memoised selectors + factory
│       └── uiSelectors.js       # selectSelectedDate, selectIsPanelOpen, etc.
└── utils/
    ├── calendarUtils.js  # Shared calendar constants + pure helpers
    └── logger.js         # Structured logger (console + sessionStorage)
```

---

## 2. State Management

**Library:** Redux Toolkit (RTK)

### Slices

| Slice | Responsibility |
|---|---|
| `authSlice` | `isAuthenticated`, `user`, `status`, `error` |
| `bookingsSlice` | Normalised entities map, byTherapist index, async thunks |
| `uiSlice` | `selectedDate`, `selectedBookingId`, `isPanelOpen`, `toast` |

### Normalised Bookings Store

Bookings are stored in two complementary structures for O(1) access:

```js
{
  entities:    { [bookingId]: booking },   // O(1) lookup / update
  byTherapist: { [therapistId]: [id…] },  // O(1) per-column query
  ids:         [id…],                      // ordered list
}
```

This allows each TherapistColumn to subscribe only to its own slice of data — a booking update in column 1 does not re-render columns 2–8.

### Selector Factory Pattern

```js
// Each TherapistColumn creates its own memoised selector instance
const selectBookingsForTherapist = useMemo(makeSelectBookingsForTherapist, []);
const bookings = useSelector(state => selectBookingsForTherapist(state, therapist.id));
```

---

## 3. Performance Strategy

### 3.1 Virtual Rendering (Requirement 2 & 9)

`CalendarGrid` implements **dual-axis virtualisation**:

**Horizontal — column virtualisation:**
- Tracks `scrollLeft` via an `onScroll` handler on the scrollable container
- Computes `visRange = { start, end }` — the index window of currently visible columns
- Renders only `therapists.slice(visRange.start, visRange.end)` to the DOM
- Left and right spacer `<div>`s with calculated widths keep the scrollbar accurate

For 200 therapists × 140 px = 28 000 px wide grid, only ~8–10 columns are mounted at any time.

**Vertical — booking block virtualisation:**
- Tracks `scrollTop` and subtracts the sticky header height to derive grid-px coordinates
- Passes `visTop` / `visBottom` (the visible range in grid-px) to each `TherapistColumn`
- Each column runs a `useMemo` filter against every booking's computed `top` and `height`:

```js
// TherapistColumn — 200 px overscan prevents blocks popping during fast scroll
const padTop    = visTop    - VERTICAL_OVERSCAN;
const padBottom = visBottom + VERTICAL_OVERSCAN;
return sortedBookings.filter(b => {
    const top    = getMinutesSinceStart(b.startTime) * PX_PER_MINUTE;
    const height = Math.max((endMin - startMin) * PX_PER_MINUTE, 22);
    return top + height > padTop && top < padBottom;
});
```

The column container keeps its full `TOTAL_HEIGHT` — only the absolutely-positioned blocks inside are skipped. Scroll geometry and drag-drop behaviour are unaffected.

### 3.2 Shared Calendar Utilities

`src/utils/calendarUtils.js` exports constants and pure helpers used by both `BookingBlock` and `TherapistColumn`, eliminating duplication:

```js
DATE_START_HOUR, HOUR_HEIGHT, BUSINESS_HOURS, BUSINESS_MINUTES, PX_PER_MINUTE
clamp, getMinutesSinceStart, formatTime, formatDateDisplay
```

### 3.3 Memoisation

| Technique | Where |
|---|---|
| `React.memo` | CalendarGrid, TherapistColumn, BookingBlock, TimeGutter, BookingPanel, Navbar, CalSubheader, FilterPanel, LoginCard, CancelBookingModal |
| `useMemo` | Per-therapist selector instance, filteredBookings, visibleTherapists, bookingsByTherapist map, booking block layout + status, visible bookings filter, stable selectedBooking selector |
| `useCallback` | All event handlers in useBookingHandlers, CalendarGrid, TherapistColumn, BookingBlock, BookingPanel, CalSubheader, FilterPanel, Navbar, LoginCard, CancelBookingModal |
| `createSelector` | bookingSelectors.js — RTK memoised derived state |

### 3.4 Stable Handler References

Handlers that read bookings (e.g. `handleDropBooking`) use a `bookingsRef` pattern instead of closing over the `bookings` array — keeping `useCallback` deps stable across booking updates.

Map-bound event handlers (dropdown list items, filter group/status/therapist rows) use `data-*` attributes + a single shared `useCallback` handler per section instead of one inline closure per item, avoiding per-item function allocation on every render.

```js
const bookingsRef = useRef(bookings);
useEffect(() => { bookingsRef.current = bookings; }, [bookings]);

const handleDropBooking = useCallback(async (id, …) => {
  const b = bookingsRef.current.find(x => x.id === id); // reads ref, not reactive dep
  …
}, [dispatch, message]); // bookings NOT in deps
```

### 3.5 Granular Redux Subscriptions

All components use named selector functions from `store/selectors/` instead of inline `state.slice.field` access. This keeps subscriptions explicit and allows selector-level memoisation.

```js
// authSelectors.js
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthUser        = (state) => state.auth.user;
export const selectAuthStatus      = (state) => state.auth.status;
export const selectAuthError       = (state) => state.auth.error;
```

### 3.6 Code Splitting / Lazy Loading

`BookingPanel` and `CancelBookingModal` are loaded on-demand via `React.lazy`:

```js
const BookingPanel       = lazy(() => import('./components/panels/BookingPanel'));
const CancelBookingModal = lazy(() => import('./components/modals/CancelBookingModal'));
```

The main bundle does not include these components; they are split into separate chunks and fetched only when first opened.

### 3.7 Debounced Search

Keystroke events update `searchQuery` (instant display) but `debouncedSearch` (which triggers `filteredBookings` recomputation) is delayed 300 ms — preventing expensive filter passes on every keypress.

---

## 4. Error Handling

| Layer | Mechanism |
|---|---|
| React tree crash | `ErrorBoundary` (functional, via `react-error-boundary`) — full-page fallback with Reload / Try Again |
| API failure | `.unwrap()` + `try/catch` in each handler → toast notification |
| Form validation | Inline `formError` state in BookingPanel |
| 401 / 403 | `checkAuth()` in API layer fires `hipster:unauthorized` custom event → auto-logout |
| API timeout | `withTimeout()` wraps every fetch with an 8-second race |

---

## 5. Logging Strategy (Requirement 8)

`src/utils/logger.js` captures:

| Event | Level |
|---|---|
| API request failure | `ERROR` — `API_ERROR` |
| React component exception | `ERROR` — `UI_EXCEPTION` |
| Login success / demo fallback | `INFO` — `USER_ACTION` |
| Booking created / edited / cancelled / checked-in / checked-out / deleted | `INFO` — via bookingsSlice thunks |

Logs are printed to the browser console **and** persisted to `sessionStorage` key `hipster_logs` (capped at 500 entries). During the interview demo run `window.__hipsterLogs()` in the console to inspect the full structured log.

---

## 6. API Integration

Base URL: `https://dev.natureland.hipster-virtual.com/api/v1`

| Action | Method | Endpoint |
|---|---|---|
| Login | `POST` | `/login` (FormData) |
| List bookings | `GET` | `/bookings/outlet/booking/list` |
| Create booking | `POST` | `/bookings/create` (FormData) |
| Update booking | `POST` | `/bookings/{id}` (FormData) |
| Cancel booking | `POST` | `/bookings/item/cancel` (FormData) |
| Check-in | `POST` | `/bookings/update/payment-status` |
| Check-out | `POST` | `/bookings/update/payment-status` |
| Delete | `DELETE` | `/bookings/destroy/{id}` |

All API calls fall through to a `localStorage` layer if the network request fails, so the app works fully offline with seeded demo data.

---

## 7. Assumptions

1. A single outlet (`outlet=1`, `company=1`) is used for this assessment.
2. The Google reCAPTCHA bypass key (`key_pass`) from the assessment document is hardcoded in `auth.js`.
3. Therapist list is static (from the assessment spec); a real system would fetch from `/therapists`.
4. The `byTherapist` index in Redux uses the therapist IDs from the static list (`t1`–`t8`); API bookings are mapped by `therapistId` field.
5. Dates in the API use `DD-MM-YYYY` format; the app stores and displays in ISO `YYYY-MM-DD`.

---

## 8. Deployment

```bash
npm run build          # Production build → /build
npx serve -s build     # Local preview

# Vercel (recommended)
npx vercel --prod

# Netlify
netlify deploy --prod --dir=build
```

Demo credentials: `react@hipster-inc.com` / `React@123`
