import { getToken } from './client';

// ── Base URLs ──────────────────────────────────────────────────────────────
const BASE_HOST = process.env.REACT_APP_API_BASE_URL || 'https://dev.natureland.hipster-virtual.com';
export const API_V1_URL    = `${BASE_HOST}/api/v1`;
export const AUTH_BASE_URL = BASE_HOST;

// ── Fixed outlet / company config ──────────────────────────────────────────
export const OUTLET_ID          = '1';
export const COMPANY_ID         = '1';
export const OUTLET_TYPE        = '2'; // booking create / therapist queries
export const STATUS_OUTLET_TYPE = '1'; // check-in / checkout status updates
export const PANEL              = 'outlet';

// ── Booking defaults ────────────────────────────────────────────────────────
export const DEFAULT_CURRENCY     = 'SGD';
export const DEFAULT_PAYMENT_TYPE = 'payatstore';
export const DEFAULT_MEMBERSHIP   = '0';
export const DEFAULT_BOOKING_TYPE = '1';

// ── Date helpers ────────────────────────────────────────────────────────────
/**
 * Converts an ISO datetime string to the `DD-MM-YYYY HH:MM` format
 * required by the booking create/edit API endpoints.
 * Uses local time so the displayed calendar time matches what is sent.
 */
export const toApiDateTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ── Request timeout ────────────────────────────────────────────────────────
export const API_TIMEOUT_MS = 8000;

// ── Shared fetch helpers ───────────────────────────────────────────────────

/** Races a fetch promise against a timeout. */
export const withTimeout = (fetchPromise, ms = API_TIMEOUT_MS) =>
    Promise.race([
        fetchPromise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), ms)
        ),
    ]);

/**
 * Fires `hipster:unauthorized` on 401/403 so App can log the user out.
 * Returns the response unchanged for caller to inspect.
 */
export const checkAuth = (res) => {
    if (res.status === 401 || res.status === 403) {
        window.dispatchEvent(new CustomEvent('hipster:unauthorized'));
    }
    return res;
};

/**
 * Bearer-token Authorization header for authenticated requests.
 * Content-Type is intentionally omitted — FormData requests set their own
 * boundary, and JSON requests should add it explicitly if needed.
 */
export const authHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
});
