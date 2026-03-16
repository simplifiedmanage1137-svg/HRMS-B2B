// src/components/Employee/EmployeeUpdateRequests.jsx
import React, { useState, useEffect } from 'react';
import {
  Card, Button, Alert, Spinner, Badge,
  Modal, Row, Col
} from 'react-bootstrap';
import {
  FaBell,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaUniversity,
  FaBriefcase,
  FaHeartbeat,
  FaFileAlt,
  FaCreditCard
} from 'react-icons/fa';
import axios from '../../config/axios';
import API_ENDPOINTS from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const EmployeeUpdateRequests = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      console.log('📡 Fetching pending requests for employee:', user?.employeeId);

      const response = await axios.get(API_ENDPOINTS.EMPLOYEE_UPDATES_PENDING);
      
      console.log('✅ Pending requests response:', response.data);
      console.log('Response data type:', typeof response.data);
      console.log('Is array?', Array.isArray(response.data));
      
      if (Array.isArray(response.data)) {
        setRequests(response.data);
        console.log(`✅ Loaded ${response.data.length} pending requests`);
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setRequests(response.data.data);
      } else {
        console.warn('Unexpected response format:', response.data);
        setRequests([]);
      }
    } catch (error) {
      console.error('❌ Error fetching pending requests:', error);
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

  const handleAcceptRequest = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

const confirmAcceptRequest = async () => {
  if (!selectedRequest) return;

  setAccepting(true);
  try {
    console.log('📤 Accepting request:', selectedRequest.id);
    
    const response = await axios.post(
      API_ENDPOINTS.EMPLOYEE_UPDATES_ACCEPT(selectedRequest.id)
    );

    console.log('✅ Request accepted:', response.data);
    
    showNotification('Request accepted successfully!', 'success');
    
    // 👇 IMPORTANT: Direct navigation without setTimeout
    console.log('🔄 Navigating to update form...');
    navigate(`/employee/update-info/${selectedRequest.id}`);
    
    setShowModal(false);
    
  } catch (error) {
    console.error('❌ Error accepting request:', error);
    showNotification(error.response?.data?.message || 'Failed to accept request', 'danger');
  } finally {
    setAccepting(false);
  }
};

  const getFieldIcon = (field) => {
    const icons = {
      personal: <FaUser className="text-primary" />,
      contact: <FaEnvelope className="text-info" />,
      address: <FaMapMarkerAlt className="text-danger" />,
      bank: <FaUniversity className="text-warning" />,
      employment: <FaBriefcase className="text-secondary" />,
      emergency: <FaHeartbeat className="text-danger" />,
      documents: <FaFileAlt className="text-success" />,
      salary: <FaCreditCard className="text-success" />
    };
    return icons[field] || <FaInfoCircle className="text-secondary" />;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted small">Loading update requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4" style={{ backgroundColor: '#f8f9fc', minHeight: '100vh' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <FaBell className="me-2 text-primary" />
          Information Update Requests
        </h4>
        <Badge bg="info" pill className="px-3 py-2">
          {requests.length} Pending
        </Badge>
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

      {/* Requests List */}
      {requests.length > 0 ? (
        <Row>
          {requests.map((request) => (
            <Col key={request.id} md={6} className="mb-3">
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-light py-2 d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">Update Request #{request.id}</h6>
                  <Badge bg="warning">Pending</Badge>
                </Card.Header>
                <Card.Body className="p-3">
                  <div className="mb-2">
                    <strong>Requested Information:</strong>
                  </div>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {request.requested_fields?.map((field) => (
                      <Badge
                        key={field}
                        bg="light"
                        text="dark"
                        className="px-3 py-2 d-flex align-items-center border"
                      >
                        {getFieldIcon(field)}
                        <span className="ms-2">
                          {field.charAt(0).toUpperCase() + field.slice(1)}
                        </span>
                      </Badge>
                    ))}
                  </div>
                  {request.notes && (
                    <div className="bg-light p-2 rounded small mb-3">
                      <strong>Note from Admin:</strong> {request.notes}
                    </div>
                  )}
                  <div className="d-flex justify-content-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAcceptRequest(request)}
                    >
                      <FaCheckCircle className="me-2" size={12} />
                      Review & Update
                    </Button>
                  </div>
                </Card.Body>
                <Card.Footer className="bg-white border-0 pt-0 pb-2 px-3">
                  <small className="text-muted">
                    Received on: {new Date(request.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </small>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Card className="border-0 shadow-sm text-center py-5">
          <Card.Body>
            <FaBell size={40} className="text-muted mb-3 opacity-50" />
            <h5 className="text-muted">No Pending Requests</h5>
            <p className="text-muted small mb-3">
              You don't have any information update requests at the moment.
            </p>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={() => navigate('/employee/dashboard')}
            >
              Back to Dashboard
            </Button>
          </Card.Body>
        </Card>
      )}

      {/* Accept Confirmation Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="bg-primary text-white py-2">
          <Modal.Title as="h6" className="mb-0 small fw-semibold">
            <FaCheckCircle className="me-2" size={14} />
            Accept Update Request
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          <p className="small mb-2">Are you sure you want to accept this update request?</p>
          <p className="text-muted small mb-0">
            Once accepted, you will be able to update your information. The changes will need admin approval before they are applied.
          </p>
          
          {selectedRequest && (
            <div className="mt-3 p-2 bg-light rounded small">
              <strong>Request details:</strong>
              <div className="mt-1">
                {selectedRequest.requested_fields?.map(field => (
                  <Badge key={field} bg="info" className="me-1 mb-1">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="py-2">
          <Button variant="secondary" size="sm" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={confirmAcceptRequest}
            disabled={accepting}
          >
            {accepting ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
                Accepting...
              </>
            ) : (
              <>
                <FaCheckCircle className="me-2" size={12} />
                Accept Request
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EmployeeUpdateRequests;