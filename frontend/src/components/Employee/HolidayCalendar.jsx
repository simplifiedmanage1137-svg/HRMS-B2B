// src/components/Employee/HolidayCalendar.jsx
import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Badge, Form, Row, Col, Button, 
  Alert, Spinner, InputGroup 
} from 'react-bootstrap';
import { 
  FaCalendarAlt, 
  FaDownload, 
  FaPrint, 
  FaSun, 
  FaUmbrellaBeach,
  FaSearch,
  FaTimes,
  FaInfoCircle,
  FaGlobe,
  FaFlag
} from 'react-icons/fa';
import { holidays, getHolidaysByRegion, getHolidaysByYear } from '../../data/holidays';
import PropTypes from 'prop-types';

const HolidayCalendar = ({ 
  employeeRegion = 'All', 
  onHolidaySelect,
  maxHeight = '300px',
  showFilters = true 
}) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedRegion, setSelectedRegion] = useState(employeeRegion);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [filteredHolidays, setFilteredHolidays] = useState([]);

  const years = [2024, 2025, 2026, 2027, 2028];
  const regions = ['All', 'India', 'USA', 'Global'];

  useEffect(() => {
    filterHolidays();
  }, [selectedYear, selectedRegion, searchTerm]);

  const filterHolidays = () => {
    setLoading(true);
    
    // Get holidays by region and year
    let holidaysList = getHolidaysByRegion(selectedRegion)
      .filter(h => new Date(h.date).getFullYear() === selectedYear);

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      holidaysList = holidaysList.filter(h => 
        h.name.toLowerCase().includes(term) ||
        h.region.toLowerCase().includes(term) ||
        formatDate(h.date).toLowerCase().includes(term)
      );
    }

    setFilteredHolidays(holidaysList);
    setLoading(false);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  const handleRegionChange = (region) => {
    setSelectedRegion(region);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const getRegionBadge = (region) => {
    const colors = {
      'India': 'primary',
      'USA': 'danger',
      'Global': 'success'
    };
    
    const icons = {
      'India': <FaFlag className="me-1" size={10} />,
      'USA': <FaFlag className="me-1" size={10} />,
      'Global': <FaGlobe className="me-1" size={10} />
    };

    return (
      <Badge bg={colors[region] || 'secondary'} className="px-2 py-1">
        {icons[region]}
        {region}
      </Badge>
    );
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatShortDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    });
  };

  const handleDownload = () => {
    try {
      // Create CSV content
      const headers = ['Sr No', 'Date', 'Holiday', 'Region', 'Day'];
      const rows = filteredHolidays.map((h, index) => {
        const date = new Date(h.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        return [
          index + 1,
          formatDate(h.date),
          h.name,
          h.region,
          dayName
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Holidays_${selectedYear}_${selectedRegion}.csv`;
      a.click();
      
      setMessage({
        type: 'success',
        text: 'Holiday list downloaded successfully!'
      });
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    } catch (error) {
      console.error('Error downloading file:', error);
      setMessage({
        type: 'danger',
        text: 'Failed to download holiday list'
      });
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleHolidayClick = (holiday) => {
    if (onHolidaySelect) {
      onHolidaySelect(holiday);
    }
  };

  const getDayOfWeek = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const isUpcoming = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holidayDate = new Date(dateStr);
    holidayDate.setHours(0, 0, 0, 0);
    return holidayDate >= today;
  };

  return (
    <Card className="border-0 shadow-sm">
      {showMessage && (
        <Alert 
          variant={message.type} 
          className="mb-2 py-1 small mx-3 mt-2" 
          onClose={() => setShowMessage(false)} 
          dismissible
        >
          {message.type === 'success' && <FaInfoCircle className="me-2" size={12} />}
          {message.type === 'danger' && <FaTimes className="me-2" size={12} />}
          {message.text}
        </Alert>
      )}
      
      <Card.Header className="bg-gradient text-white py-2 d-flex justify-content-between align-items-center" 
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <h6 className="mb-0 small fw-semibold">
          <FaSun className="me-2" size={14} />
          Company Holidays {selectedYear}
        </h6>
        <Badge bg="light" text="dark" className="px-2 py-1 small">
          Total: {filteredHolidays.length} Holidays
        </Badge>
      </Card.Header>
      
      <Card.Body className="p-3">
        {/* Filters */}
        {showFilters && (
          <>
            <Row className="mb-3 g-2">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small text-muted">Year</Form.Label>
                  <Form.Select
                    size="sm"
                    value={selectedYear}
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                    className="bg-light border-0"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small text-muted">Region</Form.Label>
                  <Form.Select
                    size="sm"
                    value={selectedRegion}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    className="bg-light border-0"
                  >
                    {regions.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small text-muted">Search</Form.Label>
                  <InputGroup size="sm">
                    <InputGroup.Text className="bg-light border-0">
                      <FaSearch size={10} className="text-muted" />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search holidays..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-0 bg-light"
                    />
                    {searchTerm && (
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={clearSearch}
                        className="border-0"
                      >
                        <FaTimes size={10} />
                      </Button>
                    )}
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>

            {/* Active Filters */}
            {(searchTerm || selectedRegion !== 'All') && (
              <div className="d-flex align-items-center mb-2">
                <small className="text-muted me-2">Active filters:</small>
                {selectedRegion !== 'All' && (
                  <Badge bg="info" className="me-2 px-2 py-1">
                    Region: {selectedRegion}
                  </Badge>
                )}
                {searchTerm && (
                  <Badge bg="info" className="me-2 px-2 py-1">
                    Search: "{searchTerm}"
                  </Badge>
                )}
              </div>
            )}
          </>
        )}

        {/* Holiday Table */}
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" size="sm" />
            <p className="mt-2 text-muted small">Loading holidays...</p>
          </div>
        ) : (
          <div className="table-responsive" style={{ maxHeight, overflowY: 'auto' }}>
            <Table size="sm" className="mb-0">
              <thead className="bg-light sticky-top" style={{ top: 0, zIndex: 10 }}>
                <tr>
                  <th className="small fw-semibold text-dark text-center" style={{ width: '50px' }}>#</th>
                  <th className="small fw-semibold text-dark">Date</th>
                  <th className="small fw-semibold text-dark">Day</th>
                  <th className="small fw-semibold text-dark">Holiday</th>
                  <th className="small fw-semibold text-dark">Region</th>
                  <th className="small fw-semibold text-dark text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHolidays.length > 0 ? (
                  filteredHolidays.map((holiday, index) => {
                    const upcoming = isUpcoming(holiday.date);
                    const dayOfWeek = getDayOfWeek(holiday.date);
                    
                    return (
                      <tr 
                        key={index} 
                        onClick={() => handleHolidayClick(holiday)}
                        style={{ cursor: onHolidaySelect ? 'pointer' : 'default' }}
                        className={upcoming ? 'table-light' : ''}
                      >
                        <td className="small text-center">{index + 1}</td>
                        <td className="small">
                          {formatDate(holiday.date)}
                          <br />
                          <small className="text-muted">{formatShortDate(holiday.date)}</small>
                        </td>
                        <td className="small">{dayOfWeek}</td>
                        <td className="small fw-semibold">{holiday.name}</td>
                        <td>{getRegionBadge(holiday.region)}</td>
                        <td className="text-center">
                          {upcoming ? (
                            <Badge bg="success" pill className="px-2 py-1">
                              Upcoming
                            </Badge>
                          ) : (
                            <Badge bg="secondary" pill className="px-2 py-1">
                              Past
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      <FaSun size={30} className="text-muted mb-2 opacity-50" />
                      <p className="text-muted small mb-0">No holidays found</p>
                      {searchTerm && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={clearSearch}
                          className="mt-2"
                        >
                          Clear search
                        </Button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        )}

        {/* Summary */}
        {filteredHolidays.length > 0 && (
          <div className="mt-2 p-2 bg-light rounded small">
            <Row>
              <Col md={3}>
                <span className="text-muted">Total:</span>
                <strong className="ms-2">{filteredHolidays.length}</strong>
              </Col>
              <Col md={3}>
                <span className="text-muted">India:</span>
                <strong className="ms-2">
                  {filteredHolidays.filter(h => h.region === 'India').length}
                </strong>
              </Col>
              <Col md={3}>
                <span className="text-muted">USA:</span>
                <strong className="ms-2">
                  {filteredHolidays.filter(h => h.region === 'USA').length}
                </strong>
              </Col>
              <Col md={3}>
                <span className="text-muted">Global:</span>
                <strong className="ms-2">
                  {filteredHolidays.filter(h => h.region === 'Global').length}
                </strong>
              </Col>
            </Row>
            <Row className="mt-1">
              <Col md={6}>
                <small className="text-muted">
                  Upcoming: {filteredHolidays.filter(h => isUpcoming(h.date)).length}
                </small>
              </Col>
              <Col md={6}>
                <small className="text-muted">
                  Past: {filteredHolidays.filter(h => !isUpcoming(h.date)).length}
                </small>
              </Col>
            </Row>
          </div>
        )}

        {/* Download Buttons */}
        <div className="mt-3 d-flex justify-content-end gap-2">
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={handleDownload}
            disabled={filteredHolidays.length === 0}
          >
            <FaDownload className="me-1" size={10} />
            Download CSV
          </Button>
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={handlePrint}
            disabled={filteredHolidays.length === 0}
          >
            <FaPrint className="me-1" size={10} />
            Print
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

// PropTypes for better documentation
HolidayCalendar.propTypes = {
  employeeRegion: PropTypes.oneOf(['All', 'India', 'USA', 'Global']),
  onHolidaySelect: PropTypes.func,
  maxHeight: PropTypes.string,
  showFilters: PropTypes.bool
};

export default HolidayCalendar;