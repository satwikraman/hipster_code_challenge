import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as bookingsApi from '../../api/bookings';
import { logger } from '../../utils/logger';
import { BOOKING_STATUS } from '../../constants';

export const fetchBookings = createAsyncThunk(
    'bookings/fetchAll',
    async (date, { rejectWithValue }) => {
        try {
            return await bookingsApi.getBookings(date);
        } catch (err) {
            logger.error('API_FAILURE', { action: 'fetchBookings', err });
            return rejectWithValue(err.message);
        }
    }
);

export const createBooking = createAsyncThunk(
    'bookings/create',
    async (payload, { rejectWithValue }) => {
        try {
            const booking = await bookingsApi.postBooking(payload);
            logger.info('BOOKING_CREATED', { bookingId: booking.id });
            return booking;
        } catch (err) {
            logger.error('API_FAILURE', { action: 'createBooking', err });
            return rejectWithValue(err.message);
        }
    }
);

export const updateBooking = createAsyncThunk(
    'bookings/update',
    async ({ id, payload }, { rejectWithValue }) => {
        try {
            const booking = await bookingsApi.putBooking(id, payload);
            logger.info('BOOKING_EDITED', { bookingId: id });
            return booking;
        } catch (err) {
            logger.error('API_FAILURE', { action: 'updateBooking', err });
            return rejectWithValue(err.message);
        }
    }
);

export const cancelBooking = createAsyncThunk(
    'bookings/cancel',
    async ({ id, cancelType = 'normal' }, { rejectWithValue }) => {
        try {
            await bookingsApi.cancelBooking(id, cancelType);
            logger.info('BOOKING_CANCELLED', { bookingId: id, cancelType });
            return id;
        } catch (err) {
            logger.error('API_FAILURE', { action: 'cancelBooking', err });
            return rejectWithValue(err.message);
        }
    }
);

export const checkInBooking = createAsyncThunk(
    'bookings/checkIn',
    async (id, { rejectWithValue }) => {
        try {
            await bookingsApi.checkInBooking(id);
            logger.info('BOOKING_CHECKED_IN', { bookingId: id });
            return id;
        } catch (err) {
            logger.error('API_FAILURE', { action: 'checkInBooking', err });
            return rejectWithValue(err.message);
        }
    }
);

export const checkoutBooking = createAsyncThunk(
    'bookings/checkout',
    async (id, { rejectWithValue }) => {
        try {
            await bookingsApi.checkoutBooking(id);
            logger.info('BOOKING_CHECKED_OUT', { bookingId: id });
            return id;
        } catch (err) {
            logger.error('API_FAILURE', { action: 'checkoutBooking', err });
            return rejectWithValue(err.message);
        }
    }
);

export const deleteBooking = createAsyncThunk(
    'bookings/delete',
    async (id, { rejectWithValue }) => {
        try {
            await bookingsApi.deleteBooking(id);
            logger.info('BOOKING_DELETED', { bookingId: id });
            return id;
        } catch (err) {
            logger.error('API_FAILURE', { action: 'deleteBooking', err });
            return rejectWithValue(err.message);
        }
    }
);

const bookingsSlice = createSlice({
    name: 'bookings',
    initialState: {
        entities: {},
        byTherapist: {},
        ids: [],
        status: 'idle',
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchBookings.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchBookings.fulfilled, (state, action) => {
                state.status = 'succeeded';
                const entities = {};
                const byTherapist = {};
                const ids = [];
                action.payload.forEach((b) => {
                    entities[b.id] = b;
                    ids.push(b.id);
                    if (!byTherapist[b.therapistId]) byTherapist[b.therapistId] = [];
                    byTherapist[b.therapistId].push(b.id);
                });
                state.entities = entities;
                state.byTherapist = byTherapist;
                state.ids = ids;
            })
            .addCase(fetchBookings.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            })
            .addCase(createBooking.fulfilled, (state, action) => {
                const b = action.payload;
                state.entities[b.id] = b;
                state.ids.push(b.id);
                if (!state.byTherapist[b.therapistId]) state.byTherapist[b.therapistId] = [];
                state.byTherapist[b.therapistId].push(b.id);
            })
            .addCase(updateBooking.fulfilled, (state, action) => {
                const b = action.payload;
                const old = state.entities[b.id];
                if (old && old.therapistId !== b.therapistId) {
                    state.byTherapist[old.therapistId] = (state.byTherapist[old.therapistId] || []).filter((id) => id !== b.id);
                    if (!state.byTherapist[b.therapistId]) state.byTherapist[b.therapistId] = [];
                    state.byTherapist[b.therapistId].push(b.id);
                }
                state.entities[b.id] = { ...(old || {}), ...b };
            })
            .addCase(cancelBooking.fulfilled, (state, action) => {
                const id = action.payload;
                if (state.entities[id]) {
                    state.entities[id] = { ...state.entities[id], status: BOOKING_STATUS.CANCELLED };
                }
            })
            .addCase(checkInBooking.fulfilled, (state, action) => {
                const id = action.payload;
                if (state.entities[id]) {
                    state.entities[id] = { ...state.entities[id], status: BOOKING_STATUS.CHECK_IN };
                }
            })
            .addCase(checkoutBooking.fulfilled, (state, action) => {
                const id = action.payload;
                if (state.entities[id]) {
                    state.entities[id] = { ...state.entities[id], status: BOOKING_STATUS.COMPLETED };
                }
            })
            .addCase(deleteBooking.fulfilled, (state, action) => {
                const id = action.payload;
                delete state.entities[id];
                state.ids = state.ids.filter((x) => x !== id);
                Object.keys(state.byTherapist).forEach((tid) => {
                    state.byTherapist[tid] = state.byTherapist[tid].filter((x) => x !== id);
                });
            });
    },
});

export default bookingsSlice.reducer;
