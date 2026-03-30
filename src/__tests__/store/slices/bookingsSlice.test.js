import bookingsReducer, {
    fetchBookings,
    createBooking,
    updateBooking,
    cancelBooking,
    checkInBooking,
    checkoutBooking,
    deleteBooking,
} from '../../../store/slices/bookingsSlice';

jest.mock('../../../api/bookings');
jest.mock('../../../utils/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const initialState = {
    entities: {},
    byTherapist: {},
    ids: [],
    status: 'idle',
    error: null,
};

const sampleBooking = {
    id: 'b1',
    therapistId: 't1',
    clientName: 'Alice',
    status: 'confirmed',
    startTime: '2026-03-25T09:00:00.000Z',
    endTime: '2026-03-25T10:00:00.000Z',
};

const populatedState = {
    entities: { b1: sampleBooking },
    byTherapist: { t1: ['b1'] },
    ids: ['b1'],
    status: 'succeeded',
    error: null,
};

describe('bookingsSlice', () => {
    it('returns correct initial state', () => {
        expect(bookingsReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
    });

    describe('fetchBookings', () => {
        it('pending sets status to loading', () => {
            const state = bookingsReducer(initialState, { type: fetchBookings.pending.type });
            expect(state.status).toBe('loading');
            expect(state.error).toBeNull();
        });

        it('fulfilled normalises bookings into entities + byTherapist', () => {
            const bookings = [sampleBooking, { ...sampleBooking, id: 'b2', therapistId: 't2' }];
            const state = bookingsReducer(initialState, {
                type: fetchBookings.fulfilled.type,
                payload: bookings,
            });
            expect(state.status).toBe('succeeded');
            expect(Object.keys(state.entities)).toHaveLength(2);
            expect(state.ids).toEqual(['b1', 'b2']);
            expect(state.byTherapist['t1']).toEqual(['b1']);
            expect(state.byTherapist['t2']).toEqual(['b2']);
        });

        it('fulfilled groups multiple bookings under the same therapist', () => {
            const b2 = { ...sampleBooking, id: 'b2' };
            const state = bookingsReducer(initialState, {
                type: fetchBookings.fulfilled.type,
                payload: [sampleBooking, b2],
            });
            expect(state.byTherapist['t1']).toEqual(['b1', 'b2']);
        });

        it('rejected sets status to failed with error payload', () => {
            const state = bookingsReducer(initialState, {
                type: fetchBookings.rejected.type,
                payload: 'Network error',
            });
            expect(state.status).toBe('failed');
            expect(state.error).toBe('Network error');
        });
    });

    describe('createBooking.fulfilled', () => {
        it('adds a new booking to entities, ids, and byTherapist', () => {
            const newBooking = { id: 'b2', therapistId: 't2', clientName: 'Bob', status: 'confirmed' };
            const state = bookingsReducer(populatedState, {
                type: createBooking.fulfilled.type,
                payload: newBooking,
            });
            expect(state.entities['b2']).toEqual(newBooking);
            expect(state.ids).toContain('b2');
            expect(state.byTherapist['t2']).toContain('b2');
        });
    });

    describe('updateBooking.fulfilled', () => {
        it('updates the booking entity in place', () => {
            const updated = { ...sampleBooking, clientName: 'Alice Updated' };
            const state = bookingsReducer(populatedState, {
                type: updateBooking.fulfilled.type,
                payload: updated,
            });
            expect(state.entities['b1'].clientName).toBe('Alice Updated');
        });

        it('moves booking to new therapist in byTherapist index when therapist changes', () => {
            const moved = { ...sampleBooking, therapistId: 't3' };
            const state = bookingsReducer(populatedState, {
                type: updateBooking.fulfilled.type,
                payload: moved,
            });
            expect(state.byTherapist['t1']).not.toContain('b1');
            expect(state.byTherapist['t3']).toContain('b1');
        });
    });

    describe('cancelBooking.fulfilled', () => {
        it('sets booking status to cancelled', () => {
            const state = bookingsReducer(populatedState, {
                type: cancelBooking.fulfilled.type,
                payload: 'b1',
            });
            expect(state.entities['b1'].status).toBe('cancelled');
        });

        it('is a no-op for unknown booking id', () => {
            const state = bookingsReducer(populatedState, {
                type: cancelBooking.fulfilled.type,
                payload: 'nonexistent',
            });
            expect(state).toEqual(populatedState);
        });
    });

    describe('checkInBooking.fulfilled', () => {
        it('sets booking status to check-in', () => {
            const state = bookingsReducer(populatedState, {
                type: checkInBooking.fulfilled.type,
                payload: 'b1',
            });
            expect(state.entities['b1'].status).toBe('check-in');
        });
    });

    describe('checkoutBooking.fulfilled', () => {
        it('sets booking status to completed', () => {
            const state = bookingsReducer(populatedState, {
                type: checkoutBooking.fulfilled.type,
                payload: 'b1',
            });
            expect(state.entities['b1'].status).toBe('completed');
        });
    });

    describe('deleteBooking.fulfilled', () => {
        it('removes booking from entities, ids, and byTherapist', () => {
            const state = bookingsReducer(populatedState, {
                type: deleteBooking.fulfilled.type,
                payload: 'b1',
            });
            expect(state.entities['b1']).toBeUndefined();
            expect(state.ids).not.toContain('b1');
            expect(state.byTherapist['t1']).not.toContain('b1');
        });
    });
});
