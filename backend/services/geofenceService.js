const db = require('../config/database');

class GeofenceService {
    
    // Calculate distance between two coordinates using Haversine formula
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    }

    // Check if coordinates are within any active geofence
    static async checkGeofence(latitude, longitude) {
        try {
            console.log('🔍 Checking geofence for:', { latitude, longitude });
            
            const [geofences] = await db.query(
                'SELECT * FROM geofence_settings WHERE is_active = true'
            );

            console.log('📊 Active geofences found:', geofences.length);

            if (geofences.length === 0) {
                console.log('⚠️ No active geofences found in database');
                return {
                    inside: false,
                    geofence: null,
                    distance: null,
                    error: 'No geofence configured'
                };
            }

            for (const fence of geofences) {
                const distance = this.calculateDistance(
                    latitude, longitude,
                    parseFloat(fence.latitude), parseFloat(fence.longitude)
                );

                console.log(`📍 Distance to ${fence.location_name}:`, distance.toFixed(2), 'meters');

                if (distance <= fence.radius_meters) {
                    console.log(`✅ Inside geofence: ${fence.location_name}`);
                    return {
                        inside: true,
                        geofence: fence,
                        distance: Math.round(distance * 100) / 100,
                        location_name: fence.location_name
                    };
                }
            }

            console.log('❌ Outside all geofences');
            return {
                inside: false,
                geofence: null,
                distance: null
            };

        } catch (error) {
            console.error('❌ Geofence check error:', error);
            throw error;
        }
    }

    // Get all active geofences
    static async getActiveGeofences() {
        try {
            const [geofences] = await db.query(
                'SELECT * FROM geofence_settings WHERE is_active = true'
            );
            return geofences;
        } catch (error) {
            console.error('Error fetching geofences:', error);
            throw error;
        }
    }
}

module.exports = GeofenceService;