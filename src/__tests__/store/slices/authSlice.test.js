import authReducer, { logout, login } from '../../../store/slices/authSlice';

jest.mock('../../../api/auth', () => ({
    login: jest.fn(),
    logoutApi: jest.fn(),
}));

const initialState = {
    user: null,
    isAuthenticated: false,
    status: 'idle',
    error: null,
};

describe('authSlice', () => {
    it('returns the correct initial state', () => {
        expect(authReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
    });

    it('logout resets state to initial', () => {
        const loggedIn = {
            user: { name: 'Test' },
            isAuthenticated: true,
            status: 'succeeded',
            error: null,
        };
        const state = authReducer(loggedIn, logout());
        expect(state).toEqual(initialState);
    });

    describe('login async thunk', () => {
        it('login.pending sets status to loading', () => {
            const state = authReducer(initialState, { type: login.pending.type });
            expect(state.status).toBe('loading');
            expect(state.error).toBeNull();
        });

        it('login.fulfilled sets user and isAuthenticated', () => {
            const user = { id: 1, name: 'Alice', email: 'alice@example.com' };
            const state = authReducer(initialState, {
                type: login.fulfilled.type,
                payload: user,
            });
            expect(state.status).toBe('succeeded');
            expect(state.user).toEqual(user);
            expect(state.isAuthenticated).toBe(true);
        });

        it('login.rejected sets error and clears user', () => {
            const state = authReducer(initialState, {
                type: login.rejected.type,
                payload: 'Invalid credentials',
            });
            expect(state.status).toBe('failed');
            expect(state.error).toBe('Invalid credentials');
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
        });

        it('login.rejected uses fallback message when payload is absent', () => {
            const state = authReducer(initialState, {
                type: login.rejected.type,
                payload: undefined,
            });
            expect(state.error).toBe('Login failed');
        });
    });
});
