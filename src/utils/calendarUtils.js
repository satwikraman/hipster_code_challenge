export const DATE_START_HOUR  = 8;
export const HOUR_HEIGHT      = 88;
export const BUSINESS_HOURS   = 11;
export const BUSINESS_MINUTES = BUSINESS_HOURS * 60;
export const PX_PER_MINUTE    = HOUR_HEIGHT / 60;

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export const getMinutesSinceStart = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 0;
    const minutes = d.getHours() * 60 + d.getMinutes();
    return clamp(minutes - DATE_START_HOUR * 60, 0, BUSINESS_MINUTES);
};

export const formatTime = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDateDisplay = (dateStr) =>
    new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
    });
