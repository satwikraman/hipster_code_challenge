import { getToken } from './client';
import { logger } from '../utils/logger';
import { API_V1_URL, OUTLET_ID, OUTLET_TYPE, PANEL, authHeaders, withTimeout, checkAuth } from './apiUtils';

const SEED_SERVICES = [
    { id: 's1', name: '60 Min Swedish / Relaxing Massage' },
    { id: 's2', name: '60 Min Tui Na / Acupressure' },
    { id: 's3', name: '90 Min Tui Na / Acupressure' },
    { id: 's4', name: '60 Min Slimming Massage' },
    { id: 's5', name: '60 Min Tui Na for Kids' },
];

export const getServices = async () => {
    const token = getToken();
    if (token) {
        try {
            const params = new URLSearchParams({
                outlet_type: OUTLET_TYPE,
                outlet: OUTLET_ID,
                pagination: '0',
                panel: PANEL,
            });
            const res = checkAuth(await withTimeout(
                fetch(`${API_V1_URL}/service-category?${params}`, { headers: authHeaders() })
            ));
            if (res.ok) {
                const data = await res.json();
                const list = data.data || data.services || data;
                if (Array.isArray(list) && list.length > 0) {
                    return list.map((s) => ({
                        id: String(s.id),
                        name: s.name || s.service_name || s.title || '',
                    }));
                }
            }
        } catch (err) {
            logger.apiError('GET /service-category', err);
        }
    }
    return SEED_SERVICES;
};
