/* =========================================================
   aiMapService.js — Frontend seam for FUTURE AI integration.

   No AI provider is wired yet. These call the backend stub
   (/api/ai/...) which currently returns "not configured".
   The importMapJson() path works TODAY (manual / pasted JSON).
   ========================================================= */
import { validateMap } from './hexUtils';

const AI_BASE = 'http://localhost:5001/api/ai';

function authHeaders() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

// POST /api/ai/generate-map  ->  { ok, map } | { ok:false, reason }
export async function generateMapFromPrompt(gameCode, prompt, opts = {}) {
    try {
        const res = await fetch(`${AI_BASE}/generate-map`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ gameCode, prompt, ...opts }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
            return { ok: false, reason: data.message || `AI request failed (${res.status}).` };
        }
        const v = validateMap(data.map);
        if (!v.ok) return { ok: false, reason: `AI returned an invalid map: ${v.error}` };
        return { ok: true, map: v.map };
    } catch (e) {
        return { ok: false, reason: 'Could not reach the AI service. Is the backend running?' };
    }
}

// POST /api/ai/generate-background  ->  { ok, url } | { ok:false, reason }
export async function generateBackgroundImage(gameCode, prompt, opts = {}) {
    try {
        const res = await fetch(`${AI_BASE}/generate-background`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ gameCode, prompt, ...opts }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
            return { ok: false, reason: data.message || `AI request failed (${res.status}).` };
        }
        return { ok: true, url: data.url };
    } catch (e) {
        return { ok: false, reason: 'Could not reach the AI service. Is the backend running?' };
    }
}

// Parse + validate a pasted / AI-produced map JSON string. Works today.
export function importMapJson(text) {
    let parsed;
    try {
        parsed = typeof text === 'string' ? JSON.parse(text) : text;
    } catch (e) {
        return { ok: false, reason: 'Invalid JSON: ' + e.message };
    }
    const v = validateMap(parsed);
    if (!v.ok) return { ok: false, reason: v.error };
    return { ok: true, map: v.map };
}
