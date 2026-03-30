import { memo } from 'react';
import { HOUR_HEIGHT } from '../../utils/calendarUtils';

// Pre-computed at module load — never changes, no work in render
const HOUR_CELLS = Array.from({ length: 11 }, (_, i) => {
    const hour = i + 8;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const h12  = hour > 12 ? hour - 12 : hour;
    return { hour, label: `${String(h12).padStart(2, '0')}:00 ${ampm}` };
});

const TimeGutter = () => (
    <div className="time-gutter" data-testid="time-gutter">
        {HOUR_CELLS.map(({ hour, label }) => (
            <div key={hour} className="time-gutter-cell" data-testid="time-gutter-cell" style={{ height: `${HOUR_HEIGHT}px` }}>
                <div className="time-label-main">{label}</div>
            </div>
        ))}
    </div>
);

export default memo(TimeGutter);
