// src/components/Admin/AdminBroadcast.jsx
import React, { useState } from 'react';
import { FaExclamationTriangle, FaBullhorn } from 'react-icons/fa';
import SendNotice from './SendNotice';
import Announcements from './Announcements';

const TABS = [
  { key: 'notice',        label: 'Send Notice / Warning', icon: <FaExclamationTriangle size={13} /> },
  { key: 'announcement',  label: 'Announcements',         icon: <FaBullhorn size={13} /> },
];

const AdminBroadcast = () => {
  const [activeTab, setActiveTab] = useState('notice');

  return (
    <div className="p-2 p-md-3 p-lg-4" style={{ backgroundColor: '#f8f9fc', minHeight: '100vh' }}>
      <h5 className="mb-3 d-flex align-items-center">
        <FaBullhorn className="me-2 text-primary" />
        Broadcast Center
      </h5>

      {/* Tab Bar */}
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
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'notice'       && <SendNotice embedded />}
      {activeTab === 'announcement' && <Announcements embedded />}
    </div>
  );
};

export default AdminBroadcast;
