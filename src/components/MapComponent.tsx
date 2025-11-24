'use client';

import { useState, useEffect, useCallback, Fragment, useMemo, useRef } from 'react';
import { GoogleMap, Marker, useJsApiLoader, InfoWindow } from '@react-google-maps/api';

// ============================================================================
// CONSTANTS - Simple values that don't change
// ============================================================================
const DEFAULT_CENTER = { lat: 49.4229, lng: 26.9871 };
const MAP_ZOOM = 13;
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// ============================================================================
// TYPES - What data looks like
// ============================================================================
interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  status: 'green' | 'red' | 'orange';
  timestamp: number;
  lastActionTimestamp?: number;
  confirmationCount?: number;
}

interface MarkerDetails {
  id: string;
  status: 'green' | 'red' | 'orange';
  confirmationCount: number;
  redPressCount: number;
  greenPressCount: number;
  latestEvent?: {
    userEmail: string;
    userName?: string;
    voteType: 'red' | 'green';
    distance: number;
    timestamp: string | Date;
  };
}

interface MapComponentProps {
  userLocation: [number, number] | null;
  markers: MarkerData[];
}

// ============================================================================
// HELPER FUNCTIONS - Simple utilities
// ============================================================================

// Create a colored circle icon for markers
function createMarkerIcon(color: string) {
  return {
    path: 'M 0,0 m -10,0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0',
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale: 1,
    anchor: new google.maps.Point(10, 10),
  };
}


// Format time like "5m ago" or "2h ago"
function formatTime(timestamp: number | string | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function MapComponent({ userLocation, markers }: MapComponentProps) {
  // State - what can change
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [markerDetails, setMarkerDetails] = useState<MarkerDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const hasCenteredRef = useRef(false);
  const [markersKey, setMarkersKey] = useState(0); // Force re-render when markers change

  // Load Google Maps
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: API_KEY,
    libraries: ['geometry'],
  });

  // Calculate center ONCE - use user location if available, otherwise default
  // This value never changes after first calculation, so map won't re-center
  const mapCenter = useMemo(() => {
    // Only use userLocation if we haven't centered yet
    if (userLocation && !hasCenteredRef.current) {
      return { lat: userLocation[0], lng: userLocation[1] };
    }
    return DEFAULT_CENTER;
  }, [userLocation]);

  // Handle map load - center only once, then let user explore freely
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    // Center map only on first load
    if (!hasCenteredRef.current) {
      map.setCenter(mapCenter);
      hasCenteredRef.current = true;
    }
  }, [mapCenter]);

  // Create a stable string representation of markers for comparison
  const markersSignature = useMemo(() => {
    return markers.map(m => `${m.id}-${m.status}-${m.latitude}-${m.longitude}`).join('|');
  }, [markers]);

  // Force re-render of markers when markers array changes
  useEffect(() => {
    setMarkersKey(prev => prev + 1);
    // Close any open info windows when markers update
    if (selectedMarkerId) {
      // Check if the selected marker still exists
      const markerExists = markers.some(m => m.id === selectedMarkerId);
      if (!markerExists) {
        setSelectedMarkerId(null);
        setMarkerDetails(null);
      }
    }
  }, [markersSignature, selectedMarkerId, markers]);

  // When user clicks a marker, fetch its details
  const handleMarkerClick = useCallback(async (markerId: string) => {
    // If clicking same marker, close it
    if (selectedMarkerId === markerId) {
      setSelectedMarkerId(null);
      setMarkerDetails(null);
      return;
    }

    // Open this marker
    setSelectedMarkerId(markerId);
    setIsLoadingDetails(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/markers/${markerId}`);
      if (response.ok) {
        const data = await response.json();
        setMarkerDetails(data);
      }
    } catch (error) {
      console.error('Error loading marker details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [selectedMarkerId]);

  // Close popup when clicking map
  const handleMapClick = useCallback(() => {
    setSelectedMarkerId(null);
    setMarkerDetails(null);
  }, []);

  // Show loading screen while Google Maps loads
  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading map...</p>
      </div>
    );
  }

  // Create marker icons (only after Google Maps is loaded)
  // Regular markers are simple circles - distinct from user location pin
  const icons = {
    green: createMarkerIcon('#22c55e'),
    red: createMarkerIcon('#ef4444'),
    orange: createMarkerIcon('#f97316'),
  };

  // Render the map
  // Use DEFAULT_CENTER for the prop (static, never changes)
  // The actual centering happens in onLoad callback
  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={DEFAULT_CENTER}
      zoom={MAP_ZOOM}
      onLoad={handleMapLoad}
      onClick={handleMapClick}
      options={{
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
      }}
    >
      {/* Show user's current location with special distinct marker */}
      {userLocation && (
        <>
          {/* Outer pulsing ring - largest */}
          <Marker
            position={{ lat: userLocation[0], lng: userLocation[1] }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#3b82f6',
              fillOpacity: 0.15,
              strokeColor: '#3b82f6',
              strokeWeight: 2,
              strokeOpacity: 0.5,
              scale: 25,
              anchor: new google.maps.Point(0, 0),
            }}
            title="Your location"
            zIndex={1}
          />
          {/* Middle ring */}
          <Marker
            position={{ lat: userLocation[0], lng: userLocation[1] }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#3b82f6',
              fillOpacity: 0.3,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              scale: 18,
              anchor: new google.maps.Point(0, 0),
            }}
            title="Your location"
            zIndex={2}
          />
          {/* Inner ring */}
          <Marker
            position={{ lat: userLocation[0], lng: userLocation[1] }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#3b82f6',
              fillOpacity: 0.5,
              strokeColor: '#ffffff',
              strokeWeight: 3,
              scale: 12,
              anchor: new google.maps.Point(0, 0),
            }}
            title="Your location"
            zIndex={3}
          />
          {/* Center location pin icon - most distinct */}
          <Marker
            position={{ lat: userLocation[0], lng: userLocation[1] }}
            icon={{
              path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
              fillColor: '#2563eb',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
              scale: 1.5,
              anchor: new google.maps.Point(12, 24),
            }}
            title="Your location"
            zIndex={4}
          />
        </>
      )}

      {/* Show all markers from database */}
      {markers.map((marker) => {
        const isSelected = selectedMarkerId === marker.id;
        // Create a unique key that includes marker data to force re-render on changes
        const markerKey = `${marker.id}-${marker.status}-${marker.latitude}-${marker.longitude}-${markersKey}`;
        return (
          <Fragment key={markerKey}>
            <Marker
              key={markerKey}
              position={{ lat: marker.latitude, lng: marker.longitude }}
              icon={icons[marker.status]}
              title={`${marker.status} marker`}
              onClick={() => handleMarkerClick(marker.id)}
            />
            {/* Show popup when this marker is clicked */}
            {isSelected && markerDetails && (
              <InfoWindow
                position={{ lat: marker.latitude, lng: marker.longitude }}
                onCloseClick={() => {
                  setSelectedMarkerId(null);
                  setMarkerDetails(null);
                }}
              >
            <div className="p-3 min-w-[200px] max-w-[300px]">
              {isLoadingDetails ? (
                <p className="text-sm text-gray-600">Loading...</p>
              ) : (
                <>
                  {/* Marker status */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full ${
                        markerDetails.status === 'green' ? 'bg-green-500' :
                        markerDetails.status === 'red' ? 'bg-red-500' :
                        'bg-orange-500'
                      }`}></div>
                      <h3 className="font-bold text-lg capitalize">
                        {markerDetails.status} Marker
                      </h3>
                    </div>
                    {markerDetails.status === 'orange' && (
                      <p className="text-sm text-gray-600">
                        Confirmations: {markerDetails.confirmationCount}/10
                      </p>
                    )}
                  </div>

                  {/* Latest event info */}
                  {markerDetails.latestEvent && (
                    <div className="border-t pt-3 mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Latest Event
                      </p>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">User:</span>{' '}
                          {markerDetails.latestEvent.userName || markerDetails.latestEvent.userEmail}
                        </p>
                        <p>
                          <span className="font-medium">Action:</span>{' '}
                          <span className="capitalize">{markerDetails.latestEvent.voteType}</span> button
                        </p>
                        <p>
                          <span className="font-medium">Distance:</span>{' '}
                          {markerDetails.latestEvent.distance.toFixed(0)}m
                        </p>
                        <p>
                          <span className="font-medium">Time:</span>{' '}
                          {formatTime(markerDetails.latestEvent.timestamp)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Statistics */}
                  <div className="border-t pt-2 text-xs text-gray-500">
                    <p>Total interactions: {markerDetails.redPressCount + markerDetails.greenPressCount}</p>
                  </div>
              </>
            )}
              </div>
            </InfoWindow>
            )}
          </Fragment>
        );
      })}
    </GoogleMap>
  );
}
