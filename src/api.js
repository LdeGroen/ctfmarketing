export const API_URL = import.meta.env.VITE_API_URL || 'https://backend.cafetheaterfestival.nl';

// Inloggen met de pincode van het gezelschap (21-11-2026), dezelfde als in de
// artiestenomgeving. Hij gaat als header mee met elk verzoek: dan verloopt de
// link van een gekoppelde inzending niet. Bewaard in localStorage, zodat een
// maker na een week gewoon terugkomt; uitloggen haalt hem weg.
const PINCODE_KEY = 'ctfmarketing_pincode_v1';

export const pincode = {
    lees: () => { try { return localStorage.getItem(PINCODE_KEY) || ''; } catch { return ''; } },
    zet: (p) => { try { localStorage.setItem(PINCODE_KEY, p); } catch { /* privévenster */ } },
    weg: () => { try { localStorage.removeItem(PINCODE_KEY); } catch { /* privévenster */ } },
};

async function request(path, options = {}) {
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    const pin = pincode.lees();
    if (pin && !headers['X-Artist-Pincode']) headers['X-Artist-Pincode'] = pin;
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
    deadlines: () => request('/api/marketing/public/deadlines'),
    login: (pin) => request('/api/marketing/public/login', {
        method: 'POST',
        headers: { 'X-Artist-Pincode': '' },
        body: JSON.stringify({ pincode: pin }),
    }),
    mijn: () => request('/api/marketing/public/mijn'),
    openVoor: (performanceId) => request(`/api/marketing/public/mijn/${encodeURIComponent(performanceId)}`, { method: 'POST' }),
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
