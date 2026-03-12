// src/components/Employee/EmployeeUpdateRequests.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  FaSave, 
  FaArrowLeft, 
  FaEdit, 
  FaCheckCircle, 
  FaUpload, 
  FaFileAlt 
} from 'react-icons/fa';
import { 
  Button, 
  Col, 
  Form, 
  ProgressBar, 
  Spinner 
} from 'react-bootstrap';

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

  // Field definitions with categories
  const fieldDefinitions = {
    personal: {
      label: 'Personal Information',
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
      fields: [
        { name: 'email', label: 'Email Address', type: 'email', required: true },
        { name: 'phone', label: 'Phone Number', type: 'tel' }
      ]
    },
    address: {
      label: 'Address',
      fields: [
        { name: 'address', label: 'Address', type: 'textarea' },
        { name: 'city', label: 'City', type: 'text' },
        { name: 'state', label: 'State', type: 'text' },
        { name: 'pincode', label: 'Pincode', type: 'text' }
      ]
    },
    bank: {
      label: 'Bank Details',
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
      fields: [
        { name: 'emergency_contact', label: 'Emergency Contact Number', type: 'tel' }
      ]
    },
    documents: {
      label: 'Documents',
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
      fields: [
        { name: 'gross_salary', label: 'Gross Salary', type: 'number' },
        { name: 'in_hand_salary', label: 'In Hand Salary', type: 'number' }
      ]
    }
  };

  // Document types mapping for file uploads
  const documentTypes = [
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
      
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/employee-updates/pending-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
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
      setError('Failed to load requests. Please try again.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentEmployeeData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/employees/profile/${user?.employeeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
      console.log('📤 Employee ID:', user?.employeeId);
      
      const token = localStorage.getItem('token');
      console.log('📤 Using token:', token ? 'Token exists' : 'No token');
      
      const url = `http://localhost:5000/api/employee-updates/accept-request/${request.id}`;
      console.log('📤 Calling URL:', url);
      
      const response = await axios.post(
        url,
        {},
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      console.log('✅ Accept response:', response.data);
      
      setSelectedRequest(request);
      
      // Check if this is a document-only request
      const isDocumentRequest = checkIfDocumentRequest(request);
      
      if (!isDocumentRequest) {
        // Only fetch current data if it's not a document request
        await fetchCurrentEmployeeData();
      }
      
    } catch (error) {
      console.error('❌ Error accepting request:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
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
      const documentFieldNames = documentTypes.map(dt => dt.value);
      const allFieldsAreDocuments = request.requested_field_names.every(field => 
        documentFieldNames.includes(field)
      );
      if (allFieldsAreDocuments && request.requested_field_names.length > 0) {
        return true;
      }
    }
    
    return false;
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
      allowedDocumentTypes = documentTypes.map(dt => dt.value);
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
        
        const url = `http://localhost:5000/api/employees/${user?.employeeId}/documents`;
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
      
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/employee-updates/submit-update',
        {
          requestId: selectedRequest.id,
          updatedData: { document_updated: true } // Just a flag to indicate documents were updated
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setSuccess('Documents uploaded successfully! Waiting for admin approval.');
      
      // Refresh requests after 2 seconds
      setTimeout(() => {
        setSelectedRequest(null);
        fetchPendingRequests();
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting update:', error);
      setError('Failed to submit update');
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

      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/employee-updates/submit-update',
        {
          requestId: selectedRequest.id,
          updatedData: updateData
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setSuccess('Update submitted successfully! Waiting for admin approval.');
      
      // Refresh requests after 2 seconds
      setTimeout(() => {
        setSelectedRequest(null);
        fetchPendingRequests();
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting update:', error);
      setError('Failed to submit update');
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

  // Loading state
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading update requests...</p>
        </div>
      </div>
    );
  }

  // Selected request view
  if (selectedRequest) {
    const isDocumentRequest = checkIfDocumentRequest(selectedRequest);
    
    return (
      <div className="container py-4">
        <button
          className="btn btn-link mb-3"
          onClick={() => setSelectedRequest(null)}
        >
          <FaArrowLeft /> Back to Requests
        </button>

        <div className="card">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">Update Request #{selectedRequest.id}</h5>
            <small>
              {isDocumentRequest ? 'Document Upload Required' : `Fields to update: ${selectedRequest.requested_fields?.join(', ')}`}
            </small>
          </div>
          
          <div className="card-body">
            {success && (
              <div className="alert alert-success">{success}</div>
            )}
            {error && (
              <div className="alert alert-danger">{error}</div>
            )}

            {isDocumentRequest ? (
              // Document Upload UI
              <div>
                <h6 className="mb-3">Upload Required Documents</h6>
                <p className="text-muted small mb-4">
                  Please upload the following documents as requested by admin:
                </p>

                {selectedFiles.map((_, index) => (
                  <div key={index} className="row g-2 mb-2 align-items-center">
                    <div className="col-md-8">
                      <Form.Control
                        type="file"
                        onChange={(e) => handleFileSelect(index, e.target.files[0])}
                        size="sm"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        disabled={uploading}
                      />
                    </div>
                    <div className="col-md-4">
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeUploadRow(index)}
                        disabled={uploading || selectedFiles.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
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

                <div className="mt-4 text-end">
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
                        <FaUpload className="me-2" />
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
                    <div key={category} className="mb-4">
                      <h6 className="border-bottom pb-2">{definition.label}</h6>
                      <div className="row">
                        {definition.fields.map(field => {
                          if (!shouldShowField(category, field.name)) return null;

                          return (
                            <div key={field.name} className="col-md-6 mb-3">
                              <label className="form-label">
                                {field.label} {field.required && <span className="text-danger">*</span>}
                              </label>
                              
                              {field.type === 'select' ? (
                                <select
                                  className="form-control"
                                  name={field.name}
                                  value={formData[field.name] || ''}
                                  onChange={handleInputChange}
                                  required={field.required}
                                >
                                  <option value="">Select {field.label}</option>
                                  {field.options?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : field.type === 'textarea' ? (
                                <textarea
                                  className="form-control"
                                  name={field.name}
                                  value={formData[field.name] || ''}
                                  onChange={handleInputChange}
                                  rows="3"
                                />
                              ) : (
                                <input
                                  type={field.type}
                                  className="form-control"
                                  name={field.name}
                                  value={formData[field.name] || ''}
                                  onChange={handleInputChange}
                                  required={field.required}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="text-end">
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={submitting}
                  >
                    <FaSave /> {submitting ? 'Submitting...' : 'Submit Update for Approval'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main list view
  return (
    <div className="container py-4">
      <h4 className="mb-4">Update Requests</h4>

      {error && (
        <div className="alert alert-info">{error}</div>
      )}

      {requests.length > 0 ? (
        <div className="row">
          {requests.map(request => {
            const isDocumentRequest = checkIfDocumentRequest(request);
            
            return (
              <div key={request.id} className="col-md-6 mb-3">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">
                      Update Request #{request.id}
                      <span className={`badge bg-${request.status === 'pending' ? 'warning' : 'info'} ms-2`}>
                        {request.status}
                      </span>
                    </h5>
                    <p className="card-text">
                      <strong>Type:</strong>{' '}
                      {isDocumentRequest ? (
                        <span className="badge bg-primary">Document Upload Required</span>
                      ) : (
                        <span className="badge bg-secondary">Information Update</span>
                      )}
                    </p>
                    <p className="card-text">
                      <strong>Fields to Update:</strong><br />
                      {request.requested_fields?.map(field => (
                        <span key={field} className="badge bg-secondary me-1 p-2">
                          {field === 'documents' ? '📄 Documents' : field}
                        </span>
                      ))}
                    </p>
                    <p className="card-text">
                      <strong>Requested on:</strong> {new Date(request.created_at).toLocaleDateString()}
                    </p>
                    {request.notes && (
                      <p className="card-text">
                        <strong>Notes:</strong> {request.notes}
                      </p>
                    )}
                    <button
                      className="btn btn-primary"
                      onClick={() => handleAcceptRequest(request)}
                      disabled={submitting}
                    >
                      {isDocumentRequest ? (
                        <><FaUpload /> Upload Documents</>
                      ) : (
                        <><FaEdit /> Review & Update</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !error && (
          <div className="text-center py-5">
            <div className="mb-3">
              <FaCheckCircle size={50} className="text-muted" />
            </div>
            <h5>No Pending Update Requests</h5>
            <p className="text-muted">
              You don't have any pending update requests from admin at the moment.
            </p>
          </div>
        )
      )}
    </div>
  );
};

export default EmployeeUpdateRequests;