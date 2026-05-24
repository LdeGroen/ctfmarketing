export const API_URL = process.env.REACT_APP_API_URL || 'https://backend.cafetheaterfestival.nl';

async function request(path, options = {}) {
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    const body = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
        const err = new Error(body?.message || `HTTP ${res.status}`);
        err.status = res.status;
        err.body = body;
        throw err;
    }
    return body;
}

export const api = {
    start: (lang = 'nl') => request('/api/marketing/public/start', {
        method: 'POST',
        body: JSON.stringify({ language: lang }),
    }),
    get: (token) => request(`/api/marketing/public/submissions/${token}`),
    update: (token, patch) => request(`/api/marketing/public/submissions/${token}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
    }),
    submit: (token) => request(`/api/marketing/public/submissions/${token}/submit`, { method: 'POST' }),
    approve: (token) => request(`/api/marketing/public/submissions/${token}/approve`, { method: 'POST' }),
    upload: (token, file, type) => {
        const fd = new FormData();
        fd.append('file', file);
        if (type) fd.append('type', type);
        return request(`/api/marketing/public/submissions/${token}/upload`, {
            method: 'POST',
            body: fd,
        });
    },
};
