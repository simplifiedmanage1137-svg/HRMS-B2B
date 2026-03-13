// src/components/Admin/GeofenceSettings.jsx
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Alert, Modal, Spinner, Badge } from 'react-bootstrap';
import { FaMapMarkerAlt, FaEdit, FaTrash, FaPlus, FaCheck, FaTimes } from 'react-icons/fa';
import axios from '../../config/axios';
import API_ENDPOINTS from '../../config/api';

const GeofenceSettings = () => {
  const [geofences, setGeofences] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    location_name: '',
    latitude: '',
    longitude: '',
    radius_meters: 50,
    is_active: true
  });

  useEffect(() => {
    fetchGeofences();
  }, []);

  const fetchGeofences = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.GEOFENCE_LIST);
      setGeofences(response.data);
      setMessage({ type: '', text: '' });
    } catch (error) {
      console.error('Error fetching geofences:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Failed to load geofences'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.location_name.trim()) {
      setMessage({ type: 'danger', text: 'Location name is required' });
      return;
    }
    if (!formData.latitude || isNaN(formData.latitude)) {
      setMessage({ type: 'danger', text: 'Valid latitude is required' });
      return;
    }
    if (!formData.longitude || isNaN(formData.longitude)) {
      setMessage({ type: 'danger', text: 'Valid longitude is required' });
      return;
    }
    if (formData.radius_meters < 10) {
      setMessage({ type: 'danger', text: 'Radius must be at least 10 meters' });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      if (editingGeofence) {
        await axios.put(API_ENDPOINTS.GEOFENCE_UPDATE(editingGeofence.id), formData);
        setMessage({ type: 'success', text: 'Geofence updated successfully!' });
      } else {
        await axios.post(API_ENDPOINTS.GEOFENCE_CREATE, formData);
        setMessage({ type: 'success', text: 'Geofence added successfully!' });
      }
      
      await fetchGeofences();
      
      // Close modal after success
      setTimeout(() => {
        setShowModal(false);
        resetForm();
        setMessage({ type: '', text: '' });
      }, 1500);
      
    } catch (error) {
      console.error('Error saving geofence:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Failed to save geofence'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, locationName) => {
    if (window.confirm(`Are you sure you want to delete "${locationName}"?`)) {
      try {
        setLoading(true);
        await axios.delete(API_ENDPOINTS.GEOFENCE_DELETE(id));
        setMessage({
          type: 'success',
          text: 'Geofence deleted successfully!'
        });
        await fetchGeofences();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
        
      } catch (error) {
        console.error('Error deleting geofence:', error);
        setMessage({
          type: 'danger',
          text: error.response?.data?.message || 'Failed to delete geofence'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      location_name: '',
      latitude: '',
      longitude: '',
      radius_meters: 50,
      is_active: true
    });
    setEditingGeofence(null);
  };

  const handleEdit = (geofence) => {
    setEditingGeofence(geofence);
    setFormData({
      location_name: geofence.location_name || '',
      latitude: geofence.latitude || '',
      longitude: geofence.longitude || '',
      radius_meters: geofence.radius_meters || 50,
      is_active: geofence.is_active !== undefined ? geofence.is_active : true
    });
    setShowModal(true);
    setMessage({ type: '', text: '' });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <FaMapMarkerAlt className="me-2 text-primary" />
          Geofence Settings
        </h2>
        <Badge bg="secondary" pill className="px-3 py-2">
          Total: {geofences.length} Locations
        </Badge>
      </div>

      {/* Message Alert */}
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

      {/* Add Button */}
      <div className="mb-3">
        <Button 
          variant="primary" 
          size="sm"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <FaPlus className="me-2" />
          Add New Location
        </Button>
      </div>

      {/* Geofence List */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-light py-3">
          <h5 className="mb-0">Location List</h5>
        </Card.Header>
        <Card.Body className="p-0">
          {loading && geofences.length === 0 ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" size="sm" />
              <p className="mt-2 text-muted small">Loading geofences...</p>
            </div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table hover striped className="mb-0 small">
                <thead className="bg-light sticky-top" style={{ top: 0, zIndex: 10 }}>
                  <tr>
                    <th className="text-nowrap text-dark fw-normal">#</th>
                    <th className="text-nowrap text-dark fw-normal">Location Name</th>
                    <th className="text-nowrap text-dark fw-normal">Latitude</th>
                    <th className="text-nowrap text-dark fw-normal">Longitude</th>
                    <th className="text-nowrap text-dark fw-normal">Radius (m)</th>
                    <th className="text-nowrap text-dark fw-normal">Status</th>
                    <th className="text-nowrap text-dark fw-normal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {geofences.length > 0 ? (
                    geofences.map((g, index) => (
                      <tr key={g.id}>
                        <td>{index + 1}</td>
                        <td className="fw-semibold">{g.location_name}</td>
                        <td>{g.latitude}</td>
                        <td>{g.longitude}</td>
                        <td>
                          <Badge bg="info" pill>
                            {g.radius_meters}m
                          </Badge>
                        </td>
                        <td>
                          <Badge 
                            bg={g.is_active ? 'success' : 'secondary'} 
                            pill
                            className="px-2 py-1"
                          >
                            {g.is_active ? (
                              <><FaCheck className="me-1" size={10} /> Active</>
                            ) : (
                              <><FaTimes className="me-1" size={10} /> Inactive</>
                            )}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button 
                              variant="outline-warning" 
                              size="sm"
                              className="px-2"
                              onClick={() => handleEdit(g)}
                              title="Edit Location"
                            >
                              <FaEdit size={12} />
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              className="px-2"
                              onClick={() => handleDelete(g.id, g.location_name)}
                              title="Delete Location"
                            >
                              <FaTrash size={12} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-5">
                        <FaMapMarkerAlt size={40} className="text-muted mb-3 opacity-50" />
                        <p className="text-muted small mb-0">No geofence locations found</p>
                        <p className="text-muted small">
                          Click "Add New Location" to create your first geofence.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="md" centered>
        <Modal.Header closeButton className={`py-2 ${editingGeofence ? 'bg-warning' : 'bg-primary'} text-white`}>
          <Modal.Title as="h6" className="mb-0 small fw-semibold">
            <FaMapMarkerAlt className="me-2" size={14} />
            {editingGeofence ? 'Edit Location' : 'Add New Location'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          {message.text && (
            <Alert variant={message.type} className="py-2 small mb-3">
              {message.text}
            </Alert>
          )}

          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Location Name</Form.Label>
              <Form.Control
                type="text"
                size="sm"
                value={formData.location_name}
                onChange={(e) => setFormData({...formData, location_name: e.target.value})}
                placeholder="e.g., Head Office, Branch Office"
              />
            </Form.Group>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Latitude</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.000001"
                    size="sm"
                    value={formData.latitude}
                    onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                    placeholder="e.g., 19.0760"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Longitude</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.000001"
                    size="sm"
                    value={formData.longitude}
                    onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                    placeholder="e.g., 72.8777"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Radius (meters)</Form.Label>
              <Form.Control
                type="number"
                size="sm"
                min="10"
                value={formData.radius_meters}
                onChange={(e) => setFormData({...formData, radius_meters: parseInt(e.target.value) || 50})}
                placeholder="e.g., 50"
              />
              <Form.Text className="text-muted small">
                Minimum radius: 10 meters
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="active-switch"
                label="Active Location"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              />
            </Form.Group>
          </Form>

          <div className="bg-light p-2 rounded small text-muted">
            <FaMapMarkerAlt className="me-1 text-primary" size={12} />
            <small>
              <strong>Note:</strong> Geofences define the area where employees can mark their attendance.
              Employees must be within this radius to clock in/out.
            </small>
          </div>
        </Modal.Body>
        <Modal.Footer className="py-2">
          <Button variant="secondary" size="sm" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button 
            variant={editingGeofence ? 'warning' : 'primary'} 
            size="sm"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
                {editingGeofence ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              <>
                <FaPlus className="me-2" size={10} />
                {editingGeofence ? 'Update Location' : 'Add Location'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default GeofenceSettings;