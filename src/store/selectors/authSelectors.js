export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthUser        = (state) => state.auth.user;
export const selectAuthStatus      = (state) => state.auth.status;
export const selectAuthError       = (state) => state.auth.error;
