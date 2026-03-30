import { useDispatch, useSelector } from 'react-redux';
import { memo, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { setSelectedDate } from '../../store/slices/uiSlice';
import { selectSelectedDate } from '../../store/selectors/uiSelectors';
import { selectAllBookings } from '../../store/selectors/bookingSelectors';
import { formatDateDisplay } from '../../utils/calendarUtils';
import FilterPanel, { DEFAULT_FILTER_STATE } from './FilterPanel';

// Derive alphabetically-sorted unique clients from all bookings
const getUniqueClients = (bookings) => {
    const seen = new Set();
    const clients = [];
    for (const b of bookings) {
        if (!b.clientName) continue;
        const key = `${b.clientName}|${b.phone || ''}`;
        if (!seen.has(key)) {
            seen.add(key);
            clients.push({ name: b.clientName, phone: b.phone || '' });
        }
    }
    return clients.sort((a, b) => a.name.localeCompare(b.name));
};

// Highlight the first occurrence of `query` inside `text`
const Highlight = ({ text, query }) => {
    if (!query || !text) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
        <>
            {text.slice(0, idx)}
            <span className="search-match">{text.slice(idx, idx + query.length)}</span>
            {text.slice(idx + query.length)}
        </>
    );
};

const MAX_RESULTS = 12;

// Returns today's date as YYYY-MM-DD in LOCAL time (toISOString is UTC)
const getTodayLocal = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const CalSubheader = ({
    searchQuery, onSearchChange, onSelectClient,
    therapists, filterState, onFilterChange,
}) => {
    const dispatch     = useDispatch();
    const selectedDate = useSelector(selectSelectedDate);
    const bookings     = useSelector(selectAllBookings);
    const isToday      = selectedDate === getTodayLocal();

    // ── Search dropdown ───────────────────────────────────────────────────────
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [activeIndex, setActiveIndex]   = useState(-1);
    const searchWrapRef = useRef(null);
    const listRef       = useRef(null);

    // ── Filter panel ──────────────────────────────────────────────────────────
    const [filterOpen, setFilterOpen] = useState(false);
    const filterWrapRef = useRef(null);

    const shiftDate = useCallback((offset) => {
        const d = new Date(`${selectedDate}T00:00:00`);
        d.setDate(d.getDate() + offset);
        dispatch(setSelectedDate(d.toISOString().split('T')[0]));
    }, [selectedDate, dispatch]);

    const allClients = useMemo(() => getUniqueClients(bookings), [bookings]);

    const displayedClients = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return allClients.slice(0, MAX_RESULTS);
        return allClients
            .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
            .slice(0, MAX_RESULTS);
    }, [allClients, searchQuery]);

    // Close search dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
                setDropdownOpen(false);
                setActiveIndex(-1);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Close filter panel on outside click
    useEffect(() => {
        const handler = (e) => {
            if (filterWrapRef.current && !filterWrapRef.current.contains(e.target)) {
                setFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Scroll active item into view
    useEffect(() => {
        if (activeIndex < 0 || !listRef.current) return;
        const item = listRef.current.children[activeIndex];
        if (item) item.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const handleInputChange = useCallback((e) => {
        onSearchChange(e);
        setDropdownOpen(true);
        setActiveIndex(-1);
    }, [onSearchChange]);

    const handleSelect = useCallback((client) => {
        onSelectClient && onSelectClient(client.name);
        setDropdownOpen(false);
        setActiveIndex(-1);
    }, [onSelectClient]);

    const handleKeyDown = useCallback((e) => {
        if (!dropdownOpen || displayedClients.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, displayedClients.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            handleSelect(displayedClients[activeIndex]);
        } else if (e.key === 'Escape') {
            setDropdownOpen(false);
            setActiveIndex(-1);
        }
    }, [dropdownOpen, displayedClients, activeIndex, handleSelect]);

    const handleFocus = useCallback(() => {
        if (allClients.length > 0) setDropdownOpen(true);
    }, [allClients.length]);

    const handleClearMouseDown = useCallback((e) => {
        e.preventDefault();
        onSelectClient && onSelectClient('');
        setDropdownOpen(false);
        setActiveIndex(-1);
    }, [onSelectClient]);

    // Dropdown list item handlers using data-index to avoid per-item closures
    const handleItemMouseDown = useCallback((e) => {
        const client = displayedClients[Number(e.currentTarget.dataset.index)];
        if (client) handleSelect(client);
    }, [displayedClients, handleSelect]);

    const handleItemMouseEnter = useCallback((e) => {
        setActiveIndex(Number(e.currentTarget.dataset.index));
    }, []);

    const handleFilterToggle = useCallback(() => setFilterOpen((o) => !o), []);

    const handleTodayClick = useCallback(() => {
        dispatch(setSelectedDate(getTodayLocal()));
    }, [dispatch]);

    const handlePrevDay = useCallback(() => shiftDate(-1), [shiftDate]);
    const handleNextDay = useCallback(() => shiftDate(1), [shiftDate]);

    const handleDatePickerChange = useCallback((e) => {
        dispatch(setSelectedDate(e.target.value));
    }, [dispatch]);

    const showDropdown = dropdownOpen && displayedClients.length > 0;

    // Detect if any non-default filter is active — compare by key, not by index
    const filterActive =
        filterState.group !== DEFAULT_FILTER_STATE.group ||
        filterState.selectAllTherapists !== DEFAULT_FILTER_STATE.selectAllTherapists ||
        Object.entries(DEFAULT_FILTER_STATE.statuses).some(
            ([key, def]) => filterState.statuses[key] !== def
        );

    return (
        <div className="cal-subheader">
            <div className="outlet-info">
                <span className="outlet-name">Liat Towers ▾</span>
                <span className="display-mode">Display : 15 Min ▾</span>
            </div>
            <div className="cal-controls">

                {/* ── Search ─────────────────────────────────────────────── */}
                <div className="search-wrap" ref={searchWrapRef}>
                    <div className={`search-box${showDropdown ? ' dropdown-open' : ''}`}>
                        <svg className="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <circle cx="6.5" cy="6.5" r="5" stroke="#9ca3af" strokeWidth="1.5"/>
                            <path d="M10.5 10.5L14 14" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <input
                            type="text"
                            placeholder="Search Sales by phone/name"
                            value={searchQuery}
                            onChange={handleInputChange}
                            onFocus={handleFocus}
                            onKeyDown={handleKeyDown}
                            autoComplete="off"
                            spellCheck={false}
                        />
                        {searchQuery && (
                            <button
                                className="search-clear-btn"
                                onMouseDown={handleClearMouseDown}
                                aria-label="Clear search"
                                tabIndex={-1}
                            >
                                ×
                            </button>
                        )}
                    </div>

                    {showDropdown && (
                        <div className="search-dropdown" role="listbox" aria-label="Customer results">
                            <ul className="search-dropdown-list" ref={listRef}>
                                {displayedClients.map((client, i) => (
                                    <li
                                        key={`${client.name}|${client.phone}`}
                                        role="option"
                                        aria-selected={i === activeIndex}
                                        className={`search-dropdown-item${i === activeIndex ? ' active' : ''}`}
                                        data-index={i}
                                        onMouseDown={handleItemMouseDown}
                                        onMouseEnter={handleItemMouseEnter}
                                    >
                                        <span className="dropdown-client-name">
                                            <Highlight text={client.name} query={searchQuery} />
                                        </span>
                                        {client.phone && (
                                            <span className="dropdown-client-phone">
                                                <Highlight text={client.phone} query={searchQuery} />
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* ── Filter button + panel ──────────────────────────────── */}
                <div className="filter-wrap" ref={filterWrapRef}>
                    <button
                        className={`filter-btn${filterOpen ? ' filter-btn--open' : ''}${filterActive ? ' filter-btn--active' : ''}`}
                        type="button"
                        onClick={handleFilterToggle}
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        Filter
                    </button>

                    {filterOpen && (
                        <FilterPanel
                            therapists={therapists}
                            filterState={filterState}
                            onChange={onFilterChange}
                        />
                    )}
                </div>

                {/* ── Date navigation ────────────────────────────────────── */}
                <button
                    className={`today-btn${isToday ? ' active' : ''}`}
                    onClick={handleTodayClick}
                >
                    Today
                </button>
                <div className="date-nav">
                    <button className="date-nav-arrow" onClick={handlePrevDay}>‹</button>
                    <span className="date-nav-label">{formatDateDisplay(selectedDate)}</span>
                    <button className="date-nav-arrow" onClick={handleNextDay}>›</button>
                    <label className="date-pick-wrap" title="Pick a date">
                        📅
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={handleDatePickerChange}
                            className="date-pick-input"
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};

export default memo(CalSubheader);
