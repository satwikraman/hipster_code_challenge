import { logger } from '../../utils/logger';

beforeEach(() => {
    sessionStorage.clear();
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
});

afterEach(() => {
    jest.restoreAllMocks();
});

const getLogs = () => JSON.parse(sessionStorage.getItem('hipster_logs') || '[]');

describe('logger', () => {
    it('logger.info writes an INFO entry to sessionStorage', () => {
        logger.info('TEST_EVENT', { foo: 'bar' });
        const logs = getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0].level).toBe('INFO');
        expect(logs[0].event).toBe('TEST_EVENT');
        expect(logs[0].data).toEqual({ foo: 'bar' });
    });

    it('logger.warn writes a WARN entry', () => {
        logger.warn('WARN_EVENT');
        const logs = getLogs();
        expect(logs[0].level).toBe('WARN');
        expect(logs[0].event).toBe('WARN_EVENT');
    });

    it('logger.error writes an ERROR entry and calls console.error', () => {
        logger.error('ERR_EVENT', { x: 1 });
        const logs = getLogs();
        expect(logs[0].level).toBe('ERROR');
        expect(console.error).toHaveBeenCalled();
    });

    it('each entry has a valid ISO timestamp', () => {
        logger.info('TS_TEST');
        const [entry] = getLogs();
        expect(() => new Date(entry.ts)).not.toThrow();
        expect(new Date(entry.ts).toISOString()).toBe(entry.ts);
    });

    it('logger.apiError writes an API_ERROR event with endpoint and message', () => {
        logger.apiError('/api/bookings', new Error('Network timeout'));
        const [entry] = getLogs();
        expect(entry.level).toBe('ERROR');
        expect(entry.event).toBe('API_ERROR');
        expect(entry.data.endpoint).toBe('/api/bookings');
        expect(entry.data.message).toBe('Network timeout');
    });

    it('logger.uiError writes a UI_EXCEPTION event', () => {
        logger.uiError('MyComponent', new Error('Render crash'), 'at MyComponent\n...');
        const [entry] = getLogs();
        expect(entry.event).toBe('UI_EXCEPTION');
        expect(entry.data.component).toBe('MyComponent');
        expect(entry.data.message).toBe('Render crash');
        expect(entry.data.componentStack).toBe('at MyComponent\n...');
    });

    it('logger.uiError sets componentStack to null when not provided', () => {
        logger.uiError('Cmp', new Error('oops'));
        const [entry] = getLogs();
        expect(entry.data.componentStack).toBeNull();
    });

    it('logger.userAction writes a USER_ACTION INFO entry', () => {
        logger.userAction('LOGIN_SUCCESS', { email: 'a@b.com' });
        const [entry] = getLogs();
        expect(entry.level).toBe('INFO');
        expect(entry.event).toBe('USER_ACTION');
        expect(entry.data.action).toBe('LOGIN_SUCCESS');
        expect(entry.data.email).toBe('a@b.com');
    });

    it('accumulates multiple log entries', () => {
        logger.info('FIRST');
        logger.warn('SECOND');
        logger.error('THIRD');
        expect(getLogs()).toHaveLength(3);
    });

    it('does not include data key when data is null/undefined', () => {
        logger.info('NO_DATA');
        const [entry] = getLogs();
        expect(entry).not.toHaveProperty('data');
    });

    it('window.__hipsterLogs() returns the persisted logs array', () => {
        logger.info('WIN_TEST', { val: 42 });
        const logs = window.__hipsterLogs();
        expect(Array.isArray(logs)).toBe(true);
        expect(logs[0].event).toBe('WIN_TEST');
    });
});
