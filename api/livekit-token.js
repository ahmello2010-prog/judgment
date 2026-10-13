import { AccessToken } from "livekit-server-sdk";

export default async function livekitTokenHandler(req, res) {
    try {
        const body = req.body || {};
        const query = req.query || {};

        const roomCode = String(body.roomCode || query.roomCode || query.room || "1001").trim();
        const playerUid = String(body.playerUid || query.playerUid || query.identity || `player_${Date.now()}`).trim();
        const playerName = String(body.playerName || query.playerName || query.name || "لاعب").trim();
        const role = String(body.role || query.role || "suspect").trim();
        const roomName = `court_room_${roomCode}`;

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const livekitUrl = process.env.LIVEKIT_URL || process.env.LIVEKIT_HOST;

        if (apiKey && apiSecret && livekitUrl) {
            const at = new AccessToken(apiKey, apiSecret, {
                identity: playerUid,
                name: playerName,
                metadata: JSON.stringify({ role })
            });

            at.addGrant({
                roomJoin: true,
                room: roomName,
                canPublish: true,
                canSubscribe: true
            });

            const token = await at.toJwt();
            return res.json({
                mode: "livekit",
                token,
                url: livekitUrl,
                roomName
            });
        }

        // في حال عدم توفر مفاتيح LiveKit، نرجع الوضع الاحتياطي المدمج عبر WebRTC الخاص بالخادم
        return res.json({
            mode: "fallback",
            roomName
        });
    } catch (err) {
        console.warn("LiveKit token handler error, falling back to builtin WebRTC:", err);
        const fallbackRoom = `court_room_${req.body?.roomCode || req.query?.roomCode || "1001"}`;
        return res.json({
            mode: "fallback",
            roomName: fallbackRoom
        });
    }
}
