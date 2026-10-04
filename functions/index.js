/**
 * Firebase Cloud Functions (Gen 2 / HTTPS OnRequest) لإصدار LiveKit Access Tokens
 * يحفظ LIVEKIT_API_KEY و LIVEKIT_API_SECRET في بيئة السيرفر فقط دون كشفها للواجهة الأمامية،
 * ويربط التوكن بهوية المستخدم (UID) ومعرف الغرفة (roomCode).
 */
import { createLiveKitTokenResponse } from "../api/livekit-token.js";

/**
 * معالج HTTP قياسي متوافق مع Google Cloud Functions / Firebase Functions (onRequest)
 */
export const getLiveKitToken = async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed. Use POST." });
    }

    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
        const tokenPayload = await createLiveKitTokenResponse({
            roomCode: body.roomCode,
            playerUid: body.playerUid || body.uid,
            playerName: body.playerName,
            role: body.role
        });

        return res.status(200).json(tokenPayload);
    } catch (err) {
        const status = err.statusCode || 500;
        console.error("[Firebase Function getLiveKitToken] Error:", err.message);
        return res.status(status).json({
            error: err.message || "Internal Server Error while issuing LiveKit token"
        });
    }
};
