import { setToken, clearToken } from './client';
import { logger } from '../utils/logger';
import { AUTH_BASE_URL } from './apiUtils';
// Loaded from environment — falls back to the assessment bypass key for local dev
const CAPTCHA_KEY = process.env.REACT_APP_CAPTCHA_KEY || '07ba959153fe7eec778361bf42079439';

export const login = async (email, password) => {
    if (!email || !password) throw new Error('Email and password are required');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
        const fd = new FormData();
        fd.append('email', email);
        fd.append('password', password);
        fd.append('key_pass', CAPTCHA_KEY);
        const res = await fetch(`${AUTH_BASE_URL}/api/v1/login`, {
            method: 'POST',
            body: fd,
            signal: controller.signal,
        });
        clearTimeout(timer);

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `Login failed (${res.status})`);

        const token = data.token || data.access_token || data.data?.token;
        if (token) setToken(token);

        logger.userAction('LOGIN_SUCCESS', { email });
        return data.user || data.data?.user || { id: 'u1', name: email.split('@')[0], email };
    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
            logger.apiError('POST /api/v1/login', new Error('Request timed out'));
            throw new Error('Login request timed out');
        }
        // Network unavailable — allow demo credentials as fallback
        if (err.name === 'TypeError') {
            logger.apiError('POST /api/v1/login', err);
            if (email === 'react@hipster-inc.com' && password === 'React@123') {
                logger.userAction('LOGIN_DEMO_FALLBACK', { email });
                return { id: 'demo-1', name: 'React Demo', email };
            }
            throw new Error('Cannot connect to server. Use demo credentials: react@hipster-inc.com / React@123');
        }
        logger.apiError('POST /api/v1/login', err);
        throw err;
    }
};

export const logoutApi = () => {
    clearToken();
};
