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
  // Test mode - commented out for production
  // const [testMode, setTestMode] = useState(process.env.NODE_ENV === 'development');
  // const [testLocation, setTestLocation] = useState<[number, number] | null>(null);

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
    
    // Test mode - commented out for production
    // if (testMode && testLocation) {
    //   setUserLocation(testLocation);
    //   setLoading(false);
    //   return;
    // }
    
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
  }, [isMounted]); // testMode, testLocation removed

  // Fetch markers on mount and set up polling
  useEffect(() => {
    if (!isMounted) return;
    
    const fetchMarkers = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/markers`, {
          cache: 'no-store', // Ensure we get fresh data
        });
        if (response.ok) {
          const data = await response.json();
          // Create a new array reference to ensure React detects the change
          setMarkers([...data]);
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
        // Small delay to ensure backend has saved the marker
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Refresh markers immediately to show updates
        const markersResponse = await fetch(`${backendUrl}/api/markers`, {
          cache: 'no-store', // Ensure we get fresh data
        });
        if (markersResponse.ok) {
          const markersData = await markersResponse.json();
          // Create a new array reference to ensure React detects the change
          setMarkers([...markersData]);
        } else {
          console.error('Failed to refresh markers after update');
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
        <MapComponent 
          userLocation={userLocation} 
          markers={markers} 
        />
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg font-semibold text-gray-900 mb-2">Loading Map</p>
            <p className="text-sm text-gray-600">Getting your location...</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && !loading && (
        <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto sm:max-w-md bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg shadow-lg z-50">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex gap-3 sm:gap-4 z-40 justify-center">
        <div className="flex gap-3 sm:gap-4 w-full max-w-md">
          <button
            onClick={() => handleButtonClick('green')}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 sm:py-5 md:py-6 px-4 sm:px-6 md:px-8 rounded-xl text-base sm:text-lg md:text-xl shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !userLocation}
          >
            GREEN
          </button>
          <button
            onClick={() => handleButtonClick('red')}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 sm:py-5 md:py-6 px-4 sm:px-6 md:px-8 rounded-xl text-base sm:text-lg md:text-xl shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !userLocation}
          >
            RED
          </button>
        </div>
      </div>

      {/* User info and logout */}
      {session && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 sm:gap-3">
          <span className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg text-xs sm:text-sm text-gray-700 shadow-md border border-gray-200">
            {session.user?.email}
          </span>
          <button
            onClick={() => {
              import('next-auth/react').then(({ signOut }) => signOut({ callbackUrl: '/login' }));
            }}
            className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg text-xs sm:text-sm text-gray-700 hover:bg-white shadow-md border border-gray-200 transition-all font-medium"
          >
            Logout
          </button>
        </div>
      )}

    </div>
  );
}
