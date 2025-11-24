'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import backendUrl from '@/lib/backendUrl';

// Dynamically import MapComponent to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gradient-to-br from-blue-900/20 via-cyan-900/20 to-indigo-900/20 flex items-center justify-center rounded-2xl backdrop-blur-sm">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/30 border-t-cyan-400 mb-4"></div>
        <p className="text-cyan-200 font-medium">Loading map...</p>
      </div>
    </div>
  ),
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

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

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
  }, [isMounted]);

  // Fetch markers on mount and set up polling
  useEffect(() => {
    if (!isMounted) return;
    
    const fetchMarkers = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/markers`, {
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          setMarkers([...data]);
        }
      } catch (err) {
        console.error('Error fetching markers:', err);
      }
    };

    fetchMarkers();
    const interval = setInterval(fetchMarkers, 3000);

    return () => clearInterval(interval);
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
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const markersResponse = await fetch(`${backendUrl}/api/markers`, {
          cache: 'no-store',
        });
        if (markersResponse.ok) {
          const markersData = await markersResponse.json();
          setMarkers([...markersData]);
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-cyan-500/30 border-t-cyan-400 mb-6"></div>
          <p className="text-cyan-200 text-lg font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl blur-md opacity-75"></div>
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">
                  Marker Map
                </h1>
                <p className="text-xs text-cyan-200/80 hidden sm:block">Real-time location tracking</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50"></div>
                <span className="text-sm font-medium text-white">{session?.user?.email}</span>
              </div>
              <button
                onClick={() => {
                  import('next-auth/react').then(({ signOut }) => signOut({ callbackUrl: '/login' }));
                }}
                className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-200 font-medium text-sm shadow-lg hover:shadow-xl hover:scale-105"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-8 md:pt-16 md:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              Track & Share
              <span className="block bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent animate-gradient">
                Location Markers
              </span>
            </h2>
            <p className="text-lg md:text-xl text-cyan-100/90 mb-8 leading-relaxed">
              Place green or red markers on the map to share real-time location information with your community.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <div className="w-2 h-2 rounded-full bg-green-400 shadow-lg shadow-green-400/50"></div>
                <span className="text-white">Green Markers</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <div className="w-2 h-2 rounded-full bg-red-400 shadow-lg shadow-red-400/50"></div>
                <span className="text-white">Red Markers</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <div className="w-2 h-2 rounded-full bg-orange-400 shadow-lg shadow-orange-400/50"></div>
                <span className="text-white">Pending Confirmation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="group relative p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-300 hover:-translate-y-2 hover:shadow-green-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-4 shadow-lg shadow-green-500/50 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Green Status</h3>
                <p className="text-cyan-100/80 leading-relaxed">Mark safe locations and areas of interest with green markers.</p>
              </div>
            </div>

            <div className="group relative p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-300 hover:-translate-y-2 hover:shadow-red-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-rose-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center mb-4 shadow-lg shadow-red-500/50 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Red Alert</h3>
                <p className="text-cyan-100/80 leading-relaxed">Report important alerts or warnings with red markers.</p>
              </div>
            </div>

            <div className="group relative p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-300 hover:-translate-y-2 hover:shadow-cyan-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/50 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Real-time Updates</h3>
                <p className="text-cyan-100/80 leading-relaxed">Get instant updates as markers are placed and confirmed by the community.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-8 md:py-12 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden">
            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center z-50">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-cyan-500/30 border-t-cyan-400 mb-4"></div>
                  <p className="text-xl font-semibold text-white mb-2">Loading Map</p>
                  <p className="text-sm text-cyan-200">Getting your location...</p>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && !loading && (
              <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto sm:max-w-md bg-red-500/20 backdrop-blur-xl border-l-4 border-red-400 text-red-100 px-4 py-3 rounded-r-xl shadow-2xl z-50 border border-red-400/30">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Map Container */}
            <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px]">
              <MapComponent 
                userLocation={userLocation} 
                markers={markers} 
              />
            </div>

            {/* Action buttons */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-md px-4">
              <div className="flex gap-4">
                <button
                  onClick={() => handleButtonClick('green')}
                  className="relative flex-1 group overflow-hidden"
                  disabled={loading || !userLocation}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                  <div className="relative text-white font-bold py-4 md:py-5 px-6 md:px-8 rounded-2xl text-base md:text-lg shadow-2xl shadow-green-500/50 hover:shadow-green-500/70 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm border border-white/20">
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      GREEN
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => handleButtonClick('red')}
                  className="relative flex-1 group overflow-hidden"
                  disabled={loading || !userLocation}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                  <div className="relative text-white font-bold py-4 md:py-5 px-6 md:px-8 rounded-2xl text-base md:text-lg shadow-2xl shadow-red-500/50 hover:shadow-red-500/70 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm border border-white/20">
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      RED
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-white/5 backdrop-blur-xl mt-16 md:mt-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl blur-md opacity-75"></div>
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white">Marker Map</h3>
              </div>
              <p className="text-cyan-100/80 leading-relaxed">
                Real-time location tracking and community-driven marker sharing.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Features</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-cyan-100/80 hover:text-white transition-colors">Real-time Updates</a></li>
                <li><a href="#" className="text-cyan-100/80 hover:text-white transition-colors">Location Tracking</a></li>
                <li><a href="#" className="text-cyan-100/80 hover:text-white transition-colors">Community Markers</a></li>
                <li><a href="#" className="text-cyan-100/80 hover:text-white transition-colors">Status Alerts</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">About</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-cyan-100/80 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-cyan-100/80 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-cyan-100/80 hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="text-cyan-100/80 hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10">
            <p className="text-center text-cyan-100/60 text-sm">
              © {new Date().getFullYear()} Marker Map. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
