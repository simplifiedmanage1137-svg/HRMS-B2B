import React, { useState } from 'react';
import { Button, Modal, Alert, Spinner, Badge } from 'react-bootstrap';
import { FaClock, FaHistory, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import axios from '../../config/axios';
import API_ENDPOINTS from '../../config/api';

const HistoricalLateMarksUpdater = () => {
    const [showModal, setShowModal] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleUpdate = async () => {
        setUpdating(true);
        setError('');
        setResult(null);

        try {
            console.log('🚀 Starting historical late marks update...');
            
            const response = await axios.post(API_ENDPOINTS.ATTENDANCE_UPDATE_HISTORICAL_LATE_MARKS);
            
            if (response.data.success) {
                setResult(response.data);
                console.log('✅ Update completed:', response.data);
            } else {
                setError(response.data.message || 'Update failed');
            }
        } catch (err) {
            console.error('❌ Update error:', err);
            setError(err.response?.data?.message || 'Failed to update historical late marks');
        } finally {
            setUpdating(false);
        }
    };

    const handleClose = () => {
        setShowModal(false);
        setResult(null);
        setError('');
    };

    return (
        <>
            <Button 
                variant="warning" 
                size="sm" 
                onClick={() => setShowModal(true)}
                className="d-flex align-items-center"
            >
                <FaHistory className="me-2" size={12} />
                Update Historical Late Marks
            </Button>

            <Modal show={showModal} onHide={handleClose} centered size="lg">
                <Modal.Header closeButton className="bg-warning text-dark">
                    <Modal.Title className="h6 d-flex align-items-center">
                        <FaClock className="me-2" />
                        Update Historical Late Marks
                    </Modal.Title>
                </Modal.Header>
                
                <Modal.Body className="p-4">
                    {!result && !error && !updating && (
                        <div>
                            <div className="mb-3 p-3 bg-light rounded">
                                <h6 className="text-warning mb-2">
                                    <FaExclamationTriangle className="me-2" />
                                    What does this do?
                                </h6>
                                <p className="mb-0 small">
                                    This will recalculate and update late marks for all historical attendance records. 
                                    Any employee who clocked in after their shift time will be marked as late with the exact duration.
                                </p>
                            </div>
                            
                            <Alert variant="info" className="small">
                                <strong>Note:</strong> This process will:
                                <ul className="mb-0 mt-2">
                                    <li>Scan all attendance records in the database</li>
                                    <li>Calculate late time based on employee shift timings</li>
                                    <li>Update records that need correction</li>
                                    <li>Show results in Attendance Reports and Live Feed</li>
                                </ul>
                            </Alert>
                        </div>
                    )}

                    {updating && (
                        <div className="text-center py-4">
                            <Spinner animation="border" variant="warning" className="mb-3" />
                            <h6>Updating Historical Late Marks...</h6>
                            <p className="text-muted small mb-0">
                                Please wait while we process all attendance records.
                            </p>
                        </div>
                    )}

                    {error && (
                        <Alert variant="danger">
                            <h6 className="alert-heading">Update Failed</h6>
                            <p className="mb-0">{error}</p>
                        </Alert>
                    )}

                    {result && (
                        <div>
                            <Alert variant="success" className="mb-3">
                                <h6 className="alert-heading d-flex align-items-center">
                                    <FaCheckCircle className="me-2" />
                                    Update Completed Successfully!
                                </h6>
                                <p className="mb-0">{result.message}</p>
                            </Alert>

                            <div className="row g-3">
                                <div className="col-6">
                                    <div className="card border-0 bg-light">
                                        <div className="card-body text-center py-3">
                                            <h4 className="text-primary mb-1">{result.totalRecords}</h4>
                                            <small className="text-muted">Total Records</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="card border-0 bg-light">
                                        <div className="card-body text-center py-3">
                                            <h4 className="text-success mb-1">{result.updatedCount}</h4>
                                            <small className="text-muted">Updated</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="card border-0 bg-light">
                                        <div className="card-body text-center py-3">
                                            <h4 className="text-info mb-1">{result.alreadyCorrectCount}</h4>
                                            <small className="text-muted">Already Correct</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="card border-0 bg-light">
                                        <div className="card-body text-center py-3">
                                            <h4 className="text-danger mb-1">{result.errorCount}</h4>
                                            <small className="text-muted">Errors</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {result.updatedCount > 0 && (
                                <Alert variant="info" className="mt-3 small">
                                    <strong>✅ Success!</strong> {result.updatedCount} attendance records have been updated with correct late marks. 
                                    You can now see the late marks in the Attendance Reports and Live Attendance Feed.
                                </Alert>
                            )}

                            {result.updatedCount === 0 && (
                                <Alert variant="info" className="mt-3 small">
                                    <strong>ℹ️ Info:</strong> All attendance records were already up to date. No changes were needed.
                                </Alert>
                            )}
                        </div>
                    )}
                </Modal.Body>
                
                <Modal.Footer>
                    {!result && !updating && (
                        <>
                            <Button variant="secondary" size="sm" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button 
                                variant="warning" 
                                size="sm" 
                                onClick={handleUpdate}
                                disabled={updating}
                            >
                                <FaClock className="me-2" />
                                Start Update
                            </Button>
                        </>
                    )}
                    
                    {(result || error) && (
                        <Button variant="primary" size="sm" onClick={handleClose}>
                            Close
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default HistoricalLateMarksUpdater;