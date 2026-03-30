const LOCAL_KEY = 'hipster_booking_store';
const TOKEN_KEY = 'hipster_token';

const getStore = () => {
    try {
        const raw = localStorage.getItem(LOCAL_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const setStore = (data) => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
};

export const getData = () => getStore();
export const setData = (data) => setStore(data);

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const generateId = () => `b-${Date.now()}-${Math.random().toString(16).slice(2)}`;
