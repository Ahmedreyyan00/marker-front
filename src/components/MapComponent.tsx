'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { GoogleMap, Marker, useJsApiLoader, InfoWindow } from '@react-google-maps/api';

// Khmelnytskyi coordinates
const KHMELNYTSKYI_CENTER = { lat: 49.4229, lng: 26.9871 };

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

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
  latitude: number;
  longitude: number;
  status: 'green' | 'red' | 'orange';
  timestamp: number;
  lastActionTimestamp: number;
  redPressCount: number;
  greenPressCount: number;
  confirmationCount: number;
  latestEvent?: {
    userEmail: string;
    userName?: string;
    voteType: 'red' | 'green';
    markerState: 'green' | 'red' | 'orange';
    distance: number;
    timestamp: string | Date;
  };
}

interface MapComponentProps {
  userLocation: [number, number] | null;
  markers: MarkerData[];
}

// Google Maps API key - store in global to persist across hot reloads
const getApiKey = () => {
  if (typeof window !== 'undefined') {
    if (!(window as any).__GOOGLE_MAPS_API_KEY__) {
      (window as any).__GOOGLE_MAPS_API_KEY__ = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    }
    return (window as any).__GOOGLE_MAPS_API_KEY__;
  }
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
};

const GOOGLE_MAPS_API_KEY = getApiKey();
const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['geometry'];

export default function MapComponent({ userLocation, markers }: MapComponentProps) {
  const [map, setMap] = useState<any>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [markerDetails, setMarkerDetails] = useState<MarkerDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Memoize loader options to prevent recreation on hot reload
  const loaderOptions = useMemo(() => ({
    id: 'google-map-script',
    googleMapsApiKey: getApiKey(),
    libraries: libraries as ('places' | 'drawing' | 'geometry' | 'visualization')[],
  }), []);

  const { isLoaded } = useJsApiLoader(loaderOptions);

  // Calculate initial center only once - don't recalculate on userLocation changes
  const initialCenter = useMemo(() => 
    userLocation 
      ? { lat: userLocation[0], lng: userLocation[1] }
      : KHMELNYTSKYI_CENTER,
    [] // Only calculate on mount
  );

  const onLoad = useCallback((mapInstance: any) => {
    setMap(mapInstance);
    // Only center on initial load, not on every update
    if (mapInstance && !hasInitialized) {
      mapInstance.setCenter(initialCenter);
      setHasInitialized(true);
    }
  }, [initialCenter, hasInitialized]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Fetch marker details when a marker is clicked
  const handleMarkerClick = useCallback(async (markerId: string) => {
    if (selectedMarker === markerId) {
      // If clicking the same marker, close the popup
      setSelectedMarker(null);
      setMarkerDetails(null);
      return;
    }

    setSelectedMarker(markerId);
    setLoadingDetails(true);

    try {
      const response = await fetch(`${backendUrl}/api/markers/${markerId}`);
      if (response.ok) {
        const data = await response.json();
        setMarkerDetails(data);
      } else {
        console.error('Failed to fetch marker details');
        setMarkerDetails(null);
      }
    } catch (error) {
      console.error('Error fetching marker details:', error);
      setMarkerDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  }, [selectedMarker]);

  // Close popup when clicking on the map
  const handleMapClick = useCallback(() => {
    setSelectedMarker(null);
    setMarkerDetails(null);
  }, []);

  // Custom marker icons - simple colored circles
  const createMarkerIcon = useCallback((color: string, size: number = 20) => {
    if (!isLoaded || typeof google === 'undefined') return undefined;
    
    // Use Symbol type for SVG path markers
    return {
      path: 'M 0,0 m -10,0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0',
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: size / 20,
      anchor: new google.maps.Point(10, 10),
    } as google.maps.Symbol;
  }, [isLoaded]);

  if (!isLoaded) {
    return <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <p className="text-gray-600">Loading map...</p>
    </div>;
  }

  const greenIcon = createMarkerIcon('#22c55e', 20);
  const redIcon = createMarkerIcon('#ef4444', 20);
  const orangeIcon = createMarkerIcon('#f97316', 20);
  const blueIcon = createMarkerIcon('#3b82f6', 16);

  // Format timestamp for display
  const formatTimestamp = (timestamp: number | string | Date) => {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMarkerTitle = (marker: MarkerData) => {
    const statusText = {
      green: 'Green marker',
      red: 'Red marker',
      orange: 'Orange marker'
    };
    const timestamp = marker.lastActionTimestamp || marker.timestamp;
    const timeText = formatTimestamp(timestamp);
    const confirmText = marker.status === 'orange' && marker.confirmationCount 
      ? ` (${marker.confirmationCount}/10)` 
      : '';
    return `${statusText[marker.status]}${confirmText} - ${timeText}`;
  };

  const getMarkerIconByStatus = (status: 'green' | 'red' | 'orange') => {
    switch (status) {
      case 'green': return greenIcon;
      case 'red': return redIcon;
      case 'orange': return orangeIcon;
      default: return greenIcon;
    }
  };

  return (
    <div className="w-full h-full">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={initialCenter}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            position={{ lat: userLocation[0], lng: userLocation[1] }}
            icon={blueIcon}
            title="Your location"
          />
        )}

        {/* Green, red, and orange markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={{ lat: marker.latitude, lng: marker.longitude }}
            icon={getMarkerIconByStatus(marker.status)}
            title={getMarkerTitle(marker)}
            onClick={() => handleMarkerClick(marker.id)}
          >
            {selectedMarker === marker.id && markerDetails && (
              <InfoWindow
                onCloseClick={() => {
                  setSelectedMarker(null);
                  setMarkerDetails(null);
                }}
                position={{ lat: marker.latitude, lng: marker.longitude }}
              >
                <div className="p-2 min-w-[200px] max-w-[300px]">
                  {loadingDetails ? (
                    <div className="text-center py-2">
                      <p className="text-sm text-gray-600">Loading...</p>
                    </div>
                  ) : (
                    <>
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
                        {markerDetails.status === 'orange' && markerDetails.confirmationCount > 0 && (
                          <p className="text-sm text-gray-600">
                            Confirmations: {markerDetails.confirmationCount}/10
                          </p>
                        )}
                      </div>

                      {markerDetails.latestEvent && (
                        <div className="border-t pt-3 mt-3">
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
                              {markerDetails.latestEvent.markerState !== markerDetails.status && (
                                <span className="text-gray-600">
                                  {' '}(was {markerDetails.latestEvent.markerState})
                                </span>
                              )}
                            </p>
                            <p>
                              <span className="font-medium">Distance:</span>{' '}
                              {markerDetails.latestEvent.distance.toFixed(0)}m
                            </p>
                            <p>
                              <span className="font-medium">Time:</span>{' '}
                              {formatTimestamp(markerDetails.latestEvent.timestamp)}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="border-t pt-2 mt-2 text-xs text-gray-500">
                        <p>Created: {formatTimestamp(markerDetails.timestamp)}</p>
                        <p>Last action: {formatTimestamp(markerDetails.lastActionTimestamp)}</p>
                        <p className="mt-1">
                          Interactions: {markerDetails.redPressCount + markerDetails.greenPressCount}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </InfoWindow>
            )}
          </Marker>
        ))}
      </GoogleMap>
    </div>
  );
}
