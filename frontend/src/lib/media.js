// Centralized helper for building authenticated URLs to /api/uploads/* files.
//
// Browser <img> tags cannot send an Authorization header, and the uploads
// route is now auth + tenant scoped (Phase 1 item 1.5). The backend therefore
// also accepts the session token via a `token` query param. Route every
// uploaded-file URL through mediaUrl() so images keep loading for the
// authenticated, same-tenant user.
export function mediaUrl(path) {
    if (!path) return path;
    // Absolute / already-embedded sources pass through untouched.
    if (/^(https?:|blob:|data:)/.test(path)) return path;

    const base = process.env.REACT_APP_BACKEND_URL || '';
    const url = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;

    // Only uploaded files need the token; other static paths don't.
    if (url.includes('/api/uploads/')) {
        const token = localStorage.getItem('token');
        if (token) {
            return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
        }
    }
    return url;
}

export default mediaUrl;
