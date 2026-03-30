import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimeGutter from '../../../components/calendar/TimeGutter';

describe('TimeGutter', () => {
    it('renders 11 time cells (08:00 AM – 06:00 PM)', () => {
        render(<TimeGutter />);
        expect(screen.getAllByTestId('time-gutter-cell')).toHaveLength(11);
    });

    it('renders the first label as 08:00 AM', () => {
        render(<TimeGutter />);
        expect(screen.getByText('08:00 AM')).toBeInTheDocument();
    });

    it('renders the last label as 06:00 PM', () => {
        render(<TimeGutter />);
        expect(screen.getByText('06:00 PM')).toBeInTheDocument();
    });

    it('renders noon as 12:00 PM', () => {
        render(<TimeGutter />);
        expect(screen.getByText('12:00 PM')).toBeInTheDocument();
    });

    it('wraps everything in a .time-gutter container', () => {
        render(<TimeGutter />);
        expect(screen.getByTestId('time-gutter')).toBeInTheDocument();
    });
});
