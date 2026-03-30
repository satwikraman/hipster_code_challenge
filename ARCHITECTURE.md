# SPA Booking System — Architecture & Technical Documentation

## 1. Architecture Overview

```
src/
├── api/             # API layer — fetch wrappers + localStorage fallback
│   ├── apiUtils.js  # Shared constants, authHeaders, withTimeout, checkAuth, toApiDateTime
│   ├── auth.js      # Login / logout
│   ├── bookings.js  # CRUD + check-in / checkout / cancel
│   ├── client.js    # Token storage, localStorage helpers
│   ├── services.js  # Fetch service categories
│   ├── therapists.js# Fetch therapists (with availability params)
│   └── users.js     # Search / get / create users
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
├── hooks/
│   └── useBookingHandlers.js  # Custom hook — all booking state + CRUD callbacks
├── store/
│   ├── index.js               # Redux store configuration
│   ├── slices/
│   │   ├── authSlice.js       # Authentication state
│   │   ├── bookingsSlice.js   # Normalised bookings + async thunks
│   │   ├── therapistsSlice.js # Therapist list + fetchTherapists thunk
│   │   ├── servicesSlice.js   # Service category list + fetchServices thunk
│   │   └── uiSlice.js         # Selected date, panel state, toast
│   └── selectors/
│       ├── authSelectors.js       # selectIsAuthenticated, selectAuthUser, selectAuthStatus, selectAuthError
│       ├── bookingSelectors.js    # createSelector memoised selectors + factory
│       ├── therapistSelectors.js  # selectTherapists
│       ├── serviceSelectors.js    # selectServices
│       └── uiSelectors.js         # selectSelectedDate, selectIsPanelOpen, etc.
├── constants.js      # App-wide constants: BOOKING_STATUS enum, DEBOUNCE_MS, SNAP_MINUTES
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
| `therapistsSlice` | `list` of therapists fetched from API per selected date, `status`, `error` |
| `servicesSlice` | `list` of service categories fetched once on login, `status`, `error` |
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

### 3.1 Virtual Rendering

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

## 5. Logging Strategy

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

Base URL: `process.env.REACT_APP_API_BASE_URL` (falls back to `https://dev.natureland.hipster-virtual.com`)

| Action | Method | Endpoint |
|---|---|---|
| Login | `POST` | `/login` (FormData) |
| List bookings | `GET` | `/api/v1/bookings/outlet/booking/list` |
| Create booking | `POST` | `/api/v1/bookings/create` (FormData) |
| Update booking | `POST` | `/api/v1/bookings/{id}` (FormData) |
| Cancel booking | `POST` | `/api/v1/bookings/item/cancel` (FormData) |
| Check-in | `POST` | `/api/v1/bookings/update/payment-status` |
| Check-out | `POST` | `/api/v1/bookings/update/payment-status` |
| Delete | `DELETE` | `/api/v1/bookings/destroy/{id}` |
| List therapists | `GET` | `/api/v1/therapists` (with date + outlet params) |
| List services | `GET` | `/api/v1/service-category` |
| Search users | `GET` | `/api/v1/users?search=…` |
| Get user | `GET` | `/api/v1/users/{id}` |
| Create user | `POST` | `/api/v1/users/create` (FormData) |

All API calls fall through to a `localStorage` layer if the network request fails, so the app works fully offline with seeded demo data.

---

## 7. Key Technical Decisions & Trade-offs

### 1. Redux Toolkit over local state
**Chose:** Normalized entity store with a `byTherapist` index alongside the main `entities` map.

**Why:** The calendar renders N columns simultaneously, each needing its own booking list. A flat array would require every column to filter the full list on every update — O(N×M). The dual-index gives O(1) per-column access and means a booking update in column 1 doesn't re-render columns 2–8.

**Trade-off:** More boilerplate in the slice (maintaining two structures on create/update/delete/reschedule). Worth it at scale; overkill for 8 therapists.

---

### 2. Dual-axis virtual rendering
**Chose:** Custom virtual scroll (no library) for both horizontal columns and vertical booking blocks.

**Why:** At 200 therapists × full-day bookings, naively mounting everything would be ~1600+ DOM nodes. The virtualizer keeps it to ~10 columns × ~5 visible blocks = ~50 nodes at any time.

**Trade-off:** Significant complexity in `CalendarGrid` and `TherapistColumn`. An off-the-shelf virtualizer (react-virtual, react-window) would have been simpler but harder to integrate with the drag-drop overlay and sticky header.

---

### 3. localStorage fallback for all API calls
**Chose:** Every API function silently falls back to seeded demo data on failure or missing token.

**Why:** Demo-ability. The app works fully without a live backend — interviewers can interact with it without credentials.

**Trade-off:** API failures are invisible to the user. In production this would be a bug; here it's intentional. Also means the app never surfaces "network error" states — it always looks healthy.

---

### 4. `React.lazy` only for panel and modal
**Chose:** Code-split `BookingPanel` and `CancelBookingModal`, but not the calendar components.

**Why:** The calendar grid is always visible on load — lazy-loading it would cause a visible layout shift. The panel and modal are opened on user action, so the async chunk fetch is hidden behind the interaction delay.

**Trade-off:** The main bundle still includes all calendar code. A more aggressive split (per-route) isn't applicable here since it's a single-page app with no routes.

---

### 5. `bookingsRef` pattern for drag handlers
**Chose:** Store bookings in a ref (`bookingsRef.current`) and keep it current via a `useEffect`, rather than including `bookings` in `handleDropBooking`'s dependency array.

**Why:** `handleDropBooking` is passed down through `CalendarGrid` → `TherapistColumn` → `BookingBlock`. Including `bookings` in its deps would recreate the function on every booking change, busting `React.memo` on every child on every update — defeating the entire optimization.

**Trade-off:** Non-standard pattern; harder to read. The ref update is synchronous with the render cycle so it's safe, but it requires understanding *why* it's there.

---

### 6. API constants centralized, not environment-driven (mostly)
**Chose:** `OUTLET_ID`, `COMPANY_ID`, `OUTLET_TYPE` etc. are hardcoded constants in `apiUtils.js`. Only the base URL reads from an env var.

**Why:** This is a single-outlet assessment app. There's no multi-tenancy requirement. Env vars for every constant would add configuration overhead with no benefit.

**Trade-off:** Changing outlet/company requires a code change, not a config change. Acceptable for the scope; wrong for a real SaaS product.

---

### 7. Phone validation locked to Indian format
**Chose:** Regex `/^[6-9]\d{9}$/` — 10-digit Indian mobile numbers only.

**Why:** The backend and business context implied a specific regional market. The assessment spec didn't require international support.

**Trade-off:** International users are rejected. A real product would use a library like `libphonenumber` with country-code selection.

---

## 8. Assumptions

1. A single outlet (`outlet=1`, `company=1`) is used for this assessment.
2. The Google reCAPTCHA bypass key (`key_pass`) from the assessment document is hardcoded in `auth.js`.
3. Therapist list is fetched from `GET /api/v1/therapists` on each date change; falls back to seeded demo data if no token or API fails.
4. The `byTherapist` index in Redux uses dynamic therapist IDs returned by the API; bookings are mapped by the `therapistId` field.
5. Dates in the API use `DD-MM-YYYY` format; the app stores and displays in ISO `YYYY-MM-DD`.
