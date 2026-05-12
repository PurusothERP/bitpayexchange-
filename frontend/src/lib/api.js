
export const getApiUrl = () => {
    // 1. Priority: Environment Variable (most reliable for production)
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    if (typeof window !== 'undefined') {
        const { protocol, hostname, port } = window.location;

        // 2. Local Development Heuristic
        // If we are on port 3000 (standard Next.js), backend is likely on 3001
        if (port === '3000') {
            return `${protocol}//${hostname}:3001/api`;
        }
        
        // 3. Custom Local Port
        // If we are on some other port (but still likely local), try same host on 3001
        if (port && (hostname === 'localhost' || hostname === '127.0.0.1')) {
            return `${protocol}//${hostname}:3001/api`;
        }

        // 4. Production Fallback
        // If we are on a production domain (no port, or not localhost), 
        // we should default to the same host's /api path.
        // This works well with Vercel/Render/Nginx proxies.
        return `${protocol}//${hostname}/api`;
    }
    
    // Server-side fallback
    return 'http://localhost:3001/api';
};

export const API_URL = getApiUrl();
