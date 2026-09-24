// api/tts.js — وسيط Vercel Serverless يخفي مفتاح Google Cloud TTS عن المتصفح.
// الإعداد: أضف متغير البيئة GOOGLE_TTS_API_KEY في لوحة Vercel (Settings → Environment Variables).
// يمرّر نفس شكل استجابة Google (audioContent بصيغة base64) فيعمل مع js/tts.js مباشرة.

const MAX_TEXT_LENGTH = 2000;

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "TTS key is not configured", detail: "GOOGLE_TTS_API_KEY is missing" });
    }

    const body = typeof req.body === "string" ? safeParse(req.body) : req.body;
    const text = body && body.input && body.input.text;
    if (typeof text !== "string" || !text.trim() || text.length > MAX_TEXT_LENGTH) {
        return res.status(400).json({ error: "Invalid text" });
    }

    // نقبل الأصوات العربية فقط ونثبّت الإعدادات المسموحة لمنع إساءة استخدام الحصة
    const voiceName = String((body.voice && body.voice.name) || "ar-XA-Wavenet-B");
    if (!/^ar-XA-(Wavenet|Standard|Chirp3-HD)-/.test(voiceName)) {
        return res.status(400).json({ error: "Voice not allowed" });
    }
    const audio = body.audioConfig || {};
    const audioConfig = {
        audioEncoding: "MP3",
        speakingRate: clamp(audio.speakingRate, 0.5, 1.5, 0.92)
    };
    if (!/Chirp3/i.test(voiceName)) audioConfig.pitch = clamp(audio.pitch, -10, 10, -1.5);

    try {
        const upstream = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    input: { text },
                    voice: { languageCode: "ar-XA", name: voiceName },
                    audioConfig
                })
            }
        );
        const data = await upstream.json();
        if (!upstream.ok) {
            const detail = (data && data.error && data.error.message) || "Upstream TTS error";
            return res.status(upstream.status).json({ error: "Upstream TTS error", detail });
        }
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).json({ audioContent: data.audioContent });
    } catch (err) {
        return res.status(502).json({ error: "TTS upstream unreachable" });
    }
}

function safeParse(s) {
    try {
        return JSON.parse(s);
    } catch (e) {
        return null;
    }
}

function clamp(v, min, max, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
