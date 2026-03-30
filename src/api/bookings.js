import { getData, setData, generateId, getToken } from './client';
import { logger } from '../utils/logger';
import {
    API_V1_URL, OUTLET_ID, COMPANY_ID, OUTLET_TYPE, STATUS_OUTLET_TYPE, PANEL,
    DEFAULT_CURRENCY, DEFAULT_PAYMENT_TYPE, DEFAULT_MEMBERSHIP, DEFAULT_BOOKING_TYPE,
    authHeaders, withTimeout, checkAuth, toApiDateTime,
} from './apiUtils';
import { BOOKING_STATUS } from '../constants';

// --- Demo seed data ---
const seedBookings = () => {
    const today = new Date().toISOString().split('T')[0];
    return [
        {
            id: 'b-1', therapistId: 't1', clientName: 'Victoria Baker',
            serviceName: '90 Min Tui Na / Acupressure', phone: '9221486800',
            startTime: `${today}T09:00:00.000Z`, endTime: `${today}T10:30:00.000Z`,
            status: BOOKING_STATUS.CONFIRMED, requestedTherapist: true, requestedRoom: false,
        },
        {
            id: 'b-2', therapistId: 't2', clientName: 'Yashika Yeo',
            serviceName: '60 Min Slimming Massage', phone: '9336958900',
            startTime: `${today}T10:30:00.000Z`, endTime: `${today}T11:30:00.000Z`,
            status: BOOKING_STATUS.CONFIRMED, requestedTherapist: false, requestedRoom: false,
        },
        {
            id: 'b-3', therapistId: 't3', clientName: 'Ethan Tan',
            serviceName: '60 Min Swedish / Relaxing Massage', phone: '9336958901',
            startTime: `${today}T10:00:00.000Z`, endTime: `${today}T11:00:00.000Z`,
            status: BOOKING_STATUS.CHECK_IN, requestedTherapist: false, requestedRoom: true,
        },
        {
            id: 'b-4', therapistId: 't1', clientName: 'Gerald Tan',
            serviceName: '60 Min Tui Na for Kids', phone: '9336958902',
            startTime: `${today}T11:00:00.000Z`, endTime: `${today}T12:00:00.000Z`,
            status: BOOKING_STATUS.CONFIRMED, requestedTherapist: true, requestedRoom: false,
        },
        {
            id: 'b-5', therapistId: 't4', clientName: 'Yashika Yeo',
            serviceName: '60 Min Slimming Massage', phone: '9336958900',
            startTime: `${today}T11:00:00.000Z`, endTime: `${today}T12:00:00.000Z`,
            status: BOOKING_STATUS.CANCELLED, requestedTherapist: false, requestedRoom: false,
        },
        {
            id: 'b-6', therapistId: 't1', clientName: 'Victoria Baker',
            serviceName: '60 Min Slimming Massage', phone: '9221486800',
            startTime: `${today}T12:30:00.000Z`, endTime: `${today}T13:30:00.000Z`,
            status: BOOKING_STATUS.CHECK_IN, requestedTherapist: true, requestedRoom: true,
        },
        {
            id: 'b-7', therapistId: 't5', clientName: 'Gerald Tan',
            serviceName: '90 Min Tui Na / Acupressure', phone: '9336958902',
            startTime: `${today}T13:00:00.000Z`, endTime: `${today}T14:30:00.000Z`,
            status: BOOKING_STATUS.CONFIRMED, requestedTherapist: false, requestedRoom: true,
        },
    ];
};

const normalizeDateKey = (datetime) => {
    const d = new Date(datetime);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
};

// Convert YYYY-MM-DD to DD-MM-YYYY required by the API
const toApiDate = (isoDate) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}-${m}-${y}`;
};

export const getBookings = async (selectedDate) => {
    const token = getToken();
    if (token) {
        try {
            const apiDate = toApiDate(selectedDate);
            const daterange = apiDate ? `${apiDate} / ${apiDate}` : '';
            const params = new URLSearchParams({
                pagination: '1',
                daterange,
                outlet: OUTLET_ID,
                panel: PANEL,
                view_type: 'calendar',
            });
            const res = checkAuth(await withTimeout(
                fetch(`${API_V1_URL}/bookings/outlet/booking/list?${params}`, { headers: authHeaders() })
            ));
            if (res.ok) {
                const data = await res.json();
                const list = data.data || data.bookings || data;
                if (Array.isArray(list)) return list;
            }
        } catch (err) {
            logger.apiError('GET /bookings/outlet/booking/list', err);
        }
    }

    await new Promise((r) => setTimeout(r, 150));
    let bookings = getData();
    if (!bookings || bookings.length === 0) {
        bookings = seedBookings();
        setData(bookings);
    }
    if (!selectedDate) return bookings;
    return bookings.filter((b) => normalizeDateKey(b.startTime) === selectedDate);
};

export const postBooking = async (payload) => {
    const token = getToken();
    if (token) {
        try {
            const fd = new FormData();
            fd.append('company', COMPANY_ID);
            fd.append('outlet', OUTLET_ID);
            fd.append('outlet_type', OUTLET_TYPE);
            fd.append('booking_type', DEFAULT_BOOKING_TYPE);
            fd.append('panel', PANEL);
            fd.append('type', 'manual');
            fd.append('currency', DEFAULT_CURRENCY);
            fd.append('payment_type', DEFAULT_PAYMENT_TYPE);
            fd.append('membership', DEFAULT_MEMBERSHIP);
            if (payload.clientName) fd.append('customer_name', payload.clientName);
            if (payload.phone) fd.append('mobile_number', payload.phone);
            if (payload.startTime) fd.append('service_at', toApiDateTime(payload.startTime));
            if (payload.therapistId) fd.append('therapist', payload.therapistId);
            if (payload.serviceName) fd.append('service_name', payload.serviceName);
            if (payload.source) fd.append('source', payload.source);
            const res = checkAuth(await withTimeout(
                fetch(`${API_V1_URL}/bookings/create`, {
                    method: 'POST',
                    headers: authHeaders(),
                    body: fd,
                })
            ));
            if (res.ok) {
                const data = await res.json();
                return data.data || data.booking || data;
            }
        } catch (err) {
            logger.apiError('POST /bookings/create', err);
        }
    }

    await new Promise((r) => setTimeout(r, 150));
    const all = getData();
    const booking = { id: generateId(), status: BOOKING_STATUS.CONFIRMED, ...payload };
    setData([...all, booking]);
    return booking;
};

export const putBooking = async (id, payload) => {
    const token = getToken();
    if (token) {
        try {
            const fd = new FormData();
            fd.append('company', COMPANY_ID);
            fd.append('outlet', OUTLET_ID);
            fd.append('panel', PANEL);
            fd.append('booking_type', DEFAULT_BOOKING_TYPE);
            fd.append('currency', DEFAULT_CURRENCY);
            fd.append('payment_type', DEFAULT_PAYMENT_TYPE);
            fd.append('membership', DEFAULT_MEMBERSHIP);
            if (payload.clientName) fd.append('customer_name', payload.clientName);
            if (payload.phone) fd.append('mobile_number', payload.phone);
            if (payload.startTime) fd.append('service_at', toApiDateTime(payload.startTime));
            if (payload.therapistId) fd.append('therapist', payload.therapistId);
            if (payload.serviceName) fd.append('service_name', payload.serviceName);
            if (payload.source) fd.append('source', payload.source);
            const res = checkAuth(await withTimeout(
                fetch(`${API_V1_URL}/bookings/${id}`, {
                    method: 'POST',
                    headers: authHeaders(),
                    body: fd,
                })
            ));
            if (res.ok) {
                const data = await res.json();
                return data.data || data.booking || data;
            }
        } catch (err) {
            logger.apiError(`POST /bookings/${id}`, err);
        }
    }

    await new Promise((r) => setTimeout(r, 150));
    const all = getData();
    const idx = all.findIndex((b) => b.id === id);
    if (idx < 0) throw new Error('Booking not found');
    const updated = { ...all[idx], ...payload };
    all[idx] = updated;
    setData(all);
    return updated;
};

// cancelType: 'normal' | 'no-show'
export const cancelBooking = async (id, cancelType = 'normal') => {
    const token = getToken();
    if (token) {
        try {
            const fd = new FormData();
            fd.append('company', COMPANY_ID);
            fd.append('id', id);
            fd.append('type', cancelType);
            fd.append('panel', PANEL);
            const res = checkAuth(await withTimeout(
                fetch(`${API_V1_URL}/bookings/item/cancel`, {
                    method: 'POST',
                    headers: authHeaders(),
                    body: fd,
                })
            ));
            if (res.ok) return id;
        } catch (err) {
            logger.apiError('POST /bookings/item/cancel', err);
        }
    }

    await new Promise((r) => setTimeout(r, 150));
    const all = getData();
    const idx = all.findIndex((b) => b.id === id);
    if (idx < 0) throw new Error('Booking not found');
    all[idx] = { ...all[idx], status: BOOKING_STATUS.CANCELLED };
    setData(all);
    return id;
};

export const checkInBooking = async (id) => {
    const token = getToken();
    if (token) {
        try {
            const fd = new FormData();
            fd.append('company', COMPANY_ID);
            fd.append('id', id);
            fd.append('status', 'Check-in (In Progress)');
            fd.append('panel', PANEL);
            fd.append('outlet_type', STATUS_OUTLET_TYPE);
            const res = checkAuth(await withTimeout(
                fetch(`${API_V1_URL}/bookings/update/payment-status`, {
                    method: 'POST',
                    headers: authHeaders(),
                    body: fd,
                })
            ));
            if (res.ok) return id;
        } catch (err) {
            logger.apiError('POST /bookings/update/payment-status (check-in)', err);
        }
    }

    await new Promise((r) => setTimeout(r, 150));
    const all = getData();
    const idx = all.findIndex((b) => b.id === id);
    if (idx < 0) throw new Error('Booking not found');
    all[idx] = { ...all[idx], status: BOOKING_STATUS.CHECK_IN };
    setData(all);
    return id;
};

export const checkoutBooking = async (id) => {
    const token = getToken();
    if (token) {
        try {
            const fd = new FormData();
            fd.append('company', COMPANY_ID);
            fd.append('id', id);
            fd.append('status', 'Completed');
            fd.append('panel', PANEL);
            fd.append('outlet_type', STATUS_OUTLET_TYPE);
            const res = checkAuth(await withTimeout(
                fetch(`${API_V1_URL}/bookings/update/payment-status`, {
                    method: 'POST',
                    headers: authHeaders(),
                    body: fd,
                })
            ));
            if (res.ok) return id;
        } catch (err) {
            logger.apiError('POST /bookings/update/payment-status (checkout)', err);
        }
    }

    await new Promise((r) => setTimeout(r, 150));
    const all = getData();
    const idx = all.findIndex((b) => b.id === id);
    if (idx < 0) throw new Error('Booking not found');
    all[idx] = { ...all[idx], status: BOOKING_STATUS.COMPLETED };
    setData(all);
    return id;
};

export const deleteBooking = async (id) => {
    const token = getToken();
    if (token) {
        try {
            const res = checkAuth(await withTimeout(
                fetch(`${API_V1_URL}/bookings/destroy/${id}`, {
                    method: 'DELETE',
                    headers: authHeaders(),
                })
            ));
            if (res.ok) return id;
        } catch (err) {
            logger.apiError(`DELETE /bookings/destroy/${id}`, err);
        }
    }

    await new Promise((r) => setTimeout(r, 150));
    const all = getData();
    setData(all.filter((b) => b.id !== id));
    return id;
};
