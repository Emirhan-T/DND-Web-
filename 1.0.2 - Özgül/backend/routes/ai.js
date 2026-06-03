const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');

// ============================================================
//  AI HARİTA / ARKA PLAN ÜRETİMİ  (ŞİMDİLİK STUB)
// ============================================================
// Şu an bağlı aktif bir AI sağlayıcısı YOKTUR.
// Bu rotalar, ileride gerçek bir sağlayıcı bağlanabilsin diye
// uçtan uca kabloları hazır tutar (frontend -> /api/ai -> sağlayıcı).
//
// Gerekli ortam değişkeni:  process.env.AI_API_KEY
//   (backend/.env dosyasına eklenecek — gerçek anahtar burada SAKLANMAZ)
//
// Gelecekte doldurma örneği (Anthropic SDK — `claude-api` skill'i ile):
//   const Anthropic = require('@anthropic-ai/sdk');
//   const client = new Anthropic({ apiKey: process.env.AI_API_KEY });
//   const msg = await client.messages.create({
//       model: 'claude-opus-4-8',
//       max_tokens: 4096,
//       messages: [{ role: 'user', content: buildMapPrompt(req.body) }]
//   });
//   const map = JSON.parse(msg.content[0].text); // hexUtils.validateMap ile uyumlu olmalı
//   return res.json({ ok: true, map });
// ============================================================

const isAiConfigured = () => Boolean(process.env.AI_API_KEY);

// POST /api/ai/generate-map
// body: { prompt, width, height, campaignId }
// dönüş (gelecekte): { ok: true, map: <howto/json.txt yapısı> }
router.post('/generate-map', verifyToken, async (req, res) => {
    if (!isAiConfigured()) {
        return res.status(501).json({
            ok: false,
            message: 'AI map generation is not configured yet. Set AI_API_KEY in backend/.env and implement the provider call in backend/routes/ai.js.'
        });
    }
    // TODO: gerçek AI çağrısını burada yap ve hexUtils.validateMap ile uyumlu JSON döndür.
    return res.status(501).json({ ok: false, message: 'AI map provider is not implemented yet.' });
});

// POST /api/ai/generate-background
// body: { prompt }
// dönüş (gelecekte): { ok: true, url: '<görsel url>' }
router.post('/generate-background', verifyToken, async (req, res) => {
    if (!isAiConfigured()) {
        return res.status(501).json({
            ok: false,
            message: 'AI background generation is not configured yet. Set AI_API_KEY in backend/.env and implement the image provider call in backend/routes/ai.js.'
        });
    }
    // TODO: görsel üretim sağlayıcısını çağır ve { url } döndür.
    return res.status(501).json({ ok: false, message: 'AI image provider is not implemented yet.' });
});

module.exports = router;
