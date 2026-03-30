import { memo, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../../store/slices/authSlice';
import { selectAuthStatus, selectAuthError } from '../../store/selectors/authSelectors';

const LoginCard = () => {
    const dispatch = useDispatch();
    const authStatus = useSelector(selectAuthStatus);
    const authError = useSelector(selectAuthError);

    const [loginForm, setLoginForm] = useState({ email: '', password: '' });

    // Keep a ref so onSubmit never needs loginForm in its dep array
    const loginFormRef = useRef(loginForm);
    loginFormRef.current = loginForm;

    const onSubmit = useCallback(async (e) => {
        e.preventDefault();
        await dispatch(login(loginFormRef.current));
    }, [dispatch]);

    const onEmailChange = useCallback((e) => {
        const val = e.target.value;
        setLoginForm((prev) => ({ ...prev, email: val }));
    }, []);

    const onPasswordChange = useCallback((e) => {
        const val = e.target.value;
        setLoginForm((prev) => ({ ...prev, password: val }));
    }, []);

    return (
        <div className="auth-card">
            <div className="auth-logo">
                <img src="/natureLandLogo.svg" alt="NatureLand" />
            </div>
            <h2>Sign In</h2>
            <p className="auth-subtitle">Welcome back! Please sign in to continue.</p>
            <form onSubmit={onSubmit}>
                <div className="field">
                    <label>Email</label>
                    <input
                        type="email"
                        placeholder="Email address"
                        value={loginForm.email}
                        onChange={onEmailChange}
                        required
                    />
                </div>
                <div className="field">
                    <label>Password</label>
                    <input
                        type="password"
                        placeholder="Password"
                        value={loginForm.password}
                        onChange={onPasswordChange}
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="login-btn"
                    disabled={authStatus === 'loading'}
                >
                    {authStatus === 'loading' ? 'Signing in…' : 'Sign In'}
                </button>
            </form>
            {authError && <div className="auth-error">{authError}</div>}
        </div>
    );
};

export default memo(LoginCard);
