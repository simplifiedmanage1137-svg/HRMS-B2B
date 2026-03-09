// SendUpdateRequest.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPaperPlane } from 'react-icons/fa';

const SendUpdateRequest = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedFields, setSelectedFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fieldOptions = [
    { value: 'personal', label: 'Personal Information' },
    { value: 'contact', label: 'Contact Details' },
    { value: 'bank', label: 'Bank Details' },
    { value: 'documents', label: 'Documents' },
    { value: 'address', label: 'Address' },
    { value: 'emergency', label: 'Emergency Contact' }
  ];

  useEffect(() => {
    fetchEmployees();
  }, []);

// SendUpdateRequest.jsx mein fetchEmployees function
const fetchEmployees = async () => {
  try {
    const response = await axios.get('http://localhost:5000/api/admin-updates/employees');
    if (Array.isArray(response.data)) {
      setEmployees(response.data);
      if (response.data.length === 0) {
        setMessage('No employees found in database');
      }
    } else {
      console.warn('Unexpected response format:', response.data);
      setEmployees([]);
    }
  } catch (error) {
    console.error('Error fetching employees:', error);
    setEmployees([]);
    setMessage('Could not load employees. Database connection issue.');
  }
};

  const handleFieldChange = (field) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedEmployee) {
      setMessage('Please select an employee');
      return;
    }

    if (selectedFields.length === 0) {
      setMessage('Please select at least one field to update');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await axios.post('http://localhost:5000/api/admin-updates/send-request', {
        employee_id: selectedEmployee,
        requested_fields: selectedFields
      });

      setMessage('Update request sent successfully!');
      setSelectedEmployee('');
      setSelectedFields([]);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error sending request');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="send-update-request">
      <h4 className="mb-4">Send Update Request to Employee</h4>

      {message && (
        <div className={`alert ${message.includes('success') ? 'alert-success' : 'alert-danger'}`}>
          {message}
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Select Employee</label>
              <select
                className="form-select"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                required
              >
                <option value="">Choose employee...</option>
                {employees.length > 0 ? (
                  employees.map(emp => (
                    <option key={emp.employee_id || emp.id} value={emp.employee_id}>
                      {emp.first_name} {emp.last_name} - {emp.designation} ({emp.employee_id})
                    </option>
                  ))
                ) : (
                  <option disabled>No employees found</option>
                )}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Select Fields to Update</label>
              <div className="row">
                {fieldOptions.map(field => (
                  <div key={field.value} className="col-md-4 mb-2">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={field.value}
                        checked={selectedFields.includes(field.value)}
                        onChange={() => handleFieldChange(field.value)}
                      />
                      <label className="form-check-label" htmlFor={field.value}>
                        {field.label}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-end">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || employees.length === 0}
              >
                <FaPaperPlane /> {loading ? 'Sending...' : 'Send Update Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SendUpdateRequest;