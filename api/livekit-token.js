// ==========================================================================
// ☁️ Cloud Function / Serverless Handler لإصدار LiveKit Access Tokens بأمان
// تستخدم LIVEKIT_API_KEY و LIVEKIT_API_SECRET و LIVEKIT_URL من المتغيرات البيئية
// وتربط التوكن بمعرف الغرفة (roomCode) وهوية اللاعب (playerUid / UID)
// ==========================================================================
import { AccessToken } from "livekit-server-sdk";
import fs from "fs";
import path from "path";

// تحميل متغيرات البيئة من ملف .env تلقائياً إن وُجد على السيرفر
(function loadLocalEnv() {
    try {
        const envPath = path.resolve(process.cwd(), ".env");
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, "utf8");
            content.split(/\r?\n/).forEach((line) => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith("#")) return;
                const eqIdx = trimmed.indexOf("=");
                if (eqIdx > 0) {
                    const key = trimmed.slice(0, eqIdx).trim();
                    const val = trimmed.slice(eqIdx + 1).trim();
                    if (!process.env[key]) {
                        process.env[key] = val;
                    }
                }
            });
        }
    } catch (e) {
        /* ignore */
    }
})();

const FIREBASE_DB_DEFAULT = "https://great-songs-e334c-default-rtdb.firebaseio.com";
const DEFAULT_LIVEKIT_URL = "wss://mhkmh-l-dwr-z8komo70.livekit.cloud";
const DEFAULT_LIVEKIT_API_KEY = "APIfG8kgLbzNftb";
const DEFAULT_LIVEKIT_API_SECRET = "LzK8itWk04Y7UtL5M1W6mMUKLJwu6YfXnCgcaE7PQrP";

/**
 * التحقق من وجود الغرفة واللاعب في Firebase Realtime Database (إن أمكن)
 * لضمان عدم إصدار توكن لمستخدم غير منضم للغرفة واستخراج دوره الفعلي.
 */
async function verifyRoomMembershipAndRole(roomCode, playerUid, fallbackName, fallbackRole) {
    const dbUrl = (process.env.FIREBASE_DATABASE_URL || FIREBASE_DB_DEFAULT).replace(/\/$/, "");
    const cleanRoomCode = String(roomCode).replace(/[^0-9a-zA-Z_-]/g, "");
    const cleanUid = String(playerUid).trim();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(`${dbUrl}/rooms/${encodeURIComponent(cleanRoomCode)}.json`, {
            method: "GET",
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return {
                verified: true,
                playerName: String(fallbackName || "لاعب"),
                role: String(fallbackRole || "suspect")
            };
        }

        const roomData = await response.json();
        if (!roomData) {
            return { verified: false, reason: "Room does not exist" };
        }

        const players = roomData.players || {};
        const assignments = (roomData.game_state && roomData.game_state.assignments) || {};

        let foundPlayerName = null;
        for (const key of Object.keys(players)) {
            const p = players[key];
            if (p && p.uid === cleanUid) {
                foundPlayerName = p.name || "لاعب";
                break;
            }
        }

        // السماح أيضاً إذا كان اللاعب هو منشئ الغرفة أو مسجلاً في توزيع الأدوار
        const assignedCard = assignments[cleanUid] || null;
        const isHost = roomData.hostUID === cleanUid;

        if (!foundPlayerName && !assignedCard && !isHost) {
            return { verified: false, reason: "Player UID is not a member of this room" };
        }

        const resolvedRole = (assignedCard && assignedCard.role_type) || fallbackRole || "suspect";
        const resolvedRoleName = (assignedCard && assignedCard.role_name) || "";

        return {
            verified: true,
            playerName: foundPlayerName || String(fallbackName || "لاعب"),
            role: String(resolvedRole),
            roleName: String(resolvedRoleName)
        };
    } catch (err) {
        // في حال تعذر الوصول المؤقت لـ Firebase REST، نسمح بالمتابعة بالبيانات الممررة لعدم تعطيل اللعب
        return {
            verified: true,
            playerName: String(fallbackName || "لاعب"),
            role: String(fallbackRole || "suspect"),
            roleName: ""
        };
    }
}

/**
 * الدالة الأساسية لتوليد بيانات توكن LiveKit المؤمّنة
 */
export async function createLiveKitTokenResponse({ roomCode, playerUid, playerName, role }) {
    const cleanRoomCode = String(roomCode || "").trim();
    const cleanUid = String(playerUid || "").trim();

    if (!cleanRoomCode || !/^[0-9a-zA-Z_-]{1,32}$/.test(cleanRoomCode)) {
        const err = new Error("معرف الغرفة (roomCode) غير صالح أو مفقود.");
        err.statusCode = 400;
        throw err;
    }

    if (!cleanUid || cleanUid.length < 3 || cleanUid.length > 128) {
        const err = new Error("هوية المستخدم (playerUid) غير صالحة أو مفقودة.");
        err.statusCode = 400;
        throw err;
    }

    // التحقق من عضوية اللاعب في الغرفة ودوره من Firebase
    const membership = await verifyRoomMembershipAndRole(cleanRoomCode, cleanUid, playerName, role);
    if (!membership.verified) {
        const err = new Error(membership.reason || "غير مصرح لهذا المستخدم بالانضمام إلى القناة الصوتية للغرفة.");
        err.statusCode = 403;
        throw err;
    }

    const livekitUrl = (process.env.LIVEKIT_URL || DEFAULT_LIVEKIT_URL).trim();
    const apiKey = (process.env.LIVEKIT_API_KEY || DEFAULT_LIVEKIT_API_KEY).trim();
    const apiSecret = (process.env.LIVEKIT_API_SECRET || DEFAULT_LIVEKIT_API_SECRET).trim();

    const roomName = `court_room_${cleanRoomCode}`;

    // إذا توفرت مفاتيح LiveKit في المتغيرات البيئية للسيرفر، نصدر JWT رسمي موقع بـ LIVEKIT_API_SECRET
    if (livekitUrl && apiKey && apiSecret) {
        const at = new AccessToken(apiKey, apiSecret, {
            identity: cleanUid,
            name: membership.playerName,
            ttl: "4h",
            metadata: JSON.stringify({
                uid: cleanUid,
                roomCode: cleanRoomCode,
                role: membership.role,
                roleName: membership.roleName || ""
            })
        });

        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true
        });

        const token = await at.toJwt();

        return {
            mode: "livekit",
            token,
            url: livekitUrl,
            roomName,
            identity: cleanUid,
            role: membership.role
        };
    }

    // وضع WebRTC المدمج في حال عدم تهيئة مفاتيح LiveKit السحابية بعد
    return {
        mode: "builtin-webrtc",
        token: `builtin_${roomName}_${cleanUid}_${Date.now()}`,
        url: "/ws/voice",
        roomName,
        identity: cleanUid,
        role: membership.role
    };
}

/**
 * Cloud Function / Vercel Serverless Handler
 */
export default async function handler(req, res) {
    // إعدادات CORS الآمنة
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed. Use POST." });
    }

    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
        const result = await createLiveKitTokenResponse({
            roomCode: body.roomCode,
            playerUid: body.playerUid || body.uid,
            playerName: body.playerName,
            role: body.role
        });

        return res.status(200).json(result);
    } catch (error) {
        const status = error.statusCode || 500;
        console.error("[Cloud Function livekit-token] Error:", error.message);
        return res.status(status).json({
            error: error.message || "Failed to generate LiveKit access token"
        });
    }
}
