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
