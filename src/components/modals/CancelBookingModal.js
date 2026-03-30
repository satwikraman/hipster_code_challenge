import { memo, useState, useCallback } from 'react';

/**
 * Cancel / Delete Booking modal — matches Figma node 556:11412
 *
 * Props:
 *   booking      — the booking being acted on
 *   onCancel     — user clicks the "Cancel" button (close modal, do nothing)
 *   onConfirm    — user clicks "Next" with selected type: 'normal' | 'delete'
 */
const CancelBookingModal = ({ booking, onCancel, onConfirm }) => {
    const [selected, setSelected] = useState('normal');

    const handleSelectNormal = useCallback(() => setSelected('normal'), []);
    const handleSelectDelete = useCallback(() => setSelected('delete'), []);
    const handleNext = useCallback(() => onConfirm(selected), [onConfirm, selected]);

    if (!booking) return null;

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="cancel-modal-title">
            <div className="cancel-modal">
                {/* Progress bar — step 1 */}
                <div className="cancel-modal-progress">
                    <div className="cancel-modal-progress-fill" />
                </div>

                <div className="cancel-modal-body">
                    {/* Header */}
                    <div className="cancel-modal-header">
                        <h2 id="cancel-modal-title">Cancel / Delete Booking</h2>
                        <p>Please select the cancellation type.</p>
                    </div>

                    {/* Radio options */}
                    <div className="cancel-modal-options">
                        {/* Normal Cancellation */}
                        <label className="cancel-option">
                            <input
                                type="radio"
                                name="cancelType"
                                value="normal"
                                checked={selected === 'normal'}
                                onChange={handleSelectNormal}
                            />
                            <span className="cancel-option-label">Normal Cancellation</span>
                        </label>

                        {/* No Show — disabled per design */}
                        <label className="cancel-option disabled">
                            <input type="radio" name="cancelType" value="noshow" disabled />
                            <span className="cancel-option-label">No Show</span>
                        </label>

                        <div className="cancel-modal-divider" />

                        {/* Just Delete It */}
                        <label className="cancel-option">
                            <input
                                type="radio"
                                name="cancelType"
                                value="delete"
                                checked={selected === 'delete'}
                                onChange={handleSelectDelete}
                            />
                            <span className="cancel-option-label">Just Delete It</span>
                        </label>
                        <p className="cancel-delete-note">
                            Bookings with a deposit cannot be deleted. Please cancel instead to retain a proper record.
                        </p>
                    </div>

                    {/* Action buttons */}
                    <div className="cancel-modal-actions">
                        <button className="cancel-modal-btn-cancel" type="button" onClick={onCancel}>
                            Cancel
                        </button>
                        <button className="cancel-modal-btn-next" type="button" onClick={handleNext}>
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(CancelBookingModal);
