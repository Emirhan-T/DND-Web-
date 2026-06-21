const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const verifyToken = require('../middleware/verifyToken');

// ============================================================
//  AI HARİTA YARDIMCILARI
//
//  - /generate-background : prompttan TOP-DOWN savaş haritası
//    GÖRSELİ üretir (OpenAI gpt-image-1), diske kaydeder ve
//    kalıcı bir URL döndürür (frontend onu hex ızgaranın arkasına
//    arka plan olarak koyar). Görseli /maps altından servis ederiz.
//
//  - /generate-map : (WIP) prompttan harita VERİSİ. Bağlı değil.
//
//  Sağlayıcı: IMAGE_PROVIDER env (varsayılan: OPENAI_API_KEY
//  ayarlıysa 'openai'). Anahtar process.env'den okunur; gerçek
//  .env DÜZENLENMEZ. Gereken anahtarlar:
//     OPENAI_API_KEY            (zorunlu)
//     OPENAI_IMAGE_MODEL        (ops, vars. 'gpt-image-1-mini' — en ucuz;
//                                daha yüksek kalite için 'gpt-image-1';
//                                org doğrulaması yoksa 'dall-e-3')
//     OPENAI_IMAGE_QUALITY      (ops, vars. 'medium' — low|medium|high)
// ============================================================

const MAPS_DIR = path.join(__dirname, '..', 'public', 'maps');
const IMAGE_PROVIDER = process.env.IMAGE_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'none');

// Optional style/lighting fragments that slot into the fixed scaffold.
// The canonical wording lives here so every image stays consistent;
// the frontend only sends the short ids.
const STYLE_FRAGMENTS = {
    painterly: 'painterly hand-painted fantasy art style',
    realistic: 'photorealistic with detailed natural textures',
    gritty: 'dark gritty grimdark style, muted desaturated tones',
    vibrant: 'vibrant, colorful, stylized art style',
};
const LIGHTING_FRAGMENTS = {
    day: 'bright midday daylight',
    dusk: 'warm golden-hour dusk lighting',
    night: 'moonlit night, cool blue tones',
    torchlit: 'dim flickering torchlight',
};

// Steer any prompt toward a usable, grid-free, top-down battle map.
function buildBgPrompt(userPrompt, { style, lighting } = {}) {
    const base = 'Top-down orthographic birds-eye-view fantasy tabletop RPG battle map. '
        + 'Highly detailed natural terrain textures, even flat lighting, sharp focus. '
        + 'No grid, no grid lines, no hexes, no text, no labels, no legend, no UI, '
        + 'no characters, no tokens, no border frame. Seamless terrain filling the whole image.';
    let extra = '';
    if (STYLE_FRAGMENTS[style]) extra += ` Style: ${STYLE_FRAGMENTS[style]}.`;
    if (LIGHTING_FRAGMENTS[lighting]) extra += ` Lighting: ${LIGHTING_FRAGMENTS[lighting]}.`;
    return `${base} Scene: ${userPrompt}.${extra}`;
}

async function saveImageBuffer(buf, ext = 'png') {
    await fs.promises.mkdir(MAPS_DIR, { recursive: true });
    const name = `bg_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    await fs.promises.writeFile(path.join(MAPS_DIR, name), buf);
    return name;
}

// Returns a PNG Buffer.
async function generateBackgroundWithOpenAI({ prompt, size, style, lighting }) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
        const e = new Error('OPENAI_API_KEY is not set on the server.');
        e.statusCode = 501;
        throw e;
    }
    const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini';
    const isGptImage = model.startsWith('gpt-image');
    const body = {
        model,
        prompt: buildBgPrompt(prompt, { style, lighting }),
        n: 1,
        size: size || (isGptImage ? '1536x1024' : '1792x1024'),
    };
    if (isGptImage) {
        body.quality = process.env.OPENAI_IMAGE_QUALITY || 'medium'; // low|medium|high
    } else {
        body.response_format = 'b64_json'; // dall-e-3 / dall-e-2 need this to return base64
    }

    let res;
    try {
        res = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
            body: JSON.stringify(body),
        });
    } catch (e) {
        throw new Error(`could not reach OpenAI (${e.message}). Check the server's internet connection.`);
    }
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        const e = new Error(`OpenAI image API error ${res.status}. ${text.slice(0, 300)}`);
        e.statusCode = (res.status === 401 || res.status === 403) ? res.status : 502;
        throw e;
    }
    const data = await res.json();
    const b64 = data && data.data && data.data[0] && data.data[0].b64_json;
    if (!b64) throw new Error('OpenAI returned no image data.');
    return Buffer.from(b64, 'base64');
}

// ---- provider dispatch ----
async function generateBackground(args) {
    switch (IMAGE_PROVIDER) {
        case 'openai':
            return generateBackgroundWithOpenAI(args);
        default: {
            const err = new Error('Background generation is not configured. Set OPENAI_API_KEY on the server, then restart it.');
            err.statusCode = 501;
            throw err;
        }
    }
}

// ============================================================
//  ROUTES
// ============================================================

// POST /api/ai/generate-background  { prompt, size? }  ->  { ok, url } | { ok:false, message }
router.post('/generate-background', verifyToken, async (req, res) => {
    const { prompt, size, style, lighting } = req.body || {};
    if (!prompt || !String(prompt).trim()) {
        return res.status(400).json({ ok: false, message: 'A prompt is required.' });
    }
    try {
        const buf = await generateBackground({ prompt: String(prompt).trim(), size, style, lighting });
        const name = await saveImageBuffer(buf, 'png');
        const url = `${req.protocol}://${req.get('host')}/maps/${name}`;
        return res.json({ ok: true, url });
    } catch (e) {
        console.error('generate-background failed:', e.message);
        return res.status(e.statusCode || 502).json({ ok: false, message: 'Background generation failed: ' + e.message });
    }
});

// POST /api/ai/generate-map  (WIP — prompttan harita VERİSİ; ileride)
router.post('/generate-map', verifyToken, async (req, res) => {
    return res.status(501).json({
        ok: false,
        message: 'Map-data generation from a prompt is not implemented. Build the map manually or import JSON. (AI generates the background image only.)',
    });
});

module.exports = router;
