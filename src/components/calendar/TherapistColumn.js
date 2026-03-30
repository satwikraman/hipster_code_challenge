import { memo, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import BookingBlock from './BookingBlock';
import { makeSelectBookingsForTherapist } from '../../store/selectors/bookingSelectors';
import {
    DATE_START_HOUR,
    HOUR_HEIGHT,
    BUSINESS_HOURS,
    BUSINESS_MINUTES,
    PX_PER_MINUTE,
    clamp,
    getMinutesSinceStart,
} from '../../utils/calendarUtils';
import { SNAP_MINUTES } from '../../constants';

const TOTAL_HEIGHT      = BUSINESS_HOURS * HOUR_HEIGHT;
// Render this many extra px above and below the visible area to prevent
// blocks popping in during fast scrolling.
const VERTICAL_OVERSCAN = 200;

const startTimeForDrop = (selectedDate, yPx) => {
    const rawMinutes = yPx / PX_PER_MINUTE;
    const snapped = clamp(Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES, 0, BUSINESS_MINUTES);
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setHours(DATE_START_HOUR, 0, 0, 0);
    d.setMinutes(d.getMinutes() + snapped);
    return d.toISOString();
};

const TherapistColumn = ({
    therapist,
    selectedDate,
    bookings: bookingsProp,
    onBookingClick,
    onDropBooking,
    onCreateBooking,
    onDragStart,
    onDragEnd,
    width,
    visTop    = 0,
    visBottom = Infinity,
}) => {
    // Each instance has its own memoized selector — other therapists' updates don't trigger re-render
    const selectBookingsForTherapist = useMemo(makeSelectBookingsForTherapist, []);
    const bookingsFromStore = useSelector((state) => selectBookingsForTherapist(state, therapist.id));
    // Use filtered bookings from parent when provided (search), otherwise fall back to store
    const bookings = bookingsProp !== undefined ? bookingsProp : bookingsFromStore;

    const sortedBookings = useMemo(
        () => bookings.slice().sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
        [bookings]
    );

    // Vertical virtualisation — skip blocks outside the visible grid range.
    // The column container keeps its full TOTAL_HEIGHT so absolute positioning
    // and the scrollbar geometry are unaffected.
    const visibleBookings = useMemo(() => {
        const padTop    = visTop    - VERTICAL_OVERSCAN;
        const padBottom = visBottom + VERTICAL_OVERSCAN;
        return sortedBookings.filter((b) => {
            const startMin = getMinutesSinceStart(b.startTime);
            const endMin   = getMinutesSinceStart(b.endTime);
            const top      = startMin * PX_PER_MINUTE;
            const height   = Math.max((endMin - startMin) * PX_PER_MINUTE, 22);
            // Include if any part of the block overlaps [padTop, padBottom]
            return top + height > padTop && top < padBottom;
        });
    }, [sortedBookings, visTop, visBottom]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const bookingId = e.dataTransfer.getData('text/plain');
        if (!bookingId) return;
        const bound = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - bound.top;
        onDropBooking && onDropBooking(bookingId, therapist.id, startTimeForDrop(selectedDate, y));
    }, [onDropBooking, therapist.id, selectedDate]);

    const handleCreate = useCallback((e) => {
        if (!onCreateBooking) return;
        const bound = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - bound.top;
        const start = startTimeForDrop(selectedDate, y);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 60);
        onCreateBooking(therapist.id, start, end.toISOString());
    }, [onCreateBooking, therapist.id, selectedDate]);

    const handleDragOver = useCallback((e) => e.preventDefault(), []);

    const handleBlockDragStart = useCallback((e, id) => {
        e.dataTransfer.setData('text/plain', id);
        onDragStart && onDragStart();
    }, [onDragStart]);

    const handleBlockDragEnd = useCallback(() => {
        onDragEnd && onDragEnd();
    }, [onDragEnd]);

    return (
        <div
            className="therapist-column"
            style={width ? { width: `${width}px`, flexShrink: 0 } : undefined}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDoubleClick={handleCreate}
        >
            <div className="therapist-grid" style={{ height: `${TOTAL_HEIGHT}px` }}>
                {visibleBookings.map((booking) => (
                    <BookingBlock
                        key={booking.id}
                        booking={booking}
                        onClick={onBookingClick}
                        onDragStart={handleBlockDragStart}
                        onDragEnd={handleBlockDragEnd}
                    />
                ))}
            </div>
        </div>
    );
};

export default memo(TherapistColumn);
