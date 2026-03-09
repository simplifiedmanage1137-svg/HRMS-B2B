import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Button, Alert, Spinner, Badge, 
  Row, Col, Modal 
} from 'react-bootstrap';
import { 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaInfoCircle,
  FaClock,
  FaMapMarkerAlt,
  FaBuilding,
  FaHome,
  FaLocationArrow,
  FaSignOutAlt
} from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const Attendance = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [geofenceInfo, setGeofenceInfo] = useState(null);
  const [heartbeatInterval, setHeartbeatInterval] = useState(null);
  const [showExitWarning, setShowExitWarning] = useState(false);

  const STORAGE_KEY = `attendance_session_${user?.employeeId}`;

  const saveSessionToStorage = (session) => {
    if (!user?.employeeId) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  };

  const clearSessionFromStorage = () => {
    if (!user?.employeeId) return;
    localStorage.removeItem(STORAGE_KEY);
  };

  const loadSessionFromStorage = () => {
    if (!user?.employeeId) return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const isClockedIn = Boolean(attendance?.clock_in || activeSession);
  const isClockedOut = Boolean(attendance?.clock_out);

  // Office coordinates
  const OFFICE_COORDS = {
    name: 'Viman Nagar Office',
    address: '8th Floor SkyVista, 805, Mhada Colony, Viman Nagar, Pune 411014',
    latitude: 18.56835629424307,
    longitude: 73.90856078144989,
    radius: 50 // meters
  };

  useEffect(() => {
    if (!user?.employeeId) return;

    // Load cached session (so the Clock Out button stays visible even if the backend fetch is delayed)
    const storedSession = loadSessionFromStorage();
    if (storedSession) {
      setActiveSession(storedSession);
    }

    fetchTodayAttendance();
    getCurrentLocation();
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Add beforeunload event listener to warn user
    const handleBeforeUnload = (e) => {
      if (activeSession) {
        // Show warning but don't auto clock-out
        e.preventDefault();
        e.returnValue = 'You have an active session. Please clock out before leaving.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(timer);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  // Start heartbeat when active session exists
  useEffect(() => {
    if (activeSession && location) {
      const interval = setInterval(sendHeartbeat, 30000); // Every 30 seconds
      setHeartbeatInterval(interval);
      
      return () => clearInterval(interval);
    }
  }, [activeSession, location]);

  const getCurrentLocation = () => {
    setLocationLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        
        setLocation(newLocation);
        
        const distance = calculateDistance(
          newLocation.latitude,
          newLocation.longitude,
          OFFICE_COORDS.latitude,
          OFFICE_COORDS.longitude
        );
        
        const isInOffice = distance <= OFFICE_COORDS.radius;
        
        setGeofenceInfo({
          distance: Math.round(distance * 100) / 100,
          isInOffice,
          requiredRadius: OFFICE_COORDS.radius
        });

        setLocationLoading(false);
      },
      (error) => {
        console.error('❌ Location error:', error);
        let errorMessage = 'Failed to get your location';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Please enable location access to mark attendance';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        setLocationError(errorMessage);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const fetchTodayAttendance = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/attendance/today/${user.employeeId}`
      );

      const attendanceData = response.data.attendance;
      const serverSession = response.data.active_session;

      setAttendance(attendanceData);

      // If the server returns an active session, use that.
      // Otherwise, if we have an attendance record with a session_id (but no active session), keep using it.
      if (serverSession) {
        setActiveSession(serverSession);
        saveSessionToStorage(serverSession);
      } else if (attendanceData?.clock_in && !attendanceData?.clock_out && attendanceData.session_id) {
        const inferredSession = {
          session_id: attendanceData.session_id,
          clock_in_time: attendanceData.clock_in
        };
        setActiveSession(inferredSession);
        saveSessionToStorage(inferredSession);
      } else {
        setActiveSession(null);
        clearSessionFromStorage();
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const sendHeartbeat = async () => {
    try {
      if (activeSession && location) {
        await axios.post('http://localhost:5000/api/attendance/heartbeat', {
          employee_id: user.employeeId,
          session_id: activeSession.session_id,
          latitude: location.latitude,
          longitude: location.longitude
        });
      }
    } catch (error) {
      console.error('Heartbeat failed:', error);
    }
  };

  const handleClockIn = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!location) {
        throw new Error('Unable to get your location');
      }

      if (!geofenceInfo.isInOffice) {
        throw new Error(
          `You must be within ${OFFICE_COORDS.radius} meters of the office to clock in. ` +
          `You are currently ${geofenceInfo.distance} meters away.`
        );
      }

      const response = await axios.post('http://localhost:5000/api/attendance/clock-in', {
        employee_id: user.employeeId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
      });

      setMessage({
        type: 'success',
        text: response.data.message
      });

      // Immediately update UI so Clock Out button appears without waiting for additional fetch
      setAttendance(prev => ({
        ...prev,
        clock_in: response.data.clock_in,
        late_minutes: response.data.late_minutes ?? prev?.late_minutes,
        late_display: response.data.late_display ?? prev?.late_display,
        status: response.data.status ?? prev?.status
      }));

      const session = {
        session_id: response.data.session_id,
        clock_in_time: response.data.clock_in_time
      };
      setActiveSession(session);
      saveSessionToStorage(session);

      // Refresh from server to ensure we have latest data
      await fetchTodayAttendance();

    } catch (error) {
      console.error('Clock-in error:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || error.message || 'Failed to clock in'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!activeSession) {
        throw new Error('No active session found');
      }

      const response = await axios.post('http://localhost:5000/api/attendance/clock-out', {
        employee_id: user.employeeId,
        session_id: activeSession.session_id,
        latitude: location?.latitude,
        longitude: location?.longitude,
        accuracy: location?.accuracy
      });

      setMessage({
        type: 'success',
        text: response.data.message
      });

      // Immediately update UI so the user sees clock-out status without waiting
      setAttendance(prev => ({
        ...prev,
        clock_out: response.data.clock_out,
        total_hours: response.data.total_hours,
        status: response.data.status
      }));
      setActiveSession(null);
      clearSessionFromStorage();

      await fetchTodayAttendance();

    } catch (error) {
      console.error('Clock-out error:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || error.message || 'Failed to clock out'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualClockOut = () => {
    setShowExitWarning(false);
    handleClockOut();
  };

  const getLocationBadge = () => {
    if (locationLoading) {
      return (
        <Badge bg="secondary" className="px-3 py-2">
          <Spinner size="sm" animation="border" className="me-2" />
          Getting location...
        </Badge>
      );
    }

    if (locationError) {
      return (
        <Badge bg="danger" className="px-3 py-2">
          <FaExclamationTriangle className="me-2" />
          {locationError}
        </Badge>
      );
    }

    if (geofenceInfo) {
      if (geofenceInfo.isInOffice) {
        return (
          <Badge bg="success" className="px-3 py-2">
            <FaBuilding className="me-2" />
            At Office ({geofenceInfo.distance}m from center)
          </Badge>
        );
      } else {
        return (
          <Badge bg="warning" className="px-3 py-2">
            <FaHome className="me-2" />
            Outside Office ({geofenceInfo.distance}m away)
          </Badge>
        );
      }
    }

    return (
      <Badge bg="secondary" className="px-3 py-2">
        <FaLocationArrow className="me-2" />
        Location unknown
      </Badge>
    );
  };

  const formatTime = (datetime) => {
    if (!datetime) return '--:--';
    return new Date(datetime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="attendance-page p-4">
      <h5 className="mb-4">
        <FaMapMarkerAlt className="me-2 text-dark" />
        Attendance System
      </h5>

      {/* Location Status Card */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={8}>
              <div className="d-flex align-items-center flex-wrap">
                {getLocationBadge()}
                {geofenceInfo && (
                  <small className={`ms-3 ${geofenceInfo.isInOffice ? 'text-success' : 'text-warning'}`}>
                    <FaMapMarkerAlt className="me-1" />
                    Accuracy: ±{Math.round(location?.accuracy || 0)}m
                  </small>
                )}
              </div>
              {location && (
                <div className="mt-2 small text-muted">
                  <strong>Office:</strong> {OFFICE_COORDS.name}<br />
                  <small>📍 {OFFICE_COORDS.latitude.toFixed(6)}, {OFFICE_COORDS.longitude.toFixed(6)}</small>
                </div>
              )}
            </Col>
           
          </Row>
        </Card.Body>
      </Card>

      {/* Warning for outside office */}
      {geofenceInfo && !geofenceInfo.isInOffice && (
        <Alert variant="warning" className="mb-4">
          <FaExclamationTriangle className="me-2" />
          You are <strong>{geofenceInfo.distance} meters</strong> away from the office.
          You need to be within <strong>{OFFICE_COORDS.radius} meters</strong> to mark attendance.
        </Alert>
      )}


      <Row>
        <Col md={6} className="mx-auto">
          <Card className="shadow-lg border-0">
            <Card.Header className={`text-white text-center py-3 ${
              geofenceInfo?.isInOffice ? 'bg-success' : 'bg-secondary'
            }`}>
              <h5 className="mb-0">
                {geofenceInfo?.isInOffice ? '✅ At Office' : '⛔ Outside Office'}
              </h5>
            </Card.Header>
            <Card.Body className="text-center p-5">

              {/* Status Messages */}
              {message.text && (
                <Alert 
                  variant={message.type} 
                  onClose={() => setMessage({ type: '', text: '' })}
                  dismissible
                  className="mb-3"
                >
                  {message.text}
                </Alert>
              )}

              {/* Today's Attendance Status */}
              {attendance && (
                <Card className="bg-light mb-4">
                  <Card.Body>
                    <h5>Today's Attendance</h5>
                    {attendance.clock_in && (
                      <p className="mb-1">
                        <strong>Clock In:</strong> {formatTime(attendance.clock_in)}
                        {attendance.late_display && (
                          <Badge bg="danger" className="ms-2">
                            ⚠️ Late by {attendance.late_display}
                          </Badge>
                        )}
                      </p>
                    )}
                    {attendance.clock_out && (
                      <p className="mb-0">
                        <strong>Clock Out:</strong> {formatTime(attendance.clock_out)}
                        <Badge bg="success" className="ms-2">
                          {attendance.total_hours} hours
                        </Badge>
                      </p>
                    )}
                    {activeSession && (
                      <p className="mb-0 mt-2 text-success">
                        <FaClock className="me-1" />
                        Active session • Clocked in at {formatTime(activeSession.clock_in_time)}
                      </p>
                    )}
                  </Card.Body>
                </Card>
              )}

              {/* Action Buttons */}
              {!isClockedIn ? (
                <Button
                  variant="success"
                  size="md"
                  className="w-50 py-2"
                  onClick={handleClockIn}
                  disabled={loading || !geofenceInfo?.isInOffice || locationLoading}
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FaMapMarkerAlt className="me-2" />
                      {geofenceInfo?.isInOffice ? 'Clock In' : 'Cannot Clock In'}
                    </>
                  )}
                </Button>
              ) : !isClockedOut ? (
                <>
                  <Button
                    variant="warning"
                    size="md"
                    className="w-50 py-2"
                    onClick={handleClockOut}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FaSignOutAlt className="me-2" />
                        Clock Out
                      </>
                    )}
                  </Button>
                 
                </>
              ) : (
                <Alert variant="success" className="text-center">
                  <FaCheckCircle size={30} className="mb-2" />
                  <h5>You're all done for today!</h5>
                  <p className="mb-0">See you tomorrow!</p>
                </Alert>
              )}
            </Card.Body>
          </Card>

          {/* Exit Warning Modal */}
          <Modal show={showExitWarning} onHide={() => setShowExitWarning(false)} centered>
            <Modal.Header closeButton className="bg-warning">
              <Modal.Title>⚠️ Active Session Detected</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p>You have an active session. Would you like to clock out before leaving?</p>
              <p className="text-muted small">If you don't clock out, your attendance will not be recorded properly.</p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowExitWarning(false)}>
                Cancel
              </Button>
              <Button variant="warning" onClick={handleManualClockOut}>
                <FaSignOutAlt className="me-2" />
                Clock Out Now
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Instructions */}
          <Card className="mt-3 bg-light">
            <Card.Body className="small">
              <h6>
                <FaInfoCircle className="me-2 text-primary" />
                Important Notes
              </h6>
              <ul className="mb-0">
                <li>✅ You must manually click <strong>Clock Out</strong> when leaving</li>
                <li>⚠️ Closing the browser tab will NOT clock you out</li>
                <li>📍 Location updates every 30 seconds while working</li>
                <li>⏱️ Your total hours are calculated when you clock out</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Attendance;