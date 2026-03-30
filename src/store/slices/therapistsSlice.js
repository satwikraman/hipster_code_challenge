import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getTherapists } from '../../api/therapists';
import { logger } from '../../utils/logger';

export const fetchTherapists = createAsyncThunk(
    'therapists/fetch',
    async (selectedDate, { rejectWithValue }) => {
        try {
            return await getTherapists(selectedDate);
        } catch (err) {
            logger.error('API_FAILURE', { action: 'fetchTherapists', err });
            return rejectWithValue(err.message);
        }
    }
);

const therapistsSlice = createSlice({
    name: 'therapists',
    initialState: {
        list: [],
        status: 'idle', // idle | loading | succeeded | failed
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchTherapists.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchTherapists.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.list = action.payload;
            })
            .addCase(fetchTherapists.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            });
    },
});

export default therapistsSlice.reducer;
