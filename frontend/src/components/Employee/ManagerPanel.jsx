// src/components/Employee/ManagerPanel.jsx
import React, { useState } from 'react';
import { FaCalendarAlt, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import ManagerLeaveRequests from './ManagerLeaveRequests';
import ManagerShiftUpdate from './ManagerShiftUpdate';
import SendNotice from '../Admin/SendNotice';

const TABS = [
  { key: 'leaves', label: 'Team Leaves', icon: <FaCalendarAlt size={13} /> },
  { key: 'shifts', label: 'Team Shifts', icon: <FaClock size={13} /> },
  { key: 'notice', label: 'Send Notice', icon: <FaExclamationTriangle size={13} /> },
];

const ManagerPanel = () => {
  const [activeTab, setActiveTab] = useState('leaves');

  return (
    <div className="p-2 p-md-3 p-lg-4" style={{ backgroundColor: '#f8f9fc', minHeight: '100vh' }}>
      <h5 className="mb-3 d-flex align-items-center">
        <FaCalendarAlt className="me-2 text-primary" />
        My Team
      </h5>

      {/* Custom Tab Bar */}
      <div className="d-flex border-bottom mb-3" style={{ gap: '4px' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="d-flex align-items-center gap-2"
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #0d6efd' : '3px solid transparent',
              background: 'transparent',
              color: activeTab === tab.key ? '#0d6efd' : '#6c757d',
              fontWeight: activeTab === tab.key ? '600' : '400',
              fontSize: '14px',
              cursor: 'pointer',
              borderRadius: '0',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'leaves' && <ManagerLeaveRequests embedded />}
        {activeTab === 'shifts' && <ManagerShiftUpdate embedded />}
        {activeTab === 'notice' && <SendNotice embedded />}
      </div>
    </div>
  );
};

export default ManagerPanel;
