import { useCallback } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { logger } from '../utils/logger';

const ErrorFallback = ({ error, resetErrorBoundary }) => (
    <div className="error-boundary">
        <div className="error-boundary-card">
            <div className="error-boundary-icon">⚠️</div>
            <h2>Something went wrong</h2>
            <p className="error-boundary-message">
                {error?.message || 'An unexpected error occurred.'}
            </p>
            <div className="error-boundary-actions">
                <button className="error-boundary-btn-primary" onClick={() => window.location.reload()}>
                    Reload Page
                </button>
                <button className="error-boundary-btn-secondary" onClick={resetErrorBoundary}>
                    Try Again
                </button>
            </div>
        </div>
    </div>
);

const ErrorBoundary = ({ children }) => {
    const handleError = useCallback((error, info) => {
        logger.uiError('ErrorBoundary', error, info.componentStack);
    }, []);

    return (
        <ReactErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
            {children}
        </ReactErrorBoundary>
    );
};

export default ErrorBoundary;
