# PWA Installation Guide

This guide explains how to build and install the Khmelnytskyi Marker Map PWA.

## Prerequisites

Make sure you have Node.js and npm/pnpm installed on your system.

## Building the Application

### 1. Install Dependencies (if not already installed)

```bash
npm install
# or
pnpm install
```

### 2. Build for Production

```bash
npm run build
# or
pnpm build
```

This creates an optimized production build in the `.next` directory.

### 3. Start Production Server

```bash
npm start
# or
pnpm start
```

The app will be available at `http://localhost:3000` (or your configured port).

**Important:** PWA features require HTTPS in production (or localhost for development).

## Installing the PWA

### On Desktop (Chrome/Edge/Brave)

1. Open your browser and navigate to your app URL
2. Look for an **install icon** in the address bar (usually a "+" or download icon)
3. Click the install icon
4. Click **"Install"** in the popup
5. The app will open in a standalone window

**Alternative method:**
1. Click the **menu** (three dots) in the browser
2. Look for **"Install Khmelnytskyi Marker Map"** or **"Install app"**
3. Click to install

### On Desktop (Firefox)

1. Open the app in Firefox
2. Click the **menu** (three horizontal lines)
3. Look for **"Install"** option
4. Click to install

### On Android (Chrome)

1. Open Chrome and navigate to your app URL
2. Tap the **menu** (three dots) in the top right
3. Tap **"Install app"** or **"Add to Home screen"**
4. Confirm installation
5. The app icon will appear on your home screen

### On Android (Samsung Internet)

1. Open Samsung Internet and navigate to your app URL
2. Tap the **menu** (three horizontal lines)
3. Tap **"Add page to"** → **"Home screen"**
4. Confirm by tapping **"Add"**

### On iOS (Safari)

1. Open Safari and navigate to your app URL
2. Tap the **Share button** (square with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Customize the name if needed
5. Tap **"Add"**
6. The app icon will appear on your home screen

**Note:** iOS handles PWAs differently - they open in a Safari-like interface but still provide an app-like experience.

## Development Mode

For testing during development:

```bash
npm run dev
# or
pnpm dev
```

Then navigate to `http://localhost:3000` and follow the installation steps above.

**Note:** Service Worker registration only works over HTTPS or localhost.

## Verification

After installation, verify the PWA is working:

1. **Check Service Worker:**
   - Open browser DevTools (F12)
   - Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
   - Check **Service Workers** section
   - You should see your service worker registered and running

2. **Test Offline Mode:**
   - With DevTools open, go to **Network** tab
   - Check **"Offline"** checkbox
   - Refresh the page
   - The app should still load (basic pages are cached)

3. **Check Manifest:**
   - In DevTools **Application** tab
   - Check **Manifest** section
   - Verify all icons and settings are correct

## Troubleshooting

### Service Worker Not Registering

- Make sure you're accessing via `localhost` (for dev) or `https` (for production)
- Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check browser console for errors

### Install Button Not Appearing

- Make sure the app meets PWA criteria:
  - ✅ Has a valid manifest.json
  - ✅ Has a registered service worker
  - ✅ Served over HTTPS (or localhost)
  - ✅ Has proper icons (192x192 and 512x512)

### Offline Mode Not Working

- Clear cache and unregister old service workers in DevTools
- Check that the service worker is properly caching resources
- Verify the cache strategy in `public/sw.js`

## Production Deployment

For production deployment, ensure:

1. **HTTPS is enabled** - PWAs require HTTPS (except localhost)
2. **Build is optimized** - Run `npm run build` before deploying
3. **Static files are served** - Ensure `public/` folder files (manifest.json, sw.js, icons) are accessible
4. **Service worker scope** - Service worker should be at the root (`/sw.js`)

## Testing Checklist

- [ ] Service worker registers successfully
- [ ] Manifest.json loads correctly
- [ ] Icons display properly
- [ ] App installs on target devices
- [ ] App opens in standalone mode (desktop)
- [ ] Offline functionality works
- [ ] Updates are detected and applied

