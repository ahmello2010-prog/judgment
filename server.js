import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.use(express.json({ limit: "10mb" }));

// ذاكرة تخزين مؤقت للصوت الفوري السريع
const audioBufferCache = new Map();

// دالة توليد الصوت البشري الرجالي العصبي الطبيعي فائق النقاء
async function generateNeuralAudio(text, voiceName = "ar-SA-HamedNeural") {
    const cacheKey = `${voiceName}:${text}`;
    if (audioBufferCache.has(cacheKey)) {
        return audioBufferCache.get(cacheKey);
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const { audioStream } = await tts.toStream(text);

    const chunks = [];
    return new Promise((resolve, reject) => {
        audioStream.on("data", (chunk) => chunks.push(chunk));
        audioStream.on("end", () => {
            const buffer = Buffer.concat(chunks);
            if (audioBufferCache.size > 300) {
                audioBufferCache.delete(audioBufferCache.keys().next().value);
            }
            audioBufferCache.set(cacheKey, buffer);
            resolve(buffer);
        });
        audioStream.on("error", (err) => reject(err));
    });
}

// مسار الصوت الرجالي العربي البشري الواقعي (أصوات Azure Neural مثل حامد وشاكر)
app.get("/api/speak", async (req, res) => {
    const text = (req.query.text || "").toString().trim();
    const voice = (req.query.voice || "ar-SA-HamedNeural").toString().trim();

    if (!text) {
        return res.status(400).send("No text provided");
    }

    try {
        const audioBuffer = await generateNeuralAudio(text.slice(0, 500), voice);
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(audioBuffer);
    } catch (err) {
        console.warn("Neural TTS fallback triggered:", err.message);
        try {
            const encoded = encodeURIComponent(text.slice(0, 350));
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&q=${encoded}`;
            const response = await fetch(url, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            });
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                res.setHeader("Content-Type", "audio/mpeg");
                return res.send(Buffer.from(arrayBuffer));
            }
        } catch (fallbackErr) {
            console.error("TTS error:", fallbackErr);
        }
        res.status(500).json({ error: "Failed to generate speech audio" });
    }
});

// قائمة الأصوات الرجالية والنسائية المتاحة
app.get("/api/voices", (req, res) => {
    res.json([
        { id: "ar-SA-HamedNeural", name: "حامد (صوت رجالي سعودي فخم ووقور - للمحكمة)", gender: "Male" },
        { id: "ar-EG-ShakirNeural", name: "شاكر (صوت رجالي مصري طبيعي وهادئ)", gender: "Male" },
        { id: "ar-SA-ZariyahNeural", name: "زارية (صوت نسائي سعودي طبيعي)", gender: "Female" }
    ]);
});

// Serve static assets from project root
app.use(
    express.static(__dirname, {
        extensions: ["html"],
        index: "index.html"
    })
);

// Fallback to index.html for SPA/root navigation
app.get("*", (req, res, next) => {
    if (req.accepts("html")) {
        res.sendFile(path.join(__dirname, "index.html"));
    } else {
        next();
    }
});

app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
});
