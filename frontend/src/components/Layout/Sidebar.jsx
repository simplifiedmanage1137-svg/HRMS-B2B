// src/components/Layout/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FaTachometerAlt, FaUsers, FaCalendarAlt, FaMoneyBill,
  FaUserCircle, FaSignOutAlt, FaFingerprint, FaClock,
  FaBars, FaChevronLeft, FaChevronRight, FaBell,
  FaPaperPlane, FaEdit, FaCheckCircle, FaUserTie,
  FaBullhorn, FaStar
} from 'react-icons/fa';
import axios from '../../config/axios';
import API_ENDPOINTS from '../../config/api';
import { Badge } from 'react-bootstrap';

const SIDEBAR_OPEN = '260px';
const SIDEBAR_CLOSED = '72px';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [employeeName, setEmployeeName] = useState('');
  const [employeeDesignation, setEmployeeDesignation] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchEmployeeName();
      if (user?.role === 'admin') fetchPendingCount();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'admin') {
      const handler = () => fetchPendingCount();
      window.addEventListener('updateApprovalsChanged', handler);
      return () => window.removeEventListener('updateApprovalsChanged', handler);
    }
  }, [user]);

  useEffect(() => {
    if (location.pathname === '/admin/update-approvals') {
      setPendingCount(0);
      markNotificationsAsRead();
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsOpen(true);
      else setIsOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const mainContent = document.getElementById('main-content-wrapper');
    if (mainContent) {
      mainContent.style.marginLeft = isMobile ? '0' : (isOpen ? SIDEBAR_OPEN : SIDEBAR_CLOSED);
      mainContent.style.transition = 'margin-left 0.25s ease';
    }
  }, [isOpen, isMobile]);

  const fetchEmployeeName = async () => {
    try {
      if (user?.role === 'admin') { setEmployeeName('Administrator'); return; }
      const res = await axios.get(API_ENDPOINTS.EMPLOYEE_PROFILE(user?.employeeId));
      if (res.data) {
        setEmployeeName(`${res.data.first_name || ''} ${res.data.last_name || ''}`.trim() || 'Employee');
        setEmployeeDesignation(res.data.designation || '');
      }
    } catch {
      setEmployeeName(user?.role === 'admin' ? 'Administrator' : 'Employee');
    }
  };

  const fetchPendingCount = async () => {
    try {
      const res = await axios.get(API_ENDPOINTS.ADMIN_UPDATES_PENDING_COUNT);
      setPendingCount(res.data.count || 0);
    } catch { /* silent */ }
  };

  const markNotificationsAsRead = async () => {
    try { await axios.post(API_ENDPOINTS.ADMIN_UPDATES_MARK_READ); } catch { /* silent */ }
  };

  const closeSidebar = () => { if (isMobile) setIsOpen(false); };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // ✅ FIXED: NavItem with proper horizontal alignment
  const NavItem = ({ to, icon, label, badge, onClick, end = false }) => (
    <NavLink
      to={to}
      end={end}
      onClick={() => { if (onClick) onClick(); closeSidebar(); }}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: isOpen ? 'flex-start' : 'center',
        gap: '12px',
        padding: isOpen ? '10px 12px' : '10px',
        margin: '2px 0',
        borderRadius: '8px',
        backgroundColor: isActive ? 'var(--keka-primary-light, #e8f0fe)' : 'transparent',
        color: isActive ? 'var(--keka-primary, #0d6efd)' : 'var(--keka-sidebar-text, #5a626e)',
        fontWeight: isActive ? '600' : '400',
        fontSize: '13px',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        position: 'relative',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      })}
      title={!isOpen ? label : ''}
    >
      <span style={{ 
        flexShrink: 0, 
        fontSize: '16px', 
        width: '20px', 
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        {icon}
      </span>
      {isOpen && (
        <>
          <span style={{ 
            flex: 1, 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap' 
          }}>
            {label}
          </span>
          {badge > 0 && (
            <Badge 
              bg="danger" 
              pill 
              style={{ 
                fontSize: '10px', 
                padding: '2px 6px',
                flexShrink: 0,
                marginLeft: '4px'
              }}
            >
              {badge}
            </Badge>
          )}
        </>
      )}
      {!isOpen && badge > 0 && (
        <Badge
          bg="danger"
          pill
          style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            fontSize: '9px',
            padding: '2px 5px',
            minWidth: '18px'
          }}
        >
          {badge}
        </Badge>
      )}
    </NavLink>
  );

  const SectionLabel = ({ label }) => (
    isOpen ? (
      <div style={{
        fontSize: '10px',
        fontWeight: '600',
        color: 'var(--keka-text-muted, #8a94a6)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        padding: '16px 12px 6px',
        marginTop: '4px'
      }}>
        {label}
      </div>
    ) : (
      <div style={{ height: '20px' }} />
    )
  );

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            top: '12px',
            left: '16px',
            zIndex: 1000,
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'var(--keka-primary, #0d6efd)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          <FaBars size={18} />
        </button>
      )}

      {/* Desktop Toggle Button - ✅ FIXED POSITION */}
      {!isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'fixed',
            top: '50%',
            transform: 'translateY(-50%)',
            left: isOpen ? `calc(${SIDEBAR_OPEN} - 10px)` : `calc(${SIDEBAR_CLOSED} - 10px)`,
            zIndex: 1001,
            width: '20px',
            height: '40px',
            borderRadius: '0 8px 8px 0',
            background: 'white',
            border: '1px solid var(--keka-border, #e9ecef)',
            borderLeft: 'none',
            color: 'var(--keka-text-secondary, #6c757d)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '2px 0 5px rgba(0,0,0,0.05)',
            padding: 0,
            transition: 'left 0.25s ease'
          }}
        >
          {isOpen ? <FaChevronLeft size={10} /> : <FaChevronRight size={10} />}
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          onClick={closeSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 999
          }}
        />
      )}

      {/* Sidebar */}
      <div
        className="sidebar"
        style={{
          position: 'fixed',
          top: 0,
          left: isMobile ? (isOpen ? '0' : '-280px') : '0',
          width: isMobile ? SIDEBAR_OPEN : (isOpen ? SIDEBAR_OPEN : SIDEBAR_CLOSED),
          height: '100vh',
          backgroundColor: 'var(--keka-sidebar-bg, #fff)',
          borderRight: '1px solid var(--keka-border, #e9ecef)',
          zIndex: 1000,
          transition: 'width 0.25s ease, left 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isMobile && isOpen ? '0 0 15px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        {/* Logo Area */}
        <div style={{
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          padding: isOpen ? '0 16px' : '0',
          justifyContent: isOpen ? 'flex-start' : 'center',
          borderBottom: '1px solid var(--keka-border, #e9ecef)',
          flexShrink: 0
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0d6efd, #0b5ed7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '700',
            fontSize: '16px',
            flexShrink: 0
          }}>
            E
          </div>
          {isOpen && (
            <div style={{ marginLeft: '12px' }}>
              <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--keka-text-primary, #1a2c3e)', lineHeight: 1.2 }}>
                EMS Portal
              </div>
              <div style={{ fontSize: '10px', color: 'var(--keka-text-muted, #8a94a6)' }}>
                {user?.role === 'admin' ? 'Admin Dashboard' : 'Employee Dashboard'}
              </div>
            </div>
          )}
        </div>

        {/* Navigation - Scrollable */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: isOpen ? '12px 12px' : '12px 8px',
          scrollbarWidth: 'thin'
        }}>
          <SectionLabel label="Main" />
          <NavItem to="/" end icon={<FaTachometerAlt />} label="Dashboard" />

          {user?.role === 'admin' ? (
            <>
              <SectionLabel label="Management" />
              <NavItem to="/admin/employees" icon={<FaUsers />} label="Employees" />
              <NavItem to="/admin/leave-requests" icon={<FaCalendarAlt />} label="Leave Requests" />
              <NavItem to="/admin/attendance/reports" icon={<FaClock />} label="Attendance" />
              <NavItem to="/admin/ratings" icon={<FaStar />} label="Employee Ratings" />

              <SectionLabel label="Admin" />
              <NavItem to="/admin/send-update-request" icon={<FaPaperPlane />} label="Send Update Request" />
              <NavItem
                to="/admin/update-approvals"
                icon={<FaBell />}
                label="Update Approvals"
                badge={pendingCount}
                onClick={() => { setPendingCount(0); markNotificationsAsRead(); }}
              />
              <NavItem to="/admin/broadcast" icon={<FaBullhorn />} label="Broadcast" />
            </>
          ) : (
            <>
              <SectionLabel label="My Space" />
              <NavItem to="/profile" icon={<FaUserCircle />} label="My Profile" />
              <NavItem to="/attendance" icon={<FaFingerprint />} label="Daily Attendance" />
              <NavItem to="/apply-leave" icon={<FaCalendarAlt />} label="Apply Leave" />
              <NavItem to="/salary-slip" icon={<FaMoneyBill />} label="Salary Slip" />
              <NavItem to="/employee/update-requests" icon={<FaEdit />} label="Update Requests" />

              {(() => {
                const d = (employeeDesignation || '').toLowerCase();
                const isTL = d.includes('team leader') || d.includes('team manager') ||
                  d.includes('tl') || d.includes('lead') || d.includes('manager') ||
                  d.includes('head') || d.includes('supervisor');
                return isTL ? (
                  <>
                    <SectionLabel label="Team" />
                    <NavItem to="/manager/panel" icon={<FaUserTie />} label="My Team" />
                  </>
                ) : null;
              })()}
            </>
          )}
        </div>

        {/* User Footer */}
        <div style={{
          padding: isOpen ? '16px' : '12px',
          borderTop: '1px solid var(--keka-border, #e9ecef)',
          flexShrink: 0,
          backgroundColor: 'var(--keka-sidebar-bg, #fff)'
        }}>
          {isOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0d6efd, #0b5ed7)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600',
                flexShrink: 0
              }}>
                {getInitials(employeeName)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--keka-text-primary, #1a2c3e)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {employeeName}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--keka-text-muted, #8a94a6)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {user?.role === 'admin' ? 'Administrator' : `ID: ${user?.employeeId}`}
                </div>
              </div>
              <button
                onClick={logout}
                title="Logout"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  color: '#dc3545',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#dc3545';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = '#dc3545';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8f9fa';
                  e.currentTarget.style.color = '#dc3545';
                  e.currentTarget.style.borderColor = '#e9ecef';
                }}
              >
                <FaSignOutAlt size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0d6efd, #0b5ed7)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {getInitials(employeeName)}
              </div>
              <button
                onClick={logout}
                title="Logout"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  color: '#dc3545',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <FaSignOutAlt size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;