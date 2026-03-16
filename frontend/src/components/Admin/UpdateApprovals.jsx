// src/components/Admin/UpdateApprovals.jsx
import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Badge, Alert, Spinner,
  Modal, Row, Col, Form
} from 'react-bootstrap';
import {
  FaCheck,
  FaTimes,
  FaEye,
  FaUser,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarAlt,
  FaClock,
  FaExclamationTriangle
} from 'react-icons/fa';
import axios from '../../config/axios';
import API_ENDPOINTS from '../../config/api';

const UpdateApprovals = () => {
  const [completedRequests, setCompletedRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [comments, setComments] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filter, setFilter] = useState('all'); // all, approved, rejected

  useEffect(() => {
    fetchCompletedRequests();
  }, []);

  const fetchCompletedRequests = async () => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      console.log('📡 Fetching completed requests from:', API_ENDPOINTS.ADMIN_UPDATES_COMPLETED);
      
      const response = await axios.get(API_ENDPOINTS.ADMIN_UPDATES_COMPLETED);
      
      console.log('✅ API Response:', response);
      console.log('📦 Response data:', response.data);
      
      if (Array.isArray(response.data)) {
        setCompletedRequests(response.data);
        console.log(`✅ Loaded ${response.data.length} completed requests`);
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setCompletedRequests(response.data.data);
      } else {
        console.warn('⚠️ Unexpected response format:', response.data);
        setCompletedRequests([]);
      }
    } catch (error) {
      console.error('❌ Error fetching completed requests:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Failed to load requests'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
    setComments('');
  };

const handleApprove = async () => {
  if (!selectedRequest) return;
  
  setProcessing(true);
  setMessage({ type: '', text: '' });
  
  try {
    console.log('📤 Approving request:', selectedRequest.id);
    
    const response = await axios.post(API_ENDPOINTS.ADMIN_UPDATES_HANDLE, {
      request_id: selectedRequest.id,
      action: 'approve',
      comments: comments || null
    });
    
    console.log('✅ Approve response:', response.data);
    
    setMessage({ 
      type: 'success', 
      text: 'Request approved successfully! Employee data has been updated.' 
    });
    
    setShowModal(false);
    await fetchCompletedRequests(); // Refresh the list
    
    // 👇 IMPORTANT: Dispatch event to update sidebar count
    window.dispatchEvent(new Event('updateApprovalsChanged'));
    
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    
  } catch (error) {
    console.error('❌ Error approving request:', error);
    setMessage({ 
      type: 'danger', 
      text: error.response?.data?.message || error.message || 'Error approving request' 
    });
  } finally {
    setProcessing(false);
  }
};

const handleReject = async () => {
  if (!selectedRequest) return;
  
  setProcessing(true);
  setMessage({ type: '', text: '' });
  
  try {
    console.log('📤 Rejecting request:', selectedRequest.id);
    
    const response = await axios.post(API_ENDPOINTS.ADMIN_UPDATES_HANDLE, {
      request_id: selectedRequest.id,
      action: 'reject',
      comments: comments || null
    });
    
    console.log('✅ Reject response:', response.data);
    
    setMessage({ 
      type: 'success', 
      text: 'Request rejected successfully!' 
    });
    
    setShowModal(false);
    await fetchCompletedRequests(); // Refresh the list
    
    // 👇 IMPORTANT: Dispatch event to update sidebar count
    window.dispatchEvent(new Event('updateApprovalsChanged'));
    
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    
  } catch (error) {
    console.error('❌ Error rejecting request:', error);
    setMessage({ 
      type: 'danger', 
      text: error.response?.data?.message || error.message || 'Error rejecting request' 
    });
  } finally {
    setProcessing(false);
  }
};

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilteredRequests = () => {
    if (filter === 'all') return completedRequests;
    return completedRequests.filter(req => req.status === filter);
  };

  const getStatusBadge = (status) => {
    if (!status) return <Badge bg="secondary">Unknown</Badge>;
    
    switch(status) {
      case 'approved':
        return <Badge bg="success" pill><FaCheckCircle className="me-1" size={10} /> Approved</Badge>;
      case 'rejected':
        return <Badge bg="danger" pill><FaTimesCircle className="me-1" size={10} /> Rejected</Badge>;
      case 'pending':
        return <Badge bg="warning" pill><FaClock className="me-1" size={10} /> Pending</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const filteredRequests = getFilteredRequests();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted small">Loading approval requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4" style={{ backgroundColor: '#f8f9fc', minHeight: '100vh' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <FaEye className="me-2 text-primary" />
          Update Approvals
        </h4>
        <div className="d-flex gap-2">
          <Badge bg="info" pill className="px-3 py-2">
            Total: {completedRequests.length} Requests
          </Badge>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={fetchCompletedRequests}
            disabled={loading}
          >
            <FaExclamationTriangle className="me-2" size={12} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Message Alert */}
      {message.text && (
        <Alert 
          variant={message.type} 
          onClose={() => setMessage({ type: '', text: '' })} 
          dismissible
          className="mb-4 shadow-sm"
        >
          {message.type === 'success' && <FaCheckCircle className="me-2" size={14} />}
          {message.type === 'danger' && <FaExclamationTriangle className="me-2" size={14} />}
          {message.text}
        </Alert>
      )}

      {/* Filter Tabs */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body className="p-2">
          <div className="d-flex gap-2">
            <Button
              size="sm"
              variant={filter === 'all' ? 'primary' : 'outline-secondary'}
              onClick={() => setFilter('all')}
            >
              All ({completedRequests.length})
            </Button>
            <Button
              size="sm"
              variant={filter === 'pending' ? 'warning' : 'outline-warning'}
              onClick={() => setFilter('pending')}
            >
              Pending ({completedRequests.filter(r => r.status === 'pending').length})
            </Button>
            <Button
              size="sm"
              variant={filter === 'approved' ? 'success' : 'outline-success'}
              onClick={() => setFilter('approved')}
            >
              Approved ({completedRequests.filter(r => r.status === 'approved').length})
            </Button>
            <Button
              size="sm"
              variant={filter === 'rejected' ? 'danger' : 'outline-danger'}
              onClick={() => setFilter('rejected')}
            >
              Rejected ({completedRequests.filter(r => r.status === 'rejected').length})
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Main Content */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-light py-3 d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Pending Approval Requests</h5>
          <Badge bg="dark" pill>
            {filteredRequests.length} Records
          </Badge>
        </Card.Header>
        <Card.Body className="p-0">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-5">
              <FaInfoCircle size={50} className="text-muted mb-3 opacity-50" />
              <h5 className="text-muted">No Requests Found</h5>
              <p className="text-muted small">
                {filter === 'all' 
                  ? 'When employees submit their updates, they will appear here.'
                  : `No ${filter} requests found.`}
              </p>
              {filter !== 'all' && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setFilter('all')}
                  className="mt-2"
                >
                  View all requests
                </Button>
              )}
            </div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table hover className="mb-0">
                <thead className="bg-light sticky-top" style={{ top: 0, zIndex: 10 }}>
                  <tr>
                    <th className="small fw-normal text-dark">#</th>
                    <th className="small fw-normal text-dark">Employee</th>
                    <th className="small fw-normal text-dark">Requested Fields</th>
                    <th className="small fw-normal text-dark">Submitted On</th>
                    <th className="small fw-normal text-dark">Status</th>
                    <th className="small fw-normal text-dark">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req, index) => (
                    <tr key={req.id}>
                      <td className="small">{index + 1}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaUser className="me-2 text-primary" size={12} />
                          <div>
                            <div className="small fw-semibold">
                              {req.employee_name || 'Unknown'}
                            </div>
                            <small className="text-muted">{req.employee_id}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {(req.requested_fields || []).map(field => (
                            <Badge 
                              key={field} 
                              bg="info" 
                              pill 
                              className="px-2 py-1"
                              style={{ fontSize: '11px' }}
                            >
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaCalendarAlt className="text-muted me-2" size={10} />
                          <small>{formatDate(req.updated_at)}</small>
                        </div>
                      </td>
                      <td>{getStatusBadge(req.status)}</td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleViewDetails(req)}
                          className="px-3"
                        >
                          <FaEye className="me-1" size={12} />
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Review Modal */}
      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        size="xl"
        centered
        className="review-modal"
      >
        <Modal.Header closeButton className="bg-primary text-white py-2">
          <Modal.Title as="h6" className="mb-0 small fw-semibold">
            <FaEye className="me-2" size={14} />
            Review Update Request
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {selectedRequest && (
            <>
              {/* Request Info */}
              <Card className="border-0 bg-light mb-3">
                <Card.Body className="p-3">
                  <Row>
                    <Col md={6}>
                      <h6 className="text-primary mb-2 small fw-semibold">
                        <FaUser className="me-2" size={12} />
                        Employee Information
                      </h6>
                      <p className="mb-1"><strong>Name:</strong> {selectedRequest.employee_name || 'N/A'}</p>
                      <p className="mb-1"><strong>Employee ID:</strong> {selectedRequest.employee_id}</p>
                      <p className="mb-0"><strong>Department:</strong> {selectedRequest.employee_department || 'N/A'}</p>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-primary mb-2 small fw-semibold">
                        <FaInfoCircle className="me-2" size={12} />
                        Request Details
                      </h6>
                      <p className="mb-1"><strong>Status:</strong> {getStatusBadge(selectedRequest.status)}</p>
                      <p className="mb-1"><strong>Submitted:</strong> {formatDate(selectedRequest.updated_at)}</p>
                      <p className="mb-0"><strong>Requested Fields:</strong></p>
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {(selectedRequest.requested_fields || []).map(field => (
                          <Badge key={field} bg="info" pill className="px-2 py-1">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Data Comparison */}
              <Row className="g-3">
                <Col md={6}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Header className="bg-light py-2">
                      <h6 className="mb-0 text-primary small fw-semibold">Current Data</h6>
                    </Card.Header>
                    <Card.Body className="p-3">
                      <pre style={{ 
                        background: '#f8f9fa', 
                        padding: '12px', 
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '300px',
                        fontSize: '12px',
                        margin: 0
                      }}>
                        {JSON.stringify(selectedRequest.employeeDetails || {}, null, 2)}
                      </pre>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Header className="bg-light py-2">
                      <h6 className="mb-0 text-success small fw-semibold">Updated Data</h6>
                    </Card.Header>
                    <Card.Body className="p-3">
                      <pre style={{ 
                        background: '#f8f9fa', 
                        padding: '12px', 
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '300px',
                        fontSize: '12px',
                        margin: 0
                      }}>
                        {JSON.stringify(selectedRequest.employee_data || {}, null, 2)}
                      </pre>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Comments Section */}
              <Form.Group className="mt-3">
                <Form.Label className="small fw-semibold">
                  <FaInfoCircle className="me-2 text-primary" size={12} />
                  Comments (Optional)
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add comments about this decision..."
                  size="sm"
                  className="bg-light"
                  disabled={processing}
                />
              </Form.Group>

              {/* Admin Notes if any */}
              {selectedRequest.notes && (
                <div className="mt-3 p-2 bg-warning bg-opacity-10 rounded">
                  <small className="text-warning fw-semibold d-block mb-1">
                    <FaInfoCircle className="me-1" size={10} />
                    Admin Note:
                  </small>
                  <small className="text-dark">{selectedRequest.notes}</small>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="py-2">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => setShowModal(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleReject}
            disabled={processing}
            className="px-3"
          >
            {processing ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
                Processing...
              </>
            ) : (
              <>
                <FaTimes className="me-1" size={12} />
                Reject
              </>
            )}
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={handleApprove}
            disabled={processing}
            className="px-3"
          >
            {processing ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
                Processing...
              </>
            ) : (
              <>
                <FaCheck className="me-1" size={12} />
                Approve
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UpdateApprovals;