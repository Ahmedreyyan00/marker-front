// Simple file-based database for MVP
// In production, replace with PostgreSQL, MongoDB, or similar

import { promises as fs } from 'fs';
import path from 'path';

export interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  status: 'green' | 'red';
  timestamp: number;
}

const DB_FILE = path.join(process.cwd(), 'data', 'markers.json');

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.dirname(DB_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Read markers from file
export async function getMarkers(): Promise<Marker[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save markers to file
async function saveMarkers(markers: Marker[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DB_FILE, JSON.stringify(markers, null, 2), 'utf-8');
}

// Add a new marker
export async function addMarker(marker: Omit<Marker, 'id' | 'timestamp'>): Promise<Marker> {
  const markers = await getMarkers();
  const newMarker: Marker = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    ...marker,
    timestamp: Date.now(),
  };
  markers.push(newMarker);
  await saveMarkers(markers);
  return newMarker;
}

// Remove a marker by ID
export async function removeMarker(id: string): Promise<boolean> {
  const markers = await getMarkers();
  const filtered = markers.filter(m => m.id !== id);
  if (filtered.length === markers.length) {
    return false; // Marker not found
  }
  await saveMarkers(filtered);
  return true;
}

// Find red markers within radius (in meters)
export async function findRedMarkersInRadius(
  latitude: number,
  longitude: number,
  radiusMeters: number
): Promise<Marker[]> {
  const markers = await getMarkers();
  const redMarkers = markers.filter(m => m.status === 'red');
  
  return redMarkers.filter(marker => {
    const distance = calculateDistance(latitude, longitude, marker.latitude, marker.longitude);
    return distance <= radiusMeters;
  });
}

// Calculate distance between two coordinates using Haversine formula (in meters)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

