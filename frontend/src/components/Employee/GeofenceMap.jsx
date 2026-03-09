import React from 'react';
import { Card } from 'react-bootstrap';

const GeofenceMap = ({ userLocation, officeCoords }) => {
  // Calculate if user is inside geofence
  const isInside = userLocation ? 
    calculateDistance(
      userLocation.latitude, userLocation.longitude,
      officeCoords.latitude, officeCoords.longitude
    ) <= officeCoords.radius : false;

  return (
    <Card className="mb-3 bg-light">
      <Card.Body>
        <h6 className="mb-3">
          <span className="text-primary">📍</span> Geofence Status
        </h6>
        
        <div className="position-relative" style={{ height: '200px', background: '#e9ecef', borderRadius: '8px' }}>
          {/* Office Center */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '10px',
            height: '10px',
            background: '#dc3545',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 3
          }} />
          
          {/* 50m Radius Circle */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100px',
            height: '100px',
            border: '2px solid #28a745',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2
          }} />
          
          {/* User Location (if available) */}
          {userLocation && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '8px',
              height: '8px',
              background: isInside ? '#28a745' : '#ffc107',
              borderRadius: '50%',
              transform: `translate(-50%, -50%) translate(${getOffset(userLocation, officeCoords).x}px, ${getOffset(userLocation, officeCoords).y}px)`,
              zIndex: 4,
              boxShadow: '0 0 10px rgba(0,0,0,0.3)'
            }} />
          )}
        </div>

        <div className="mt-3 small">
          <div><span className="text-danger">●</span> Office Center</div>
          <div><span className="text-success">○</span> 50m Geofence Radius</div>
          {userLocation && (
            <div>
              <span className={isInside ? 'text-success' : 'text-warning'}>●</span> You are {isInside ? 'INSIDE' : 'OUTSIDE'} the geofence
              <br />
              <small>Distance: {calculateDistance(
                userLocation.latitude, userLocation.longitude,
                officeCoords.latitude, officeCoords.longitude
              ).toFixed(2)}m</small>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

// Helper function to calculate pixel offset for user location
const getOffset = (userLoc, officeLoc) => {
  const maxOffset = 40; // Maximum pixels offset for 100m
  const distance = calculateDistance(
    userLoc.latitude, userLoc.longitude,
    officeLoc.latitude, officeLoc.longitude
  );
  
  // Calculate direction (simplified - assumes lat/lng are roughly equal scale)
  const latDiff = userLoc.latitude - officeLoc.latitude;
  const lngDiff = userLoc.longitude - officeLoc.longitude;
  const angle = Math.atan2(latDiff, lngDiff);
  
  // Scale distance to pixels (50m = 50px in our visualization)
  const pixelDistance = Math.min(distance, 100) * 1; // 1m = 1px up to 100px
  
  return {
    x: Math.cos(angle) * pixelDistance,
    y: Math.sin(angle) * pixelDistance
  };
};

// Distance calculation function (same as in Attendance component)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export default GeofenceMap;