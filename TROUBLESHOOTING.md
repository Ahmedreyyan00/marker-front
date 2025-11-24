# Troubleshooting Guide

## Module Not Found Error

If you see `Cannot find module '@react-google-maps/api'`:

1. **Stop the dev server** (Ctrl+C)
2. **Clear Next.js cache**:
   ```bash
   rm -rf .next
   # On Windows PowerShell:
   Remove-Item -Recurse -Force .next
   ```
3. **Reinstall dependencies**:
   ```bash
   pnpm install
   ```
4. **Restart dev server**:
   ```bash
   pnpm dev
   ```

## Icon Warnings

The app uses SVG icons. If you see icon size warnings:

1. The SVG icons work, but some browsers prefer PNG
2. To create PNG icons, open `scripts/generate-icons.html` in your browser
3. Download the generated icons and replace the SVG files in `public/` folder
4. Update `public/manifest.json` to use `.png` instead of `.svg`

## Google Maps API Key

The app works without an API key but shows a watermark. To remove it:

1. Get a key from [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
2. Enable "Maps JavaScript API"
3. Create `.env.local` file:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
   ```
4. Restart the dev server


