import { memo, useRef, useState, useCallback, useEffect, useMemo } from 'react';
import TimeGutter from './TimeGutter';
import TherapistColumn from './TherapistColumn';
import DragDropLayer from './DragDropLayer';

const COLUMN_WIDTH      = 140;
const EMPTY             = [];
const TIME_GUTTER_WIDTH = 72;
// Extra columns to render beyond the visible horizontal edge
const OVERSCAN_H = 2;

// Skeleton block positions per column
const SKELETON_SLOTS = [
    { top: 44,  height: 88  },
    { top: 176, height: 132 },
    { top: 352, height: 88  },
    { top: 528, height: 110 },
];

/**
 * Dual-axis virtual rendering:
 *
 * Horizontal — only therapist columns inside the horizontal viewport
 *   (+ OVERSCAN_H buffer) are mounted. Spacer <div>s maintain scroll width.
 *
 * Vertical — only booking blocks whose pixel bounds overlap the vertical
 *   viewport (+ OVERSCAN_V px buffer) are rendered. The column container
 *   keeps its full height so absolute positioning and scrollbar behaviour
 *   are unchanged — we simply skip rendering invisible blocks.
 */
const CalendarGrid = ({
    therapists,
    selectedDate,
    bookings,
    onBookingClick,
    onReschedule,
    onCreate,
    isDragging,
    onDragStart,
    onDragEnd,
    isLoading,
}) => {
    const scrollRef    = useRef(null);
    const headerRowRef = useRef(null);

    const [visRange, setVisRange] = useState({
        start: 0,
        end: Math.min(OVERSCAN_H * 4, therapists.length),
    });

    // visVertical.top/bottom are in grid-px coordinates (0 = top of time grid)
    const [visVertical, setVisVertical] = useState({ top: 0, bottom: Infinity });

    const totalColumns = therapists.length;
    const innerWidth   = TIME_GUTTER_WIDTH + totalColumns * COLUMN_WIDTH;

    const updateRange = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;

        // ── Horizontal ─────────────────────────────────────────────────────────
        const scrollLeft    = el.scrollLeft;
        const viewportWidth = el.clientWidth;
        const contentScroll = Math.max(0, scrollLeft - TIME_GUTTER_WIDTH);
        const rawStart      = Math.floor(contentScroll / COLUMN_WIDTH);
        const rawEnd        = Math.ceil((contentScroll + viewportWidth) / COLUMN_WIDTH);
        setVisRange({
            start: Math.max(0, rawStart - OVERSCAN_H),
            end:   Math.min(totalColumns, rawEnd + OVERSCAN_H),
        });

        // ── Vertical ───────────────────────────────────────────────────────────
        // The sticky header sits above the time grid. Subtract its height so
        // visVertical is expressed in grid-px (0 = top of 08:00 row).
        const headerH = headerRowRef.current ? headerRowRef.current.offsetHeight : 0;
        setVisVertical({
            top:    Math.max(0, el.scrollTop - headerH),
            bottom: el.scrollTop - headerH + el.clientHeight,
        });
    }, [totalColumns]);

    // Seed ranges on mount and whenever the therapist list changes
    useEffect(() => { updateRange(); }, [updateRange]);

    const leftSpacerWidth   = visRange.start * COLUMN_WIDTH;
    const rightSpacerWidth  = Math.max(0, (totalColumns - visRange.end) * COLUMN_WIDTH);
    const visibleTherapists = therapists.slice(visRange.start, visRange.end);

    // Pre-group bookings by therapistId so each TherapistColumn gets a stable
    // reference that only changes when that therapist's bookings actually change.
    const bookingsByTherapist = useMemo(() => {
        if (!bookings) return null;
        const map = new Map();
        for (const b of bookings) {
            const list = map.get(b.therapistId);
            if (list) list.push(b);
            else map.set(b.therapistId, [b]);
        }
        return map;
    }, [bookings]);

    return (
        <div className="calendar-root" ref={scrollRef} onScroll={updateRange}>
            {/* ── Sticky therapist header row ── */}
            <div className="cal-header-row" ref={headerRowRef} style={{ width: `${innerWidth}px` }}>
                <div className="time-gutter-stub">
                    <span className="time-stub-label">Time</span>
                </div>

                {leftSpacerWidth > 0 && (
                    <div style={{ width: `${leftSpacerWidth}px`, flexShrink: 0 }} />
                )}

                {visibleTherapists.map((t) => (
                    <div key={t.id} className="therapist-header" style={{ width: `${COLUMN_WIDTH}px` }}>
                        <div className={`therapist-badge ${t.gender}`}>{t.number}</div>
                        <div className="therapist-info">
                            <span className="therapist-name">{t.name}</span>
                            <span className={`therapist-gender-label ${t.gender}`}>
                                {t.gender === 'female' ? 'Female' : 'Male'}
                            </span>
                        </div>
                    </div>
                ))}

                {rightSpacerWidth > 0 && (
                    <div style={{ width: `${rightSpacerWidth}px`, flexShrink: 0 }} />
                )}
            </div>

            {/* ── Scrollable body ── */}
            <div className="cal-body-row" style={{ width: `${innerWidth}px` }}>
                <TimeGutter />

                <div
                    className="calendar-columns"
                    style={{
                        display: 'flex',
                        width: `${totalColumns * COLUMN_WIDTH}px`,
                    }}
                >
                    {leftSpacerWidth > 0 && (
                        <div style={{ width: `${leftSpacerWidth}px`, flexShrink: 0, borderLeft: '1px solid #e2e8f0' }} />
                    )}

                    {isLoading
                        ? visibleTherapists.map((therapist) => (
                            <div
                                key={therapist.id}
                                className="skeleton-col"
                                style={{ width: `${COLUMN_WIDTH}px`, flexShrink: 0 }}
                            >
                                {SKELETON_SLOTS.map((slot, i) => (
                                    <div
                                        key={i}
                                        className="skeleton-block"
                                        style={{ top: `${slot.top}px`, height: `${slot.height}px` }}
                                    />
                                ))}
                            </div>
                        ))
                        : visibleTherapists.map((therapist) => (
                            <TherapistColumn
                                key={therapist.id}
                                therapist={therapist}
                                selectedDate={selectedDate}
                                bookings={bookingsByTherapist ? (bookingsByTherapist.get(therapist.id) ?? EMPTY) : undefined}
                                onBookingClick={onBookingClick}
                                onDropBooking={onReschedule}
                                onCreateBooking={onCreate}
                                onDragStart={onDragStart}
                                onDragEnd={onDragEnd}
                                width={COLUMN_WIDTH}
                                visTop={visVertical.top}
                                visBottom={visVertical.bottom}
                            />
                        ))
                    }

                    {rightSpacerWidth > 0 && (
                        <div style={{ width: `${rightSpacerWidth}px`, flexShrink: 0 }} />
                    )}
                </div>
            </div>

            <DragDropLayer isDragging={isDragging} />
        </div>
    );
};

export default memo(CalendarGrid);
