// components/Common/GlobalNotification.jsx
import React from 'react';
import { Alert } from 'react-bootstrap';
import { useNotification } from '../../context/NotificationContext';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';

const GlobalNotification = () => {
  const { notification } = useNotification();

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <FaCheckCircle className="me-2" size={18} />;
      case 'danger':
        return <FaExclamationTriangle className="me-2" size={18} />;
      case 'info':
        return <FaInfoCircle className="me-2" size={18} />;
      default:
        return null;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      maxWidth: '400px'
    }}>
      <Alert 
        variant={notification.type} 
        className="shadow-lg border-0"
        style={{
          animation: 'slideIn 0.3s ease-out'
        }}
      >
        <div className="d-flex align-items-center">
          {getIcon()}
          <span>{notification.message}</span>
        </div>
      </Alert>
    </div>
  );
};

export default GlobalNotification;