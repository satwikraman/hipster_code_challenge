import { getToken } from './client';
import { logger } from '../utils/logger';
import { API_V1_URL, authHeaders, withTimeout, checkAuth } from './apiUtils';

const normalizeUser = (u) => ({
    id: String(u.id),
    name: [u.name, u.lastname].filter(Boolean).join(' '),
    phone: u.contact_number || u.phone || '',
    email: u.email || '',
});

export const searchUsers = async (query) => {
    const token = getToken();
    if (!token || !query.trim()) return [];
    try {
        const params = new URLSearchParams({
            pagination: '1',
            search: query.trim(),
        });
        const res = checkAuth(await withTimeout(
            fetch(`${API_V1_URL}/users?${params}`, { headers: authHeaders() })
        ));
        if (res.ok) {
            const data = await res.json();
            const list = data.data || data.users || data;
            if (Array.isArray(list)) return list.map(normalizeUser);
        }
    } catch (err) {
        logger.apiError('GET /users', err);
    }
    return [];
};

export const getUser = async (userId) => {
    const token = getToken();
    if (!token) return null;
    try {
        const res = checkAuth(await withTimeout(
            fetch(`${API_V1_URL}/users/${userId}`, { headers: authHeaders() })
        ));
        if (res.ok) {
            const data = await res.json();
            const u = data.data || data.user || data;
            return normalizeUser(u);
        }
    } catch (err) {
        logger.apiError(`GET /users/${userId}`, err);
    }
    return null;
};

export const createUser = async ({ name, phone, email }) => {
    const token = getToken();
    if (!token) return null;
    try {
        const fd = new FormData();
        const parts = name.trim().split(/\s+/);
        fd.append('name', parts[0]);
        if (parts.length > 1) fd.append('lastname', parts.slice(1).join(' '));
        if (phone) fd.append('contact_number', phone);
        if (email) fd.append('email', email);
        fd.append('status', '1');
        const res = checkAuth(await withTimeout(
            fetch(`${API_V1_URL}/users/create`, {
                method: 'POST',
                headers: authHeaders(),
                body: fd,
            })
        ));
        if (res.ok) {
            const data = await res.json();
            const u = data.data || data.user || data;
            return normalizeUser(u);
        }
    } catch (err) {
        logger.apiError('POST /users/create', err);
    }
    return null;
};
