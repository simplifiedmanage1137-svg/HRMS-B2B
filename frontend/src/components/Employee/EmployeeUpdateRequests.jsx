// src/components/Employee/EmployeeUpdateRequests.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { FaEdit, FaArrowLeft, FaSave, FaTimes, FaUser, FaEnvelope, FaPhone, FaMapMarker, FaBriefcase, FaUniversity, FaCreditCard, FaIdCard, FaCalendar, FaHeart, FaUserTie } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const EmployeeUpdateRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (user?.employeeId) {
      fetchPendingRequests();
    } else if (user === null) {
      const timer = setTimeout(() => {
        if (!user) {
          setLoading(false);
          setError('User not loaded. Please refresh the page.');
        }
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setLoading(false);
      setError('No employee ID found. Please login again.');
    }
  }, [user, retryCount]);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const axiosInstance = axios.create({
        timeout: 30000,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const response = await axiosInstance.get('http://localhost:5000/api/employee-updates/pending-requests');
      
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
      
      setRequests(requestsData);
      
    } catch (err) {
      console.error('Error fetching requests:', err);
      
      if (err.code === 'ECONNABORTED') {
        setError('Request timeout. Server is taking too long to respond.');
      } else if (err.response) {
        setError(err.response.data?.message || `Server error: ${err.response.status}`);
      } else if (err.request) {
        setError('Cannot connect to server. Please check if backend is running.');
      } else {
        setError(err.message || 'Failed to load requests');
      }
      
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentEmployeeData = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/employees/profile/${user?.employeeId}`);
      setOriginalData(response.data);
      setFormData(response.data);
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };

// EmployeeUpdateRequests.jsx mein handleAcceptRequest function
const handleAcceptRequest = async (requestId) => {
    try {
        setSubmitting(true);
        setError('');
        
        console.log('Accepting request:', requestId);
        
        const response = await axios.post(
            `http://localhost:5000/api/employee-updates/accept-request/${requestId}`
        );
        
        console.log('✅ Accept response:', response.data);
        
        // Find and set the selected request
        const request = requests.find(r => r.id === requestId);
        setSelectedRequest(request);
        
        // Fetch current employee data
        await fetchCurrentEmployeeData();
        
        // Refresh requests list
        await fetchPendingRequests();
        
    } catch (error) {
        console.error('❌ Error accepting request:', error);
        console.error('❌ Error response:', error.response?.data);
        
        let errorMessage = 'Failed to accept request';
        
        if (error.response) {
            if (error.response.status === 404) {
                errorMessage = 'Request not found';
            } else if (error.response.status === 400) {
                errorMessage = error.response.data?.message || 'Request cannot be accepted';
            } else if (error.response.status === 401) {
                errorMessage = 'Please login again';
            } else if (error.response.status === 403) {
                errorMessage = 'You do not have permission';
            }
        } else if (error.request) {
            errorMessage = 'Cannot connect to server';
        }
        
        setError(errorMessage);
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
      await axios.post('http://localhost:5000/api/employee-updates/submit-update', {
        requestId: selectedRequest.id,
        updatedData: formData
      });

      setSuccess('Update submitted successfully! Waiting for admin approval.');
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

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError('');
    setLoading(true);
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        padding: '20px'
      }}>
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p style={{ marginTop: '20px', color: '#666' }}>
          Loading update requests...
        </p>
      </div>
    );
  }

  // Error state with retry
  if (error && !selectedRequest) {
    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          padding: '30px',
          textAlign: 'center'
        }}>
          <h4 style={{ marginTop: 0, color: '#721c24' }}>Error</h4>
          <p style={{ marginBottom: '20px' }}>{error}</p>
          <button
            onClick={handleRetry}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '10px 30px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No requests state
  if (requests.length === 0 && !selectedRequest) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3>Update Requests</h3>
        <div style={{
          backgroundColor: '#e2e3e5',
          padding: '40px',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <p style={{ fontSize: '16px', color: '#383d41', marginBottom: '20px' }}>
            No pending update requests from admin
          </p>
          <button
            onClick={() => navigate('/profile')}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  // Show selected request form with ALL FIELDS
  if (selectedRequest) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <button
          onClick={() => setSelectedRequest(null)}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#007bff',
            cursor: 'pointer',
            marginBottom: '20px',
            fontSize: '16px'
          }}
        >
          <FaArrowLeft /> Back to Requests
        </button>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Update Request #{selectedRequest.id}</h3>
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeeba',
            borderRadius: '4px',
            padding: '10px',
            marginBottom: '20px'
          }}>
            <strong>Fields to update:</strong> {selectedRequest.requested_fields?.join(', ')}
          </div>

          {success && (
            <div style={{
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '4px',
              padding: '10px',
              marginBottom: '20px',
              color: '#155724'
            }}>
              {success}
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              padding: '10px',
              marginBottom: '20px',
              color: '#721c24'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmitUpdate}>
            {/* Personal Information Section */}
            <h4 style={{ 
              borderBottom: '2px solid #d53f8c', 
              paddingBottom: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <FaUser style={{ color: '#d53f8c' }} /> Personal Information
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  First Name <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Last Name <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob ? formData.dob.split('T')[0] : ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Blood Group
                </label>
                <select
                  name="blood_group"
                  value={formData.blood_group || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            {/* Contact Information */}
            <h4 style={{ 
              borderBottom: '2px solid #d53f8c', 
              paddingBottom: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <FaEnvelope style={{ color: '#d53f8c' }} /> Contact Information
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Email <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Phone <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>
            </div>

            {/* Address Section */}
            <h4 style={{ 
              borderBottom: '2px solid #d53f8c', 
              paddingBottom: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <FaMapMarker style={{ color: '#d53f8c' }} /> Address
            </h4>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Address
              </label>
              <textarea
                name="address"
                value={formData.address || ''}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minHeight: '80px'
                }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '30px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Pincode
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Employment Details */}
            <h4 style={{ 
              borderBottom: '2px solid #d53f8c', 
              paddingBottom: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <FaBriefcase style={{ color: '#d53f8c' }} /> Employment Details
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Designation
                </label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Department
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Employment Type
                </label>
                <select
                  name="employment_type"
                  value={formData.employment_type || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select Type</option>
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Intern">Intern</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Shift Timing
                </label>
                <input
                  type="text"
                  name="shift_timing"
                  value={formData.shift_timing || ''}
                  onChange={handleInputChange}
                  placeholder="9:00 AM - 6:00 PM"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Reporting Manager
                </label>
                <input
                  type="text"
                  name="reporting_manager"
                  value={formData.reporting_manager || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Joining Date
                </label>
                <input
                  type="date"
                  name="joining_date"
                  value={formData.joining_date ? formData.joining_date.split('T')[0] : ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Bank Details */}
            <h4 style={{ 
              borderBottom: '2px solid #d53f8c', 
              paddingBottom: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <FaUniversity style={{ color: '#d53f8c' }} /> Bank Details
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Bank Name
                </label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.bank_name || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Account Number
                </label>
                <input
                  type="text"
                  name="account_number"
                  value={formData.account_number || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  IFSC Code
                </label>
                <input
                  type="text"
                  name="ifsc_code"
                  value={formData.ifsc_code || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  PAN Number
                </label>
                <input
                  type="text"
                  name="pan_number"
                  value={formData.pan_number || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Salary Information */}
            <h4 style={{ 
              borderBottom: '2px solid #d53f8c', 
              paddingBottom: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <FaCreditCard style={{ color: '#d53f8c' }} /> Salary Information
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Gross Salary
                </label>
                <input
                  type="number"
                  name="gross_salary"
                  value={formData.gross_salary || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  In Hand Salary
                </label>
                <input
                  type="number"
                  name="in_hand_salary"
                  value={formData.in_hand_salary || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <h4 style={{ 
              borderBottom: '2px solid #d53f8c', 
              paddingBottom: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <FaUserTie style={{ color: '#d53f8c' }} /> Emergency Contact
            </h4>
            
            <div style={{ marginBottom: '30px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Emergency Contact Number
                </label>
                <input
                  type="text"
                  name="emergency_contact"
                  value={formData.emergency_contact || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Documents (if needed) */}
            <h4 style={{ 
              borderBottom: '2px solid #d53f8c', 
              paddingBottom: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <FaIdCard style={{ color: '#d53f8c' }} /> Documents
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Aadhar Number
                </label>
                <input
                  type="text"
                  name="aadhar_number"
                  value={formData.aadhar_number || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Passport Number
                </label>
                <input
                  type="text"
                  name="passport_number"
                  value={formData.passport_number || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              justifyContent: 'flex-end',
              borderTop: '1px solid #ddd',
              paddingTop: '20px',
              marginTop: '20px'
            }}>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 30px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FaTimes /> Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 30px',
                  borderRadius: '4px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: submitting ? 0.7 : 1
                }}
              >
                <FaSave /> {submitting ? 'Submitting...' : 'Submit Update for Approval'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Show list of requests
  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginBottom: '20px' }}>Update Requests</h3>
      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
        {requests.map(request => (
          <div key={request.id} style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{ marginTop: 0, color: '#d53f8c' }}>Update Request #{request.id}</h4>
            <div style={{ marginBottom: '15px' }}>
              <span style={{
                backgroundColor: request.status === 'pending' ? '#ffc107' : '#17a2b8',
                color: 'white',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {request.status}
              </span>
            </div>
            <p><strong>Fields to Update:</strong></p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '15px' }}>
              {request.requested_fields?.map(field => (
                <span key={field} style={{
                  backgroundColor: '#e9ecef',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '12px'
                }}>
                  {field}
                </span>
              ))}
            </div>
            <p><strong>Requested on:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
            {request.notes && (
              <p><strong>Notes:</strong> {request.notes}</p>
            )}
            <button
              onClick={() => handleAcceptRequest(request.id)}
              disabled={submitting}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%',
                fontSize: '16px',
                marginTop: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <FaEdit /> Review & Update Information
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmployeeUpdateRequests;