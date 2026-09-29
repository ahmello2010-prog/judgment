// Vercel Serverless Function - 100% مجاني بدون أي متطلبات أو مكتبات خارجية
export default async function handler(req, res) {
    const text = (req.query.text || "").toString().trim();
    if (!text) {
        return res.status(400).send("No text provided");
    }

    try {
        const encoded = encodeURIComponent(text.slice(0, 400));
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&q=${encoded}`;

        const response = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: "TTS provider returned error" });
        }

        const arrayBuffer = await response.arrayBuffer();
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
        return res.send(Buffer.from(arrayBuffer));
    } catch (err) {
        console.error("Serverless TTS error:", err);
        return res.status(500).json({ error: "Failed to generate speech" });
    }
}
