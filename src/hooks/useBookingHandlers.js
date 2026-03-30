import { useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    createBooking,
    updateBooking,
    cancelBooking,
    checkInBooking,
    checkoutBooking,
    deleteBooking,
} from '../store/slices/bookingsSlice';
import { closePanel, openPanel, setToast } from '../store/slices/uiSlice';
import { selectAllBookings } from '../store/selectors/bookingSelectors';

export const useBookingHandlers = () => {
    const dispatch = useDispatch();
    const bookings = useSelector(selectAllBookings);

    // Ref so handlers can read the latest bookings without triggering re-renders
    const bookingsRef = useRef(bookings);
    useEffect(() => { bookingsRef.current = bookings; }, [bookings]);

    const [isDragging, setIsDragging]             = useState(false);
    const [draftBooking, setDraftBooking]         = useState(null);
    const [cancelModalBooking, setCancelModalBooking] = useState(null);

    const message = useCallback((msg) => dispatch(setToast(msg)), [dispatch]);

    const handleDropBooking = useCallback(async (id, therapistId, startTime) => {
        const b = bookingsRef.current.find((x) => x.id === id);
        if (!b) { message('Unable to reschedule.'); setIsDragging(false); return; }
        const duration = new Date(b.endTime) - new Date(b.startTime);
        const endTime = new Date(new Date(startTime).getTime() + duration).toISOString();
        try {
            await dispatch(updateBooking({ id, payload: { therapistId, startTime, endTime, source: b.source } })).unwrap();
            message('Booking rescheduled!');
        } catch (err) {
            message(`Reschedule failed: ${err}`);
        }
        setIsDragging(false);
    }, [dispatch, message]);

    const handleCreateBooking = useCallback((therapistId, startTime, endTime) => {
        setDraftBooking({ therapistId, startTime, endTime, clientName: '' });
        dispatch(openPanel(null));
    }, [dispatch]);

    const handlePanelSubmit = useCallback(async ({ id, therapistId, clientName, startTime, endTime, serviceName, phone, source }) => {
        try {
            if (id) {
                await dispatch(updateBooking({ id, payload: { therapistId, clientName, startTime, endTime, serviceName, phone, source } })).unwrap();
                message('Booking updated.');
            } else {
                await dispatch(createBooking({ therapistId, clientName, startTime, endTime, serviceName, phone, source })).unwrap();
                message('Booking created.');
            }
            setDraftBooking(null);
            dispatch(closePanel());
        } catch (err) {
            message(`Save failed: ${err}`);
        }
    }, [dispatch, message]);

    const handlePanelClose = useCallback(() => {
        setDraftBooking(null);
        dispatch(closePanel());
    }, [dispatch]);

    // Opens the Cancel/Delete modal instead of acting immediately
    const handlePanelCancel = useCallback((id) => {
        const booking = bookingsRef.current.find((b) => b.id === id);
        if (booking) setCancelModalBooking(booking);
    }, []);

    // Called when user confirms a choice inside the modal
    const handleCancelModalConfirm = useCallback(async (type) => {
        const id = cancelModalBooking?.id;
        if (!id) return;  // guard: modal was dismissed externally before confirm fired
        setCancelModalBooking(null);
        dispatch(closePanel());
        try {
            if (type === 'delete') {
                await dispatch(deleteBooking(id)).unwrap();
                message('Booking deleted.');
            } else {
                await dispatch(cancelBooking({ id, cancelType: 'normal' })).unwrap();
                message('Booking cancelled.');
            }
        } catch (err) {
            message(`Action failed: ${err}`);
        }
    }, [cancelModalBooking, dispatch, message]);

    const handlePanelCheckIn = useCallback(async (id) => {
        try {
            await dispatch(checkInBooking(id)).unwrap();
            message('Client checked in!');
        } catch (err) {
            message(`Check-in failed: ${err}`);
        }
    }, [dispatch, message]);

    const handlePanelCheckOut = useCallback(async (id) => {
        try {
            await dispatch(checkoutBooking(id)).unwrap();
            message('Client checked out!');
        } catch (err) {
            message(`Check-out failed: ${err}`);
        }
    }, [dispatch, message]);

    const handleBookingClick = useCallback((booking) => {
        dispatch(openPanel(booking.id));
        setDraftBooking(null);
    }, [dispatch]);

    const handleDragStart = useCallback(() => setIsDragging(true), []);
    const handleDragEnd   = useCallback(() => setIsDragging(false), []);

    return {
        isDragging,
        draftBooking,
        cancelModalBooking,
        setCancelModalBooking,
        handleDropBooking,
        handleCreateBooking,
        handlePanelSubmit,
        handlePanelClose,
        handlePanelCancel,
        handleCancelModalConfirm,
        handlePanelCheckIn,
        handlePanelCheckOut,
        handleBookingClick,
        handleDragStart,
        handleDragEnd,
    };
};
