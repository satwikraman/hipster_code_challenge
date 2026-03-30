import { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './App.css';
import { useBookingHandlers } from './hooks/useBookingHandlers';
import Navbar from './components/layout/Navbar';
import CalSubheader from './components/layout/CalSubheader';
import LoginCard from './components/auth/LoginCard';
import CalendarGrid from './components/calendar/CalendarGrid';
import { fetchBookings } from './store/slices/bookingsSlice';
import { fetchTherapists } from './store/slices/therapistsSlice';
import { fetchServices } from './store/slices/servicesSlice';
import { logout } from './store/slices/authSlice';
import { setToast, clearToast } from './store/slices/uiSlice';
import { formatDateDisplay } from './utils/calendarUtils';
import {
    selectSelectedDate,
    selectSelectedBookingId,
    selectIsPanelOpen,
    selectToastMessage,
} from './store/selectors/uiSelectors';
import { selectAllBookings, selectBookingsStatus, selectBookingsError } from './store/selectors/bookingSelectors';
import { selectIsAuthenticated, selectAuthUser } from './store/selectors/authSelectors';
import { selectTherapists } from './store/selectors/therapistSelectors';
import { selectServices } from './store/selectors/serviceSelectors';
import { DEFAULT_FILTER_STATE } from './components/layout/FilterPanel';
import { DEBOUNCE_MS, BOOKING_STATUS } from './constants';

// Lazy-loaded — only downloaded when the panel/modal actually opens (code splitting)
const BookingPanel = lazy(() => import('./components/panels/BookingPanel'));
const CancelBookingModal = lazy(() => import('./components/modals/CancelBookingModal'));

const App = () => {
    const dispatch = useDispatch();

    // ── Selectors ──────────────────────────────────────────────────────────────
    const selectedDate = useSelector(selectSelectedDate);
    const selectedBookingId = useSelector(selectSelectedBookingId);
    const isPanelOpen = useSelector(selectIsPanelOpen);
    const toastMessage = useSelector(selectToastMessage);
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const authUser = useSelector(selectAuthUser);
    const bookings = useSelector(selectAllBookings);
    const bookingsStatus = useSelector(selectBookingsStatus);
    const bookingsError = useSelector(selectBookingsError);
    const therapists = useSelector(selectTherapists);
    const services = useSelector(selectServices);

    // Selector function is stable per selectedBookingId — avoids allocating a new
    // function on every App render while keeping the direct entity lookup pattern.
    const selectSelectedBooking = useMemo(
        () => (state) => selectedBookingId ? state.bookings.entities[selectedBookingId] ?? null : null,
        [selectedBookingId]
    );
    const selectedBooking = useSelector(selectSelectedBooking);

    // ── Booking handlers (state + callbacks) ───────────────────────────────────
    const {
        isDragging, draftBooking,
        cancelModalBooking, setCancelModalBooking,
        handleDropBooking, handleCreateBooking,
        handlePanelSubmit, handlePanelClose, handlePanelCancel,
        handleCancelModalConfirm,
        handlePanelCheckIn, handlePanelCheckOut,
        handleBookingClick, handleDragStart, handleDragEnd,
    } = useBookingHandlers();

    // ── Side-effects ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchBookings(selectedDate));
            dispatch(fetchTherapists(selectedDate));
        }
    }, [dispatch, selectedDate, isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) dispatch(fetchServices());
    }, [dispatch, isAuthenticated]);

    useEffect(() => {
        const handler = () => {
            dispatch(logout());
            dispatch(setToast('Session expired. Please sign in again.'));
        };
        window.addEventListener('hipster:unauthorized', handler);
        return () => window.removeEventListener('hipster:unauthorized', handler);
    }, [dispatch]);

    useEffect(() => {
        if (!toastMessage) return;
        const timer = setTimeout(() => dispatch(clearToast()), 2500);
        return () => clearTimeout(timer);
    }, [toastMessage, dispatch]);

    // ── Search + debounce ──────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debounceTimer = useRef(null);

    const handleSearchChange = useCallback((e) => {
        const val = e.target.value;
        setSearchQuery(val);
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => setDebouncedSearch(val), DEBOUNCE_MS);
    }, []);

    const handleSelectClient = useCallback((name) => {
        setSearchQuery(name);
        clearTimeout(debounceTimer.current);
        setDebouncedSearch(name);
    }, []);

    const handleCancelModalClose = useCallback(() => setCancelModalBooking(null), [setCancelModalBooking]);

    // ── Filter state ────────────────────────────────────────────────────────
    const [filterState, setFilterState] = useState(DEFAULT_FILTER_STATE);

    // Therapist columns visible based on group + individual selection.
    // Only depends on the three relevant filterState fields — status-only changes won't recompute.
    const visibleTherapists = useMemo(() => {
        let list = therapists;
        if (filterState.group !== 'all') {
            list = list.filter((t) => t.gender === filterState.group);
        }
        if (!filterState.selectAllTherapists && filterState.selectedTherapistIds) {
            list = list.filter((t) => filterState.selectedTherapistIds.has(t.id));
        }
        return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [therapists, filterState.group, filterState.selectAllTherapists, filterState.selectedTherapistIds]);

    const filteredBookings = useMemo(() => {
        let result = bookings.filter((b) => b?.startTime?.startsWith(selectedDate));

        // Status filter
        result = result.filter((b) => filterState.statuses[b.status || BOOKING_STATUS.CONFIRMED] !== false);

        // Therapist filter (when not select-all)
        if (!filterState.selectAllTherapists && filterState.selectedTherapistIds) {
            result = result.filter((b) => filterState.selectedTherapistIds.has(b.therapistId));
        }

        // Search filter
        if (debouncedSearch.trim()) {
            const q = debouncedSearch.toLowerCase();
            result = result.filter(
                (b) =>
                    b.clientName?.toLowerCase().includes(q) ||
                    b.phone?.includes(q) ||
                    b.serviceName?.toLowerCase().includes(q)
            );
        }

        return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookings, selectedDate, filterState.statuses, filterState.selectAllTherapists, filterState.selectedTherapistIds, debouncedSearch]);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="App">
            <Navbar isAuthenticated={isAuthenticated} authUser={authUser} />

            {!isAuthenticated ? (
                <main className="auth-panel">
                    <LoginCard />
                </main>
            ) : (
                <main className="calendar-shell">
                    <CalSubheader
                        searchQuery={searchQuery}
                        onSearchChange={handleSearchChange}
                        onSelectClient={handleSelectClient}
                        therapists={therapists}
                        filterState={filterState}
                        onFilterChange={setFilterState}
                    />

                    {bookingsError && (
                        <div className="error-bar">
                            API unavailable — showing cached data ({bookingsError})
                        </div>
                    )}

                    <div className="calendar-body">
                        <section className="calendar-area">
                            <div className="status-bar">
                                {bookingsStatus === 'loading'
                                    ? 'Loading bookings…'
                                    : `${filteredBookings.length} booking${filteredBookings.length !== 1 ? 's' : ''} · ${formatDateDisplay(selectedDate)}`}
                            </div>
                            <CalendarGrid
                                therapists={visibleTherapists}
                                selectedDate={selectedDate}
                                bookings={filteredBookings}
                                onBookingClick={handleBookingClick}
                                onReschedule={handleDropBooking}
                                onCreate={handleCreateBooking}
                                isDragging={isDragging}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                isLoading={bookingsStatus === 'loading'}
                            />
                        </section>

                        <aside className={`right-panel${isPanelOpen ? ' open' : ''}`}>
                            {isPanelOpen ? (
                                <Suspense fallback={<div className="panel-lazy-loading">Loading…</div>}>
                                    <BookingPanel
                                        booking={selectedBooking}
                                        draftBooking={draftBooking}
                                        therapists={therapists}
                                        services={services}
                                        onClose={handlePanelClose}
                                        onSubmit={handlePanelSubmit}
                                        onCancel={handlePanelCancel}
                                        onCheckIn={handlePanelCheckIn}
                                        onCheckOut={handlePanelCheckOut}
                                    />
                                </Suspense>
                            ) : (
                                <div className="panel-placeholder">
                                    <div className="placeholder-icon">📋</div>
                                    <h3>Booking Details</h3>
                                    <p>Click a booking to view or edit. Double-click an empty slot to create one.</p>
                                </div>
                            )}
                        </aside>
                    </div>
                </main>
            )}

            {toastMessage && (
                <div className={`toast${/failed|error|expired|unable/i.test(toastMessage) ? ' toast-error' : ''}`}>
                    {toastMessage}
                </div>
            )}

            {cancelModalBooking && (
                <Suspense fallback={null}>
                    <CancelBookingModal
                        booking={cancelModalBooking}
                        onCancel={handleCancelModalClose}
                        onConfirm={handleCancelModalConfirm}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default App;
