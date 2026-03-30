/**
 * Structured logger — satisfies Assessment Requirement 8 (Logging Strategy)
 *
 * Captures:
 *  - API errors & responses
 *  - UI exceptions (wired from ErrorBoundary)
 *  - User actions (booking created / edited / cancelled / check-in / check-out)
 *
 * Logs are printed to the browser console AND persisted in sessionStorage
 * (key: "hipster_logs") for inspection during the interview demo.
 */

const MAX_SESSION_LOGS = 500;

const persist = (entry) => {
    try {
        const raw  = sessionStorage.getItem('hipster_logs');
        const logs = raw ? JSON.parse(raw) : [];
        logs.push(entry);
        if (logs.length > MAX_SESSION_LOGS) logs.splice(0, logs.length - MAX_SESSION_LOGS);
        sessionStorage.setItem('hipster_logs', JSON.stringify(logs));
    } catch {
        // sessionStorage unavailable or quota exceeded — ignore
    }
};

const write = (level, event, data) => {
    const entry = {
        ts:    new Date().toISOString(),
        level,
        event,
        ...(data != null ? { data } : {}),
    };

    const prefix = `[${entry.ts}] [${level}] ${event}`;
    if (level === 'ERROR')      console.error(prefix, data ?? '');
    else if (level === 'WARN')  console.warn(prefix,  data ?? '');
    else                        console.log(prefix,   data ?? '');

    persist(entry);
};

export const logger = {
    // ── Generic levels ──────────────────────────────────────────────────────
    info:  (event, data) => write('INFO',  event, data),
    warn:  (event, data) => write('WARN',  event, data),
    error: (event, data) => write('ERROR', event, data),

    // ── Semantic helpers ─────────────────────────────────────────────────────
    /** Log a failed API call. Pass the endpoint + the caught error. */
    apiError: (endpoint, err) =>
        write('ERROR', 'API_ERROR', {
            endpoint,
            message: err?.message ?? String(err),
        }),

    /** Log a React component exception (use inside componentDidCatch). */
    uiError: (component, err, componentStack) =>
        write('ERROR', 'UI_EXCEPTION', {
            component,
            message:        err?.message ?? String(err),
            componentStack: componentStack ?? null,
        }),

    /** Log an intentional user action. */
    userAction: (action, data) =>
        write('INFO', 'USER_ACTION', { action, ...data }),
};

/** Expose logs on window so they can be inspected in the browser console. */
if (typeof window !== 'undefined') {
    window.__hipsterLogs = () => {
        try {
            return JSON.parse(sessionStorage.getItem('hipster_logs') || '[]');
        } catch {
            return [];
        }
    };
}
