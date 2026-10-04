import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { WebSocketServer } from "ws";
import livekitTokenHandler from "./api/livekit-token.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
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

// ==========================================================================
// ☁️ Cloud Function Endpoints لإصدار LiveKit Access Tokens بأمان من الخادم
// ==========================================================================
app.all("/api/livekit-token", (req, res) => livekitTokenHandler(req, res));
app.all("/getLiveKitToken", (req, res) => livekitTokenHandler(req, res));

// تقديم مكتبة livekit-client مباشرة من node_modules للواجهة الأمامية
app.use(
    "/vendor/livekit",
    express.static(path.join(__dirname, "node_modules/livekit-client/dist"))
);

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

// ==========================================================================
// 🔊 خادم الإشارات الصوتية المباشر (WebSocket Signaling for Multi-Device Voice)
// يضمن عمل الاتصال الصوتي الفوري بين الأجهزة حتى قبل إضافة مفاتيح LiveKit Cloud
// ==========================================================================
const wss = new WebSocketServer({ server, path: "/ws/voice" });
// roomsMap: Map<roomName, Map<identity, { ws, name, role, muted }>>
const voiceRooms = new Map();

function broadcastToVoiceRoom(roomName, senderIdentity, payload) {
    const roomPeers = voiceRooms.get(roomName);
    if (!roomPeers) return;
    const messageStr = JSON.stringify(payload);
    for (const [peerId, peer] of roomPeers.entries()) {
        if (peerId !== senderIdentity && peer.ws.readyState === 1) {
            try {
                peer.ws.send(messageStr);
            } catch (e) {
                /* ignore */
            }
        }
    }
}

wss.on("connection", (ws) => {
    let currentRoom = null;
    let currentIdentity = null;

    ws.on("message", (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw.toString());
        } catch (e) {
            return;
        }

        if (msg.type === "join") {
            const { roomName, identity, name, role } = msg;
            if (!roomName || !identity) return;

            currentRoom = String(roomName);
            currentIdentity = String(identity);

            if (!voiceRooms.has(currentRoom)) {
                voiceRooms.set(currentRoom, new Map());
            }
            const roomPeers = voiceRooms.get(currentRoom);

            // إذا كان هناك اتصال قديم لنفس الهوية، نغلقه
            if (roomPeers.has(currentIdentity)) {
                const oldPeer = roomPeers.get(currentIdentity);
                if (oldPeer && oldPeer.ws !== ws) {
                    try {
                        oldPeer.ws.close();
                    } catch (e) {
                        /* ignore */
                    }
                }
            }

            // قائمة المشاركين الموجودين حالياً لإرسالها للمنضم الجديد
            const existingPeers = [];
            for (const [peerId, peerData] of roomPeers.entries()) {
                if (peerId !== currentIdentity) {
                    existingPeers.push({
                        identity: peerId,
                        name: peerData.name,
                        role: peerData.role,
                        muted: peerData.muted
                    });
                }
            }

            roomPeers.set(currentIdentity, {
                ws,
                name: String(name || "لاعب"),
                role: String(role || "suspect"),
                muted: true
            });

            ws.send(
                JSON.stringify({
                    type: "peers",
                    peers: existingPeers
                })
            );

            broadcastToVoiceRoom(currentRoom, currentIdentity, {
                type: "peer-joined",
                identity: currentIdentity,
                name: String(name || "لاعب"),
                role: String(role || "suspect"),
                muted: true
            });
            return;
        }

        if (!currentRoom || !currentIdentity) return;
        const roomPeers = voiceRooms.get(currentRoom);
        if (!roomPeers) return;

        if (msg.type === "signal" && msg.target) {
            const targetPeer = roomPeers.get(String(msg.target));
            if (targetPeer && targetPeer.ws.readyState === 1) {
                targetPeer.ws.send(
                    JSON.stringify({
                        type: "signal",
                        from: currentIdentity,
                        signal: msg.signal
                    })
                );
            }
            return;
        }

        if (msg.type === "mute-state") {
            const me = roomPeers.get(currentIdentity);
            if (me) {
                me.muted = !!msg.muted;
            }
            broadcastToVoiceRoom(currentRoom, currentIdentity, {
                type: "peer-mute-state",
                identity: currentIdentity,
                muted: !!msg.muted,
                speaking: !!msg.speaking
            });
            return;
        }

        if (msg.type === "speaking") {
            broadcastToVoiceRoom(currentRoom, currentIdentity, {
                type: "peer-speaking",
                identity: currentIdentity,
                speaking: !!msg.speaking
            });
        }
    });

    ws.on("close", () => {
        if (currentRoom && currentIdentity && voiceRooms.has(currentRoom)) {
            const roomPeers = voiceRooms.get(currentRoom);
            const peer = roomPeers.get(currentIdentity);
            if (peer && peer.ws === ws) {
                roomPeers.delete(currentIdentity);
                broadcastToVoiceRoom(currentRoom, currentIdentity, {
                    type: "peer-left",
                    identity: currentIdentity
                });
                if (roomPeers.size === 0) {
                    voiceRooms.delete(currentRoom);
                }
            }
        }
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
});
