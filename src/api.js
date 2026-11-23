import { maakRequest } from 'ctf-ui/formulier';
export const API_URL = import.meta.env.VITE_API_URL || 'https://backend.cafetheaterfestival.nl';

// Inloggen met de pincode van het gezelschap (21-11-2026), dezelfde als in de
// artiestenomgeving. Daarna gaat er bij elk verzoek een sessietoken mee (sinds
// 22-11-2026, audit BE-S-01; daarvoor de pincode zelf): dan verloopt de link
// van een gekoppelde inzending niet. Bewaard in localStorage, zodat een maker
// na een week gewoon terugkomt; uitloggen trekt het token in. Een browser van
// vóór die dag heeft nog een pincode bewaard; die gaat in de overgang nog mee.
const SESSIE_KEY = 'ctfmarketing_sessie_v1';
const PINCODE_KEY = 'ctfmarketing_pincode_v1';

function lees(sleutel) {
    try { return localStorage.getItem(sleutel) || ''; } catch { return ''; }
}

export const sessie = {
    /** Ingelogd (met een token, of nog met een oude pincode)? */
    lees: () => lees(SESSIE_KEY) || lees(PINCODE_KEY),
    zet: (token) => {
        try {
            localStorage.setItem(SESSIE_KEY, token);
            localStorage.removeItem(PINCODE_KEY);
        } catch { /* privévenster */ }
    },
    weg: () => {
        try {
            localStorage.removeItem(SESSIE_KEY);
            localStorage.removeItem(PINCODE_KEY);
        } catch { /* privévenster */ }
    },
};

function authHeaders() {
    const token = lees(SESSIE_KEY);
    if (token) return { 'X-Portaal-Sessie': token };
    const pin = lees(PINCODE_KEY);
    return pin ? { 'X-Artist-Pincode': pin } : {};
}

// Het verzoek zelf komt uit ctf-ui (audit FRM-13, 23-11-2026).
const request = maakRequest(API_URL, { kop: authHeaders });

export const api = {
    start: (lang = 'nl') => request('/api/marketing/public/start', {
        method: 'POST',
        body: JSON.stringify({ language: lang }),
    }),
    deadlines: () => request('/api/marketing/public/deadlines'),
    login: (pin) => request('/api/marketing/public/login', {
        method: 'POST',
        anoniem: true,
        body: JSON.stringify({ pincode: pin }),
    }),
    // Uitloggen trekt het sessietoken in (audit BE-S-01).
    logout: () => request('/api/marketing/public/logout', { method: 'POST' }),
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
