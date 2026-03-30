import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CancelBookingModal from '../../../components/modals/CancelBookingModal';

const sampleBooking = { id: 'b1', clientName: 'Alice', status: 'confirmed' };

describe('CancelBookingModal', () => {
    it('renders nothing when booking is null', () => {
        const { container } = render(
            <CancelBookingModal booking={null} onCancel={jest.fn()} onConfirm={jest.fn()} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the modal when booking is provided', () => {
        render(<CancelBookingModal booking={sampleBooking} onCancel={jest.fn()} onConfirm={jest.fn()} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Cancel / Delete Booking')).toBeInTheDocument();
    });

    it('defaults to "normal" cancellation selected', () => {
        render(<CancelBookingModal booking={sampleBooking} onCancel={jest.fn()} onConfirm={jest.fn()} />);
        const normalRadio = screen.getByDisplayValue('normal');
        expect(normalRadio).toBeChecked();
    });

    it('allows selecting "delete" option', () => {
        render(<CancelBookingModal booking={sampleBooking} onCancel={jest.fn()} onConfirm={jest.fn()} />);
        const deleteRadio = screen.getByDisplayValue('delete');
        fireEvent.click(deleteRadio);
        expect(deleteRadio).toBeChecked();
    });

    it('"No Show" radio is disabled', () => {
        render(<CancelBookingModal booking={sampleBooking} onCancel={jest.fn()} onConfirm={jest.fn()} />);
        expect(screen.getByDisplayValue('noshow')).toBeDisabled();
    });

    it('calls onCancel when Cancel button is clicked', () => {
        const handleCancel = jest.fn();
        render(<CancelBookingModal booking={sampleBooking} onCancel={handleCancel} onConfirm={jest.fn()} />);
        fireEvent.click(screen.getByText('Cancel'));
        expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm with "normal" by default when Next is clicked', () => {
        const handleConfirm = jest.fn();
        render(<CancelBookingModal booking={sampleBooking} onCancel={jest.fn()} onConfirm={handleConfirm} />);
        fireEvent.click(screen.getByText('Next'));
        expect(handleConfirm).toHaveBeenCalledWith('normal');
    });

    it('calls onConfirm with "delete" when delete is selected and Next clicked', () => {
        const handleConfirm = jest.fn();
        render(<CancelBookingModal booking={sampleBooking} onCancel={jest.fn()} onConfirm={handleConfirm} />);
        fireEvent.click(screen.getByDisplayValue('delete'));
        fireEvent.click(screen.getByText('Next'));
        expect(handleConfirm).toHaveBeenCalledWith('delete');
    });

    it('has aria-modal and aria-labelledby for accessibility', () => {
        render(<CancelBookingModal booking={sampleBooking} onCancel={jest.fn()} onConfirm={jest.fn()} />);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'cancel-modal-title');
    });
});
