import { configureStore } from '@reduxjs/toolkit';
import bookingsReducer from './slices/bookingsSlice';
import uiReducer from './slices/uiSlice';
import authReducer from './slices/authSlice';
import therapistsReducer from './slices/therapistsSlice';
import servicesReducer from './slices/servicesSlice';

export const store = configureStore({
    reducer: {
        bookings: bookingsReducer,
        ui: uiReducer,
        auth: authReducer,
        therapists: therapistsReducer,
        services: servicesReducer,
    },
});