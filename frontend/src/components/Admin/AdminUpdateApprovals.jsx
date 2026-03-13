// components/Admin/AdminUpdateApprovals.jsx
import React, { useState, useEffect } from 'react';
import axios from '../../config/axios'; // Import configured axios instance
import API_ENDPOINTS from '../../config/api'; // Import API endpoints
import { FaCheck, FaTimes, FaEye } from 'react-icons/fa';

const AdminUpdateApprovals = () => {
  const [completedRequests, setCompletedRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    fetchCompletedRequests();
  }, []);

  const fetchCompletedRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.ADMIN_UPDATES_COMPLETED);
      setCompletedRequests(response.data);
      setMessage('');
    } catch (error) {
      console.error('Error fetching requests:', error);
      setMessage('Failed to fetch update requests');
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    setLoading(true);
    try {
      await axios.post(API_ENDPOINTS.ADMIN_UPDATES_HANDLE, {
        requestId,
        action: 'approve'
      });
      
      setMessage('Request approved successfully!');
      setMessageType('success');
      await fetchCompletedRequests(); // Refresh the list
      setSelectedRequest(null);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error approving request');
      setMessageType('danger');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    setLoading(true);
    try {
      await axios.post(API_ENDPOINTS.ADMIN_UPDATES_HANDLE, {
        requestId,
        action: 'reject'
      });
      
      setMessage('Request rejected successfully!');
      setMessageType('success');
      await fetchCompletedRequests(); // Refresh the list
      setSelectedRequest(null);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error rejecting request');
      setMessageType('danger');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewChanges = (request) => {
    setSelectedRequest(request);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  const renderComparisonValue = (oldValue, newValue) => {
    if (oldValue === newValue) {
      return <span className="text-muted">No change</span>;
    }
    return (
      <div>
        <span className="text-danger text-decoration-line-through me-2">
          {oldValue || 'null'}
        </span>
        <span className="text-success">→ {newValue}</span>
      </div>
    );
  };

  if (loading && completedRequests.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading update requests...</p>
      </div>
    );
  }

  return (
    <div className="admin-update-approvals p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Pending Update Approvals</h4>
        <button 
          className="btn btn-sm btn-outline-primary"
          onClick={fetchCompletedRequests}
          disabled={loading}
        >
          <i className="bi bi-arrow-repeat me-1"></i>
          Refresh
        </button>
      </div>

      {message && (
        <div className={`alert alert-${messageType} alert-dismissible fade show mb-4`} role="alert">
          {message}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setMessage('')}
            aria-label="Close"
          ></button>
        </div>
      )}

      {selectedRequest ? (
        // Show comparison view
        <div className="card mb-4 shadow-sm">
          <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
            <div>
              <h5 className="mb-0">
                Update Request Review
              </h5>
              <small className="text-muted">
                Request ID: {selectedRequest._id}
              </small>
            </div>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setSelectedRequest(null)}
            >
              ← Back to List
            </button>
          </div>
          <div className="card-body">
            {/* Employee Info */}
            <div className="bg-light p-3 rounded mb-4">
              <div className="row">
                <div className="col-md-6">
                  <h6 className="fw-bold mb-2">Employee Details</h6>
                  <p className="mb-1">
                    <strong>Name:</strong> {selectedRequest.employeeDetails?.firstName}{' '}
                    {selectedRequest.employeeDetails?.lastName}
                  </p>
                  <p className="mb-1">
                    <strong>Employee ID:</strong> {selectedRequest.employeeDetails?.employeeId}
                  </p>
                  <p className="mb-1">
                    <strong>Designation:</strong> {selectedRequest.employeeDetails?.designation}
                  </p>
                  <p className="mb-1">
                    <strong>Department:</strong> {selectedRequest.employeeDetails?.department}
                  </p>
                </div>
                <div className="col-md-6">
                  <h6 className="fw-bold mb-2">Request Info</h6>
                  <p className="mb-1">
                    <strong>Submitted:</strong> {formatDate(selectedRequest.updatedAt).date} at {formatDate(selectedRequest.updatedAt).time}
                  </p>
                  <p className="mb-1">
                    <strong>Requested Fields:</strong> {selectedRequest.requestedFields?.join(', ')}
                  </p>
                  <p className="mb-1">
                    <strong>Status:</strong>{' '}
                    <span className="badge bg-warning text-dark">Pending Review</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Changes Comparison */}
            <h6 className="fw-bold mb-3">Changes Requested</h6>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '25%' }}>Field</th>
                    <th style={{ width: '35%' }}>Current Value</th>
                    <th style={{ width: '35%' }}>Requested Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(selectedRequest.employeeData || {}).map(field => {
                    const oldValue = selectedRequest.employeeDetails?.[field];
                    const newValue = selectedRequest.employeeData?.[field];
                    
                    // Skip if values are the same
                    if (oldValue === newValue) return null;
                    
                    return (
                      <tr key={field}>
                        <td className="fw-semibold">{field.replace(/_/g, ' ').toUpperCase()}</td>
                        <td className="text-danger bg-light">
                          {oldValue || <em className="text-muted">Not set</em>}
                        </td>
                        <td className="text-success bg-light">
                          {newValue || <em className="text-muted">Will be cleared</em>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                className="btn btn-outline-danger px-4"
                onClick={() => handleReject(selectedRequest._id)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Rejecting...
                  </>
                ) : (
                  <>
                    <FaTimes className="me-2" />
                    Reject
                  </>
                )}
              </button>
              <button
                className="btn btn-success px-4"
                onClick={() => handleApprove(selectedRequest._id)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Approving...
                  </>
                ) : (
                  <>
                    <FaCheck className="me-2" />
                    Approve
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Show list of completed requests
        <div className="card shadow-sm">
          <div className="card-body p-0">
            {completedRequests.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-3">
                  <FaEye size={40} className="text-muted" />
                </div>
                <h5 className="text-muted">No pending update requests</h5>
                <p className="text-muted small">
                  When employees request to update their information, they will appear here.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Employee</th>
                      <th>Requested Fields</th>
                      <th>Submitted On</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedRequests.map(request => {
                      const { date, time } = formatDate(request.updatedAt);
                      return (
                        <tr key={request._id}>
                          <td>
                            <div className="fw-semibold">
                              {request.employeeDetails?.firstName}{' '}
                              {request.employeeDetails?.lastName}
                            </div>
                            <small className="text-muted">
                              {request.employeeDetails?.designation}
                            </small>
                          </td>
                          <td>
                            <div className="d-flex flex-wrap gap-1">
                              {request.requestedFields?.map((field, idx) => (
                                <span key={idx} className="badge bg-info text-dark">
                                  {field.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <div>{date}</div>
                            <small className="text-muted">{time}</small>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => viewChanges(request)}
                            >
                              <FaEye className="me-1" />
                              Review Changes
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUpdateApprovals;