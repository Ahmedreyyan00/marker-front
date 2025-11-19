'use client';

import { useCallback, useMemo, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

// Khmelnytskyi coordinates
const KHMELNYTSKYI_CENTER = { lat: 49.4229, lng: 26.9871 };

interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  status: 'green' | 'red' | 'orange';
  timestamp: number;
  lastActionTimestamp?: number;
  confirmationCount?: number;
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
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US');
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
          />
        ))}
      </GoogleMap>
    </div>
  );
}
