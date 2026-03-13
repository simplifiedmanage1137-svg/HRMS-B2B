// src/components/Admin/UpdateApprovals.jsx
import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Badge, Alert, Spinner,
  Modal, Row, Col, Form, InputGroup
} from 'react-bootstrap';
import {
  FaCheck,
  FaTimes,
  FaEye,
  FaArrowLeft,
  FaSync,
  FaUser,
  FaCalendarAlt,
  FaClock,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaSearch,
  FaFilter
} from 'react-icons/fa';
import axios from '../../config/axios';
import API_ENDPOINTS from '../../config/api';

const UpdateApprovals = () => {
  const [completedRequests, setCompletedRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchCompletedRequests();
  }, []);

  // Apply filters whenever searchTerm, statusFilter, or completedRequests change
  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, completedRequests]);

  const fetchCompletedRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📤 Fetching completed requests...');
      
      const response = await axios.get(API_ENDPOINTS.ADMIN_UPDATES_COMPLETED);
      
      console.log('✅ Response:', response.data);
      
      if (Array.isArray(response.data)) {
        setCompletedRequests(response.data);
        setFilteredRequests(response.data);
        if (response.data.length === 0) {
          setError('No completed requests found');
        } else {
          setError(''); // Clear error if data found
        }
      } else {
        setCompletedRequests([]);
        setFilteredRequests([]);
        setError('Unexpected response format');
      }
      
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.response?.data?.message || 'Failed to load completed requests');
      setCompletedRequests([]);
      setFilteredRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...completedRequests];

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(req => {
        const fullName = `${req.first_name || ''} ${req.last_name || ''}`.toLowerCase();
        const employeeId = (req.employee_id || '').toLowerCase();
        const fields = (req.requested_fields || []).join(' ').toLowerCase();

        return fullName.includes(term) ||
          employeeId.includes(term) ||
          fields.includes(term);
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    setFilteredRequests(filtered);
  };

  const handleApprove = async (requestId) => {
    try {
      setMessage({ type: '', text: '' });
      setProcessing(true);
      
      console.log('📤 Approving request:', requestId);
      
      const response = await axios.post(API_ENDPOINTS.ADMIN_UPDATES_HANDLE, {
        request_id: requestId,
        action: 'approve'
      });
      
      console.log('✅ Approve response:', response.data);
      
      setMessage({
        type: 'success',
        text: 'Request approved successfully!'
      });
      
      // Close the detail modal
      setShowDetailModal(false);
      setSelectedRequest(null);
      
      // Refresh the list
      await fetchCompletedRequests();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error approving:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Failed to approve request'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId) => {
    try {
      setMessage({ type: '', text: '' });
      setProcessing(true);
      
      console.log('📤 Rejecting request:', requestId);
      
      const response = await axios.post(API_ENDPOINTS.ADMIN_UPDATES_HANDLE, {
        request_id: requestId,
        action: 'reject'
      });
      
      console.log('✅ Reject response:', response.data);
      
      setMessage({
        type: 'success',
        text: 'Request rejected successfully!'
      });
      
      setShowDetailModal(false);
      setSelectedRequest(null);
      
      // Refresh the list
      await fetchCompletedRequests();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error rejecting:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Failed to reject request'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRefresh = () => {
    fetchCompletedRequests();
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    if (!status) return <Badge bg="secondary">Unknown</Badge>;
    
    const statusMap = {
      'pending': { bg: 'warning', icon: <FaClock className="me-1" />, text: 'Pending' },
      'approved': { bg: 'success', icon: <FaCheckCircle className="me-1" />, text: 'Approved' },
      'rejected': { bg: 'danger', icon: <FaTimesCircle className="me-1" />, text: 'Rejected' }
    };
    
    const config = statusMap[status.toLowerCase()] || { bg: 'secondary', icon: null, text: status };
    
    return (
      <Badge bg={config.bg} pill className="px-3 py-2">
        {config.icon}
        {config.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted small">Loading approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <FaEye className="me-2 text-primary" />
          Update Approvals
        </h4>
        <div className="d-flex gap-2">
          <Badge bg="info" pill className="px-3 py-2">
            Total: {filteredRequests.length} Requests
          </Badge>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <FaSync className="me-2" size={12} />
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
          className="mb-4"
        >
          {message.type === 'success' && <FaCheckCircle className="me-2" size={14} />}
          {message.type === 'danger' && <FaTimesCircle className="me-2" size={14} />}
          {message.text}
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body className="p-3">
          <Row className="g-3">
            <Col md={6}>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-light border-0">
                  <FaSearch size={12} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by employee name, ID, or fields..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-0 bg-light"
                />
                {searchTerm && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="border-0"
                  >
                    <FaTimes size={12} />
                  </Button>
                )}
              </InputGroup>
            </Col>
            <Col md={4}>
              <Form.Select
                size="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-light border-0"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={clearFilters}
                className="w-100"
                disabled={!searchTerm && statusFilter === 'all'}
              >
                Clear Filters
              </Button>
            </Col>
          </Row>
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
          {error && filteredRequests.length === 0 ? (
            <div className="text-center py-5">
              <FaInfoCircle size={40} className="text-muted mb-3 opacity-50" />
              <p className="text-muted mb-3">{error}</p>
              <Button
                variant="primary"
                size="sm"
                onClick={fetchCompletedRequests}
              >
                <FaSync className="me-2" size={12} />
                Try Again
              </Button>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-5">
              <FaCheckCircle size={40} className="text-success mb-3 opacity-50" />
              <p className="text-muted mb-0">No pending approvals</p>
              {(searchTerm || statusFilter !== 'all') && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-2"
                >
                  Clear filters
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
                          <div className="me-2">
                            <FaUser className="text-primary" size={12} />
                          </div>
                          <div>
                            <div className="small fw-semibold">
                              {req.first_name} {req.last_name}
                            </div>
                            <small className="text-muted">{req.employee_id}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {(req.requested_fields || []).map(field => (
                            <Badge key={field} bg="info" pill className="px-2 py-1">
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
                        >
                          <FaEye className="me-1" size={10} />
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

      {/* Detail Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="xl" centered>
        <Modal.Header closeButton className="bg-primary text-white py-2">
          <Modal.Title as="h6" className="mb-0 small fw-semibold">
            <FaEye className="me-2" size={14} />
            Review Update Request
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {selectedRequest && (
            <div>
              {/* Employee Info */}
              <Card className="border-0 bg-light mb-3">
                <Card.Body className="p-3">
                  <Row>
                    <Col md={6}>
                      <h6 className="text-primary mb-2 small fw-semibold">
                        <FaUser className="me-2" size={12} />
                        Employee Information
                      </h6>
                      <p className="mb-1"><strong>Name:</strong> {selectedRequest.first_name} {selectedRequest.last_name}</p>
                      <p className="mb-1"><strong>Employee ID:</strong> {selectedRequest.employee_id}</p>
                      <p className="mb-0"><strong>Submitted:</strong> {formatDate(selectedRequest.updated_at)}</p>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-primary mb-2 small fw-semibold">
                        <FaInfoCircle className="me-2" size={12} />
                        Request Details
                      </h6>
                      <p className="mb-1"><strong>Status:</strong> {getStatusBadge(selectedRequest.status)}</p>
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

              {/* Comparison */}
              <Row className="g-3">
                <Col md={6}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Header className="bg-light py-2">
                      <h6 className="mb-0 text-primary">Current Data</h6>
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
                      <h6 className="mb-0 text-success">Updated Data</h6>
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
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="py-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowDetailModal(false)}
          >
            Close
          </Button>
          {selectedRequest?.status === 'pending' && (
            <>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleReject(selectedRequest.id)}
                disabled={processing}
              >
                {processing ? (
                  <Spinner size="sm" animation="border" className="me-1" />
                ) : (
                  <FaTimes className="me-1" size={10} />
                )}
                Reject
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => handleApprove(selectedRequest.id)}
                disabled={processing}
              >
                {processing ? (
                  <Spinner size="sm" animation="border" className="me-1" />
                ) : (
                  <FaCheck className="me-1" size={10} />
                )}
                Approve
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UpdateApprovals;