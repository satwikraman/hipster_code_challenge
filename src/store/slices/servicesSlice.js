import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getServices } from '../../api/services';
import { logger } from '../../utils/logger';

export const fetchServices = createAsyncThunk(
    'services/fetch',
    async (_, { rejectWithValue }) => {
        try {
            return await getServices();
        } catch (err) {
            logger.error('API_FAILURE', { action: 'fetchServices', err });
            return rejectWithValue(err.message);
        }
    }
);

const servicesSlice = createSlice({
    name: 'services',
    initialState: {
        list: [],
        status: 'idle', // idle | loading | succeeded | failed
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchServices.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchServices.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.list = action.payload;
            })
            .addCase(fetchServices.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            });
    },
});

export default servicesSlice.reducer;
