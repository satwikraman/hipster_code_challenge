import { createSelector } from '@reduxjs/toolkit';

export const selectAllBookings = createSelector(
    [(state) => state.bookings.ids, (state) => state.bookings.entities],
    (ids, entities) => ids.map((id) => entities[id]).filter(Boolean)
);

// Returns the raw entities map — stable reference unless an entity changes
export const selectBookingEntities = (state) => state.bookings.entities;

// Returns the byTherapist index — stable reference unless assignments change
export const selectByTherapist = (state) => state.bookings.byTherapist;

export const selectBookingsStatus = (state) => state.bookings.status;
export const selectBookingsError  = (state) => state.bookings.error;

// Factory: creates a memoized per-therapist selector.
// Each TherapistColum instance calls this once and reuses the selector,
// so a status update on therapist A does NOT re-render therapist B's column.
export const makeSelectBookingsForTherapist = () =>
    createSelector(
        [
            selectBookingEntities,
            selectByTherapist,
            (_state, therapistId) => therapistId,
        ],
        (entities, byTherapist, therapistId) => {
            const ids = byTherapist[therapistId] || [];
            return ids.map((id) => entities[id]).filter(Boolean);
        }
    );
