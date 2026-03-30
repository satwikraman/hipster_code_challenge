import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BookingPanel from '../../../components/panels/BookingPanel';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const THERAPISTS = [
    { id: 't1', number: 1, name: 'Alice', gender: 'female' },
    { id: 't2', number: 2, name: 'Bob', gender: 'male' },
];

// Local-time strings (no Z) so toLocalInput() round-trips correctly
const START = '2026-03-27T09:00:00';
const END = '2026-03-27T10:00:00';

// Minimal draft that passes every validation except the one under test
const fullDraft = {
    clientName: 'Test Client',
    phone: '',
    therapistId: 't1',
    startTime: START,
    endTime: END,
};

const renderPanel = (draftOverrides = {}, propOverrides = {}) =>
    render(
        <BookingPanel
            draftBooking={{ ...fullDraft, ...draftOverrides }}
            therapists={THERAPISTS}
            onClose={jest.fn()}
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
            {...propOverrides}
        />
    );

const submit = () => fireEvent.click(screen.getByRole('button', { name: /create booking/i }));

// ── Null guard ────────────────────────────────────────────────────────────────

describe('BookingPanel — null guard', () => {
    it('renders nothing when both booking and draftBooking are absent', () => {
        const { container } = render(
            <BookingPanel therapists={THERAPISTS} onClose={jest.fn()} onSubmit={jest.fn()} />
        );
        expect(container).toBeEmptyDOMElement();
    });
});

// ── Client name validation ────────────────────────────────────────────────────

describe('BookingPanel — client name validation', () => {
    it('shows error when client name is empty', () => {
        renderPanel({ clientName: '' });
        submit();
        expect(screen.getByText('Client name is required')).toBeInTheDocument();
    });

    it('shows error when client name is whitespace only', () => {
        renderPanel({ clientName: '   ' });
        submit();
        expect(screen.getByText('Client name is required')).toBeInTheDocument();
    });

    it('passes when client name is provided', () => {
        renderPanel();
        submit();
        expect(screen.queryByText('Client name is required')).not.toBeInTheDocument();
    });
});

// ── Phone validation ──────────────────────────────────────────────────────────

describe('BookingPanel — phone validation', () => {
    const phoneError = /valid 10-digit indian mobile number/i;

    describe('valid phone numbers (no error)', () => {
        const validNumbers = [
            ['starts with 6', '6000000000'],
            ['starts with 7', '7000000000'],
            ['starts with 8', '8000000000'],
            ['starts with 9', '9876543210'],
            ['empty (optional)', ''],
        ];

        test.each(validNumbers)('%s — "%s"', (_, number) => {
            renderPanel({ phone: number });
            submit();
            expect(screen.queryByText(phoneError)).not.toBeInTheDocument();
        });
    });

    describe('invalid phone numbers (shows error)', () => {
        const invalidNumbers = [
            ['starts with 0', '0123456789'],
            ['starts with 1', '1234567890'],
            ['starts with 5', '5123456789'],
            ['too short — 9 digits', '987654321'],
            ['too long — 11 digits', '98765432101'],
            ['contains letters', '98765abc90'],
            ['contains spaces mid-number', '98765 4321'],
            ['contains dashes', '9876-543210'],
        ];

        test.each(invalidNumbers)('%s — "%s"', (_, number) => {
            renderPanel({ phone: number });
            submit();
            expect(screen.getByText(phoneError)).toBeInTheDocument();
        });
    });
});

// ── Therapist validation ──────────────────────────────────────────────────────

describe('BookingPanel — therapist validation', () => {
    it('shows error when no therapist is selected', () => {
        renderPanel({ therapistId: '' });
        submit();
        expect(screen.getByText('Please select a therapist')).toBeInTheDocument();
    });

    it('passes when a therapist is selected', () => {
        renderPanel();
        submit();
        expect(screen.queryByText('Please select a therapist')).not.toBeInTheDocument();
    });
});

// ── Time validation ───────────────────────────────────────────────────────────

describe('BookingPanel — time validation', () => {
    it('shows error when start time is missing', () => {
        renderPanel({ startTime: '' });
        submit();
        expect(screen.getByText('Start and end time are required')).toBeInTheDocument();
    });

    it('shows error when end time is missing', () => {
        renderPanel({ endTime: '' });
        submit();
        expect(screen.getByText('Start and end time are required')).toBeInTheDocument();
    });

    it('shows error when end time is before start time', () => {
        renderPanel({ startTime: '2026-03-27T10:00:00', endTime: '2026-03-27T09:00:00' });
        submit();
        expect(screen.getByText('End time must be after start time')).toBeInTheDocument();
    });

    it('shows error when end time equals start time', () => {
        renderPanel({ startTime: '2026-03-27T09:00:00', endTime: '2026-03-27T09:00:00' });
        submit();
        expect(screen.getByText('End time must be after start time')).toBeInTheDocument();
    });

    it('passes when end time is after start time', () => {
        renderPanel();
        submit();
        expect(screen.queryByText('End time must be after start time')).not.toBeInTheDocument();
        expect(screen.queryByText('Start and end time are required')).not.toBeInTheDocument();
    });
});

// ── Successful submit ─────────────────────────────────────────────────────────

describe('BookingPanel — successful submission', () => {
    it('calls onSubmit with correct payload when all fields are valid', () => {
        const onSubmit = jest.fn();
        renderPanel({}, { onSubmit });
        submit();
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                clientName: 'Test Client',
                therapistId: 't1',
            })
        );
    });

    it('includes phone in payload when provided', () => {
        const onSubmit = jest.fn();
        renderPanel({ phone: '9123456789' }, { onSubmit });
        submit();
        expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({ phone: '9123456789' })
        );
    });

    it('does not call onSubmit when validation fails', () => {
        const onSubmit = jest.fn();
        renderPanel({ clientName: '' }, { onSubmit });
        submit();
        expect(onSubmit).not.toHaveBeenCalled();
    });
});
