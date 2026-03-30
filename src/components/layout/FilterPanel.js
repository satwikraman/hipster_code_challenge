import { memo, useState, useCallback } from 'react';
import { BOOKING_STATUS } from '../../constants';

// ── Static config ────────────────────────────────────────────────────────────

const STATUS_ROWS = [
    [
        { key: BOOKING_STATUS.CONFIRMED,   label: 'Confirmed',              dot: '#60a5fa' },
        { key: BOOKING_STATUS.UNCONFIRMED, label: 'Unconfirmed',            dot: '#fdba74' },
    ],
    [
        { key: BOOKING_STATUS.CHECK_IN,    label: 'Checked In',             dot: '#60a5fa' },
        { key: BOOKING_STATUS.COMPLETED,   label: 'Completed',              dot: '#d1d5db' },
    ],
    [
        { key: BOOKING_STATUS.CANCELLED,   label: 'Cancelled',              dot: '#60a5fa' },
        { key: BOOKING_STATUS.NO_SHOW,     label: 'No Show',                dot: '#60a5fa' },
    ],
    [
        { key: BOOKING_STATUS.HOLDING,     label: 'Holding',                dot: '#d1d5db' },
        null,
    ],
    [
        { key: BOOKING_STATUS.IN_PROGRESS, label: 'Check-in (In Progress)', dot: '#d1d5db' },
        null,
    ],
];

const RESOURCES = ['Rooms', 'Sofa', 'Monkey Chair'];

export const DEFAULT_FILTER_STATE = {
    group: 'all',
    statuses: {
        [BOOKING_STATUS.CONFIRMED]:   true,
        [BOOKING_STATUS.UNCONFIRMED]: true,
        [BOOKING_STATUS.CHECK_IN]:    true,
        [BOOKING_STATUS.COMPLETED]:   true,
        [BOOKING_STATUS.CANCELLED]:   false,
        [BOOKING_STATUS.NO_SHOW]:     false,
        [BOOKING_STATUS.HOLDING]:     true,
        [BOOKING_STATUS.IN_PROGRESS]: true,
    },
    selectAllTherapists: true,
    selectedTherapistIds: null, // null = all
};

// ── Sub-components ───────────────────────────────────────────────────────────

const FpCheckbox = ({ checked }) => (
    <span className={`fp-checkbox${checked ? ' fp-checkbox--checked' : ''}`}>
        {checked && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                <path d="M1 3.5L3.2 5.8L8 1" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        )}
    </span>
);

// ── Main component ───────────────────────────────────────────────────────────

const FilterPanel = ({ therapists, filterState, onChange }) => {
    const { group, statuses, selectAllTherapists, selectedTherapistIds } = filterState;
    const [therapistSearch, setTherapistSearch] = useState('');

    const update = useCallback(
        (patch) => onChange({ ...filterState, ...patch }),
        [onChange, filterState]
    );

    const toggleStatus = useCallback(
        (key) => update({ statuses: { ...statuses, [key]: !statuses[key] } }),
        [update, statuses]
    );

    const toggleSelectAll = useCallback(() => {
        if (selectAllTherapists) {
            update({ selectAllTherapists: false, selectedTherapistIds: new Set() });
        } else {
            update({ selectAllTherapists: true, selectedTherapistIds: null });
        }
    }, [update, selectAllTherapists]);

    const toggleTherapist = useCallback((id) => {
        const next = new Set(selectedTherapistIds || therapists.map(t => t.id));
        if (next.has(id)) next.delete(id); else next.add(id);
        const allSelected = therapists.every(t => next.has(t.id));
        update({ selectAllTherapists: allSelected, selectedTherapistIds: allSelected ? null : next });
    }, [update, selectedTherapistIds, therapists]);

    const clearFilter = useCallback(() => {
        setTherapistSearch('');
        onChange({ ...DEFAULT_FILTER_STATE });
    }, [onChange]);

    const handleTherapistSearchChange = useCallback((e) => {
        setTherapistSearch(e.target.value);
    }, []);

    const visibleTherapists = therapistSearch.trim()
        ? therapists.filter(t => t.name.toLowerCase().includes(therapistSearch.toLowerCase()))
        : therapists;

    const effectiveIds = selectedTherapistIds ?? new Set(therapists.map(t => t.id));

    // Data-attribute handlers — single stable function per section, avoids per-item closures
    const handleGroupClick = useCallback((e) => {
        update({ group: e.currentTarget.dataset.val });
    }, [update]);

    const handleStatusToggle = useCallback((e) => {
        toggleStatus(e.currentTarget.dataset.key);
    }, [toggleStatus]);

    const handleTherapistToggle = useCallback((e) => {
        const idx = Number(e.currentTarget.dataset.index);
        toggleTherapist(visibleTherapists[idx].id);
    }, [toggleTherapist, visibleTherapists]);

    return (
        <div className="filter-panel">

            {/* ── Show by group ─────────────────────────────────────────── */}
            <div className="fp-section">
                <p className="fp-section-title">Show by group (Person who is on duty)</p>
                <div className="fp-group-list">
                    {[
                        { val: 'all',    label: 'All Therapist' },
                        { val: 'male',   label: 'Male'          },
                        { val: 'female', label: 'Female'        },
                    ].map(({ val, label }) => (
                        <div
                            key={val}
                            className={`fp-group-item${val !== 'all' ? ' fp-group-item--indented' : ''}`}
                            data-val={val}
                            onClick={handleGroupClick}
                        >
                            <span className="fp-group-label">{label}</span>
                            {group === val && <span className="fp-group-dot" />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="fp-divider" />

            {/* ── Resources ─────────────────────────────────────────────── */}
            <div className="fp-section">
                <p className="fp-section-title fp-section-title--light">Resources</p>
                <div className="fp-group-list">
                    {RESOURCES.map((r) => (
                        <div key={r} className="fp-group-item fp-group-item--indented">
                            <span className="fp-group-label">{r}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="fp-divider" />

            {/* ── Booking Status ────────────────────────────────────────── */}
            <div className="fp-section">
                <p className="fp-section-title">Booking Status</p>
                <div className="fp-status-grid">
                    {STATUS_ROWS.map((row, ri) => (
                        <div key={ri} className="fp-status-row">
                            {row.map((item, ci) =>
                                item ? (
                                    <button
                                        key={item.key}
                                        type="button"
                                        className="fp-status-item"
                                        data-key={item.key}
                                        onClick={handleStatusToggle}
                                    >
                                        <FpCheckbox checked={!!statuses[item.key]} />
                                        <span className="fp-status-label">{item.label}</span>
                                        <span className="fp-status-dot" style={{ background: item.dot }} />
                                    </button>
                                ) : (
                                    <div key={`e${ri}${ci}`} />
                                )
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="fp-divider" />

            {/* ── Select Therapist ──────────────────────────────────────── */}
            <div className="fp-section">
                <div className="fp-therapist-header">
                    <span className="fp-section-title fp-section-title--inline">Select Therapist</span>
                    <button type="button" className="fp-select-all-btn" onClick={toggleSelectAll}>
                        <span>Select All</span>
                        <FpCheckbox checked={selectAllTherapists} />
                    </button>
                </div>
                <input
                    type="text"
                    className="fp-therapist-search"
                    placeholder="Search by therapist"
                    value={therapistSearch}
                    onChange={handleTherapistSearchChange}
                    spellCheck={false}
                />
                {!selectAllTherapists && (
                    <div className="fp-therapist-list">
                        {visibleTherapists.map((t, i) => (
                            <button
                                key={t.id}
                                type="button"
                                className="fp-status-item"
                                data-index={i}
                                onClick={handleTherapistToggle}
                            >
                                <FpCheckbox checked={effectiveIds.has(t.id)} />
                                <span className="fp-status-label">{t.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="fp-divider" />

            {/* ── Footer ────────────────────────────────────────────────── */}
            <div className="fp-footer">
                <button type="button" className="fp-clear-btn" onClick={clearFilter}>
                    Clear Filter (Return to Default)
                </button>
            </div>
        </div>
    );
};

export default memo(FilterPanel);
