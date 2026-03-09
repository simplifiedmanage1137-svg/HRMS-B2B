// components/Employee/ApplyLeave.jsx
import React, { useState, useEffect } from 'react';
import { 
  Card, Form, Button, Row, Col, Alert, 
  Spinner, Badge, ProgressBar 
} from 'react-bootstrap';
import { 
  FaCalendarAlt, 
  FaPaperPlane, 
  FaTimes, 
  FaInfoCircle,
  FaUmbrellaBeach,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ApplyLeave = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState({
    available: 0,
    total_accrued: 0,
    used: 0,
    pending: 0,
    months_completed: 0,
    is_eligible: false
  });
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [employeeDetails, setEmployeeDetails] = useState({
    joining_date: '',
    reporting_manager: '',
    months_completed: 0
  });
  const [formData, setFormData] = useState({
    leave_type: 'Annual',
    leave_duration: 'Full Day',
    half_day_type: '',
    start_date: '',
    end_date: '',
    reason: '',
    reporting_manager: ''
  });
  const [calculatedDays, setCalculatedDays] = useState(1);
  const [errors, setErrors] = useState({});
  const [leaveTypes] = useState([
    'Annual',
    'Sick',
    'Personal',
    'Maternity',
    'Paternity',
    'Bereavement',
    'Unpaid',
    'Compensatory Off'
  ]);

  const [halfDayOptions] = useState([
    { value: 'first_half', label: 'First Half (9:00 AM - 1:00 PM)' },
    { value: 'second_half', label: 'Second Half (2:00 PM - 6:00 PM)' }
  ]);

  useEffect(() => {
    if (user?.employeeId) {
      fetchEmployeeDetails();
      fetchLeaveBalance();
      fetchRecentLeaves();
    }
  }, [user]);

  useEffect(() => {
    calculateDays();
  }, [formData.start_date, formData.end_date, formData.leave_duration]);

  const fetchEmployeeDetails = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/employees/profile/${user.employeeId}`);
      
      // Calculate months completed
      const joiningDate = new Date(response.data.joining_date);
      const today = new Date();
      const months = (today.getFullYear() - joiningDate.getFullYear()) * 12 + 
                     (today.getMonth() - joiningDate.getMonth());
      
      setEmployeeDetails({
        joining_date: response.data.joining_date,
        reporting_manager: response.data.reporting_manager || '',
        months_completed: months
      });
      
      if (response.data.reporting_manager) {
        setFormData(prev => ({
          ...prev,
          reporting_manager: response.data.reporting_manager
        }));
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/leaves/balance/${user.employeeId}`);
      
      // Calculate months from employee details if not in response
      let monthsCompleted = response.data.months_completed || 0;
      if (!monthsCompleted && employeeDetails.joining_date) {
        const joiningDate = new Date(employeeDetails.joining_date);
        const today = new Date();
        monthsCompleted = (today.getFullYear() - joiningDate.getFullYear()) * 12 + 
                         (today.getMonth() - joiningDate.getMonth());
      }
      
      const isEligible = monthsCompleted >= 6;
      
      setLeaveBalance({
        available: response.data.available || 0,
        total_accrued: response.data.total_accrued || 0,
        used: response.data.used || 0,
        pending: response.data.pending || 0,
        months_completed: monthsCompleted,
        is_eligible: isEligible
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      showNotification('Failed to load leave balance', 'danger');
      setLoading(false);
    }
  };

  const fetchRecentLeaves = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/leaves?employee_id=${user.employeeId}`);
      setRecentLeaves(response.data.slice(0, 3));
    } catch (error) {
      console.error('Error fetching recent leaves:', error);
    }
  };

  const calculateDays = () => {
    if (!formData.start_date) {
      setCalculatedDays(0);
      return;
    }

    if (formData.leave_duration === 'Half Day') {
      setCalculatedDays(0.5);
      return;
    }

    if (!formData.end_date) {
      setCalculatedDays(1);
      return;
    }

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    
    if (start > end) {
      setErrors(prev => ({
        ...prev,
        end_date: 'End date cannot be before start date'
      }));
      setCalculatedDays(0);
      return;
    }

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    setCalculatedDays(diffDays);
    setErrors(prev => ({ ...prev, end_date: '' }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Auto-set end date for half day
    if (name === 'leave_duration' && value === 'Half Day') {
      setFormData(prev => ({
        ...prev,
        end_date: prev.start_date || ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Check eligibility first
    if (!leaveBalance.is_eligible) {
      newErrors.eligibility = `You need to complete 6 months before applying for leave. Current: ${leaveBalance.months_completed} months completed.`;
      setErrors(newErrors);
      return false;
    }

    if (!formData.leave_type) {
      newErrors.leave_type = 'Please select leave type';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (formData.leave_duration === 'Half Day' && !formData.half_day_type) {
      newErrors.half_day_type = 'Please select which half';
    }

    if (formData.leave_duration === 'Full Day' && !formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = 'End date cannot be before start date';
    }

    if (!formData.reason) {
      newErrors.reason = 'Reason is required';
    } else if (formData.reason.length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters';
    }

    // Check leave balance
    if (calculatedDays > leaveBalance.available) {
      newErrors.balance = `Insufficient leave balance. Available: ${leaveBalance.available} days`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showNotification('Please fix the errors in the form', 'warning');
      return;
    }

    setSubmitting(true);

    try {
      const leaveData = {
        ...formData,
        employee_id: user.employeeId,
        days_count: calculatedDays,
        applied_date: new Date().toISOString().split('T')[0]
      };

      const response = await axios.post('http://localhost:5000/api/leaves/apply', leaveData, {
        headers: {
          'employee-id': user.employeeId
        }
      });

      if (response.data.success) {
        showNotification('Leave request submitted successfully!', 'success');
        
        // Reset form
        setFormData({
          leave_type: 'Annual',
          leave_duration: 'Full Day',
          half_day_type: '',
          start_date: '',
          end_date: '',
          reason: '',
          reporting_manager: employeeDetails.reporting_manager
        });
        
        // Refresh data
        await fetchLeaveBalance();
        await fetchRecentLeaves();
        
        // Navigate back after short delay
        setTimeout(() => {
          navigate('/employee/dashboard');
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting leave:', error);
      showNotification(
        error.response?.data?.message || 'Failed to submit leave request',
        'danger'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/employee/dashboard');
  };

  const getLeaveBalanceColor = () => {
    const percentage = (leaveBalance.used / leaveBalance.total_accrued) * 100;
    if (percentage >= 80) return 'danger';
    if (percentage >= 50) return 'warning';
    return 'success';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatJoiningDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateEligibilityDate = () => {
    if (!employeeDetails.joining_date) return 'N/A';
    const joiningDate = new Date(employeeDetails.joining_date);
    joiningDate.setMonth(joiningDate.getMonth() + 6);
    return joiningDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const monthsUntilEligible = 6 - leaveBalance.months_completed;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted small">Loading leave application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4" style={{ backgroundColor: '#f8f9fc', minHeight: '100vh' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">
            <FaUmbrellaBeach className="me-2 text-primary" />
            Apply for Leave
          </h4>
          <p className="text-muted mb-0 small">
            Submit your leave request for approval
          </p>
        </div>
        <Button 
          variant="outline-secondary" 
          size="sm"
          onClick={handleCancel}
        >
          <FaTimes className="me-2" size={12} />
          Cancel
        </Button>
      </div>

      <Row>
        {/* Main Form Column */}
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3">
              <h6 className="mb-0">Leave Request Form</h6>
            </Card.Header>
            <Card.Body>
              {/* Eligibility Alert - Only shows warning, doesn't hide balance */}
              {!leaveBalance.is_eligible && (
                <Alert variant="warning" className="mb-4">
                  <div className="d-flex">
                    <FaExclamationTriangle className="me-3 mt-1" size={20} />
                    <div>
                      <h6 className="alert-heading">Application Restricted</h6>
                      <p className="mb-1 small">
                        You cannot apply for leave until you complete 6 months of service.
                      </p>
                      <p className="mb-0 small">
                        <strong>Your Leave Balance:</strong> {leaveBalance.available} days (Visible but cannot apply)<br />
                        <strong>Months Completed:</strong> {leaveBalance.months_completed} / 6 months<br />
                        <strong>Eligible from:</strong> {calculateEligibilityDate()}
                      </p>
                    </div>
                  </div>
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                {/* Leave Type - Disabled if not eligible */}
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold text-muted">
                    Leave Type <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    name="leave_type"
                    value={formData.leave_type}
                    onChange={handleChange}
                    size="sm"
                    isInvalid={!!errors.leave_type}
                    disabled={!leaveBalance.is_eligible}
                  >
                    {leaveTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Form.Select>
                  {errors.leave_type && (
                    <Form.Control.Feedback type="invalid">
                      {errors.leave_type}
                    </Form.Control.Feedback>
                  )}
                  {!leaveBalance.is_eligible && (
                    <Form.Text className="text-muted">
                      <FaInfoCircle className="me-1" size={10} />
                      You need to complete 6 months to select leave type
                    </Form.Text>
                  )}
                </Form.Group>

                {/* Leave Duration - Disabled if not eligible */}
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold text-muted">
                    Leave Duration <span className="text-danger">*</span>
                  </Form.Label>
                  <div>
                    <Form.Check
                      inline
                      type="radio"
                      label="Full Day"
                      name="leave_duration"
                      value="Full Day"
                      checked={formData.leave_duration === 'Full Day'}
                      onChange={handleChange}
                      className="me-3"
                      disabled={!leaveBalance.is_eligible}
                    />
                    <Form.Check
                      inline
                      type="radio"
                      label="Half Day"
                      name="leave_duration"
                      value="Half Day"
                      checked={formData.leave_duration === 'Half Day'}
                      onChange={handleChange}
                      disabled={!leaveBalance.is_eligible}
                    />
                  </div>
                </Form.Group>

                {/* Half Day Type - Disabled if not eligible */}
                {formData.leave_duration === 'Half Day' && (
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-semibold text-muted">
                      Select Half <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select
                      name="half_day_type"
                      value={formData.half_day_type}
                      onChange={handleChange}
                      size="sm"
                      isInvalid={!!errors.half_day_type}
                      disabled={!leaveBalance.is_eligible}
                    >
                      <option value="">Choose which half...</option>
                      {halfDayOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Form.Select>
                    {errors.half_day_type && (
                      <Form.Control.Feedback type="invalid">
                        {errors.half_day_type}
                      </Form.Control.Feedback>
                    )}
                  </Form.Group>
                )}

                {/* Date Range - Disabled if not eligible */}
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-muted">
                        Start Date <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleChange}
                        size="sm"
                        isInvalid={!!errors.start_date}
                        min={new Date().toISOString().split('T')[0]}
                        disabled={!leaveBalance.is_eligible}
                      />
                      {errors.start_date && (
                        <Form.Control.Feedback type="invalid">
                          {errors.start_date}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-muted">
                        {formData.leave_duration === 'Half Day' ? 'Date' : 'End Date'} 
                        {formData.leave_duration === 'Full Day' && <span className="text-danger">*</span>}
                      </Form.Label>
                      <Form.Control
                        type="date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleChange}
                        size="sm"
                        isInvalid={!!errors.end_date}
                        disabled={formData.leave_duration === 'Half Day' || !leaveBalance.is_eligible}
                        min={formData.start_date || new Date().toISOString().split('T')[0]}
                      />
                      {errors.end_date && (
                        <Form.Control.Feedback type="invalid">
                          {errors.end_date}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                {/* Reason - Disabled if not eligible */}
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold text-muted">
                    Reason for Leave <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    size="sm"
                    placeholder="Please provide detailed reason for your leave request..."
                    isInvalid={!!errors.reason}
                    disabled={!leaveBalance.is_eligible}
                  />
                  {errors.reason && (
                    <Form.Control.Feedback type="invalid">
                      {errors.reason}
                    </Form.Control.Feedback>
                  )}
                  <Form.Text className="text-muted">
                    {formData.reason.length}/500 characters
                  </Form.Text>
                </Form.Group>

                {/* Reporting Manager - Read-only but visible */}
                <Form.Group className="mb-4">
                  <Form.Label className="small fw-semibold text-muted">
                    Reporting Manager
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="reporting_manager"
                    value={formData.reporting_manager}
                    onChange={handleChange}
                    size="sm"
                    placeholder="Your reporting manager"
                    readOnly
                    className="bg-light"
                  />
                </Form.Group>

                {/* Balance Error - Only show if eligible */}
                {errors.balance && leaveBalance.is_eligible && (
                  <Alert variant="danger" className="py-2 small">
                    <FaExclamationTriangle className="me-2" />
                    {errors.balance}
                  </Alert>
                )}

                {/* Eligibility Error - Shown when trying to submit while ineligible */}
                {errors.eligibility && (
                  <Alert variant="warning" className="py-2 small">
                    <FaInfoCircle className="me-2" />
                    {errors.eligibility}
                  </Alert>
                )}

                {/* Submit Buttons - Disabled if not eligible */}
                <div className="d-flex gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={submitting || !leaveBalance.is_eligible || (leaveBalance.is_eligible && calculatedDays > leaveBalance.available)}
                    className="px-4"
                    title={!leaveBalance.is_eligible ? "You need to complete 6 months before applying" : ""}
                  >
                    {submitting ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane className="me-2" size={12} />
                        Submit Request
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                </div>

                {/* Info message when not eligible */}
                {!leaveBalance.is_eligible && (
                  <div className="mt-3 p-2 bg-light rounded small text-muted">
                    <FaInfoCircle className="me-2 text-primary" size={12} />
                    Your leave balance of <strong>{leaveBalance.available} days</strong> is visible, but you cannot apply until you complete 6 months.
                  </div>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column - Leave Balance & Info */}
        <Col lg={4}>
          {/* Leave Balance Card - ALWAYS VISIBLE */}
          <Card className="border-0 shadow-sm mb-3">
            <Card.Header className="bg-white py-3">
              <h6 className="mb-0">
                <FaInfoCircle className="me-2 text-primary" size={14} />
                Your Leave Balance
              </h6>
            </Card.Header>
            <Card.Body>
              {/* Eligibility Status Badge */}
              <div className={`text-center mb-3 p-2 rounded ${leaveBalance.is_eligible ? 'bg-success bg-opacity-10' : 'bg-warning bg-opacity-10'}`}>
                {leaveBalance.is_eligible ? (
                  <>
                    <FaCheckCircle className="text-success mb-2" size={24} />
                    <p className="small text-success fw-semibold mb-0">Eligible to Apply</p>
                  </>
                ) : (
                  <>
                    <FaExclamationTriangle className="text-warning mb-2" size={24} />
                    <p className="small text-warning fw-semibold mb-0">Application Restricted</p>
                    <p className="small text-muted mt-1">
                      {monthsUntilEligible} months remaining
                    </p>
                  </>
                )}
              </div>

              {/* Leave Balance Display - ALWAYS VISIBLE */}
              <div className="text-center mb-3">
                <h3 className={`display-6 fw-bold ${leaveBalance.is_eligible ? 'text-primary' : 'text-primary'}`}>
                  {leaveBalance.available}
                </h3>
                <p className="text-muted small">Available Leaves</p>
              </div>

              {/* Leave Balance Details */}
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1 small">
                  <span className="text-muted">Total Accrued:</span>
                  <span className="fw-semibold">{leaveBalance.total_accrued} days</span>
                </div>
                <div className="d-flex justify-content-between mb-1 small">
                  <span className="text-muted">Used:</span>
                  <span className="fw-semibold">{leaveBalance.used} days</span>
                </div>
                <div className="d-flex justify-content-between mb-2 small">
                  <span className="text-muted">Pending:</span>
                  <span className="fw-semibold">{leaveBalance.pending} days</span>
                </div>

                {/* Progress Bar */}
                {leaveBalance.total_accrued > 0 && (
                  <ProgressBar 
                    now={(leaveBalance.used / leaveBalance.total_accrued) * 100} 
                    variant={getLeaveBalanceColor()} 
                    style={{ height: '6px' }}
                  />
                )}
              </div>

              {/* Days Calculation Preview - Only when eligible and dates selected */}
              {leaveBalance.is_eligible && calculatedDays > 0 && (
                <Alert variant="info" className="py-2 small mb-0">
                  <FaClock className="me-2" />
                  This request will use <strong>{calculatedDays} day{calculatedDays > 1 ? 's' : ''}</strong>
                  <br />
                  <small>Balance after request: <strong>{leaveBalance.available - calculatedDays}</strong> days</small>
                </Alert>
              )}

              {/* Joining Info */}
              <div className="mt-3 pt-2 border-top small text-muted">
                <p className="mb-1">
                  <strong>Joining Date:</strong> {formatJoiningDate(employeeDetails.joining_date)}
                </p>
                <p className="mb-1">
                  <strong>Months Completed:</strong> {leaveBalance.months_completed} / 6
                </p>
                {!leaveBalance.is_eligible && (
                  <p className="mb-0 text-warning">
                    <strong>Eligible from:</strong> {calculateEligibilityDate()}
                  </p>
                )}
              </div>

              {/* Info for ineligible employees */}
              {!leaveBalance.is_eligible && (
                <div className="mt-3 p-2 bg-light rounded small">
                  <FaInfoCircle className="me-2 text-primary" size={10} />
                  <span className="text-muted">
                    Your leave balance is <strong>{leaveBalance.available} days</strong>. 
                    You can see your balance but cannot apply yet.
                  </span>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Recent Leaves Card */}
          {recentLeaves.length > 0 && (
            <Card className="border-0 shadow-sm mb-3">
              <Card.Header className="bg-white py-3">
                <h6 className="mb-0">
                  <FaCalendarAlt className="me-2 text-primary" size={14} />
                  Recent Requests
                </h6>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="list-group list-group-flush">
                  {recentLeaves.map((leave, index) => (
                    <div key={leave.id || index} className="list-group-item py-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <span className="small fw-semibold">{leave.leave_type}</span>
                          <br />
                          <small className="text-muted">
                            {formatDate(leave.start_date)}
                            {leave.start_date !== leave.end_date && ` - ${formatDate(leave.end_date)}`}
                          </small>
                        </div>
                        <Badge 
                          bg={
                            leave.status === 'approved' ? 'success' :
                            leave.status === 'pending' ? 'warning' : 'danger'
                          }
                          pill
                        >
                          {leave.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Info Card */}
          <Card className="border-0 shadow-sm bg-light">
            <Card.Body className="p-3">
              <h6 className="small fw-semibold mb-2">Leave Policy</h6>
              <ul className="small text-muted ps-3 mb-0">
                <li>6 months probation period required before applying for leave</li>
                <li>Annual leaves: 1.5 days per month (total 18 days/year)</li>
                <li>Submit at least 3 days in advance</li>
                <li>Medical leaves require doctor's note</li>
                <li>Unpaid leaves available after exhausting all leaves</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ApplyLeave;