// components/Employee/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, Spinner, Alert, Button, ProgressBar } from 'react-bootstrap';
import { 
  FaUserCircle, 
  FaCalendarAlt, 
  FaClock, 
  FaUmbrellaBeach,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
  FaEye,
  FaChartLine,
  FaHistory,
  FaArrowRight,
  FaBell,
  FaTrophy,
  FaBirthdayCake,
  FaSyncAlt
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { showNotification, todayEvents, fetchTodayEvents } = useNotification();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState({
    available: 0,
    total_accrued: 12,
    used: 0,
    pending: 0
  });
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalLeaves: 0,
    approvedLeaves: 0,
    pendingLeaves: 0,
    rejectedLeaves: 0,
    presentDays: 0,
    absentDays: 0,
    workingDays: 22,
    lateDays: 0
  });

  // Chart data
  const [attendanceChartData, setAttendanceChartData] = useState({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Hours Worked',
        data: [0, 0, 0, 0, 0, 0, 0],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4
      }
    ]
  });

  const [leaveChartData, setLeaveChartData] = useState({
    labels: ['Used', 'Available', 'Pending'],
    datasets: [
      {
        data: [0, 12, 0],
        backgroundColor: ['#dc3545', '#28a745', '#ffc107'],
        borderWidth: 0
      }
    ]
  });

  useEffect(() => {
    if (user?.employeeId) {
      loadDashboardData();
    }
  }, [user]);

  // Update charts when data changes
  useEffect(() => {
    if (attendanceHistory.length > 0) {
      updateAttendanceChart();
    }
    if (leaveBalance) {
      updateLeaveChart();
    }
  }, [attendanceHistory, leaveBalance]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch all data in parallel for better performance
      await Promise.all([
        fetchEmployeeData(),
        fetchLeaveBalance(),
        fetchLeaveRequests(),
        fetchTodayAttendance(),
        fetchAttendanceHistory(),
        fetchUpcomingHolidays(),
        fetchTodayEvents()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load some dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    showNotification('Dashboard refreshed!', 'success');
  };

  const fetchEmployeeData = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/employees/profile/${user.employeeId}`);
      setEmployee(response.data);
    } catch (error) {
      console.error('Error fetching employee:', error);
      showNotification('Failed to load profile data', 'danger');
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      console.log('Fetching leave balance for:', user.employeeId);
      
      const response = await axios.get(`http://localhost:5000/api/leaves/balance/${user.employeeId}`);
      console.log('Leave balance response:', response.data);
      
      // Ensure we have valid numbers
      const balance = {
        available: parseFloat(response.data.available) || 0,
        total_accrued: parseFloat(response.data.total_accrued) || 12,
        used: parseFloat(response.data.used) || 0,
        pending: parseFloat(response.data.pending) || 0
      };
      
      setLeaveBalance(balance);
      
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      
      // Set default values if API fails
      setLeaveBalance({
        available: 12,
        total_accrued: 12,
        used: 0,
        pending: 0
      });
      
      showNotification('Using default leave balance', 'info');
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/leaves?employee_id=${user.employeeId}`);
      const leaves = response.data || [];
      setLeaveRequests(leaves.slice(0, 5)); // Show only 5 most recent
      
      // Calculate leave stats
      setStats(prev => ({
        ...prev,
        totalLeaves: leaves.length,
        approvedLeaves: leaves.filter(l => l.status === 'approved').length,
        pendingLeaves: leaves.filter(l => l.status === 'pending').length,
        rejectedLeaves: leaves.filter(l => l.status === 'rejected').length
      }));
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(
        `http://localhost:5000/api/attendance/report?start=${today}&end=${today}&employee_id=${user.employeeId}`
      );
      
      if (response.data.attendance && response.data.attendance.length > 0) {
        setTodayAttendance(response.data.attendance[0]);
      }
    } catch (error) {
      console.error('Error fetching today attendance:', error);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const response = await axios.get(
        `http://localhost:5000/api/attendance/report?start=${startDateStr}&end=${endDateStr}&employee_id=${user.employeeId}`
      );
      
      const attendance = response.data.attendance || [];
      setAttendanceHistory(attendance);
      
      // Calculate attendance stats
      const present = attendance.filter(a => a.status === 'present' || a.status === 'working').length;
      const absent = attendance.filter(a => a.status === 'absent').length;
      const late = attendance.filter(a => parseFloat(a.late_minutes) > 0).length;
      
      setStats(prev => ({
        ...prev,
        presentDays: present,
        absentDays: absent,
        lateDays: late
      }));
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    }
  };

  const fetchUpcomingHolidays = async () => {
    try {
      // You can implement this from your holidays data
      const today = new Date();
      const upcoming = [
        { date: '2026-03-25', name: 'Holi', daysLeft: 19 },
        { date: '2026-04-02', name: 'Good Friday', daysLeft: 27 },
        { date: '2026-05-01', name: 'Labour Day', daysLeft: 56 }
      ];
      setUpcomingHolidays(upcoming);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  const updateAttendanceChart = () => {
    // Group attendance by day of week
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hoursByDay = [0, 0, 0, 0, 0, 0, 0];
    
    attendanceHistory.forEach(record => {
      if (record.clock_in && record.total_hours) {
        const date = new Date(record.attendance_date);
        const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        hoursByDay[dayIndex] += parseFloat(record.total_hours);
      }
    });

    setAttendanceChartData({
      labels: daysOfWeek,
      datasets: [
        {
          label: 'Hours Worked',
          data: hoursByDay,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4
        }
      ]
    });
  };

  const updateLeaveChart = () => {
    setLeaveChartData({
      labels: ['Used', 'Available', 'Pending'],
      datasets: [
        {
          data: [
            leaveBalance.used || 0,
            leaveBalance.available || 0,
            leaveBalance.pending || 0
          ],
          backgroundColor: ['#dc3545', '#28a745', '#ffc107'],
          borderWidth: 0
        }
      ]
    });
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return <Badge bg="success" className="px-2 py-1"><FaCheckCircle className="me-1" size={10} /> Approved</Badge>;
      case 'pending':
        return <Badge bg="warning" className="px-2 py-1"><FaHourglassHalf className="me-1" size={10} /> Pending</Badge>;
      case 'rejected':
        return <Badge bg="danger" className="px-2 py-1"><FaTimesCircle className="me-1" size={10} /> Rejected</Badge>;
      default:
        return <Badge bg="secondary" className="px-2 py-1">Unknown</Badge>;
    }
  };

  const getAttendanceStatus = (record) => {
    if (!record) return <Badge bg="secondary">Not Marked</Badge>;
    if (!record.clock_in) return <Badge bg="secondary">Not Clocked</Badge>;
    if (record.clock_in && !record.clock_out) {
      return <Badge bg="info">Working</Badge>;
    }

    if (record.status === 'present') {
      return <Badge bg="success">Present</Badge>;
    }

    if (record.status === 'half_day') {
      return <Badge bg="warning">Half Day</Badge>;
    }

    return <Badge bg="secondary">Absent</Badge>;

    return <Badge bg="secondary">Absent</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (datetime) => {
    if (!datetime) return '-';
    return new Date(datetime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateLeavePercentage = () => {
    const used = leaveBalance.used || 0;
    const total = leaveBalance.total_accrued || 1;
    return ((used / total) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4" style={{ backgroundColor: '#f8f9fc', minHeight: '100vh' }}>
      {/* Welcome Header with Refresh Button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">
            <FaUserCircle className="me-2 text-primary" />
            Welcome back, {employee?.first_name || 'Employee'}!
          </h4>
          <p className="text-muted mb-0 small">
            {employee?.designation || 'Employee'} • {employee?.department || 'Department'}
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={refreshData}
            disabled={refreshing}
          >
            <FaSyncAlt className={`me-2 ${refreshing ? 'fa-spin' : ''}`} size={12} />
            Refresh
          </Button>
          <Badge bg="dark" className="p-2">
            ID: {user?.employeeId}
          </Badge>
          <Badge bg="info" className="p-2">
            {employee?.employment_type || 'Full Time'}
          </Badge>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible className="mb-3">
          {error}
        </Alert>
      )}

      {/* Today's Events Widget */}
      {todayEvents?.total > 0 && (
        <Card className="mb-4 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Card.Body className="p-3 text-white">
            <div className="d-flex align-items-center mb-2">
              <FaBirthdayCake className="me-2" size={20} />
              <FaTrophy className="me-2" size={20} />
              <h6 className="mb-0">Today's Celebrations 🎉</h6>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {todayEvents.birthdays?.map(emp => (
                <Badge key={`birthday-${emp.id}`} bg="light" text="dark" className="p-2">
                  🎂 {emp.first_name} {emp.last_name} ({emp.department})
                </Badge>
              ))}
              {todayEvents.anniversaries?.map(emp => (
                <Badge key={`anniversary-${emp.id}`} bg="light" text="dark" className="p-2">
                  🏆 {emp.first_name} {emp.last_name} - {emp.years} Years
                </Badge>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Today's Status Card */}
      {todayAttendance && (
        <Card className="mb-4 border-0 shadow-sm bg-white text-dark">
          <Card.Body>
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <FaClock size={30} className="me-3 opacity-75" />
                <div>
                  <h6 className="mb-1">Today's Attendance</h6>
                  <p className="mb-0">
                    {todayAttendance.clock_in ? (
                      <>
                        In: <strong>{formatTime(todayAttendance.clock_in)}</strong>
                        {todayAttendance.late_display && (
                          <small className="text-danger ms-2">(Late {todayAttendance.late_display})</small>
                        )}
                        {todayAttendance.clock_out ? (
                          <> • Out: <strong>{formatTime(todayAttendance.clock_out)}</strong></>
                        ) : (
                          <Badge bg="light" text="dark" className="ms-2">Working</Badge>
                        )}
                      </>
                    ) : (
                      "Not clocked in yet"
                    )}
                  </p>
                </div>
              </div>
              <Button 
                variant="light" 
                size="sm"
                onClick={() => navigate('/attendance')}
              >
                View Details <FaArrowRight className="ms-2" size={10} />
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Statistics Cards */}
      <Row className="mb-4 g-3">
        <Col md={3}>
          <Card className="border-0 shadow-sm h-70">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted small mb-1">Leave Balance</p>
                  <h4 className="mb-0 fw-bold text-primary">{leaveBalance.available}</h4>
                  <small className="text-muted">Available days</small>
                </div>
                <div className="bg-primary bg-opacity-10 p-2 rounded-circle">
                  <FaUmbrellaBeach className="text-primary" size={20} />
                </div>
              </div>
            
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm h-70">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted small mb-1">Present Days</p>
                  <h4 className="mb-0 fw-bold text-success">{stats.presentDays}</h4>
                  <small className="text-muted">Last 30 days</small>
                </div>
                <div className="bg-success bg-opacity-10 p-2 rounded-circle">
                  <FaCheckCircle className="text-success" size={20} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm h-70">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted small mb-1">Pending Leaves</p>
                  <h4 className="mb-0 fw-bold text-warning">{stats.pendingLeaves}</h4>
                  <small className="text-muted">Awaiting approval</small>
                </div>
                <div className="bg-warning bg-opacity-10 p-2 rounded-circle">
                  <FaHourglassHalf className="text-warning" size={20} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm h-70">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted small mb-1">Upcoming Holiday</p>
                  {upcomingHolidays.length > 0 ? (
                    <>
                      <h6 className="mb-0 fw-bold">{upcomingHolidays[0].name}</h6>
                      <small className="text-muted">{upcomingHolidays[0].date}</small>
                    </>
                  ) : (
                    <p className="mb-0">No upcoming holidays</p>
                  )}
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded-circle">
                  <FaCalendarAlt className="text-info" size={24} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        {/* Attendance Chart */}
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0">
                <FaChartLine className="me-2 text-primary" />
                Weekly Attendance
              </h6>
              <Badge bg="light" text="dark">Last 7 days</Badge>
            </Card.Header>
            <Card.Body>
              <div style={{ height: '250px' }}>
                <Line 
                  data={attendanceChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Hours'
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Leave Distribution Chart */}
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0">
                <FaUmbrellaBeach className="me-2 text-primary" />
                Leave Distribution
              </h6>
              <Badge bg="light" text="dark">Total: {leaveBalance.total_accrued} days</Badge>
            </Card.Header>
            <Card.Body>
              <div className="d-flex align-items-center" style={{ height: '200px' }}>
                <div style={{ width: '60%', height: '200px' }}>
                  <Doughnut 
                    data={leaveChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }}
                  />
                </div>
                <div className="ms-4">
                  <div className="mb-2">
                    <small className="text-muted d-block">Used</small>
                    <strong className="text-danger">{leaveBalance.used} days</strong>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted d-block">Available</small>
                    <strong className="text-success">{leaveBalance.available} days</strong>
                  </div>
                  <div>
                    <small className="text-muted d-block">Pending</small>
                    <strong className="text-warning">{leaveBalance.pending} days</strong>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Recent Leave Requests */}
        <Col md={7}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0">
                <FaHistory className="me-2 text-primary" />
                Recent Leave Requests
              </h6>
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => navigate('/apply-leave')}
                className="text-decoration-none"
              >
                View All <FaArrowRight className="ms-1" size={10} />
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="small text-dark">Leave Type</th>
                      <th className="small text-dark">Duration</th>
                      <th className="small text-dark">Date Range</th>
                      <th className="small text-dark">Days</th>
                      <th className="small text-dark">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.length > 0 ? (
                      leaveRequests.map((leave, index) => (
                        <tr key={leave.id || index}>
                          <td className="small">
                            <Badge bg="secondary" className="px-2 py-1">
                              {leave.leave_type}
                            </Badge>
                          </td>
                          <td className="small">{leave.leave_duration || 'Full Day'}</td>
                          <td className="small">
                            {formatDate(leave.start_date)}
                            {leave.start_date !== leave.end_date && ` - ${formatDate(leave.end_date)}`}
                          </td>
                          <td className="small fw-bold">{leave.days_count || 1}</td>
                          <td className="small">{getStatusBadge(leave.status)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-4">
                          <FaUmbrellaBeach size={30} className="text-muted mb-2 opacity-50" />
                          <p className="text-muted small mb-2">No leave requests found</p>
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => navigate('/apply-leave')}
                          >
                            Apply for Leave
                          </Button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Upcoming Holidays & Quick Actions */}
        <Col md={5}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Header className="bg-white py-3">
              <h6 className="mb-0">
                <FaCalendarAlt className="me-2 text-primary" />
                Upcoming Holidays
              </h6>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="list-group list-group-flush">
                {upcomingHolidays.map((holiday, index) => (
                  <div key={index} className="list-group-item d-flex justify-content-between align-items-center py-2">
                    <div>
                      <span className="fw-semibold small">{holiday.name}</span>
                      <br />
                      <small className="text-muted">{holiday.date}</small>
                    </div>
                    <Badge bg="info" pill>
                      {holiday.daysLeft} days left
                    </Badge>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3">
              <h6 className="mb-0">
                <FaBell className="me-2 text-primary" />
                Quick Actions
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button 
                  variant="primary" 
                  onClick={() => navigate('/apply-leave')}
                  className="d-flex align-items-center justify-content-between"
                >
                  <span><FaUmbrellaBeach className="me-2" /> Apply for Leave</span>
                  <FaArrowRight size={12} />
                </Button>
                <Button 
                  variant="outline-primary" 
                  onClick={() => navigate('/attendance')}
                  className="d-flex align-items-center justify-content-between"
                >
                  <span><FaClock className="me-2" /> Mark Attendance</span>
                  <FaArrowRight size={12} />
                </Button>
                <Button 
                  variant="outline-success" 
                  onClick={() => navigate('/salary-slip')}
                  className="d-flex align-items-center justify-content-between"
                >
                  <span><FaChartLine className="me-2" /> View Salary Slip</span>
                  <FaArrowRight size={12} />
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Attendance History */}
      <Card className="mt-4 border-0 shadow-sm">
        <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <FaClock className="me-2 text-primary" />
            Recent Attendance
          </h6>
          <Badge bg="light" text="dark">Last 5 days</Badge>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="small text-dark">Date</th>
                  <th className="small text-dark">Clock In</th>
                  <th className="small text-dark">Clock Out</th>
                  <th className="small text-dark">Hours</th>
                  <th className="small text-dark">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceHistory.slice(0, 5).map((record, index) => (
                  <tr key={index}>
                    <td className="small">{formatDate(record.attendance_date)}</td>
                    <td className="small">
                      {formatTime(record.clock_in)}
                      {record.late_display && (
                        <small className="text-danger d-block">Late {record.late_display}</small>
                      )}
                    </td>
                    <td className="small">{formatTime(record.clock_out)}</td>
                    <td className="small fw-bold">{record.total_hours || '0.0'} hrs</td>
                    <td className="small">{getAttendanceStatus(record)}</td>
                  </tr>
                ))}
                {attendanceHistory.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-3">
                      <small className="text-muted">No attendance records found</small>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default EmployeeDashboard;