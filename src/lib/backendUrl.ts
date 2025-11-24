const FALLBACK_URL = 'http://localhost:5000';

const rawEnvUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();

const normalizedEnvUrl = rawEnvUrl
  ? rawEnvUrl.startsWith('http://') || rawEnvUrl.startsWith('https://')
    ? rawEnvUrl
    : `https://${rawEnvUrl}`
  : FALLBACK_URL;

// Remove trailing slashes to avoid double slash when building paths
const backendUrl = normalizedEnvUrl.replace(/\/+$/, '');

export default backendUrl;

