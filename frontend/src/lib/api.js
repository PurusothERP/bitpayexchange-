
export const getApiUrl = () => {
    // 1. Priority: Environment Variable
    let envUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (typeof window !== 'undefined') {
        const { protocol, hostname, port } = window.location;
        const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

        // If ENV is localhost but we are NOT on localhost, ignore the ENV
        if (envUrl && envUrl.includes('localhost') && !isLocalHost) {
            console.warn('[API] Ignoring localhost API_URL on production domain');
            envUrl = null;
        }

        let baseUrl = '';
        if (envUrl) {
            baseUrl = envUrl;
        } else if (port === '3000') {
            // Local Development Heuristic
            baseUrl = `${protocol}//${hostname}:3001`;
        } else if (port && isLocalHost) {
            // Custom Local Port
            baseUrl = `${protocol}//${hostname}:3001`;
        } else if (hostname === 'mexapay.net' || hostname === 'www.mexapay.net') {
            // Hardcoded Production Fallback for Mexapay.net
            // Since the relative /api is 404ing, we point to the likely Render backend
            baseUrl = 'https://b20-backend.onrender.com';
        } else {
            // Generic Production Fallback
            baseUrl = ''; // relative path
        }

        // Clean up baseUrl (remove trailing slash)
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        
        // Ensure /api suffix
        if (baseUrl && !baseUrl.endsWith('/api')) {
            baseUrl += '/api';
        } else if (!baseUrl) {
            baseUrl = '/api';
        }

        console.log('[API] Using Base URL (v2.1):', baseUrl);
        return baseUrl;
    }
    
    // Server-side fallback
    let serverUrl = envUrl || 'http://localhost:3001';
    if (serverUrl.endsWith('/')) serverUrl = serverUrl.slice(0, -1);
    if (!serverUrl.endsWith('/api')) serverUrl += '/api';
    return serverUrl;
};

export const API_URL = getApiUrl();
