
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
        } else {
            // Production Fallback (relative or same host)
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

        return baseUrl;
    }
    
    // Server-side fallback
    let serverUrl = envUrl || 'http://localhost:3001';
    if (serverUrl.endsWith('/')) serverUrl = serverUrl.slice(0, -1);
    if (!serverUrl.endsWith('/api')) serverUrl += '/api';
    return serverUrl;
};

export const API_URL = getApiUrl();
