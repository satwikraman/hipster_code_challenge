import { memo, useMemo, useCallback } from 'react';
import {
    PX_PER_MINUTE,
    getMinutesSinceStart,
    formatTime,
} from '../../utils/calendarUtils';
import { BOOKING_STATUS } from '../../constants';

const isDraggable = (status) => status !== BOOKING_STATUS.CANCELLED && status !== BOOKING_STATUS.COMPLETED;

const BookingBlock = ({ booking, onClick, onDragStart, onDragEnd }) => {
    // Memoize layout, Intl calculations, and status-derived values together
    const { top, height, timeLabel, statusClass, canDrag } = useMemo(() => {
        const start = getMinutesSinceStart(booking.startTime);
        const end   = getMinutesSinceStart(booking.endTime);
        const h     = Math.max((end - start) * PX_PER_MINUTE, 22);
        const sc =
            booking.status === BOOKING_STATUS.CHECK_IN  ? BOOKING_STATUS.CHECK_IN  :
            booking.status === BOOKING_STATUS.COMPLETED ? BOOKING_STATUS.COMPLETED :
            booking.status === BOOKING_STATUS.CANCELLED ? BOOKING_STATUS.CANCELLED : '';
        return {
            top: start * PX_PER_MINUTE,
            height: h,
            timeLabel: h > 44
                ? `${formatTime(booking.startTime)} – ${formatTime(booking.endTime)}`
                : null,
            statusClass: sc,
            canDrag: isDraggable(booking.status),
        };
    }, [booking.startTime, booking.endTime, booking.status]);

    const handleDragStart = useCallback((e) => {
        e.stopPropagation();
        if (canDrag && onDragStart) onDragStart(e, booking.id);
    }, [canDrag, onDragStart, booking.id]);

    const handleDragEnd = useCallback((e) => {
        e.stopPropagation();
        onDragEnd && onDragEnd();
    }, [onDragEnd]);

    const handleClick = useCallback((e) => {
        e.stopPropagation();
        onClick && onClick(booking);
    }, [onClick, booking]);

    return (
        <div
            className={`booking-block ${statusClass}`}
            data-testid="booking-block"
            style={{ top: `${top}px`, height: `${height}px` }}
            draggable={canDrag}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
        >
            <div className="booking-topic">{booking.clientName}</div>
            {booking.serviceName && (
                <div className="booking-service" data-testid="booking-service">{booking.serviceName}</div>
            )}
            {timeLabel && (
                <div className="booking-time" data-testid="booking-time">{timeLabel}</div>
            )}
            {booking.phone && height > 55 && (
                <div className="booking-phone">{booking.phone}</div>
            )}
            {height > 60 && (booking.requestedTherapist || booking.requestedRoom) && (
                <div className="booking-icons">
                    {booking.requestedTherapist && <span className="booking-icon-badge">T</span>}
                    {booking.requestedRoom && <span className="booking-icon-badge">R</span>}
                </div>
            )}
        </div>
    );
};

export default memo(BookingBlock);
