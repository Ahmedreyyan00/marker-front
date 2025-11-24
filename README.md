# Khmelnytskyi Marker Map PWA

A mobile-first Progressive Web App (PWA) for placing green and red markers on a map in Khmelnytskyi, Ukraine. The app allows users to mark locations and automatically removes red markers when a green marker is placed nearby.

## Features

- 🗺️ Full-screen interactive map centered on Khmelnytskyi
- 📍 Automatic user location detection
- 🟢 Green markers ("ЗЕЛЕНИЙ" button)
- 🔴 Red markers ("ЧЕРВОНИЙ" button)
- 🧹 Automatic red marker removal when green button is pressed within 150-300m radius
- 🔄 Real-time marker updates (polling every 3 seconds)
- 📱 PWA support for mobile installation
- 🇺🇦 Ukrainian language interface

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Maps**: Google Maps API with @react-google-maps/api
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: File-based JSON storage (easily replaceable with PostgreSQL/MongoDB)

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (or npm/yarn)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ukrain
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up Google Maps API key:
   - Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
   - Enable "Maps JavaScript API" in your project
   - Create a `.env.local` file in the root directory:
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```
   - Note: The app will work without an API key but will show a watermark on the map

4. Create PWA icons (required for PWA functionality):
   - Option 1: Open `scripts/generate-icons.html` in your browser and download the generated icons
   - Option 2: Create `public/icon-192.png` (192x192 pixels) and `public/icon-512.png` (512x512 pixels) using any image editor
   - Place both icon files in the `public/` directory

5. Run the development server:
```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
pnpm build
pnpm start
```

## Project Structure

```
ukrain/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── markers/
│   │   │       └── route.ts      # API endpoints for markers
│   │   ├── layout.tsx            # Root layout with PWA metadata
│   │   ├── page.tsx              # Main page component
│   │   └── globals.css           # Global styles
│   ├── components/
│   │   └── MapComponent.tsx      # Google Maps component
│   └── lib/
│       └── db.ts                 # Database operations
├── public/
│   ├── manifest.json             # PWA manifest
│   └── sw.js                     # Service worker
├── data/
│   └── markers.json              # Marker storage (auto-created)
└── package.json
```

## API Endpoints

### GET `/api/markers`
Returns all markers.

**Response:**
```json
[
  {
    "id": "string",
    "latitude": 49.4229,
    "longitude": 26.9871,
    "status": "green" | "red",
    "timestamp": 1234567890
  }
]
```

### POST `/api/markers`
Creates a new marker or removes a nearby red marker.

**Request Body:**
```json
{
  "latitude": 49.4229,
  "longitude": 26.9871,
  "status": "green" | "red"
}
```

**Behavior:**
- If `status` is "green" and a red marker exists within 150-300m, the closest red marker is removed
- Otherwise, a new marker is created

## Marker Removal Logic

- Red markers are **not** automatically expired
- A red marker is removed when:
  - A user presses the "ЗЕЛЕНИЙ" (green) button
  - The user's location is within 150-300 meters of the red marker
  - The closest red marker within range is removed
- If no red marker is nearby, pressing green creates a new green marker

## PWA Installation

1. Open the app in a mobile browser (Chrome, Safari, etc.)
2. Look for the "Add to Home Screen" prompt or use the browser menu
3. The app will install and can be launched like a native app

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Deploy automatically

### Netlify

1. Push your code to GitHub
2. Import the project in [Netlify](https://netlify.com)
3. Build command: `pnpm build`
4. Publish directory: `.next`

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Railway
- Render
- DigitalOcean App Platform
- AWS Amplify

## Database Migration

The current implementation uses file-based JSON storage. To migrate to a production database:

1. **PostgreSQL**: Replace `src/lib/db.ts` with PostgreSQL queries using `pg` library
2. **MongoDB**: Replace with MongoDB operations using `mongodb` or `mongoose`
3. **Supabase**: Use Supabase client for database operations
4. **Firebase**: Use Firestore for real-time updates

Example PostgreSQL schema:
```sql
CREATE TABLE markers (
  id SERIAL PRIMARY KEY,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  status VARCHAR(5) NOT NULL CHECK (status IN ('green', 'red')),
  timestamp BIGINT NOT NULL
);

CREATE INDEX idx_location ON markers(latitude, longitude);
CREATE INDEX idx_status ON markers(status);
```

## Environment Variables

No environment variables are required for the MVP. For production, consider adding:
- Database connection strings
- API keys (if switching to Google Maps/Mapbox)
- Rate limiting configuration

## Future Enhancements

- Admin panel for moderation
- Analytics dashboard
- User authentication
- Marker expiration policies
- Push notifications
- Offline support improvements

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
