// src/components/Layout/Navbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBell, FaUserCircle, FaClock, FaCalendarAlt, FaEdit,
  FaCheckCircle, FaTimesCircle, FaUser, FaSignOutAlt,
  FaTimes, FaInfoCircle, FaBirthdayCake, FaTrophy
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import axios from '../../config/axios';
import API_ENDPOINTS from '../../config/api';
import { Badge, Button, Dropdown, Spinner } from 'react-bootstrap';
import EventNotification from '../Common/EventNotification';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { eventNotifications, markEventAsRead, markAllEventsAsRead, removeNotification } = useNotification();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [employeeName, setEmployeeName] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [fetchingNotifications, setFetchingNotifications] = useState(false);

  const notificationRef = useRef(null);
  const bellRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      fetchEmployeeName();
      fetchNotifications();
      fetchPendingUpdateRequests();
    }
  }, [user]);

  useEffect(() => {
    const unreadEvents = eventNotifications.filter(e => !e.read).length;
    const unreadRegular = notifications.filter(n => !n.is_read).length;
    setUnreadCount(unreadRegular + unreadEvents);
  }, [eventNotifications, notifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        notificationRef.current && !notificationRef.current.contains(e.target) &&
        bellRef.current && !bellRef.current.contains(e.target)
      ) setShowNotifications(false);
    };
    if (showNotifications) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const fetchEmployeeName = async () => {
    try {
      if (user?.role === 'admin') { setEmployeeName('Administrator'); return; }
      const res = await axios.get(API_ENDPOINTS.EMPLOYEE_PROFILE(user?.employeeId));
      if (res.data) {
        setEmployeeName(`${res.data.first_name || ''} ${res.data.last_name || ''}`.trim() || 'Employee');
      }
    } catch {
      setEmployeeName(user?.role === 'admin' ? 'Administrator' : 'Employee');
    }
  };

  const fetchNotifications = async () => {
    if (!user?.employeeId) return;
    setFetchingNotifications(true);
    try {
      const res = await axios.get(API_ENDPOINTS.NOTIFICATIONS_BY_EMPLOYEE(user.employeeId));
      if (res.data && Array.isArray(res.data)) setNotifications(res.data);
    } catch { /* silent */ }
    finally { setFetchingNotifications(false); }
  };

  const fetchPendingUpdateRequests = async () => {
    try {
      const res = await axios.get(API_ENDPOINTS.EMPLOYEE_UPDATES_PENDING);
      const data = Array.isArray(res.data) ? res.data : res.data?.requests || [];
      setPendingRequests(data);
      setPendingCount(data.length);
    } catch { /* silent */ }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(API_ENDPOINTS.NOTIFICATION_READ(id));
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* silent */ }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(API_ENDPOINTS.NOTIFICATION_DELETE(id));
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (removeNotification) removeNotification(id);
    } catch {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      await Promise.all(unreadIds.map(id => markAsRead(id)));
      markAllEventsAsRead();
    } catch { /* silent */ }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'update_approved': case 'leave_approved': return <FaCheckCircle style={{ color: 'var(--keka-success)' }} size={13} />;
      case 'update_rejected': case 'leave_rejected': return <FaTimesCircle style={{ color: 'var(--keka-danger)' }} size={13} />;
      case 'update_request': return <FaEdit style={{ color: 'var(--keka-warning)' }} size={13} />;
      default: return <FaBell style={{ color: 'var(--keka-primary)' }} size={13} />;
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <nav style={{
      height: 'var(--keka-navbar-height)',
      backgroundColor: 'var(--keka-navbar-bg)',
      borderBottom: '1px solid var(--keka-border)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0 20px', position: 'sticky', top: 0, zIndex: 100,
      boxShadow: 'var(--keka-shadow-sm)', flexShrink: 0
    }}>
      {/* Left - Page title area (empty, sidebar has logo) */}
      <div />

      {/* Right - Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        {/* Time Display */}
        <div className="d-none d-sm-flex align-items-center" style={{
          backgroundColor: 'var(--keka-body-bg)', borderRadius: '20px',
          padding: '5px 12px', gap: '6px', border: '1px solid var(--keka-border)'
        }}>
          <FaClock style={{ color: 'var(--keka-primary)' }} size={12} />
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--keka-text-primary)' }}>{formattedTime}</span>
          <span style={{ color: 'var(--keka-border)', margin: '0 2px' }}>|</span>
          <FaCalendarAlt style={{ color: 'var(--keka-primary)' }} size={12} />
          <span style={{ fontSize: '13px', color: 'var(--keka-text-secondary)' }}>{formattedDate}</span>
        </div>

        {/* Bell */}
        <div style={{ position: 'relative', cursor: 'pointer' }} ref={bellRef} onClick={() => setShowNotifications(!showNotifications)}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            backgroundColor: showNotifications ? 'var(--keka-primary-light)' : 'var(--keka-body-bg)',
            border: `1px solid ${showNotifications ? 'var(--keka-primary)' : 'var(--keka-border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}>
            <FaBell size={15} style={{ color: showNotifications ? 'var(--keka-primary)' : 'var(--keka-text-secondary)' }} />
          </div>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              background: 'var(--keka-danger)', color: 'white',
              borderRadius: '10px', fontSize: '10px', fontWeight: '600',
              padding: '1px 5px', minWidth: '16px', textAlign: 'center',
              border: '2px solid white'
            }}>
              {unreadCount}
            </span>
          )}
        </div>

        {/* Profile Dropdown */}
        <Dropdown align="end">
          <Dropdown.Toggle
            variant="link" className="p-0 border-0 text-decoration-none"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'var(--keka-primary)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: '600'
            }}>
              {getInitials(employeeName)}
            </div>
            <div className="d-none d-md-block" style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--keka-text-primary)', lineHeight: 1.2 }}>
                {employeeName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--keka-text-muted)', lineHeight: 1 }}>
                {user?.role === 'admin' ? 'Administrator' : user?.employeeId}
              </div>
            </div>
          </Dropdown.Toggle>

          <Dropdown.Menu style={{ border: '1px solid var(--keka-border)', borderRadius: '8px', boxShadow: 'var(--keka-shadow-md)', minWidth: '180px', padding: '6px' }}>
            {user?.role === 'employee' && (
              <Dropdown.Item as={Link} to="/profile" style={{ borderRadius: '6px', fontSize: '13px', padding: '8px 12px' }}>
                <FaUser className="me-2" size={12} /> My Profile
              </Dropdown.Item>
            )}
            <Dropdown.Item
              as={Link}
              to={user?.role === 'admin' ? '/admin/update-requests' : '/employee/update-requests'}
              style={{ borderRadius: '6px', fontSize: '13px', padding: '8px 12px', display: 'flex', alignItems: 'center' }}
            >
              <FaEdit className="me-2" size={12} /> Update Requests
              {pendingCount > 0 && <Badge bg="danger" className="ms-auto">{pendingCount}</Badge>}
            </Dropdown.Item>
            <Dropdown.Divider style={{ margin: '4px 0' }} />
            <Dropdown.Item
              onClick={() => { logout(); navigate('/login'); }}
              style={{ borderRadius: '6px', fontSize: '13px', padding: '8px 12px', color: 'var(--keka-danger)' }}
            >
              <FaSignOutAlt className="me-2" size={12} /> Logout
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div
          ref={notificationRef}
          style={{
            position: 'absolute', right: '16px',
            top: 'calc(var(--keka-navbar-height) + 8px)',
            width: window.innerWidth < 576 ? 'calc(100vw - 32px)' : '380px',
            background: 'white', border: '1px solid var(--keka-border)',
            borderRadius: '10px', boxShadow: 'var(--keka-shadow-md)',
            zIndex: 1001, maxHeight: '480px', overflowY: 'auto'
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px', borderBottom: '1px solid var(--keka-border)'
          }}>
            <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--keka-text-primary)' }}>
              Notifications {unreadCount > 0 && <Badge bg="danger" pill style={{ fontSize: '10px' }}>{unreadCount}</Badge>}
            </span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '12px', color: 'var(--keka-primary)', fontWeight: '500'
              }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ padding: '8px' }}>
            {fetchingNotifications && (
              <div style={{ textAlign: 'center', padding: '12px' }}>
                <Spinner size="sm" animation="border" style={{ color: 'var(--keka-primary)' }} />
              </div>
            )}

            {/* Pending Update Requests */}
            {pendingCount > 0 && (
              <div style={{
                padding: '10px 12px', borderRadius: '8px', marginBottom: '6px',
                background: '#FFFAF0', border: '1px solid #FEEBC8',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <FaEdit style={{ color: 'var(--keka-warning)', flexShrink: 0 }} size={14} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--keka-text-primary)' }}>Pending Update Requests</div>
                  <div style={{ fontSize: '11px', color: 'var(--keka-text-secondary)' }}>{pendingCount} request(s) pending</div>
                </div>
                <button
                  onClick={() => { navigate(user?.role === 'admin' ? '/admin/update-requests' : '/employee/update-requests'); setShowNotifications(false); }}
                  style={{
                    background: 'var(--keka-warning)', color: 'white', border: 'none',
                    borderRadius: '5px', padding: '3px 10px', fontSize: '11px',
                    cursor: 'pointer', fontWeight: '500', flexShrink: 0
                  }}
                >
                  View
                </button>
              </div>
            )}

            {/* Event Notifications */}
            {eventNotifications.filter(e => !e.read).length > 0 && (
              <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--keka-text-muted)', padding: '4px 4px 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🎉 Today's Events
                </div>
                {eventNotifications.filter(e => !e.read).map(event => (
                  <div key={event.id} style={{ position: 'relative', marginBottom: '4px' }}>
                    <EventNotification event={event} onClose={() => markEventAsRead(event.id)} />
                    <button
                      onClick={(e) => { e.stopPropagation(); markEventAsRead(event.id); }}
                      style={{
                        position: 'absolute', top: '6px', right: '6px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--keka-text-muted)', padding: '2px'
                      }}
                    >
                      <FaTimes size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Regular Notifications */}
            {notifications.length > 0 ? (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--keka-text-muted)', padding: '4px 4px 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🔔 Updates
                </div>
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                    style={{
                      padding: '10px 12px', borderRadius: '8px', marginBottom: '4px',
                      background: !notif.is_read ? 'var(--keka-primary-light)' : '#F8FAFC',
                      border: `1px solid ${!notif.is_read ? '#B2EBF2' : 'var(--keka-border)'}`,
                      cursor: !notif.is_read ? 'pointer' : 'default',
                      position: 'relative', display: 'flex', gap: '10px', alignItems: 'flex-start'
                    }}
                  >
                    <div style={{ marginTop: '1px', flexShrink: 0 }}>{getNotificationIcon(notif.type)}</div>
                    <div style={{ flex: 1, minWidth: 0, marginRight: '20px' }}>
                      <p style={{ fontSize: '12px', margin: '0 0 4px', color: 'var(--keka-text-primary)', lineHeight: 1.4 }}>{notif.message}</p>
                      <span style={{ fontSize: '11px', color: 'var(--keka-text-muted)' }}>{formatTime(notif.created_at)}</span>
                      {!notif.is_read && (
                        <span style={{
                          marginLeft: '8px', background: 'var(--keka-primary)', color: 'white',
                          borderRadius: '4px', fontSize: '10px', padding: '1px 6px', fontWeight: '500'
                        }}>New</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => deleteNotification(notif.id, e)}
                      style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--keka-text-muted)', padding: '2px'
                      }}
                    >
                      <FaTimes size={10} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              eventNotifications.filter(e => !e.read).length === 0 && pendingCount === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--keka-text-muted)' }}>
                  <FaBell size={28} style={{ opacity: 0.3, marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '13px', margin: 0 }}>No notifications</p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
