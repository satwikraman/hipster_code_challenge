import { memo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';

const Navbar = ({ isAuthenticated, authUser }) => {
    const dispatch = useDispatch();
    const handleLogout = useCallback(() => dispatch(logout()), [dispatch]);

    return (
        <nav className="app-navbar">
            <div className="navbar-logo">
                <img src="/natureLandLogo.svg" alt="NatureLand" height="36" />
            </div>
            <div className="navbar-menu">
                <span className="nav-item active">Home</span>
                <span className="nav-item">Therapists</span>
                <span className="nav-item">Sales</span>
                <span className="nav-item">Clients</span>
                <span className="nav-item">Transactions</span>
                <span className="nav-item">Reports</span>
            </div>
            {isAuthenticated && (
                <div className="navbar-right">
                    <button className="navbar-bell-btn" title="Notifications">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 1.5A5.25 5.25 0 003.75 6.75v.787C3.75 9.188 3 10.476 1.875 11.25H16.125C15 10.476 14.25 9.188 14.25 7.537V6.75A5.25 5.25 0 009 1.5z" stroke="#9ca3af" strokeWidth="1.4" strokeLinejoin="round"/>
                            <path d="M7.5 14.25a1.5 1.5 0 003 0" stroke="#9ca3af" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                    </button>
                    <button className="navbar-avatar" title={authUser?.name || 'User'}>
                        {(authUser?.name || 'U')[0].toUpperCase()}
                    </button>
                    <button className="navbar-logout-btn" onClick={handleLogout} title="Logout">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3" />
                            <path d="M11 11l3-3-3-3" />
                            <path d="M14 8H6" />
                        </svg>
                        Logout
                    </button>
                </div>
            )}
        </nav>
    );
};

export default memo(Navbar);
