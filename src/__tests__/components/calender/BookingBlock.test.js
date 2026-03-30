import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BookingBlock from '../../../components/calendar/BookingBlock';

// No timezone suffix — parsed as local time so getHours() returns predictable values
// regardless of the test runner's system timezone.
const baseBooking = {
    id: 'b1',
    clientName: 'Alice Smith',
    serviceName: 'Swedish Massage',
    startTime: '2026-03-25T09:00:00',   // 9:00 AM local  → 60 min after business start
    endTime:   '2026-03-25T10:30:00',   // 10:30 AM local → 90 min → height ≈ 132 px
    status: 'confirmed',
    phone: '+1 555-0100',
    requestedTherapist: false,
    requestedRoom: false,
};

describe('BookingBlock', () => {
    it('renders client name', () => {
        render(<BookingBlock booking={baseBooking} />);
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    it('renders service name', () => {
        render(<BookingBlock booking={baseBooking} />);
        expect(screen.getByText('Swedish Massage')).toBeInTheDocument();
    });

    it('renders time range label for tall blocks (>44px)', () => {
        render(<BookingBlock booking={baseBooking} />);
        // 90 min × (88/60) ≈ 132px — should show time label
        expect(screen.getByTestId('booking-time')).toBeInTheDocument();
    });

    it('does not render time label when block is short (<= 44px)', () => {
        const shortBooking = {
            ...baseBooking,
            startTime: '2026-03-25T09:00:00',
            endTime:   '2026-03-25T09:15:00', // 15 min → ~22px (minimum clamped)
        };
        render(<BookingBlock booking={shortBooking} />);
        expect(screen.queryByTestId('booking-time')).not.toBeInTheDocument();
    });

    it('calls onClick with the booking when clicked', () => {
        const handleClick = jest.fn();
        render(<BookingBlock booking={baseBooking} onClick={handleClick} />);
        fireEvent.click(screen.getByTestId('booking-block'));
        expect(handleClick).toHaveBeenCalledTimes(1);
        expect(handleClick).toHaveBeenCalledWith(baseBooking);
    });

    it('does not throw when onClick is not provided', () => {
        render(<BookingBlock booking={baseBooking} />);
        expect(() => fireEvent.click(screen.getByTestId('booking-block'))).not.toThrow();
    });

    it('applies check-in class for check-in status', () => {
        render(<BookingBlock booking={{ ...baseBooking, status: 'check-in' }} />);
        expect(screen.getByTestId('booking-block')).toHaveClass('check-in');
    });

    it('applies completed class for completed status', () => {
        render(<BookingBlock booking={{ ...baseBooking, status: 'completed' }} />);
        expect(screen.getByTestId('booking-block')).toHaveClass('completed');
    });

    it('applies cancelled class for cancelled status', () => {
        render(<BookingBlock booking={{ ...baseBooking, status: 'cancelled' }} />);
        expect(screen.getByTestId('booking-block')).toHaveClass('cancelled');
    });

    it('is draggable for confirmed bookings', () => {
        render(<BookingBlock booking={baseBooking} />);
        expect(screen.getByTestId('booking-block')).toHaveAttribute('draggable', 'true');
    });

    it('is not draggable for cancelled bookings', () => {
        render(<BookingBlock booking={{ ...baseBooking, status: 'cancelled' }} />);
        expect(screen.getByTestId('booking-block')).toHaveAttribute('draggable', 'false');
    });

    it('is not draggable for completed bookings', () => {
        render(<BookingBlock booking={{ ...baseBooking, status: 'completed' }} />);
        expect(screen.getByTestId('booking-block')).toHaveAttribute('draggable', 'false');
    });

    it('calls onDragStart with event and booking id when drag starts', () => {
        const handleDragStart = jest.fn();
        render(<BookingBlock booking={baseBooking} onDragStart={handleDragStart} />);
        fireEvent.dragStart(screen.getByTestId('booking-block'));
        expect(handleDragStart).toHaveBeenCalledWith(expect.any(Object), 'b1');
    });

    it('calls onDragEnd when drag ends', () => {
        const handleDragEnd = jest.fn();
        render(<BookingBlock booking={baseBooking} onDragEnd={handleDragEnd} />);
        fireEvent.dragEnd(screen.getByTestId('booking-block'));
        expect(handleDragEnd).toHaveBeenCalled();
    });

    it('shows T badge when requestedTherapist is true and block is tall', () => {
        render(<BookingBlock booking={{ ...baseBooking, requestedTherapist: true }} />);
        expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('shows R badge when requestedRoom is true and block is tall', () => {
        render(<BookingBlock booking={{ ...baseBooking, requestedRoom: true }} />);
        expect(screen.getByText('R')).toBeInTheDocument();
    });

    it('does not render serviceName element when serviceName is absent', () => {
        render(<BookingBlock booking={{ ...baseBooking, serviceName: undefined }} />);
        expect(screen.queryByTestId('booking-service')).not.toBeInTheDocument();
    });
});
