'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import MapComponent to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100" />,
});

interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  status: 'green' | 'red' | 'orange';
  timestamp: number;
  lastActionTimestamp?: number;
  confirmationCount?: number;
}

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [testMode, setTestMode] = useState(process.env.NODE_ENV === 'development');
  const [testLocation, setTestLocation] = useState<[number, number] | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Ensure component is mounted (prevents hydration mismatch)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Request location permission and get user location
  useEffect(() => {
    if (!isMounted) return;
    
    // If test mode and test location is set, use it
    if (testMode && testLocation) {
      setUserLocation(testLocation);
      setLoading(false);
      return;
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          setLoading(false);
        },
        (err) => {
          console.error('Error getting location:', err);
          setError('Failed to get location');
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
    }
  }, [isMounted, testMode, testLocation]);

  // Fetch markers on mount and set up polling
  useEffect(() => {
    if (!isMounted) return;
    
    const fetchMarkers = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/markers`);
        if (response.ok) {
          const data = await response.json();
          setMarkers(data);
        }
      } catch (err) {
        console.error('Error fetching markers:', err);
      }
    };

    fetchMarkers();
    // Poll every 3 seconds for updates
    const interval = setInterval(fetchMarkers, 3000);

    return () => clearInterval(interval);
  }, [isMounted]);

  // Register service worker for PWA
  useEffect(() => {
    if (!isMounted) return;
    
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, [isMounted]);

  const handleButtonClick = async (status: 'green' | 'red') => {
    if (!userLocation) {
      alert('Waiting for location...');
      return;
    }

    if (!session?.token) {
      alert('Authentication required');
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/markers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          latitude: userLocation[0],
          longitude: userLocation[1],
          status,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh markers immediately to show updates
        const markersResponse = await fetch(`${backendUrl}/api/markers`);
        if (markersResponse.ok) {
          const markersData = await markersResponse.json();
          setMarkers(markersData);
        }
      } else {
        console.error('Error processing marker:', data);
        alert(data.error || 'Error processing marker');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error creating marker');
    }
  };

  if (status === 'loading' || !isMounted) {
    return <div className="w-full h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-gray-600">Loading...</p>
    </div>;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map */}
      <div className="absolute inset-0">
        <MapComponent userLocation={userLocation} markers={markers} />
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center">
            <p className="text-lg mb-2">Loading...</p>
            <p className="text-sm text-gray-600">Getting location permission</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && !loading && (
        <div className="absolute top-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex gap-4 z-40">
        <button
          onClick={() => handleButtonClick('green')}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-6 px-8 rounded-lg text-xl shadow-lg active:scale-95 transition-all"
          disabled={loading || !userLocation}
        >
          GREEN
        </button>
        <button
          onClick={() => handleButtonClick('red')}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-6 px-8 rounded-lg text-xl shadow-lg active:scale-95 transition-all"
          disabled={loading || !userLocation}
        >
          RED
        </button>
      </div>

      {/* User info and logout */}
      {session && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
          <span className="bg-white bg-opacity-90 px-3 py-1 rounded text-sm text-gray-700">
            {session.user?.email}
          </span>
          <button
            onClick={() => {
              import('next-auth/react').then(({ signOut }) => signOut({ callbackUrl: '/login' }));
            }}
            className="bg-white bg-opacity-90 px-3 py-1 rounded text-sm text-gray-700 hover:bg-opacity-100"
          >
            Logout
          </button>
        </div>
      )}

      {/* Test Mode */}
      {testMode && (
        <div className="absolute top-20 right-4 z-50 bg-white bg-opacity-90 p-4 rounded shadow-lg max-h-96 overflow-y-auto">
          <h3 className="font-bold mb-2">🧪 Test Mode</h3>
          <div className="space-y-2">
            <button
              onClick={() => setTestLocation([49.4229, 26.9871])}
              className="block w-full text-left px-2 py-1 bg-blue-100 rounded text-sm hover:bg-blue-200"
            >
              Location 1 (Center)
            </button>
            <button
              onClick={() => setTestLocation([49.4240, 26.9885])}
              className="block w-full text-left px-2 py-1 bg-blue-100 rounded text-sm hover:bg-blue-200"
            >
              Location 2 (150m NE)
            </button>
            <button
              onClick={() => setTestLocation([49.4218, 26.9857])}
              className="block w-full text-left px-2 py-1 bg-blue-100 rounded text-sm hover:bg-blue-200"
            >
              Location 3 (150m SW)
            </button>
            <button
              onClick={() => setTestLocation([49.4235, 26.9895])}
              className="block w-full text-left px-2 py-1 bg-blue-100 rounded text-sm hover:bg-blue-200"
            >
              Location 4 (200m NE)
            </button>
            <button
              onClick={() => {
                setTestLocation(null);
                // Reload real location
                navigator.geolocation.getCurrentPosition(
                  (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude])
                );
              }}
              className="block w-full text-left px-2 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
            >
              Use Real Location
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
