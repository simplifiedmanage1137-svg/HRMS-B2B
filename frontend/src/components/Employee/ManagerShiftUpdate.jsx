// src/components/Employee/ManagerShiftUpdate.jsx
import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner, Badge, Table, ButtonGroup } from 'react-bootstrap';
import {
  FaClock, FaUserTie, FaCheckCircle, FaExclamationTriangle,
  FaSyncAlt, FaUsers, FaUser
} from 'react-icons/fa';
import axios from '../../config/axios';
import API_ENDPOINTS from '../../config/api';

const SHIFT_OPTIONS = [
  '9:00 AM - 6:00 PM',
  '10:00 AM - 7:00 PM',
  '11:00 AM - 8:00 PM',
  '8:00 AM - 5:00 PM',
  '7:00 AM - 4:00 PM',
  '12:00 PM - 9:00 PM',
  '2:00 PM - 11:00 PM',
  '6:00 PM - 3:00 AM',
  '10:00 PM - 7:00 AM',
];

// Reusable shift picker
const ShiftPicker = ({ shift, setShift, custom, setCustom, useCustom, setUseCustom }) => (
  <>
    <Form.Check
      type="checkbox"
      label="Enter custom shift timing"
      checked={useCustom}
      onChange={e => { setUseCustom(e.target.checked); setShift(''); setCustom(''); }}
      className="mb-2 small"
    />
    {useCustom ? (
      <Form.Control
        type="text"
        size="sm"
        placeholder="e.g. 9:00 AM - 6:00 PM"
        value={custom}
        onChange={e => setCustom(e.target.value)}
      />
    ) : (
      <Form.Select size="sm" value={shift} onChange={e => setShift(e.target.value)}>
        <option value="">-- Select shift --</option>
        {SHIFT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
      </Form.Select>
    )}
    <Form.Text className="text-muted small">Format: HH:MM AM/PM - HH:MM AM/PM</Form.Text>
  </>
);

const ManagerShiftUpdate = ({ embedded = false }) => {
  const [team, setTeam]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk'
  const [message, setMessage] = useState({ type: '', text: '' });

  // ── Single update state ──
  const [singleEmpId,   setSingleEmpId]   = useState('');
  const [singleShift,   setSingleShift]   = useState('');
  const [singleCustom,  setSingleCustom]  = useState('');
  const [singleUseCustom, setSingleUseCustom] = useState(false);
  const [singleUpdating, setSingleUpdating]   = useState(false);

  // ── Bulk update state ──
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [bulkShift,    setBulkShift]    = useState('');
  const [bulkCustom,   setBulkCustom]   = useState('');
  const [bulkUseCustom, setBulkUseCustom] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  useEffect(() => { fetchTeam(); }, []);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_ENDPOINTS.MANAGER_TEAM);
      setTeam(res.data.team || []);
      setSelectedIds(new Set());
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to load team' });
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // ── Single update ──
  const handleSingleUpdate = async () => {
    const shift = singleUseCustom ? singleCustom.trim() : singleShift;
    if (!singleEmpId) return showMsg('warning', 'Please select an employee.');
    if (!shift)       return showMsg('warning', 'Please select or enter a shift timing.');

    setSingleUpdating(true);
    try {
      const res = await axios.put(API_ENDPOINTS.MANAGER_UPDATE_SHIFT(singleEmpId), { shift_timing: shift });
      setTeam(prev => prev.map(e => e.employee_id === singleEmpId ? { ...e, shift_timing: shift } : e));
      showMsg('success', res.data.message);
      setSingleEmpId(''); setSingleShift(''); setSingleCustom(''); setSingleUseCustom(false);
    } catch (err) {
      showMsg('danger', err.response?.data?.message || 'Failed to update shift.');
    } finally {
      setSingleUpdating(false);
    }
  };

  // ── Bulk update ──
  const toggleEmployee = (id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    setSelectedIds(selectedIds.size === team.length ? new Set() : new Set(team.map(e => e.employee_id)));
  };

  const handleBulkUpdate = async () => {
    const shift = bulkUseCustom ? bulkCustom.trim() : bulkShift;
    if (selectedIds.size === 0) return showMsg('warning', 'Select at least one employee.');
    if (!shift)                 return showMsg('warning', 'Please select or enter a shift timing.');

    setBulkUpdating(true);
    const ids = [...selectedIds];
    let ok = 0; const failed = [];

    await Promise.all(ids.map(async id => {
      try {
        await axios.put(API_ENDPOINTS.MANAGER_UPDATE_SHIFT(id), { shift_timing: shift });
        ok++;
      } catch {
        const e = team.find(x => x.employee_id === id);
        failed.push(e ? `${e.first_name} ${e.last_name}` : id);
      }
    }));

    setTeam(prev => prev.map(e =>
      selectedIds.has(e.employee_id) && !failed.some(f => f.includes(e.first_name))
        ? { ...e, shift_timing: shift } : e
    ));

    if (failed.length === 0) showMsg('success', `Shift updated to "${shift}" for ${ok} employee${ok > 1 ? 's' : ''}.`);
    else showMsg('warning', `Updated ${ok}. Failed: ${failed.join(', ')}.`);

    setSelectedIds(new Set()); setBulkShift(''); setBulkCustom(''); setBulkUseCustom(false);
    setBulkUpdating(false);
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
      <Spinner animation="border" variant="primary" />
    </div>
  );

  const allSelected  = team.length > 0 && selectedIds.size === team.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < team.length;
  const bulkShiftVal = bulkUseCustom ? bulkCustom.trim() : bulkShift;
  const selectedEmp  = team.find(e => e.employee_id === singleEmpId);

  return (
    <div className={embedded ? '' : 'p-2 p-md-3 p-lg-4'}>
      {!embedded && (
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h5 className="mb-0 d-flex align-items-center">
            <FaClock className="me-2 text-primary" />
            Update Team Shift Timing
          </h5>
          <Button variant="outline-primary" size="sm" onClick={fetchTeam}>
            <FaSyncAlt className="me-1" size={12} /> Refresh
          </Button>
        </div>
      )}
      {embedded && (
        <div className="d-flex justify-content-end mb-3">
          <Button variant="outline-primary" size="sm" onClick={fetchTeam}>
            <FaSyncAlt className="me-1" size={12} /> Refresh
          </Button>
        </div>
      )}

      {message.text && (
        <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })} className="mb-3 py-2 small">
          {message.type === 'success' ? <FaCheckCircle className="me-2" /> : <FaExclamationTriangle className="me-2" />}
          {message.text}
        </Alert>
      )}

      {team.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center py-5">
            <FaUserTie size={40} className="text-muted mb-3 opacity-50" />
            <p className="text-muted mb-0">No team members found under your reporting.</p>
          </Card.Body>
        </Card>
      ) : (
        <>
          {/* Tab switcher */}
          <ButtonGroup className="mb-3">
            <Button
              variant={activeTab === 'single' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => setActiveTab('single')}
            >
              <FaUser className="me-2" size={12} />
              Single Update
            </Button>
            <Button
              variant={activeTab === 'bulk' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => setActiveTab('bulk')}
            >
              <FaUsers className="me-2" size={12} />
              Bulk Update
            </Button>
          </ButtonGroup>

          {/* ══════════ SINGLE UPDATE TAB ══════════ */}
          {activeTab === 'single' && (
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-light py-2">
                <h6 className="mb-0 small fw-semibold">
                  <FaUser className="me-2" size={13} />
                  Update Single Employee Shift
                </h6>
              </Card.Header>
              <Card.Body className="p-3">
                <Form>
                  {/* Employee dropdown */}
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-semibold text-muted">
                      Select Employee <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select size="sm" value={singleEmpId} onChange={e => setSingleEmpId(e.target.value)}>
                      <option value="">-- Select team member --</option>
                      {team.map(emp => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_id}) — {emp.shift_timing || 'No shift'}
                        </option>
                      ))}
                    </Form.Select>
                    {selectedEmp && (
                      <div className="mt-1 small text-muted">
                        <strong>Dept:</strong> {selectedEmp.department} &nbsp;|&nbsp;
                        <strong>Current Shift:</strong>{' '}
                        <Badge bg="info" className="px-2">{selectedEmp.shift_timing || 'Not set'}</Badge>
                      </div>
                    )}
                  </Form.Group>

                  {/* Shift picker */}
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-semibold text-muted">
                      New Shift Timing <span className="text-danger">*</span>
                    </Form.Label>
                    <ShiftPicker
                      shift={singleShift}       setShift={setSingleShift}
                      custom={singleCustom}     setCustom={setSingleCustom}
                      useCustom={singleUseCustom} setUseCustom={setSingleUseCustom}
                    />
                  </Form.Group>

                  <Button
                    variant="primary" size="sm"
                    onClick={handleSingleUpdate}
                    disabled={singleUpdating || !singleEmpId || !(singleUseCustom ? singleCustom.trim() : singleShift)}
                    className="px-4"
                  >
                    {singleUpdating
                      ? <><Spinner size="sm" animation="border" className="me-2" />Updating...</>
                      : <><FaClock className="me-2" size={12} />Update Shift</>}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          )}

          {/* ══════════ BULK UPDATE TAB ══════════ */}
          {activeTab === 'bulk' && (
            <>
              {/* Shift picker card */}
              <Card className="border-0 shadow-sm mb-3">
                <Card.Header className="bg-light py-2">
                  <h6 className="mb-0 small fw-semibold">
                    <FaClock className="me-2" size={13} />
                    New Shift Timing (applies to all selected)
                  </h6>
                </Card.Header>
                <Card.Body className="p-3">
                  <div style={{ maxWidth: '320px' }}>
                    <ShiftPicker
                      shift={bulkShift}       setShift={setBulkShift}
                      custom={bulkCustom}     setCustom={setBulkCustom}
                      useCustom={bulkUseCustom} setUseCustom={setBulkUseCustom}
                    />
                  </div>
                </Card.Body>
              </Card>

              {/* Team table with checkboxes */}
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-light py-2 d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <h6 className="mb-0 small fw-semibold">
                    <FaUsers className="me-2" size={13} />
                    Select Employees
                    {selectedIds.size > 0 && (
                      <Badge bg="primary" pill className="ms-2">{selectedIds.size} selected</Badge>
                    )}
                  </h6>
                  <Button
                    variant="primary" size="sm"
                    onClick={handleBulkUpdate}
                    disabled={bulkUpdating || selectedIds.size === 0 || !bulkShiftVal}
                    className="d-inline-flex align-items-center"
                  >
                    {bulkUpdating
                      ? <><Spinner size="sm" animation="border" className="me-2" />Updating...</>
                      : <><FaClock className="me-2" size={12} />
                          Update {selectedIds.size > 0 ? `${selectedIds.size} Employee${selectedIds.size > 1 ? 's' : ''}` : 'Selected'}
                        </>}
                  </Button>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="table-responsive">
                    <Table hover size="sm" className="mb-0">
                      <thead className="bg-light sticky-top" style={{ top: 0, zIndex: 10 }}>
                        <tr className="small">
                          <th className="text-center" style={{ width: '40px' }}>
                            <Form.Check
                              type="checkbox"
                              checked={allSelected}
                              ref={el => { if (el) el.indeterminate = someSelected; }}
                              onChange={toggleAll}
                              title={allSelected ? 'Deselect all' : 'Select all'}
                            />
                          </th>
                          <th className="fw-normal">Employee</th>
                          <th className="fw-normal d-none d-md-table-cell">Department</th>
                          <th className="fw-normal d-none d-sm-table-cell">Designation</th>
                          <th className="fw-normal">Current Shift</th>
                        </tr>
                      </thead>
                      <tbody>
                        {team.map(emp => {
                          const checked = selectedIds.has(emp.employee_id);
                          return (
                            <tr
                              key={emp.employee_id}
                              className={checked ? 'table-primary' : ''}
                              style={{ cursor: 'pointer' }}
                              onClick={() => toggleEmployee(emp.employee_id)}
                            >
                              <td className="text-center" onClick={e => e.stopPropagation()}>
                                <Form.Check
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleEmployee(emp.employee_id)}
                                />
                              </td>
                              <td className="small">
                                <div className="fw-semibold">{emp.first_name} {emp.last_name}</div>
                                <small className="text-muted">{emp.employee_id}</small>
                              </td>
                              <td className="small d-none d-md-table-cell">{emp.department}</td>
                              <td className="small d-none d-sm-table-cell">{emp.designation}</td>
                              <td className="small">
                                <Badge bg={checked && bulkShiftVal ? 'success' : 'info'} className="px-2 py-1">
                                  <FaClock className="me-1" size={10} />
                                  {checked && bulkShiftVal ? bulkShiftVal : (emp.shift_timing || 'Not set')}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                  {selectedIds.size > 0 && bulkShiftVal && (
                    <div className="px-3 py-2 bg-light border-top small text-muted">
                      <FaCheckCircle className="me-1 text-success" size={12} />
                      <strong>{selectedIds.size}</strong> employee{selectedIds.size > 1 ? 's' : ''} will be updated to:{' '}
                      <Badge bg="success" className="ms-1">{bulkShiftVal}</Badge>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ManagerShiftUpdate;
