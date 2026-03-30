import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
    name: 'ui',
    initialState: {
        selectedDate: new Date().toISOString().split('T')[0],
        selectedBookingId: null,
        isPanelOpen: false,
        toastMessage: null,
    },
    reducers: {
        setSelectedDate: (state, action) => { state.selectedDate = action.payload; },
        openPanel: (state, action) => {
            state.selectedBookingId = action.payload;
            state.isPanelOpen = true;
        },
        closePanel: (state) => {
            state.selectedBookingId = null;
            state.isPanelOpen = false;
        },
        setToast: (state, action) => { state.toastMessage = action.payload; },
        clearToast: (state) => { state.toastMessage = null; },
    },
});

export const { setSelectedDate, openPanel, closePanel, setToast, clearToast } = uiSlice.actions;
export default uiSlice.reducer;