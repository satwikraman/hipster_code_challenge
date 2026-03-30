import {
    selectAllBookings,
    selectBookingEntities,
    selectByTherapist,
    makeSelectBookingsForTherapist,
} from '../../../store/selectors/bookingSelectors';

const b1 = { id: 'b1', therapistId: 't1', clientName: 'Alice' };
const b2 = { id: 'b2', therapistId: 't1', clientName: 'Bob' };
const b3 = { id: 'b3', therapistId: 't2', clientName: 'Carol' };

const state = {
    bookings: {
        entities: { b1, b2, b3 },
        byTherapist: { t1: ['b1', 'b2'], t2: ['b3'] },
        ids: ['b1', 'b2', 'b3'],
    },
};

describe('selectAllBookings', () => {
    it('returns all bookings in ids order', () => {
        expect(selectAllBookings(state)).toEqual([b1, b2, b3]);
    });

    it('skips ids that have no matching entity', () => {
        const sparse = {
            bookings: {
                entities: { b1 },
                byTherapist: { t1: ['b1'] },
                ids: ['b1', 'ghost'],
            },
        };
        expect(selectAllBookings(sparse)).toEqual([b1]);
    });

    it('returns empty array when there are no bookings', () => {
        const empty = { bookings: { entities: {}, byTherapist: {}, ids: [] } };
        expect(selectAllBookings(empty)).toEqual([]);
    });
});

describe('selectBookingEntities', () => {
    it('returns the entities map', () => {
        expect(selectBookingEntities(state)).toBe(state.bookings.entities);
    });
});

describe('selectByTherapist', () => {
    it('returns the byTherapist index', () => {
        expect(selectByTherapist(state)).toBe(state.bookings.byTherapist);
    });
});

describe('makeSelectBookingsForTherapist', () => {
    it('returns bookings for the specified therapist', () => {
        const selector = makeSelectBookingsForTherapist();
        expect(selector(state, 't1')).toEqual([b1, b2]);
        expect(selector(state, 't2')).toEqual([b3]);
    });

    it('returns empty array for unknown therapist', () => {
        const selector = makeSelectBookingsForTherapist();
        expect(selector(state, 'tX')).toEqual([]);
    });

    it('each factory call creates an independent memoized selector', () => {
        const selectorA = makeSelectBookingsForTherapist();
        const selectorB = makeSelectBookingsForTherapist();
        expect(selectorA(state, 't1')).toEqual([b1, b2]);
        expect(selectorB(state, 't2')).toEqual([b3]);
    });

    it('returns the same reference when state has not changed (memoization)', () => {
        const selector = makeSelectBookingsForTherapist();
        const result1 = selector(state, 't1');
        const result2 = selector(state, 't1');
        expect(result1).toBe(result2);
    });
});
