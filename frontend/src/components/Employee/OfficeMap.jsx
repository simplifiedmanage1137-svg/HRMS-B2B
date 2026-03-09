import React from 'react';
import { Card } from 'react-bootstrap';

const OfficeMap = ({ userLocation, officeCoords }) => {
  // This uses a static map image from Google Maps Static API
  // You'll need a Google Maps API key for this
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${officeCoords.latitude},${officeCoords.longitude}&zoom=18&size=600x300&maptype=satellite&markers=color:red%7C${officeCoords.latitude},${officeCoords.longitude}&circle:radius:50%7C${officeCoords.latitude},${officeCoords.longitude}&key=YOUR_GOOGLE_MAPS_API_KEY`;

  return (
    <Card className="mb-3">
      <Card.Body>
        <h6>Office Location (50m radius)</h6>
        <img 
          src={mapUrl} 
          alt="Office Location" 
          className="img-fluid rounded"
          style={{ width: '100%', height: 'auto' }}
        />
        <div className="mt-2 small text-muted">
          <div>📍 Red marker: Your office</div>
          <div>⭕ Circle: 50 meter geofence radius</div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default OfficeMap;