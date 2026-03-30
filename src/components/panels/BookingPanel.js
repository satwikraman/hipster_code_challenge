import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { searchUsers } from '../../api/users';
import { DEBOUNCE_MS, BOOKING_STATUS } from '../../constants';

// Convert a UTC ISO string to a local datetime-local input value
const toLocalInput = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
};

const fmtDate = (isoStr) => {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const fmtTime = (isoStr) => {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const BookingPanel = ({ booking, draftBooking, therapists = [], services = [], onClose, onSubmit, onCancel, onCheckIn, onCheckOut }) => {
    const [clientName, setClientName] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [therapistId, setTherapistId] = useState('');
    const [serviceName, setServiceName] = useState('');
    const [phone, setPhone] = useState('');
    const [formError, setFormError] = useState('');
    const [source, setSource] = useState('phone');
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [clientConfirmed, setClientConfirmed] = useState(false);

    // User search state
    const [userResults, setUserResults] = useState([]);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [userActiveIndex, setUserActiveIndex] = useState(-1);
    const userSearchTimer = useRef(null);
    const userDropdownRef = useRef(null);

    const headerActionsRef = useRef(null);

    useEffect(() => {
        const target = booking || draftBooking;
        if (!target) return;
        setClientName(target.clientName || '');
        setStartTime(toLocalInput(target.startTime));
        setEndTime(toLocalInput(target.endTime));
        setTherapistId(target.therapistId || '');
        setServiceName(target.serviceName || '');
        setPhone(target.phone || '');
        setSource(target.source || 'phone');
        setFormError('');
        setEditMode(false);
        setShowMoreMenu(false);
        setClientConfirmed(false);
    }, [booking, draftBooking]);

    // Close more menu when clicking outside
    useEffect(() => {
        if (!showMoreMenu) return;
        const handleClickOutside = (e) => {
            if (headerActionsRef.current && !headerActionsRef.current.contains(e.target)) {
                setShowMoreMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMoreMenu]);

    // Close user search dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
                setUserDropdownOpen(false);
                setUserActiveIndex(-1);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Cancel any in-flight user search on unmount to prevent state update after unmount
    useEffect(() => () => clearTimeout(userSearchTimer.current), []);

    // ── Action handlers (all stable via useCallback) ───────────────────────
    const handleMoreMenuToggle  = useCallback(() => setShowMoreMenu((v) => !v), []);
    const handleCancelEdit      = useCallback(() => setEditMode(false), []);
    const handleStartEdit       = useCallback(() => setEditMode(true), []);
    const handleRemoveClient    = useCallback(() => { setClientConfirmed(false); setClientName(''); }, []);

    const handleCancelBooking = useCallback(() => {
        onCancel && onCancel(booking?.id);
        setShowMoreMenu(false);
    }, [onCancel, booking?.id]);

    const handleCheckInClick  = useCallback(() => onCheckIn  && onCheckIn(booking?.id),  [onCheckIn,  booking?.id]);
    const handleCheckOutClick = useCallback(() => onCheckOut && onCheckOut(booking?.id), [onCheckOut, booking?.id]);

    const handleAddClient = useCallback(() => {
        if (clientName.trim()) setClientConfirmed(true);
    }, [clientName]);

    // Form field onChange — all setState setters are stable, so dep array is empty
    const handleClientNameChange = useCallback((e) => {
        const val = e.target.value;
        setClientName(val);
        setUserActiveIndex(-1);
        clearTimeout(userSearchTimer.current);
        if (val.trim().length < 2) {
            setUserResults([]);
            setUserDropdownOpen(false);
            return;
        }
        userSearchTimer.current = setTimeout(async () => {
            const results = await searchUsers(val.trim());
            setUserResults(results);
            setUserDropdownOpen(results.length > 0);
        }, DEBOUNCE_MS);
    }, []);

    const handleUserSelect = useCallback((user) => {
        setClientName(user.name);
        setPhone(user.phone || '');
        setUserResults([]);
        setUserDropdownOpen(false);
        setUserActiveIndex(-1);
        setClientConfirmed(true);
    }, []);

    const handleClientSearchKeyDown = useCallback((e) => {
        if (!userDropdownOpen || userResults.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setUserActiveIndex((i) => Math.min(i + 1, userResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setUserActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && userActiveIndex >= 0) {
            handleUserSelect(userResults[userActiveIndex]);
        } else if (e.key === 'Escape') {
            setUserDropdownOpen(false);
            setUserActiveIndex(-1);
        }
    }, [userDropdownOpen, userResults, userActiveIndex, handleUserSelect]);

    const handleUserItemMouseDown = useCallback((e) => {
        const user = userResults[Number(e.currentTarget.dataset.index)];
        if (user) handleUserSelect(user);
    }, [userResults, handleUserSelect]);

    const handleUserItemMouseEnter = useCallback((e) => {
        setUserActiveIndex(Number(e.currentTarget.dataset.index));
    }, []);

    const handlePhoneChange        = useCallback((e) => setPhone(e.target.value),         []);
    const handleSourceChange       = useCallback((e) => setSource(e.target.value),        []);
    const handleServiceNameChange  = useCallback((e) => setServiceName(e.target.value),  []);
    const handleTherapistIdChange  = useCallback((e) => setTherapistId(e.target.value),  []);
    const handleStartTimeChange    = useCallback((e) => setStartTime(e.target.value),    []);
    const handleEndTimeChange      = useCallback((e) => setEndTime(e.target.value),      []);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        setFormError('');
        if (!clientName.trim()) { setFormError('Client name is required'); return; }
        if (phone.trim() && !/^[6-9]\d{9}$/.test(phone.trim().replace(/\s/g, ''))) {
            setFormError('Enter a valid 10-digit Indian mobile number (e.g. 9876543210)');
            return;
        }
        if (!serviceName.trim()) { setFormError('Please select a service'); return; }
        if (!therapistId) { setFormError('Please select a therapist'); return; }
        if (!startTime || !endTime) { setFormError('Start and end time are required'); return; }
        if (new Date(endTime) <= new Date(startTime)) { setFormError('End time must be after start time'); return; }
        onSubmit({
            id: booking?.id,
            therapistId,
            clientName: clientName.trim(),
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            serviceName: serviceName.trim(),
            phone: phone.trim(),
            source,
        });
    }, [clientName, phone, therapistId, startTime, endTime, serviceName, source, booking?.id, onSubmit]);

    if (!booking && !draftBooking) return null;

    const isCancelled = booking?.status === BOOKING_STATUS.CANCELLED;
    const isCompleted = booking?.status === BOOKING_STATUS.COMPLETED;
    const isCheckIn = booking?.status === BOOKING_STATUS.CHECK_IN;
    const isNew = !booking;

    const statusClass =
        isCheckIn ? BOOKING_STATUS.CHECK_IN :
            isCompleted ? BOOKING_STATUS.COMPLETED :
                isCancelled ? BOOKING_STATUS.CANCELLED : BOOKING_STATUS.CONFIRMED;

    const statusLabel =
        isCheckIn ? 'Checked in' :
            isCompleted ? 'Completed' :
                isCancelled ? 'Cancelled' : 'Confirmed';

    const therapist = therapists.find(t => t.id === therapistId);
    const refDate = startTime ? new Date(startTime) : null;
    const refEnd = endTime ? new Date(endTime) : null;
    const duration = refDate && refEnd ? Math.round((refEnd - refDate) / 60000) : null;

    return (
        <div className="booking-panel">

            {/* ── Header ── */}
            <div className="panel-header">
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    {isNew ? 'New Booking' : editMode ? 'Update Booking' : 'Appointment'}
                </h3>
                <div className="panel-header-actions" ref={headerActionsRef}>
                    {!isNew && (
                        <>
                            <button
                                className="panel-icon-btn"
                                type="button"
                                title="More options"
                                onClick={handleMoreMenuToggle}
                            >
                                <svg width="16" height="4" viewBox="0 0 16 4" fill="currentColor">
                                    <circle cx="2" cy="2" r="1.5" />
                                    <circle cx="8" cy="2" r="1.5" />
                                    <circle cx="14" cy="2" r="1.5" />
                                </svg>
                            </button>

                            {showMoreMenu && (
                                <div className="panel-more-menu">
                                    <button
                                        className="panel-more-menu-item"
                                        type="button"
                                        onClick={handleCancelBooking}
                                    >
                                        Cancel / Delete
                                    </button>
                                </div>
                            )}

                            {editMode ? (
                                <button
                                    className="panel-cancel-text-btn"
                                    type="button"
                                    onClick={handleCancelEdit}
                                >
                                    Cancel
                                </button>
                            ) : (
                                <button
                                    className="panel-icon-btn"
                                    type="button"
                                    title={isCancelled || isCompleted ? 'Cannot edit a completed or cancelled booking' : 'Edit'}
                                    onClick={handleStartEdit}
                                    disabled={isCancelled || isCompleted}
                                >
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" />
                                    </svg>
                                </button>
                            )}
                        </>
                    )}
                    {isNew && (
                        <button
                            className="panel-cancel-text-btn"
                            type="button"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            <div className="panel-body">

                {/* ── Status + action button row ── */}
                {booking && (
                    <div className="panel-status-action-row">
                        <div className="panel-status-left">
                            <span className={`status-dot ${statusClass}`} />
                            <span className={`status-label-text ${statusClass}`}>{statusLabel}</span>
                        </div>
                        {booking.status === BOOKING_STATUS.CONFIRMED && (
                            <button
                                type="button"
                                className="btn-panel-action action-checkin"
                                onClick={handleCheckInClick}
                            >
                                Check-in
                            </button>
                        )}
                        {booking.status === BOOKING_STATUS.CHECK_IN && (
                            <button
                                type="button"
                                className="btn-panel-action action-checkout"
                                onClick={handleCheckOutClick}
                            >
                                Checkout
                            </button>
                        )}
                        {isCompleted && (
                            <button type="button" className="btn-panel-action action-view-sale">
                                View Sale
                            </button>
                        )}
                    </div>
                )}

                {/* ── Outlet + Date / Time ── */}
                {isNew && (
                    <div className="panel-info-section">
                        <div className="pi-row">
                            <span className="pi-key" style={{ fontStyle: 'italic' }}>Outlet</span>
                            <span className="pi-val">Liat Towers</span>
                        </div>
                    </div>
                )}

                {/* ── Date/Time two-column row ── */}
                <div className="panel-datetime-row">
                    <div className="panel-datetime-col">
                        <span className="pi-key" style={{ fontStyle: 'italic', fontSize: '12px', color: '#9ca3af' }}>On</span>
                        <span className="pi-val" style={{ fontSize: '13px', color: '#111827', fontWeight: 500 }}>
                            {refDate ? fmtDate(refDate.toISOString()) : '—'}
                        </span>
                    </div>
                    <div className="panel-datetime-divider" />
                    <div className="panel-datetime-col">
                        <span className="pi-key" style={{ fontStyle: 'italic', fontSize: '12px', color: '#9ca3af' }}>At</span>
                        <span className="pi-val" style={{ fontSize: '13px', color: '#111827', fontWeight: 500 }}>
                            {refDate ? fmtTime(refDate.toISOString()) : '—'}
                        </span>
                    </div>
                </div>

                {/* ── Client section ── */}
                {booking ? (
                    <div className="panel-client-row">
                        <div className="client-avatar">{getInitials(clientName)}</div>
                        <div className="client-info-block">
                            <div className="client-id-line">
                                {phone && <span className="client-phone-num">{phone}&nbsp;</span>}
                                <span className="client-full-name">{clientName || '—'}</span>
                            </div>
                            <div className="client-since-line">Client since December 2023</div>
                            {phone && <div className="client-phone-line">Phone: {phone}</div>}
                        </div>
                        <div className="client-membership-toggle-wrap">
                            <span className="client-membership-label">Apply membership discount:</span>
                            <button className="client-membership-toggle" type="button" title="Apply membership discount">
                                {/* Orange ON toggle */}
                                <svg width="36" height="20" viewBox="0 0 36 20" fill="none">
                                    <rect width="36" height="20" rx="10" fill="#f97316" />
                                    <circle cx="26" cy="10" r="8" fill="#fff" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ) : clientConfirmed ? (
                    <div className="panel-client-confirmed-row">
                        <div className="client-avatar">{getInitials(clientName)}</div>
                        <div className="client-confirmed-name">{clientName}</div>
                        <button
                            type="button"
                            className="client-remove-btn"
                            title="Remove client"
                            onClick={handleRemoveClient}
                        >
                            ×
                        </button>
                    </div>
                ) : (
                    <div className="panel-client-search-row" ref={userDropdownRef}>
                        <div className={`client-search-wrap${userDropdownOpen ? ' dropdown-open' : ''}`}>
                            <input
                                type="text"
                                className="client-search-input"
                                placeholder="Search or create client"
                                value={clientName}
                                onChange={handleClientNameChange}
                                onKeyDown={handleClientSearchKeyDown}
                                autoComplete="off"
                            />
                            <button
                                type="button"
                                className="client-add-btn"
                                title="Add client"
                                onClick={handleAddClient}
                            >＋</button>
                        </div>
                        {userDropdownOpen && (
                            <ul className="client-search-dropdown">
                                {userResults.map((user, i) => (
                                    <li
                                        key={user.id}
                                        className={`client-search-item${i === userActiveIndex ? ' active' : ''}`}
                                        data-index={i}
                                        onMouseDown={handleUserItemMouseDown}
                                        onMouseEnter={handleUserItemMouseEnter}
                                    >
                                        <span className="csi-name">{user.name}</span>
                                        {user.phone && <span className="csi-phone">{user.phone}</span>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* ── Service info display (existing bookings, view mode only) ── */}
                {booking && !editMode && (serviceName || therapist) && (
                    <div className="panel-service-section">
                        {serviceName && (
                            <div className="svc-section-header">
                                <span className="svc-name">{serviceName}</span>
                                <div className="svc-section-icons">
                                    {/* Chevron down */}
                                    <button className="svc-icon-btn" type="button" title="Expand">
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 5l4 4 4-4" />
                                        </svg>
                                    </button>
                                    {/* Trash icon */}
                                    <button className="svc-icon-btn" type="button" title="Remove service">
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M11.5 3.5l-.7 8a.5.5 0 01-.5.5H3.7a.5.5 0 01-.5-.5l-.7-8" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}
                        {therapist && (
                            <div className="svc-detail-row">
                                <span className="svc-key" style={{ fontStyle: 'italic' }}>With:</span>
                                <span className={`svc-badge ${therapist.gender}`}>{therapist.number}</span>
                                <span className="svc-val">{therapist.name}</span>
                                {/* Dark checkbox icon */}
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <rect width="16" height="16" rx="3" fill="#1a1a1a" />
                                    <path d="M4 8l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span className="svc-tag">Requested Therapist</span>
                                {/* Info icon */}
                                <button className="svc-icon-btn" type="button" title="Info" style={{ fontSize: '13px', color: '#9ca3af' }}>ⓘ</button>
                                {/* Trash icon */}
                                <button className="svc-icon-btn" type="button" title="Remove therapist">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M11.5 3.5l-.7 8a.5.5 0 01-.5.5H3.7a.5.5 0 01-.5-.5l-.7-8" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        {duration !== null && (
                            <div className="svc-detail-row">
                                <span className="svc-key" style={{ fontStyle: 'italic' }}>For:</span>
                                <span className="svc-val">{duration} min</span>
                                {refDate && (
                                    <>
                                        <span className="svc-key" style={{ fontStyle: 'italic' }}>At:</span>
                                        <span className="svc-val">{fmtTime(refDate.toISOString())}</span>
                                    </>
                                )}
                            </div>
                        )}
                        {booking.room && (
                            <div className="svc-detail-row">
                                <span className="svc-key" style={{ fontStyle: 'italic' }}>Using:</span>
                                <span className="svc-val">{booking.room}</span>
                            </div>
                        )}
                        {booking.requests && (
                            <div className="svc-detail-row">
                                <span className="svc-key" style={{ fontStyle: 'italic' }}>Select request(s)</span>
                                <span className="svc-val">{booking.requests}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Notes box (view mode only) ── */}
                {booking && !editMode && booking.notes && (
                    <div className="panel-notes-box">
                        {booking.notes}
                    </div>
                )}

                {/* ── Edit form (new booking always; existing booking only in editMode) ── */}
                <form onSubmit={handleSubmit} className="panel-edit-form">
                    {(isNew || editMode) && !isCancelled && !isCompleted && (
                        <div className="panel-edit-fields">
                            <div className="field">
                                <label>Client Name</label>
                                <input value={clientName} onChange={handleClientNameChange} placeholder="Enter client name" />
                            </div>
                            <div className="field">
                                <label>Phone</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    placeholder="9876543210"
                                    pattern="^[6-9]\d{9}$"
                                    title="10-digit Indian mobile number starting with 6, 7, 8, or 9"
                                />
                            </div>
                            <div className="field">
                                <label>Service</label>
                                {services.length > 0 ? (
                                    <select value={serviceName} onChange={handleServiceNameChange}>
                                        <option value="">— Select service —</option>
                                        {services.map((s) => (
                                            <option key={s.id} value={s.name}>{s.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input value={serviceName} onChange={handleServiceNameChange} placeholder="e.g. 60 Min Swedish Massage" />
                                )}
                            </div>
                            <div className="field">
                                <label>Therapist</label>
                                <select value={therapistId} onChange={handleTherapistIdChange}>
                                    <option value="">— Select therapist —</option>
                                    {therapists.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.number} — {t.name} ({t.gender === 'female' ? 'F' : 'M'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="field-group">
                                <div className="field">
                                    <label>Start</label>
                                    <input type="datetime-local" value={startTime} onChange={handleStartTimeChange} />
                                </div>
                                <div className="field">
                                    <label>End</label>
                                    <input type="datetime-local" value={endTime} onChange={handleEndTimeChange} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Source selector */}
                    {(isNew || editMode) && !isCancelled && !isCompleted && (
                        <div className="panel-source-row field">
                            <label>Source</label>
                            <select value={source} onChange={handleSourceChange}>
                                <option value="phone">By Phone</option>
                                <option value="walk-in">Walk-in</option>
                                <option value="website">Website</option>
                                <option value="app">App</option>
                            </select>
                        </div>
                    )}

                    {formError && <div className="form-error">{formError}</div>}

                    {/* Save / Create button */}
                    {(isNew || editMode) && !isCancelled && !isCompleted && (
                        <button type="submit" className="btn-save-changes">
                            {isNew ? 'Create Booking' : 'Save Changes'}
                        </button>
                    )}
                </form>

                {/* ── Booking details audit trail (view mode only) ── */}
                {booking && !editMode && (
                    <div className="panel-booking-details">
                        <div className="bd-heading">Booking Details</div>
                        <div className="bd-row">
                            <span className="bd-key">Booked on:</span>
                            <span className="bd-val">{booking.bookedOn || '—'}</span>
                        </div>
                        <div className="bd-row">
                            <span className="bd-key">Booked by:</span>
                            <span className="bd-val">{booking.bookedBy || booking.clientName || '—'}</span>
                        </div>
                        {isCancelled && (
                            <>
                                <div className="bd-row">
                                    <span className="bd-key">Canceled on:</span>
                                    <span className="bd-val">{booking.canceledOn || '—'}</span>
                                </div>
                                <div className="bd-row">
                                    <span className="bd-key">Canceled by:</span>
                                    <span className="bd-val">{booking.canceledBy || '—'}</span>
                                </div>
                            </>
                        )}
                        <div className="bd-row">
                            <span className="bd-key">Source:</span>
                            <span className="bd-val">{booking.source || 'By Phone'}</span>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default memo(BookingPanel);
