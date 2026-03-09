// components/Employee/HolidayCalendar.jsx
import React, { useState } from 'react';
import { Card, Table, Badge, Form, Row, Col, Button, Alert } from 'react-bootstrap';
import { FaCalendarAlt, FaDownload, FaPrint, FaSun, FaUmbrellaBeach } from 'react-icons/fa';
import { holidays, getHolidaysByRegion, getHolidaysByYear } from '../../data/holidays';

const HolidayCalendar = ({ employeeRegion = 'All', onHolidaySelect }) => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedRegion, setSelectedRegion] = useState(employeeRegion);
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');

    const years = [2026, 2027, 2028];
    const regions = ['All', 'India', 'USA', 'Global'];

    const filteredHolidays = getHolidaysByRegion(selectedRegion)
        .filter(h => new Date(h.date).getFullYear() === selectedYear);

    const handleYearChange = (year) => {
        setSelectedYear(year);
    };

    const handleRegionChange = (region) => {
        setSelectedRegion(region);
    };

    const getRegionBadge = (region) => {
        const colors = {
            'India': 'primary',
            'USA': 'danger',
            'Global': 'success'
        };
        return <Badge bg={colors[region] || 'secondary'}>{region}</Badge>;
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleDownload = () => {
        const csvContent = [
            ['Sr No', 'Date', 'Holiday', 'Region'].join(','),
            ...filteredHolidays.map((h, index) => 
                [index + 1, formatDate(h.date), h.name, h.region].join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Holidays_${selectedYear}.csv`;
        a.click();
        
        setMessage('Holiday list downloaded successfully!');
        setShowMessage(true);
        setTimeout(() => setShowMessage(false), 3000);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <Card className="shadow-sm border-0">
            {showMessage && (
                <Alert variant="success" className="mb-2 py-1 small" onClose={() => setShowMessage(false)} dismissible>
                    {message}
                </Alert>
            )}
            
            <Card.Header className="bg-dark text-white py-2 d-flex justify-content-between align-items-center">
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
                <Row className="mb-3 g-2">
                    <Col md={5}>
                        <Form.Group>
                            <Form.Label className="small text-muted">Year</Form.Label>
                            <Form.Select
                                size="sm"
                                value={selectedYear}
                                onChange={(e) => handleYearChange(parseInt(e.target.value))}
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={5}>
                        <Form.Group>
                            <Form.Label className="small text-muted">Region</Form.Label>
                            <Form.Select
                                size="sm"
                                value={selectedRegion}
                                onChange={(e) => handleRegionChange(e.target.value)}
                            >
                                {regions.map(region => (
                                    <option key={region} value={region}>{region}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={2} className="d-flex align-items-end">
                        <Button variant="outline-primary" size="sm" onClick={handleDownload} className="w-100">
                            <FaDownload className="me-1" size={10} />
                            CSV
                        </Button>
                    </Col>
                </Row>

                {/* Holiday Table */}
                <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    <Table size="sm" className="mb-0 ">
                        <thead className="bg-light sticky-top" style={{ top: 0, zIndex: 10 }}>
                            <tr>
                                <th className="small fw-semibold text-dark" style={{ width: '50px' }}>Sr No</th>
                                <th className="small fw-semibold text-dark">Date</th>
                                <th className="small fw-semibold text-dark">Holiday</th>
                                <th className="small fw-semibold text-dark">Region</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHolidays.length > 0 ? (
                                filteredHolidays.map((holiday, index) => (
                                    <tr key={index}>
                                        <td className="small px-3 py-2">
                                                {index + 1}
                                        </td>
                                        <td className="small">{formatDate(holiday.date)}</td>
                                        <td className="small fw-semibold">{holiday.name}</td>
                                        <td>{getRegionBadge(holiday.region)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="text-center py-3">
                                        <p className="text-muted small mb-0">No holidays found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </div>

                {/* Summary */}
                <div className="mt-2 p-2 bg-light rounded small">
                    <Row>
                        <Col md={4}>
                            <span className="text-muted">Total:</span>
                            <strong className="ms-2">{filteredHolidays.length}</strong>
                        </Col>
                        <Col md={4}>
                            <span className="text-muted">India:</span>
                            <strong className="ms-2">
                                {filteredHolidays.filter(h => h.region === 'India').length}
                            </strong>
                        </Col>
                        <Col md={4}>
                            <span className="text-muted">USA:</span>
                            <strong className="ms-2">
                                {filteredHolidays.filter(h => h.region === 'USA').length}
                            </strong>
                        </Col>
                    </Row>
                </div>
            </Card.Body>
        </Card>
    );
};

export default HolidayCalendar;