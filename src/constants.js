/** Debounce delay (ms) used for all search / input deferral. */
export const DEBOUNCE_MS = 300;

/** Snap-to-grid interval for drag-drop time rounding (minutes). */
export const SNAP_MINUTES = 15;

/** Booking lifecycle status values — single source of truth. */
export const BOOKING_STATUS = {
    CONFIRMED:    'confirmed',
    UNCONFIRMED:  'unconfirmed',
    CHECK_IN:     'check-in',
    COMPLETED:    'completed',
    CANCELLED:    'cancelled',
    NO_SHOW:      'no-show',
    HOLDING:      'holding',
    IN_PROGRESS:  'in-progress',
};
