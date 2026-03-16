// src/components/Employee/EmployeeUpdateForm.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Button, Card, Alert, Spinner, Row, Col } from 'react-bootstrap';
import axios from '../../config/axios';
import API_ENDPOINTS from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { FaSave, FaArrowLeft } from 'react-icons/fa';

const EmployeeUpdateForm = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({});
  const [requestDetails, setRequestDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Field to icon mapping
  const fieldIcons = {
    personal: { icon: '👤', label: 'Personal Information' },
    contact: { icon: '📞', label: 'Contact Details' },
    address: { icon: '🏠', label: 'Address' },
    bank: { icon: '🏦', label: 'Bank Details' },
    employment: { icon: '💼', label: 'Employment Details' },
    emergency: { icon: '🚑', label: 'Emergency Contact' },
    documents: { icon: '📄', label: 'Documents' },
    salary: { icon: '💰', label: 'Salary Information' }
  };

  // Field groups mapping
  const fieldGroups = {
    personal: [
      { name: 'first_name', label: 'First Name', type: 'text', required: true },
      { name: 'middle_name', label: 'Middle Name', type: 'text' },
      { name: 'last_name', label: 'Last Name', type: 'text', required: true },
      { name: 'dob', label: 'Date of Birth', type: 'date' },
      { name: 'blood_group', label: 'Blood Group', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] }
    ],
    contact: [
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'phone', label: 'Phone', type: 'tel' }
    ],
    address: [
      { name: 'address', label: 'Address', type: 'textarea' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'state', label: 'State', type: 'text' },
      { name: 'pincode', label: 'Pincode', type: 'text' }
    ],
    bank: [
      { name: 'bank_account_name', label: 'Account Holder Name', type: 'text' },
      { name: 'account_number', label: 'Account Number', type: 'text' },
      { name: 'ifsc_code', label: 'IFSC Code', type: 'text' },
      { name: 'branch_name', label: 'Branch Name', type: 'text' },
      { name: 'pan_number', label: 'PAN Number', type: 'text' }
    ],
    employment: [
      { name: 'designation', label: 'Designation', type: 'text' },
      { name: 'department', label: 'Department', type: 'text' },
      { name: 'employment_type', label: 'Employment Type', type: 'select', options: ['Full Time', 'Part Time', 'Contract', 'Intern', 'Probation'] },
      { name: 'shift_timing', label: 'Shift Timing', type: 'text', placeholder: 'e.g., 9:00 AM - 6:00 PM' },
      { name: 'reporting_manager', label: 'Reporting Manager', type: 'text' }
    ],
    emergency: [
      { name: 'emergency_contact', label: 'Emergency Contact Number', type: 'tel' }
    ],
    documents: [
      { name: 'aadhar_number', label: 'Aadhar Number', type: 'text' },
      { name: 'pan_number', label: 'PAN Number', type: 'text' }
    ],
    salary: [
      { name: 'gross_salary', label: 'Gross Salary', type: 'number' },
      { name: 'in_hand_salary', label: 'In-hand Salary', type: 'number' }
    ]
  };

  useEffect(() => {
    if (requestId) {
      fetchRequestDetails();
      fetchCurrentData();
    }
  }, [requestId]);

  const fetchRequestDetails = async () => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.EMPLOYEE_UPDATES}/request/${requestId}`);
      setRequestDetails(response.data);
    } catch (error) {
      console.error('Error fetching request details:', error);
    }
  };

  const fetchCurrentData = async () => {
    try {
      setLoading(true);
      console.log('📡 Fetching current employee data...');
      const response = await axios.get(API_ENDPOINTS.EMPLOYEE_UPDATES_CURRENT_DATA);
      console.log('✅ Current data:', response.data);
      setFormData(response.data);
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      setError('Failed to load your data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');
    
    try {
      console.log('📤 Submitting update for request:', requestId);
      
      // Only send the fields that were requested
      const updatedData = {};
      if (requestDetails?.requested_fields) {
        requestDetails.requested_fields.forEach(category => {
          const fields = fieldGroups[category] || [];
          fields.forEach(field => {
            if (formData[field.name] !== undefined) {
              updatedData[field.name] = formData[field.name];
            }
          });
        });
      }

      const response = await axios.post(API_ENDPOINTS.EMPLOYEE_UPDATES_SUBMIT, {
        requestId,
        updatedData
      });
      
      console.log('✅ Update submitted successfully:', response.data);
      setMessage('Update submitted for admin approval!');
      
      setTimeout(() => navigate('/employee/update-requests'), 2000);
    } catch (error) {
      console.error('❌ Error submitting:', error);
      setError(error.response?.data?.message || 'Failed to submit update. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const value = formData[field.name] || '';
    
    switch (field.type) {
      case 'textarea':
        return (
          <Form.Control
            as="textarea"
            rows={3}
            name={field.name}
            value={value}
            onChange={handleChange}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );
      
      case 'select':
        return (
          <Form.Select
            name={field.name}
            value={value}
            onChange={handleChange}
            required={field.required}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </Form.Select>
        );
      
      default:
        return (
          <Form.Control
            type={field.type}
            name={field.name}
            value={value}
            onChange={handleChange}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="p-4" style={{ backgroundColor: '#f8f9fc', minHeight: '100vh' }}>
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-primary text-white py-3 d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Update Your Information</h5>
            <small>Request #{requestId}</small>
          </div>
          <Button 
            variant="light" 
            size="sm"
            onClick={() => navigate('/employee/update-requests')}
          >
            <FaArrowLeft className="me-2" size={12} />
            Back to Requests
          </Button>
        </Card.Header>
        <Card.Body className="p-4">
          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}
          
          {requestDetails?.requested_fields?.length > 0 ? (
            <Form onSubmit={handleSubmit}>
              {requestDetails.requested_fields.map(category => (
                <Card key={category} className="mb-4 border-0 bg-light">
                  <Card.Header className="bg-white py-2">
                    <h6 className="mb-0">
                      {fieldIcons[category]?.icon} {fieldIcons[category]?.label || category}
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      {fieldGroups[category]?.map(field => (
                        <Col key={field.name} md={6} className="mb-3">
                          <Form.Group>
                            <Form.Label className="small fw-semibold">
                              {field.label}
                              {field.required && <span className="text-danger ms-1">*</span>}
                            </Form.Label>
                            {renderField(field)}
                          </Form.Group>
                        </Col>
                      ))}
                    </Row>
                  </Card.Body>
                </Card>
              ))}

              <div className="d-flex justify-content-end gap-2 mt-4">
                <Button 
                  variant="secondary" 
                  onClick={() => navigate('/employee/update-requests')}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FaSave className="me-2" size={12} />
                      Submit for Approval
                    </>
                  )}
                </Button>
              </div>
            </Form>
          ) : (
            <Alert variant="warning">
              No fields specified for update. Please contact admin.
            </Alert>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default EmployeeUpdateForm;