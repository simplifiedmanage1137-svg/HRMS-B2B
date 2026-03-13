// src/components/Employee/EmployeeUpdateRequests.jsx
import React, { useState, useEffect } from 'react';
import { 
  Card, Button, Form, Alert, Spinner, ProgressBar,
  Row, Col, Badge
} from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import axios from '../../config/axios';
import API_ENDPOINTS from '../../config/api';
import { 
  FaSave, 
  FaArrowLeft, 
  FaEdit, 
  FaCheckCircle, 
  FaUpload, 
  FaFileAlt,
  FaTimesCircle,
  FaInfoCircle,
  FaHourglassHalf,
  FaCloudUploadAlt
} from 'react-icons/fa';

const EmployeeUpdateRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({});
  
  // Document upload states
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documentTypes, setDocumentTypes] = useState([]);

  // Field definitions with categories
  const fieldDefinitions = {
    personal: {
      label: 'Personal Information',
      icon: '👤',
      fields: [
        { name: 'first_name', label: 'First Name', type: 'text', required: true },
        { name: 'middle_name', label: 'Middle Name', type: 'text' },
        { name: 'last_name', label: 'Last Name', type: 'text', required: true },
        { name: 'dob', label: 'Date of Birth', type: 'date' },
        { name: 'blood_group', label: 'Blood Group', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] }
      ]
    },
    contact: {
      label: 'Contact Details',
      icon: '📞',
      fields: [
        { name: 'email', label: 'Email Address', type: 'email', required: true },
        { name: 'phone', label: 'Phone Number', type: 'tel' }
      ]
    },
    address: {
      label: 'Address',
      icon: '🏠',
      fields: [
        { name: 'address', label: 'Address', type: 'textarea' },
        { name: 'city', label: 'City', type: 'text' },
        { name: 'state', label: 'State', type: 'text' },
        { name: 'pincode', label: 'Pincode', type: 'text' }
      ]
    },
    bank: {
      label: 'Bank Details',
      icon: '🏦',
      fields: [
        { name: 'bank_account_name', label: 'Account Holder Name', type: 'text' },
        { name: 'account_number', label: 'Account Number', type: 'text' },
        { name: 'ifsc_code', label: 'IFSC Code', type: 'text' },
        { name: 'branch_name', label: 'Branch Name', type: 'text' },
        { name: 'pan_number', label: 'PAN Number', type: 'text' }
      ]
    },
    employment: {
      label: 'Employment Details',
      icon: '💼',
      fields: [
        { name: 'designation', label: 'Designation', type: 'text' },
        { name: 'department', label: 'Department', type: 'text' },
        { name: 'employment_type', label: 'Employment Type', type: 'select', options: ['Full Time', 'Part Time', 'Contract', 'Intern', 'Probation'] },
        { name: 'shift_timing', label: 'Shift Timing', type: 'text' },
        { name: 'reporting_manager', label: 'Reporting Manager', type: 'text' }
      ]
    },
    emergency: {
      label: 'Emergency Contact',
      icon: '🚨',
      fields: [
        { name: 'emergency_contact', label: 'Emergency Contact Number', type: 'tel' }
      ]
    },
    documents: {
      label: 'Documents',
      icon: '📄',
      fields: [
        { name: 'aadhar_card', label: 'Aadhar Card', type: 'file', documentType: true },
        { name: 'pan_card', label: 'PAN Card', type: 'file', documentType: true },
        { name: 'appointment_letter', label: 'Appointment Letter', type: 'file', documentType: true },
        { name: 'offer_letter', label: 'Offer Letter', type: 'file', documentType: true },
        { name: 'contract_document', label: 'Contract Document', type: 'file', documentType: true },
        { name: 'resume', label: 'Resume', type: 'file', documentType: true },
        { name: 'salary_slip', label: 'Salary Slip', type: 'file', documentType: true },
        { name: 'bank_proof', label: 'Bank Proof', type: 'file', documentType: true },
        { name: 'education_certificates', label: 'Education Certificates', type: 'file', documentType: true },
        { name: 'experience_certificates', label: 'Experience Certificates', type: 'file', documentType: true }
      ]
    },
    salary: {
      label: 'Salary Information',
      icon: '💰',
      fields: [
        { name: 'gross_salary', label: 'Gross Salary', type: 'number' },
        { name: 'in_hand_salary', label: 'In Hand Salary', type: 'number' }
      ]
    }
  };

  // Document types mapping for file uploads
  const documentTypeOptions = [
    { value: 'appointment_letter', label: 'Appointment Letter' },
    { value: 'offer_letter', label: 'Offer Letter' },
    { value: 'contract_document', label: 'Contract Document' },
    { value: 'aadhar_card', label: 'Aadhar Card' },
    { value: 'pan_card', label: 'PAN Card' },
    { value: 'resume', label: 'Resume' },
    { value: 'salary_slip', label: 'Salary Slip' },
    { value: 'bank_proof', label: 'Bank Proof' },
    { value: 'education_certificates', label: 'Education Certificates' },
    { value: 'experience_certificates', label: 'Experience Certificates' },
    { value: 'profile_image', label: 'Profile Image' }
  ];

  useEffect(() => {
    console.log('👤 User from context:', user);
    if (user?.employeeId) {
      fetchPendingRequests();
    } else {
      console.log('⏳ Waiting for user to load...');
      const timer = setTimeout(() => {
        if (!user) {
          setLoading(false);
          setError('User not loaded. Please refresh the page.');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📤 Fetching pending requests for employee:', user?.employeeId);
      
      const response = await axios.get(API_ENDPOINTS.EMPLOYEE_UPDATES_PENDING);
      
      console.log('✅ API Response:', response.data);
      
      // Handle different response formats
      let requestsData = [];
      if (Array.isArray(response.data)) {
        requestsData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        requestsData = response.data.data;
      } else if (response.data?.requests && Array.isArray(response.data.requests)) {
        requestsData = response.data.requests;
      } else {
        requestsData = [];
      }
      
      // Parse JSON fields
      const formattedRequests = requestsData.map(req => ({
        ...req,
        requested_fields: req.requested_fields ? 
          (typeof req.requested_fields === 'string' ? JSON.parse(req.requested_fields) : req.requested_fields) : [],
        requested_field_names: req.requested_field_names ? 
          (typeof req.requested_field_names === 'string' ? JSON.parse(req.requested_field_names) : req.requested_field_names) : [],
        employee_data: req.employee_data ? 
          (typeof req.employee_data === 'string' ? JSON.parse(req.employee_data) : req.employee_data) : null
      }));
      
      console.log('📊 Formatted requests:', formattedRequests);
      setRequests(formattedRequests);
      
    } catch (err) {
      console.error('❌ Error fetching requests:', err);
      setError(err.response?.data?.message || 'Failed to load requests. Please try again.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentEmployeeData = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.EMPLOYEE_PROFILE(user?.employeeId));
      console.log('✅ Current employee data:', response.data);
      setFormData(response.data);
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };

  const handleAcceptRequest = async (request) => {
    try {
      setSubmitting(true);
      setError('');
      
      console.log('📤 Accepting request:', request);
      console.log('📤 Request ID:', request.id);
      
      const response = await axios.post(API_ENDPOINTS.EMPLOYEE_UPDATES_ACCEPT(request.id));
      
      console.log('✅ Accept response:', response.data);
      
      setSelectedRequest(request);
      
      // Determine which document types are allowed
      if (checkIfDocumentRequest(request)) {
        const allowedDocs = getAllowedDocumentTypes(request);
        setDocumentTypes(allowedDocs);
      }
      
      // Check if this is a document-only request
      const isDocumentRequest = checkIfDocumentRequest(request);
      
      if (!isDocumentRequest) {
        // Only fetch current data if it's not a document request
        await fetchCurrentEmployeeData();
      }
      
    } catch (error) {
      console.error('❌ Error accepting request:', error);
      
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to accept request. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Check if the request is only for documents
  const checkIfDocumentRequest = (request) => {
    // Check by requested_fields (categories)
    if (request.requested_fields?.includes('documents') && request.requested_fields?.length === 1) {
      return true;
    }
    
    // Check by requested_field_names (specific fields)
    if (request.requested_field_names) {
      const documentFieldNames = documentTypeOptions.map(dt => dt.value);
      const allFieldsAreDocuments = request.requested_field_names.every(field => 
        documentFieldNames.includes(field)
      );
      if (allFieldsAreDocuments && request.requested_field_names.length > 0) {
        return true;
      }
    }
    
    return false;
  };

  // Get allowed document types based on request
  const getAllowedDocumentTypes = (request) => {
    if (request.requested_fields?.includes('documents')) {
      // If 'documents' category is selected, allow all document types
      return documentTypeOptions;
    } else if (request.requested_field_names) {
      // If specific fields are selected, only allow those
      return documentTypeOptions.filter(dt => 
        request.requested_field_names.includes(dt.value)
      );
    }
    return [];
  };

  // Handle file selection for document upload
  const handleFileSelect = (index, file) => {
    const newFiles = [...selectedFiles];
    newFiles[index] = file;
    setSelectedFiles(newFiles);
  };

  const addUploadRow = () => {
    setSelectedFiles([...selectedFiles, null]);
  };

  const removeUploadRow = (index) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
  };

  const uploadDocuments = async () => {
    const validUploads = selectedFiles.filter(file => file !== null);
    
    if (validUploads.length === 0) {
      alert('Please select files to upload');
      return;
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    // Determine which document types are allowed based on the request
    let allowedDocumentTypes = [];
    if (selectedRequest.requested_fields?.includes('documents')) {
      // If 'documents' category is selected, allow all document types
      allowedDocumentTypes = documentTypeOptions.map(dt => dt.value);
    } else if (selectedRequest.requested_field_names) {
      // If specific fields are selected, only allow those
      allowedDocumentTypes = selectedRequest.requested_field_names;
    }

    for (let i = 0; i < validUploads.length; i++) {
      const file = validUploads[i];
      
      // Determine document type from filename or ask user
      // For simplicity, we'll use the index to map to a document type
      const documentType = allowedDocumentTypes[i] || allowedDocumentTypes[0] || 'document';
      
      const formDataObj = new FormData();
      formDataObj.append(documentType, file);

      try {
        setUploadProgress(Math.round(((i + 1) / validUploads.length) * 100));
        
        const url = API_ENDPOINTS.EMPLOYEE_DOCUMENTS(user?.employeeId);
        console.log(`📤 Uploading document type: ${documentType}, File:`, file.name);
        
        await axios.post(url, formDataObj, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        successCount++;
      } catch (error) {
        console.error(`❌ Error uploading document:`, error);
        failCount++;
      }
    }

    if (successCount > 0) {
      alert(`${successCount} document(s) uploaded successfully!`);
    }
    if (failCount > 0) {
      alert(`${failCount} document(s) failed to upload`);
    }

    setUploading(false);
    setSelectedFiles([]);
    setUploadProgress(0);
    
    // Mark request as completed
    await submitDocumentUpdate();
  };

  const submitDocumentUpdate = async () => {
    try {
      setSubmitting(true);
      
      await axios.post(
        API_ENDPOINTS.EMPLOYEE_UPDATES_SUBMIT,
        {
          requestId: selectedRequest.id,
          updatedData: { document_updated: true } // Just a flag to indicate documents were updated
        }
      );

      setSuccess('Documents uploaded successfully! Waiting for admin approval.');
      
      // Refresh requests after 2 seconds
      setTimeout(() => {
        setSelectedRequest(null);
        fetchPendingRequests();
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting update:', error);
      setError(error.response?.data?.message || 'Failed to submit update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Prepare data - only send fields that were requested
      const updateData = {};
      
      // If we have requested_field_names, use those
      if (selectedRequest.requested_field_names?.length > 0) {
        selectedRequest.requested_field_names.forEach(fieldName => {
          if (formData[fieldName] !== undefined) {
            updateData[fieldName] = formData[fieldName];
          }
        });
      } 
      // Otherwise use requested_fields (categories)
      else if (selectedRequest.requested_fields?.length > 0) {
        selectedRequest.requested_fields.forEach(category => {
          // Skip documents category here - it's handled separately
          if (category === 'documents') return;
          
          const categoryFields = fieldDefinitions[category]?.fields || [];
          categoryFields.forEach(field => {
            if (formData[field.name] !== undefined) {
              updateData[field.name] = formData[field.name];
            }
          });
        });
      }

      console.log('📤 Submitting update data:', updateData);

      await axios.post(
        API_ENDPOINTS.EMPLOYEE_UPDATES_SUBMIT,
        {
          requestId: selectedRequest.id,
          updatedData: updateData
        }
      );

      setSuccess('Update submitted successfully! Waiting for admin approval.');
      
      // Refresh requests after 2 seconds
      setTimeout(() => {
        setSelectedRequest(null);
        fetchPendingRequests();
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting update:', error);
      setError(error.response?.data?.message || 'Failed to submit update');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if a field should be shown
  const shouldShowField = (category, fieldName) => {
    if (!selectedRequest) return false;
    
    // Check by field names first
    if (selectedRequest.requested_field_names?.includes(fieldName)) {
      return true;
    }
    
    // Check by category
    if (selectedRequest.requested_fields?.includes(category)) {
      return true;
    }
    
    return false;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending':
        return <Badge bg="warning" pill><FaHourglassHalf className="me-1" /> Pending</Badge>;
      case 'accepted':
        return <Badge bg="info" pill><FaEdit className="me-1" /> In Progress</Badge>;
      case 'submitted':
        return <Badge bg="success" pill><FaCheckCircle className="me-1" /> Submitted</Badge>;
      case 'approved':
        return <Badge bg="success" pill><FaCheckCircle className="me-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge bg="danger" pill><FaTimesCircle className="me-1" /> Rejected</Badge>;
      default:
        return <Badge bg="secondary" pill>{status}</Badge>;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading update requests...</p>
        </div>
      </div>
    );
  }

  // Selected request view
  if (selectedRequest) {
    const isDocumentRequest = checkIfDocumentRequest(selectedRequest);
    
    return (
      <div className="p-4">
        <Button
          variant="link"
          className="mb-3 text-decoration-none"
          onClick={() => setSelectedRequest(null)}
        >
          <FaArrowLeft /> Back to Requests
        </Button>

        <Card className="border-0 shadow-sm">
          <Card.Header className={`py-3 text-white ${isDocumentRequest ? 'bg-info' : 'bg-primary'}`}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-1">Update Request #{selectedRequest.id}</h5>
                <small>
                  {isDocumentRequest ? 'Document Upload Required' : `Update your information as requested by admin`}
                </small>
              </div>
              <div>
                {getStatusBadge(selectedRequest.status)}
              </div>
            </div>
          </Card.Header>
          
          <Card.Body>
            {success && (
              <Alert variant="success" onClose={() => setSuccess('')} dismissible className="mb-4">
                <FaCheckCircle className="me-2" />
                {success}
              </Alert>
            )}
            
            {error && (
              <Alert variant="danger" onClose={() => setError('')} dismissible className="mb-4">
                <FaTimesCircle className="me-2" />
                {error}
              </Alert>
            )}

            {/* Request Info */}
            <Card className="bg-light border-0 mb-4">
              <Card.Body className="p-3">
                <h6 className="mb-2">Request Details</h6>
                <Row>
                  <Col md={4}>
                    <small className="text-muted">Requested On:</small>
                    <p className="fw-semibold mb-2">{formatDate(selectedRequest.created_at)}</p>
                  </Col>
                  <Col md={4}>
                    <small className="text-muted">Fields to Update:</small>
                    <div className="d-flex flex-wrap gap-1">
                      {selectedRequest.requested_fields?.map(field => (
                        <Badge key={field} bg="secondary" className="px-2 py-1">
                          {field === 'documents' ? '📄 Documents' : field}
                        </Badge>
                      ))}
                    </div>
                  </Col>
                  {selectedRequest.notes && (
                    <Col md={4}>
                      <small className="text-muted">Admin Notes:</small>
                      <p className="fst-italic mb-0">"{selectedRequest.notes}"</p>
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>

            {isDocumentRequest ? (
              // Document Upload UI
              <div>
                <h6 className="mb-3">Upload Required Documents</h6>
                
                {documentTypes.length > 0 && (
                  <div className="bg-light p-2 rounded mb-3">
                    <small className="text-muted d-block mb-1">Allowed document types:</small>
                    <div className="d-flex flex-wrap gap-1">
                      {documentTypes.map(doc => (
                        <Badge key={doc.value} bg="info" className="px-2 py-1">
                          {doc.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedFiles.map((_, index) => (
                  <Row key={index} className="g-2 mb-2 align-items-center">
                    <Col md={8}>
                      <Form.Control
                        type="file"
                        onChange={(e) => handleFileSelect(index, e.target.files[0])}
                        size="sm"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        disabled={uploading}
                      />
                    </Col>
                    <Col md={4}>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeUploadRow(index)}
                        disabled={uploading || selectedFiles.length === 1}
                      >
                        Remove
                      </Button>
                    </Col>
                  </Row>
                ))}

                <div className="mt-3">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={addUploadRow}
                    disabled={uploading}
                  >
                    Add Another File
                  </Button>
                </div>

                {uploading && (
                  <div className="mt-3">
                    <ProgressBar
                      now={uploadProgress}
                      label={`Uploading... ${uploadProgress}%`}
                      striped
                      animated
                      size="sm"
                    />
                  </div>
                )}

                <div className="mt-4 d-flex justify-content-end">
                  <Button
                    variant="success"
                    onClick={uploadDocuments}
                    disabled={uploading || selectedFiles.length === 0 || selectedFiles.every(f => !f)}
                  >
                    {uploading ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FaCloudUploadAlt className="me-2" />
                        Upload Documents
                      </>
                    )}
                  </Button>
                </div>

                <div className="mt-3 small text-muted bg-light p-2 rounded">
                  <FaFileAlt className="me-2 text-primary" size={12} />
                  <small>
                    <strong>Note:</strong> Supported formats: PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB each)
                  </small>
                </div>
              </div>
            ) : (
              // Regular Form Update UI
              <form onSubmit={handleSubmitUpdate}>
                {/* Show only selected categories */}
                {Object.entries(fieldDefinitions).map(([category, definition]) => {
                  // Skip documents category in regular form
                  if (category === 'documents') return null;
                  
                  // Check if this category has any fields to show
                  const hasFieldsToShow = definition.fields.some(field => 
                    shouldShowField(category, field.name)
                  );
                  
                  if (!hasFieldsToShow) return null;

                  return (
                    <Card key={category} className="border-0 bg-light mb-4">
                      <Card.Body className="p-3">
                        <h6 className="mb-3">
                          <span className="me-2">{definition.icon}</span>
                          {definition.label}
                        </h6>
                        <Row>
                          {definition.fields.map(field => {
                            if (!shouldShowField(category, field.name)) return null;

                            return (
                              <Col md={6} key={field.name} className="mb-3">
                                <Form.Group>
                                  <Form.Label className="small fw-semibold">
                                    {field.label} {field.required && <span className="text-danger">*</span>}
                                  </Form.Label>
                                  
                                  {field.type === 'select' ? (
                                    <Form.Select
                                      name={field.name}
                                      value={formData[field.name] || ''}
                                      onChange={handleInputChange}
                                      size="sm"
                                      required={field.required}
                                    >
                                      <option value="">Select {field.label}</option>
                                      {field.options?.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </Form.Select>
                                  ) : field.type === 'textarea' ? (
                                    <Form.Control
                                      as="textarea"
                                      rows={3}
                                      name={field.name}
                                      value={formData[field.name] || ''}
                                      onChange={handleInputChange}
                                      size="sm"
                                    />
                                  ) : (
                                    <Form.Control
                                      type={field.type}
                                      name={field.name}
                                      value={formData[field.name] || ''}
                                      onChange={handleInputChange}
                                      size="sm"
                                      required={field.required}
                                    />
                                  )}
                                </Form.Group>
                              </Col>
                            );
                          })}
                        </Row>
                      </Card.Body>
                    </Card>
                  );
                })}

                <div className="d-flex justify-content-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedRequest(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="success"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FaSave className="me-2" />
                        Submit Update for Approval
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </Card.Body>
        </Card>
      </div>
    );
  }

  // Main list view
  return (
    <div className="p-4">
      <h4 className="mb-4">
        <FaEdit className="me-2 text-primary" />
        Update Requests
      </h4>

      {error && (
        <Alert variant="info" onClose={() => setError('')} dismissible className="mb-4">
          <FaInfoCircle className="me-2" />
          {error}
        </Alert>
      )}

      {requests.length > 0 ? (
        <Row>
          {requests.map(request => {
            const isDocumentRequest = checkIfDocumentRequest(request);
            
            return (
              <Col md={6} lg={4} key={request.id} className="mb-3">
                <Card className="border-0 shadow-sm h-100">
                  <Card.Header className={`py-2 text-white ${isDocumentRequest ? 'bg-info' : 'bg-primary'}`}>
                    <small className="fw-semibold">Request #{request.id}</small>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <Badge 
                        bg={isDocumentRequest ? 'info' : 'secondary'} 
                        className="px-2 py-1"
                      >
                        {isDocumentRequest ? '📄 Document Upload' : 'ℹ️ Information Update'}
                      </Badge>
                      {getStatusBadge(request.status)}
                    </div>
                    
                    <div className="mb-3">
                      <small className="text-muted d-block mb-1">Fields to Update:</small>
                      <div className="d-flex flex-wrap gap-1">
                        {request.requested_fields?.map(field => (
                          <Badge key={field} bg="light" text="dark" className="px-2 py-1">
                            {field === 'documents' ? '📄 Documents' : field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <small className="text-muted d-block mb-2">
                      Requested on: {formatDate(request.created_at)}
                    </small>
                    
                    {request.notes && (
                      <div className="bg-light p-2 rounded small mb-3">
                        <FaInfoCircle className="text-muted me-1" size={10} />
                        {request.notes}
                      </div>
                    )}
                    
                    <Button
                      variant={isDocumentRequest ? 'info' : 'primary'}
                      size="sm"
                      className="w-100"
                      onClick={() => handleAcceptRequest(request)}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <Spinner size="sm" animation="border" className="me-2" />
                      ) : isDocumentRequest ? (
                        <><FaUpload className="me-2" /> Upload Documents</>
                      ) : (
                        <><FaEdit className="me-2" /> Review & Update</>
                      )}
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : (
        !error && (
          <Card className="border-0 shadow-sm text-center py-5">
            <Card.Body>
              <div className="mb-3">
                <FaCheckCircle size={50} className="text-success opacity-50" />
              </div>
              <h5>No Pending Update Requests</h5>
              <p className="text-muted mb-0">
                You don't have any pending update requests from admin at the moment.
              </p>
            </Card.Body>
          </Card>
        )
      )}
    </div>
  );
};

export default EmployeeUpdateRequests;