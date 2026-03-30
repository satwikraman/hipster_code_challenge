import { getToken } from './client';
import { logger } from '../utils/logger';
import { API_V1_URL, OUTLET_ID, OUTLET_TYPE, PANEL, authHeaders, withTimeout, checkAuth } from './apiUtils';

// Convert YYYY-MM-DD to DD-MM-YYYY HH:MM:SS for the therapists availability query
const toApiDateTime = (isoDate) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}-${m}-${y} 00:00:00`;
};

// Seed fallback — mirrors src/data/therapists.js
const SEED_THERAPISTS = [
    { id: 't1', number: 1,  name: 'Lily',   gender: 'female' },
    { id: 't2', number: 8,  name: 'James',  gender: 'male'   },
    { id: 't3', number: 2,  name: 'Avery',  gender: 'female' },
    { id: 't4', number: 3,  name: 'Jordan', gender: 'female' },
    { id: 't5', number: 5,  name: 'Mozza',  gender: 'female' },
    { id: 't6', number: 10, name: 'Philip', gender: 'male'   },
    { id: 't7', number: 11, name: 'Sakura', gender: 'female' },
    { id: 't8', number: 12, name: 'Summer', gender: 'female' },
];

export const getTherapists = async (selectedDate) => {
    const token = getToken();
    if (token) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const serviceAt = toApiDateTime(selectedDate || today);
            const params = new URLSearchParams({
                availability: '1',
                outlet: OUTLET_ID,
                service_at: serviceAt,
                services: '1',
                status: '1',
                pagination: '0',
                panel: PANEL,
                outlet_type: OUTLET_TYPE,
                leave: '0',
            });
            const res = checkAuth(await withTimeout(
                fetch(`${API_V1_URL}/therapists?${params}`, { headers: authHeaders() })
            ));
            if (res.ok) {
                const data = await res.json();
                const list = data.data || data.therapists || data;
                if (Array.isArray(list) && list.length > 0) {
                    return list.map((t) => ({
                        id: String(t.id),
                        number: t.therapist_no ?? t.number ?? t.id,
                        name: t.name || t.full_name || `Therapist ${t.id}`,
                        gender: (t.gender || 'female').toLowerCase(),
                    }));
                }
            }
        } catch (err) {
            logger.apiError('GET /therapists', err);
        }
    }
    return SEED_THERAPISTS;
};
