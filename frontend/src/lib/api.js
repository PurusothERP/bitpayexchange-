
export const getApiUrl = () => {
    // 1. Priority: Environment Variable
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (typeof window !== 'undefined') {
        const { protocol, hostname, port } = window.location;
        const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

        // If ENV is localhost but we are NOT on localhost, ignore the ENV
        if (envUrl && envUrl.includes('localhost') && !isLocalHost) {
            console.warn('[API] Ignoring localhost API_URL on production domain');
        } else if (envUrl) {
            return envUrl;
        }

        // 2. Local Development Heuristic
        if (port === '3000') {
            return `${protocol}//${hostname}:3001/api`;
        }
        
        // 3. Custom Local Port
        if (port && isLocalHost) {
            return `${protocol}//${hostname}:3001/api`;
        }

        // 4. Production Fallback
        // Use relative path for better compatibility with proxies
        return '/api';
    }
    
    return envUrl || 'http://localhost:3001/api';
};

export const API_URL = getApiUrl();
