
export const getApiUrl = () => {
    if (typeof window !== 'undefined') {
        // If we have an explicit env var, use it
        if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;

        // Heuristic: If we are on port 3000 (standard Next.js), backend is likely on 3001
        const { protocol, hostname, port } = window.location;
        if (port === '3000') {
            return `${protocol}//${hostname}:3001/api`;
        }
        
        // If we are on some other port, try same host on 3001
        if (port) {
            return `${protocol}//${hostname}:3001/api`;
        }

        // Fallback to relative if on the same port or unknown
        return '/api';
    }
    
    // Server-side
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
};

export const API_URL = getApiUrl();
