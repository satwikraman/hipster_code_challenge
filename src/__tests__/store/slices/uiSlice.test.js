import uiReducer, {
    setSelectedDate,
    openPanel,
    closePanel,
    setToast,
    clearToast,
} from '../../../store/slices/uiSlice';

describe('uiSlice', () => {
    it('returns correct initial state shape', () => {
        const state = uiReducer(undefined, { type: '@@INIT' });
        expect(state.selectedBookingId).toBeNull();
        expect(state.isPanelOpen).toBe(false);
        expect(state.toastMessage).toBeNull();
        expect(state.selectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('setSelectedDate updates selectedDate', () => {
        const state = uiReducer(undefined, setSelectedDate('2026-04-01'));
        expect(state.selectedDate).toBe('2026-04-01');
    });

    it('openPanel sets selectedBookingId and opens panel', () => {
        const state = uiReducer(undefined, openPanel('booking-123'));
        expect(state.selectedBookingId).toBe('booking-123');
        expect(state.isPanelOpen).toBe(true);
    });

    it('openPanel with null opens a "new booking" panel', () => {
        const state = uiReducer(undefined, openPanel(null));
        expect(state.selectedBookingId).toBeNull();
        expect(state.isPanelOpen).toBe(true);
    });

    it('closePanel clears selectedBookingId and closes panel', () => {
        const opened = uiReducer(undefined, openPanel('booking-123'));
        const closed = uiReducer(opened, closePanel());
        expect(closed.selectedBookingId).toBeNull();
        expect(closed.isPanelOpen).toBe(false);
    });

    it('setToast sets toastMessage', () => {
        const state = uiReducer(undefined, setToast('Booking saved!'));
        expect(state.toastMessage).toBe('Booking saved!');
    });

    it('clearToast resets toastMessage to null', () => {
        const withToast = uiReducer(undefined, setToast('Hello'));
        const cleared = uiReducer(withToast, clearToast());
        expect(cleared.toastMessage).toBeNull();
    });
});
