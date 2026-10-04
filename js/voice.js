// ==========================================================================
// 🎙️ محرك الصوت المباشر لقاعة المحكمة (LiveKit + Built-in WebRTC Fallback)
// يدير الاتصال الصوتي وصلاحيات المايك بناءً على حالة الجولة في Firebase
// ==========================================================================
import {
    ref,
    onValue,
    update,
    set,
    remove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

let LiveKitClientModule = null;

async function loadLiveKitClient() {
    if (LiveKitClientModule) return LiveKitClientModule;
    try {
        LiveKitClientModule = await import("/vendor/livekit/livekit-client.esm.mjs");
        return LiveKitClientModule;
    } catch (e) {
        try {
            LiveKitClientModule = await import("https://cdn.jsdelivr.net/npm/livekit-client@2.9.1/dist/livekit-client.esm.mjs");
            return LiveKitClientModule;
        } catch (err) {
            console.warn("Could not load LiveKit ESM module:", err);
            return null;
        }
    }
}

class CourtVoiceEngine {
    constructor() {
        this.db = null;
        this.roomCode = null;
        this.myUid = null;
        this.myName = "لاعب";
        this.myRoleType = "suspect"; // "judge" | "lawyer" | "suspect" | "innocent_impostor"
        this.myRoleName = "";

        // حالة الصلاحيات من Firebase
        this.activeSpeakerUID = "none";
        this.evidenceTargetUID = "none";
        this.questionTargetUID = "none";
        this.judgeMicOpen = false;
        this.localMicEnabled = false;
        this.hasPermissionToSpeak = false;

        // حالة الاتصال الصوتي
        this.mode = null; // "livekit" | "builtin-webrtc"
        this.isConnected = false;
        this.isConnecting = false;
        this.lkRoom = null;

        // Built-in WebRTC fallback state
        this.ws = null;
        this.localStream = null;
        this.peerConnections = new Map(); // identity -> RTCPeerConnection
        this.remoteAudioElements = new Map(); // identity -> HTMLAudioElement
        this.peerStates = new Map(); // identity -> { muted, speaking, name, role }
        this.audioContext = null;
        this.analyserTimer = null;
        this.reconnectTimer = null;
        this.destroyed = false;

        this.lastHandledRequestTs = 0;
        this.playersMap = {};
        this.assignmentsMap = {};
    }

    init({ db, roomCode, myUid }) {
        if (!db || !roomCode || !myUid) return;
        if (this.isConnected || this.isConnecting) return;

        this.db = db;
        this.roomCode = String(roomCode);
        this.myUid = String(myUid);
        this.destroyed = false;

        this.injectVoiceStyles();
        this.mountJudgeControlNavbarButton();
        this.mountRequestQueuePanelForJudge();
        this.bindFirebaseVoiceSync();

        // بدء الاتصال الصوتي للغرفة تلقائياً مع المايك مغلق افتراضياً
        this.connectToVoiceRoom();

        // تنظيف الاتصال عند إغلاق الصفحة أو مغادرتها
        window.addEventListener("beforeunload", () => this.disconnect());
    }

    // ==========================================================================
    // 1. حقن تنسيقات الصوت وأيقونات حالة المايك على الكراسي وشريط القاضي
    // ==========================================================================
    injectVoiceStyles() {
        if (document.getElementById("court-voice-styles")) return;
        const style = document.createElement("style");
        style.id = "court-voice-styles";
        style.textContent = `
            /* شريط التحكم الصوتي العلوي */
            .voice-control-pill {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                padding: 7px 13px;
                border-radius: 999px;
                font-family: "Alexandria", sans-serif;
                font-weight: 700;
                font-size: 0.72rem;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 1.5px solid rgba(213, 167, 92, 0.55);
                background: rgba(13, 25, 43, 0.92);
                color: #f9f5eb;
                box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
                user-select: none;
                -webkit-tap-highlight-color: transparent;
            }
            .voice-control-pill.mic-live {
                background: linear-gradient(135deg, #065f46 0%, #047857 100%);
                border-color: #34d399;
                color: #ffffff;
                box-shadow: 0 0 16px rgba(52, 211, 153, 0.45);
            }
            .voice-control-pill.mic-muted {
                background: rgba(26, 19, 21, 0.92);
                border-color: rgba(255, 82, 82, 0.6);
                color: #ff9b9b;
            }
            .voice-control-pill.mic-locked {
                background: rgba(15, 20, 29, 0.9);
                border-color: rgba(141, 153, 168, 0.4);
                color: #9aa5b5;
                cursor: not-allowed;
            }
            .voice-status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #8d99a8;
                display: inline-block;
            }
            .voice-status-dot.connected {
                background: #34d399;
                box-shadow: 0 0 8px #34d399;
            }
            .voice-status-dot.speaking {
                background: #fbbf24;
                box-shadow: 0 0 12px #fbbf24;
                animation: voicePulseDot 0.9s infinite ease-in-out;
            }
            @keyframes voicePulseDot {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.35); opacity: 0.75; }
            }

            /* شارة حالة المايك فوق كرسي اللاعب */
            .seat-voice-badge {
                position: absolute;
                bottom: -11px;
                left: 50%;
                transform: translateX(-50%);
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 7px;
                border-radius: 999px;
                font-family: "Alexandria", sans-serif;
                font-size: 0.58rem;
                font-weight: 700;
                white-space: nowrap;
                z-index: 15;
                pointer-events: none;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.65);
                transition: all 0.25s ease;
            }
            .seat-voice-badge.state-speaking {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: #ffffff;
                border: 1px solid #6ee7a0;
                box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
            }
            .seat-voice-badge.state-allowed {
                background: rgba(16, 185, 129, 0.2);
                color: #6ee7a0;
                border: 1px solid #10b981;
            }
            .seat-voice-badge.state-requested {
                background: rgba(213, 167, 92, 0.25);
                color: #ffe9b3;
                border: 1px solid var(--gold-glow, #d5a75c);
                animation: voicePulseDot 1.2s infinite ease-in-out;
            }
            .seat-voice-badge.state-muted {
                background: rgba(15, 20, 29, 0.92);
                color: #8d99a8;
                border: 1px solid rgba(255, 255, 255, 0.14);
            }

            /* إشعار طلب الكلمة التفاعلي للقاضي */
            #judge-speak-requests-container {
                position: fixed;
                top: 72px;
                right: 4%;
                z-index: 9999998;
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-width: 310px;
                width: 88vw;
                direction: rtl;
                pointer-events: none;
            }
            .judge-speak-request-card {
                pointer-events: auto;
                background: linear-gradient(135deg, rgba(10, 17, 24, 0.97) 0%, rgba(22, 34, 48, 0.97) 100%);
                border: 1.5px solid var(--gold-glow, #d5a75c);
                border-right: 4px solid #34d399;
                border-radius: 12px;
                padding: 10px 12px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65);
                font-family: "Alexandria", sans-serif;
                display: flex;
                flex-direction: column;
                gap: 8px;
                animation: smoothPanelReveal 0.3s ease-out;
            }
            .judge-speak-request-title {
                font-size: 0.75rem;
                color: #ffffff;
                font-weight: 700;
                line-height: 1.5;
            }
            .judge-speak-request-role {
                font-size: 0.65rem;
                color: var(--gold-glow, #d5a75c);
                font-weight: 600;
            }
            .judge-speak-request-actions {
                display: flex;
                gap: 8px;
            }
            .btn-grant-speak {
                flex: 1;
                padding: 6px 10px;
                border-radius: 6px;
                border: 1px solid #34d399;
                background: rgba(16, 185, 129, 0.2);
                color: #6ee7a0;
                font-family: "Alexandria", sans-serif;
                font-weight: 700;
                font-size: 0.68rem;
                cursor: pointer;
            }
            .btn-ignore-speak {
                flex: 1;
                padding: 6px 10px;
                border-radius: 6px;
                border: 1px solid rgba(255, 82, 82, 0.5);
                background: rgba(255, 82, 82, 0.12);
                color: #ff9b9b;
                font-family: "Alexandria", sans-serif;
                font-weight: 700;
                font-size: 0.68rem;
                cursor: pointer;
            }

            /* زر سحب الكلمة العائم للقاضي عندما يتحدث لاعب آخر */
            #judge-revoke-speaker-bar {
                position: fixed;
                top: 68px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999996;
                background: rgba(15, 20, 29, 0.96);
                border: 1.5px solid var(--gold-glow, #d5a75c);
                border-radius: 999px;
                padding: 6px 14px;
                display: none;
                align-items: center;
                gap: 10px;
                font-family: "Alexandria", sans-serif;
                font-size: 0.72rem;
                color: #fff;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
                direction: rtl;
            }
            #btn-judge-revoke-mic {
                background: #8b0000;
                color: #fff;
                border: 1px solid #ff5252;
                border-radius: 999px;
                padding: 4px 10px;
                font-family: "Alexandria", sans-serif;
                font-size: 0.66rem;
                font-weight: 700;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }

    // ==========================================================================
    // 2. أزرار التحكم بالمايك في الشريط العلوي ولوحة طلبات الكلمة للقاضي
    // ==========================================================================
    mountJudgeControlNavbarButton() {
        const navGroup = document.querySelector(".court-top-actions-group");
        if (!navGroup || document.getElementById("court-voice-mic-btn")) return;

        const micBtn = document.createElement("button");
        micBtn.id = "court-voice-mic-btn";
        micBtn.type = "button";
        micBtn.className = "voice-control-pill mic-locked";
        micBtn.innerHTML = `
            <span class="voice-status-dot" id="voice-conn-dot"></span>
            <span id="voice-mic-label">🔇 المايك مغلق</span>
        `;

        micBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleMicButtonClick();
        });

        navGroup.prepend(micBtn);

        // شريط سحب الكلمة السريع للقاضي
        if (!document.getElementById("judge-revoke-speaker-bar")) {
            const revokeBar = document.createElement("div");
            revokeBar.id = "judge-revoke-speaker-bar";
            revokeBar.innerHTML = `
                <span id="judge-active-speaker-label">🎙️ المتحدث الحالي: —</span>
                <button type="button" id="btn-judge-revoke-mic">🔇 سحب الكلمة</button>
            `;
            document.body.appendChild(revokeBar);

            revokeBar.querySelector("#btn-judge-revoke-mic").addEventListener("click", () => {
                if (this.myRoleType !== "judge" || !this.db || !this.roomCode) return;
                const gsRef = ref(this.db, `rooms/${this.roomCode}/game_state`);
                update(gsRef, {
                    activeSpeakerUID: "none",
                    isInterrogatingMode: false
                });
            });
        }
    }

    mountRequestQueuePanelForJudge() {
        if (document.getElementById("judge-speak-requests-container")) return;
        const container = document.createElement("div");
        container.id = "judge-speak-requests-container";
        document.body.appendChild(container);
    }

    // ==========================================================================
    // 3. منطق الصلاحيات الصارم للمايك (القاضي vs المحامي/المتهم)
    // ==========================================================================
    computeCanCurrentPlayerSpeak() {
        // 1. القاضي يملك السيادة الصوتية الكاملة في أي وقت
        if (this.myRoleType === "judge") {
            return true;
        }
        // 2. المحامي أو المتهم يُسمح له بالتحدث فقط إذا كان:
        //    - هو المتحدث النشط المعيّن من القاضي أو بالاعتراض القسري (activeSpeakerUID)
        //    - أو المستهدف حالياً بمواجهة دليل (evidenceTargetUID)
        //    - أو المستهدف حالياً بسؤال رسمي (questionTargetUID)
        if (this.activeSpeakerUID && this.activeSpeakerUID !== "none" && this.activeSpeakerUID === this.myUid) {
            return true;
        }
        if (this.evidenceTargetUID && this.evidenceTargetUID !== "none" && this.evidenceTargetUID === this.myUid) {
            return true;
        }
        return false;
    }

    async handleMicButtonClick() {
        const canSpeak = this.computeCanCurrentPlayerSpeak();

        if (this.myRoleType !== "judge" && !canSpeak) {
            this.showVoiceToast("🔒 لا يمكنك تشغيل المايك بحرية! اضغط على زر «🎙️ طلب الكلمة» وانتظر إذن سيادة القاضي.");
            return;
        }

        const nextState = !this.localMicEnabled;
        await this.setMicrophoneEnabled(nextState);

        if (this.myRoleType === "judge" && this.db && this.roomCode) {
            this.judgeMicOpen = this.localMicEnabled;
            const voiceStateRef = ref(this.db, `rooms/${this.roomCode}/game_state/voice_state/${this.myUid}`);
            update(voiceStateRef, {
                muted: !this.localMicEnabled,
                role: this.myRoleType,
                updatedAt: Date.now()
            }).catch(() => {});
        }
    }

    // ==========================================================================
    // 4. المزامنة الحية مع Firebase والربط مع الاستجواب والأدلة وطلب الكلمة
    // ==========================================================================
    bindFirebaseVoiceSync() {
        const roomRef = ref(this.db, `rooms/${this.roomCode}`);

        onValue(roomRef, (snapshot) => {
            if (!snapshot.exists()) return;
            const roomData = snapshot.val() || {};
            const playersData = roomData.players || {};
            const gameState = roomData.game_state || {};
            const assignments = gameState.assignments || {};

            // حفظ خريطة اللاعبين والأدوار
            this.playersMap = {};
            Object.keys(playersData).forEach((k) => {
                const p = playersData[k];
                if (p && p.uid) {
                    this.playersMap[p.uid] = p.name || "لاعب";
                    if (p.uid === this.myUid) {
                        this.myName = p.name || "لاعب";
                    }
                }
            });
            this.assignmentsMap = assignments;

            const myCard = assignments[this.myUid] || {};
            if (myCard.role_type) {
                this.myRoleType = myCard.role_type;
                this.myRoleName = myCard.role_name || "";
            }

            const prevSpeaker = this.activeSpeakerUID;
            const prevEvidenceTarget = this.evidenceTargetUID;

            this.activeSpeakerUID = gameState.activeSpeakerUID || "none";

            // إذا كانت هناك مواجهة دليل جارية ولم يرد عليها المتهم بعد، يُفتح له المايك للتبرير الشفهي
            const evConf = gameState.active_evidence_confrontation;
            const evResp = gameState.evidence_response;
            if (
                evConf &&
                evConf.target_uid &&
                (!evResp || !evResp.timestamp || evResp.timestamp < evConf.timestamp)
            ) {
                this.evidenceTargetUID = evConf.target_uid;
            } else {
                this.evidenceTargetUID = "none";
            }

            const canSpeakNow = this.computeCanCurrentPlayerSpeak();
            const wasAllowedBefore = this.hasPermissionToSpeak;
            this.hasPermissionToSpeak = canSpeakNow;

            // تفعيل/قفل المايك تلقائيًا حسب تغير الدور أو الاستجواب لغير القاضي
            if (this.myRoleType !== "judge") {
                if (canSpeakNow && !wasAllowedBefore) {
                    // تم منح الكلمة أو بدء استجواب هذا اللاعب -> فتح المايك تلقائياً
                    this.setMicrophoneEnabled(true);
                    this.showVoiceToast("🎙️ تم منحك الكلمة! المايك الخاص بك مفتوح الآن للتحدث أمام المحكمة.");
                } else if (!canSpeakNow && (wasAllowedBefore || this.localMicEnabled)) {
                    // انتهى الاستجواب أو سُحبت الكلمة -> إغلاق المايك فوراً وبصرامة
                    this.setMicrophoneEnabled(false);
                    if (wasAllowedBefore) {
                        this.showVoiceToast("🔇 انتهى دورك في الحديث، تم إغلاق المايك تلقائياً.");
                    }
                }
            }

            // معالجة طلبات الكلمة الواردة للقاضي
            this.handleIncomingSpeakRequestsForJudge(gameState);

            // تحديث شريط سحب الكلمة للقاضي
            this.updateJudgeRevokeBar();

            // تحديث زر المايك العلوي وشارات الكراسي
            this.updateMicButtonUI();
            this.updateAllSeatsVoiceBadges(gameState);
        });

        // اعتراض زر "أنهيت إجابتي" أو "أنهيت تبريري" لإغلاق المايك وتصفير المتحدث عند الانتهاء
        document.addEventListener("click", (e) => {
            if (
                e.target.closest("#btn-finish-my-answer") ||
                e.target.closest("#btn-finish-evidence-justification") ||
                e.target.closest("#btn-evidence-silence")
            ) {
                if (this.myRoleType !== "judge") {
                    this.setMicrophoneEnabled(false);
                    if (this.activeSpeakerUID === this.myUid && this.db && this.roomCode) {
                        const gsRef = ref(this.db, `rooms/${this.roomCode}/game_state`);
                        update(gsRef, { activeSpeakerUID: "none" }).catch(() => {});
                    }
                }
            }
        });
    }

    // ==========================================================================
    // 5. إشعار طلب الكلمة التفاعلي للقاضي (قبول / تجاهل)
    // ==========================================================================
    handleIncomingSpeakRequestsForJudge(gameState) {
        const container = document.getElementById("judge-speak-requests-container");
        if (!container) return;

        if (this.myRoleType !== "judge") {
            container.innerHTML = "";
            return;
        }

        // فحص الطلب من السيرفر (ندعم الحقل الحالي lastSpeakRequestName + الحقل المهيكل speak_request)
        const reqTs = gameState.requestTimestamp || (gameState.speak_request && gameState.speak_request.timestamp) || 0;
        const entryTs = window.courtRoomEntryTimestamp || 0;

        if (!reqTs || reqTs <= entryTs || reqTs === this.lastHandledRequestTs) {
            return;
        }

        // استنتاج هوية الطالب من speak_request أو من الاسم في قائمة اللاعبين
        let requesterUid = gameState.speak_request?.uid || null;
        let requesterName = gameState.speak_request?.name || gameState.lastSpeakRequestName || "";

        if (!requesterUid && requesterName) {
            requesterUid =
                Object.keys(this.playersMap).find((uid) => this.playersMap[uid] === requesterName) || null;
        }

        if (!requesterUid || requesterUid === this.myUid) return;

        this.lastHandledRequestTs = reqTs;
        const roleCard = this.assignmentsMap[requesterUid] || {};
        const roleTitle = roleCard.role_name || (roleCard.role_type === "lawyer" ? "محامي" : "متهم");

        // إزالة أي بطاقة طلب قديمة لنفس اللاعب
        const existingCard = container.querySelector(`[data-req-uid="${requesterUid}"]`);
        if (existingCard) existingCard.remove();

        const card = document.createElement("div");
        card.className = "judge-speak-request-card";
        card.setAttribute("data-req-uid", requesterUid);
        card.innerHTML = `
            <div>
                <div class="judge-speak-request-title">🎙️ ${this.escapeHtml(requesterName)} يطلب الكلمة</div>
                <div class="judge-speak-request-role">الدور: ${this.escapeHtml(roleTitle)}</div>
            </div>
            <div class="judge-speak-request-actions">
                <button type="button" class="btn-grant-speak">✅ السماح بالكلام</button>
                <button type="button" class="btn-ignore-speak">✕ تجاهل</button>
            </div>
        `;

        card.querySelector(".btn-grant-speak").addEventListener("click", () => {
            const gsRef = ref(this.db, `rooms/${this.roomCode}/game_state`);
            update(gsRef, {
                activeSpeakerUID: requesterUid,
                isInterrogatingMode: false,
                speak_request: null
            });
            card.remove();
        });

        card.querySelector(".btn-ignore-speak").addEventListener("click", () => {
            const gsRef = ref(this.db, `rooms/${this.roomCode}/game_state`);
            update(gsRef, { speak_request: null }).catch(() => {});
            card.remove();
        });

        container.appendChild(card);

        // إخفاء تلقائي بعد 15 ثانية إذا لم يتفاعل القاضي
        setTimeout(() => {
            if (card.isConnected) card.remove();
        }, 15000);
    }

    updateJudgeRevokeBar() {
        const bar = document.getElementById("judge-revoke-speaker-bar");
        const label = document.getElementById("judge-active-speaker-label");
        if (!bar || !label) return;

        if (
            this.myRoleType === "judge" &&
            this.activeSpeakerUID &&
            this.activeSpeakerUID !== "none" &&
            this.activeSpeakerUID !== this.myUid
        ) {
            const speakerName = this.playersMap[this.activeSpeakerUID] || "لاعب";
            const speakerRole = this.assignmentsMap[this.activeSpeakerUID]?.role_name || "";
            label.textContent = `🎙️ المتحدث الآن: ${speakerName}${speakerRole ? ` (${speakerRole})` : ""}`;
            bar.style.display = "inline-flex";
        } else {
            bar.style.display = "none";
        }
    }

    // ==========================================================================
    // 6. الاتصال الفعلي بـ LiveKit (أو WebRTC المدمج في حال عدم ضبط المفاتيح)
    // ==========================================================================
    async connectToVoiceRoom() {
        if (this.isConnecting || this.isConnected || this.destroyed) return;
        this.isConnecting = true;

        try {
            const response = await fetch("/api/livekit-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roomCode: this.roomCode,
                    playerUid: this.myUid,
                    playerName: this.myName,
                    role: this.myRoleType
                })
            });

            if (!response.ok) {
                throw new Error("Token request failed");
            }

            const data = await response.json();
            this.mode = data.mode;

            if (data.mode === "livekit" && data.token && data.url) {
                await this.connectViaLiveKitSDK(data.url, data.token);
            } else {
                await this.connectViaBuiltinWebRTC(data.roomName);
            }

            this.isConnected = true;
            this.isConnecting = false;
            this.updateMicButtonUI();

            // التأكد من أن المايك مغلق افتراضياً عند الدخول إلا إذا كان اللاعب مسموحاً له حالياً
            const shouldEnableInitial = this.myRoleType !== "judge" && this.computeCanCurrentPlayerSpeak();
            await this.setMicrophoneEnabled(shouldEnableInitial);
        } catch (err) {
            console.warn("Voice connection error, retrying...", err);
            this.isConnecting = false;
            this.isConnected = false;
            this.updateMicButtonUI();
            if (!this.destroyed) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = setTimeout(() => this.connectToVoiceRoom(), 4000);
            }
        }
    }

    async connectViaLiveKitSDK(wsUrl, token) {
        const lk = await loadLiveKitClient();
        if (!lk || !lk.Room) {
            return this.connectViaBuiltinWebRTC(`court_room_${this.roomCode}`);
        }

        const room = new lk.Room({
            adaptiveStream: true,
            dynacast: true
        });
        this.lkRoom = room;

        room.on(lk.RoomEvent.TrackSubscribed, (track, publication, participant) => {
            if (track.kind === lk.Track.Kind.Audio) {
                const audioEl = track.attach();
                audioEl.autoplay = true;
                audioEl.playsInline = true;
                document.body.appendChild(audioEl);
                this.remoteAudioElements.set(participant.identity, audioEl);
                this.updatePeerState(participant.identity, { muted: false });
            }
        });

        room.on(lk.RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
            if (track.kind === lk.Track.Kind.Audio) {
                track.detach().forEach((el) => el.remove());
                this.remoteAudioElements.delete(participant.identity);
                this.updatePeerState(participant.identity, { muted: true, speaking: false });
            }
        });

        room.on(lk.RoomEvent.TrackMuted, (pub, participant) => {
            this.updatePeerState(participant.identity, { muted: true, speaking: false });
        });

        room.on(lk.RoomEvent.TrackUnmuted, (pub, participant) => {
            this.updatePeerState(participant.identity, { muted: false });
        });

        room.on(lk.RoomEvent.ActiveSpeakersChanged, (speakers) => {
            const activeIds = new Set(speakers.map((s) => s.identity));
            for (const [id, st] of this.peerStates.entries()) {
                this.peerStates.set(id, { ...st, speaking: activeIds.has(id) });
            }
            this.peerStates.set(this.myUid, {
                ...(this.peerStates.get(this.myUid) || {}),
                muted: !this.localMicEnabled,
                speaking: activeIds.has(this.myUid)
            });
            this.updateMicButtonUI();
            this.updateAllSeatsVoiceBadges();
        });

        room.on(lk.RoomEvent.Disconnected, () => {
            this.isConnected = false;
            this.updateMicButtonUI();
        });

        await room.connect(wsUrl, token);
        // المايك مغلق افتراضياً عند الدخول
        await room.localParticipant.setMicrophoneEnabled(false);
        this.localMicEnabled = false;
    }

    // ==========================================================================
    // 7. نظام WebRTC الصوتي المدمج (Signaling عبر /ws/voice) لضمان العمل بدون إعداد خارجي
    // ==========================================================================
    async connectViaBuiltinWebRTC(roomName) {
        return new Promise((resolve, reject) => {
            const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
            const wsUrl = `${proto}//${window.location.host}/ws/voice`;
            const ws = new WebSocket(wsUrl);
            this.ws = ws;

            ws.onopen = () => {
                ws.send(
                    JSON.stringify({
                        type: "join",
                        roomName,
                        identity: this.myUid,
                        name: this.myName,
                        role: this.myRoleType
                    })
                );
                resolve();
            };

            ws.onerror = (err) => {
                reject(err);
            };

            ws.onclose = () => {
                this.isConnected = false;
                this.updateMicButtonUI();
                if (!this.destroyed) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = setTimeout(() => this.connectToVoiceRoom(), 3500);
                }
            };

            ws.onmessage = async (event) => {
                let msg;
                try {
                    msg = JSON.parse(event.data);
                } catch (e) {
                    return;
                }

                if (msg.type === "peers" && Array.isArray(msg.peers)) {
                    for (const peer of msg.peers) {
                        this.updatePeerState(peer.identity, {
                            muted: peer.muted !== false,
                            speaking: false,
                            name: peer.name,
                            role: peer.role
                        });
                        await this.createPeerConnection(peer.identity, true);
                    }
                    return;
                }

                if (msg.type === "peer-joined" && msg.identity) {
                    this.updatePeerState(msg.identity, {
                        muted: msg.muted !== false,
                        speaking: false,
                        name: msg.name,
                        role: msg.role
                    });
                    await this.createPeerConnection(msg.identity, false);
                    return;
                }

                if (msg.type === "signal" && msg.from && msg.signal) {
                    await this.handleIncomingSignal(msg.from, msg.signal);
                    return;
                }

                if (msg.type === "peer-mute-state" && msg.identity) {
                    this.updatePeerState(msg.identity, {
                        muted: !!msg.muted,
                        speaking: !!msg.speaking
                    });
                    return;
                }

                if (msg.type === "peer-speaking" && msg.identity) {
                    this.updatePeerState(msg.identity, {
                        speaking: !!msg.speaking
                    });
                    return;
                }

                if (msg.type === "peer-left" && msg.identity) {
                    this.closePeerConnection(msg.identity);
                    this.peerStates.delete(msg.identity);
                    this.updateAllSeatsVoiceBadges();
                }
            };
        });
    }

    async createPeerConnection(peerIdentity, isInitiator) {
        if (this.peerConnections.has(peerIdentity)) {
            return this.peerConnections.get(peerIdentity);
        }

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });
        this.peerConnections.set(peerIdentity, pc);

        if (this.localStream) {
            this.localStream.getAudioTracks().forEach((track) => {
                pc.addTrack(track, this.localStream);
            });
        }

        pc.onicecandidate = (e) => {
            if (e.candidate && this.ws && this.ws.readyState === 1) {
                this.ws.send(
                    JSON.stringify({
                        type: "signal",
                        target: peerIdentity,
                        signal: { type: "candidate", candidate: e.candidate }
                    })
                );
            }
        };

        pc.ontrack = (e) => {
            const [remoteStream] = e.streams;
            if (!remoteStream) return;
            let audioEl = this.remoteAudioElements.get(peerIdentity);
            if (!audioEl) {
                audioEl = document.createElement("audio");
                audioEl.autoplay = true;
                audioEl.playsInline = true;
                document.body.appendChild(audioEl);
                this.remoteAudioElements.set(peerIdentity, audioEl);
            }
            audioEl.srcObject = remoteStream;
            audioEl.play().catch(() => {});
        };

        if (isInitiator) {
            try {
                const offer = await pc.createOffer({ offerToReceiveAudio: true });
                await pc.setLocalDescription(offer);
                if (this.ws && this.ws.readyState === 1) {
                    this.ws.send(
                        JSON.stringify({
                            type: "signal",
                            target: peerIdentity,
                            signal: { type: "sdp", sdp: pc.localDescription }
                        })
                    );
                }
            } catch (err) {
                console.warn("Offer error:", err);
            }
        }

        return pc;
    }

    async handleIncomingSignal(fromIdentity, signal) {
        let pc = this.peerConnections.get(fromIdentity);
        if (!pc) {
            pc = await this.createPeerConnection(fromIdentity, false);
        }

        try {
            if (signal.type === "sdp" && signal.sdp) {
                const desc = new RTCSessionDescription(signal.sdp);
                await pc.setRemoteDescription(desc);
                if (desc.type === "offer") {
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    if (this.ws && this.ws.readyState === 1) {
                        this.ws.send(
                            JSON.stringify({
                                type: "signal",
                                target: fromIdentity,
                                signal: { type: "sdp", sdp: pc.localDescription }
                            })
                        );
                    }
                }
            } else if (signal.type === "candidate" && signal.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            }
        } catch (err) {
            console.warn("Signal handling error:", err);
        }
    }

    closePeerConnection(peerIdentity) {
        const pc = this.peerConnections.get(peerIdentity);
        if (pc) {
            try {
                pc.close();
            } catch (e) {}
            this.peerConnections.delete(peerIdentity);
        }
        const audioEl = this.remoteAudioElements.get(peerIdentity);
        if (audioEl) {
            try {
                audioEl.pause();
                audioEl.srcObject = null;
                audioEl.remove();
            } catch (e) {}
            this.remoteAudioElements.delete(peerIdentity);
        }
    }

    // ==========================================================================
    // 8. تشغيل / إيقاف المايك الفعلي مع كاشف التحدث الصوتي
    // ==========================================================================
    async setMicrophoneEnabled(enabled) {
        // حارس أمان صارم: منع أي محامي أو متهم من فتح المايك إذا لم يكن مسموحاً له
        if (enabled && !this.computeCanCurrentPlayerSpeak()) {
            this.localMicEnabled = false;
            this.updateMicButtonUI();
            return false;
        }

        try {
            if (this.mode === "livekit" && this.lkRoom && this.lkRoom.localParticipant) {
                await this.lkRoom.localParticipant.setMicrophoneEnabled(!!enabled);
                this.localMicEnabled = !!enabled;
            } else {
                if (enabled) {
                    if (!this.localStream) {
                        this.localStream = await navigator.mediaDevices.getUserMedia({
                            audio: {
                                echoCancellation: true,
                                noiseSuppression: true,
                                autoGainControl: true
                            },
                            video: false
                        });
                        this.setupLocalVoiceActivityDetector(this.localStream);

                        // إضافة المسار الصوتي لكل الاتصالات الحالية وإعادة التفاوض
                        for (const [peerId, pc] of this.peerConnections.entries()) {
                            const senders = pc.getSenders();
                            const hasAudio = senders.some((s) => s.track && s.track.kind === "audio");
                            if (!hasAudio) {
                                this.localStream.getAudioTracks().forEach((t) => pc.addTrack(t, this.localStream));
                                const offer = await pc.createOffer({ offerToReceiveAudio: true });
                                await pc.setLocalDescription(offer);
                                if (this.ws && this.ws.readyState === 1) {
                                    this.ws.send(
                                        JSON.stringify({
                                            type: "signal",
                                            target: peerId,
                                            signal: { type: "sdp", sdp: pc.localDescription }
                                        })
                                    );
                                }
                            }
                        }
                    }
                    this.localStream.getAudioTracks().forEach((t) => {
                        t.enabled = true;
                    });
                    this.localMicEnabled = true;
                } else {
                    if (this.localStream) {
                        this.localStream.getAudioTracks().forEach((t) => {
                            t.enabled = false;
                        });
                    }
                    this.localMicEnabled = false;
                }

                if (this.ws && this.ws.readyState === 1) {
                    this.ws.send(
                        JSON.stringify({
                            type: "mute-state",
                            muted: !this.localMicEnabled,
                            speaking: false
                        })
                    );
                }
            }

            // مزامنة حالة المايك في Firebase ليراها جميع اللاعبين على الكراسي
            if (this.db && this.roomCode && this.myUid) {
                const voiceStateRef = ref(this.db, `rooms/${this.roomCode}/game_state/voice_state/${this.myUid}`);
                update(voiceStateRef, {
                    muted: !this.localMicEnabled,
                    role: this.myRoleType,
                    updatedAt: Date.now()
                }).catch(() => {});
            }

            this.updatePeerState(this.myUid, {
                muted: !this.localMicEnabled,
                speaking: false
            });
            this.updateMicButtonUI();
            this.updateAllSeatsVoiceBadges();
            return true;
        } catch (err) {
            console.warn("Microphone access error:", err);
            this.localMicEnabled = false;
            this.updateMicButtonUI();
            if (enabled) {
                this.showVoiceToast("⚠️ تعذّر الوصول إلى المايكروفون. يرجى السماح بصلاحية المايك من المتصفح.");
            }
            return false;
        }
    }

    setupLocalVoiceActivityDetector(stream) {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.audioContext = new AudioCtx();
            const source = this.audioContext.createMediaStreamSource(stream);
            const analyser = this.audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            let lastSpeaking = false;
            clearInterval(this.analyserTimer);
            this.analyserTimer = setInterval(() => {
                if (!this.localMicEnabled) {
                    if (lastSpeaking) {
                        lastSpeaking = false;
                        this.updatePeerState(this.myUid, { speaking: false });
                        if (this.ws && this.ws.readyState === 1) {
                            this.ws.send(JSON.stringify({ type: "speaking", speaking: false }));
                        }
                    }
                    return;
                }
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length;
                const isSpeakingNow = avg > 18;
                if (isSpeakingNow !== lastSpeaking) {
                    lastSpeaking = isSpeakingNow;
                    this.updatePeerState(this.myUid, { speaking: isSpeakingNow });
                    if (this.ws && this.ws.readyState === 1) {
                        this.ws.send(JSON.stringify({ type: "speaking", speaking: isSpeakingNow }));
                    }
                }
            }, 220);
        } catch (e) {
            /* ignore audio context errors */
        }
    }

    updatePeerState(identity, partial) {
        const current = this.peerStates.get(identity) || { muted: true, speaking: false };
        this.peerStates.set(identity, { ...current, ...partial });
        this.updateMicButtonUI();
        this.updateAllSeatsVoiceBadges();
    }

    // ==========================================================================
    // 9. تحديث واجهة المستخدم: زر المايك وحالات الكراسي
    // ==========================================================================
    updateMicButtonUI() {
        const btn = document.getElementById("court-voice-mic-btn");
        const dot = document.getElementById("voice-conn-dot");
        const label = document.getElementById("voice-mic-label");
        if (!btn || !dot || !label) return;

        const canSpeak = this.computeCanCurrentPlayerSpeak();
        const myState = this.peerStates.get(this.myUid) || {};

        dot.className = "voice-status-dot";
        if (this.isConnected) {
            dot.classList.add("connected");
        }
        if (this.localMicEnabled && myState.speaking) {
            dot.classList.add("speaking");
        }

        btn.classList.remove("mic-live", "mic-muted", "mic-locked");

        if (this.myRoleType === "judge") {
            if (this.localMicEnabled) {
                btn.classList.add("mic-live");
                label.textContent = "🎙️ مايك القاضي مفتوح";
            } else {
                btn.classList.add("mic-muted");
                label.textContent = "🔇 مايك القاضي مغلق (اضغط للتحدث)";
            }
        } else if (canSpeak) {
            if (this.localMicEnabled) {
                btn.classList.add("mic-live");
                label.textContent = "🎙️ المايك مفتوح (لديك الكلمة)";
            } else {
                btn.classList.add("mic-muted");
                label.textContent = "🔇 المايك مكتوم (اضغط للتحدث)";
            }
        } else {
            btn.classList.add("mic-locked");
            label.textContent = "🔒 المايك مقفل (اطلب الكلمة)";
        }
    }

    updateAllSeatsVoiceBadges(gameStateOverride) {
        const seats = document.querySelectorAll(".court-seat-node");
        if (!seats.length) return;

        const gs = gameStateOverride || {};
        const voiceStateMap = gs.voice_state || {};
        const pendingRequesterName = gs.lastSpeakRequestName || "";
        const pendingReqTs = gs.requestTimestamp || 0;
        const isRecentRequest = pendingReqTs && Date.now() - pendingReqTs < 12000;

        seats.forEach((seat) => {
            const uid = seat.getAttribute("data-uid");
            const name = seat.getAttribute("data-name") || "";
            if (!uid) return;

            let badge = seat.querySelector(".seat-voice-badge");
            if (!badge) {
                badge = document.createElement("div");
                badge.className = "seat-voice-badge state-muted";
                seat.appendChild(badge);
            }

            const roleCard = this.assignmentsMap[uid] || {};
            const isJudge = roleCard.role_type === "judge";
            const peerSt = this.peerStates.get(uid) || {};
            const cloudVoice = voiceStateMap[uid] || {};

            const isMuted =
                uid === this.myUid
                    ? !this.localMicEnabled
                    : peerSt.muted !== undefined
                      ? peerSt.muted
                      : cloudVoice.muted !== false;

            const isSpeaking = !!peerSt.speaking && !isMuted;
            const isAllowedSpeaker =
                uid === this.activeSpeakerUID ||
                uid === this.evidenceTargetUID ||
                (isJudge && !isMuted);

            badge.classList.remove("state-speaking", "state-allowed", "state-requested", "state-muted");

            if (isSpeaking) {
                badge.classList.add("state-speaking");
                badge.textContent = "🔊 يتحدث الآن";
            } else if (!isMuted && isAllowedSpeaker) {
                badge.classList.add("state-allowed");
                badge.textContent = "🎙️ مسموح له بالكلام";
            } else if (isRecentRequest && pendingRequesterName === name && uid !== this.activeSpeakerUID) {
                badge.classList.add("state-requested");
                badge.textContent = "✋ يطلب الكلمة";
            } else {
                badge.classList.add("state-muted");
                badge.textContent = "🔇 صامت";
            }
        });
    }

    showVoiceToast(message) {
        const old = document.getElementById("local-floating-toast");
        if (old) old.remove();

        const toast = document.createElement("div");
        toast.id = "local-floating-toast";
        toast.style.cssText = `
            position: fixed !important; bottom: 24px !important; left: 50% !important; transform: translateX(-50%) !important;
            max-width: 88% !important; z-index: 2147483600 !important; background: rgba(5, 10, 18, 0.96) !important;
            border: 2px solid var(--gold-glow, #d5a75c) !important; color: #fff !important; font-family: 'Alexandria', sans-serif !important;
            font-size: 0.8rem !important; font-weight: 600 !important; line-height: 1.7 !important; padding: 10px 16px !important;
            border-radius: 10px !important; text-align: center !important; direction: rtl !important; box-shadow: 0 6px 24px rgba(0,0,0,0.6) !important;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3600);
    }

    escapeHtml(str) {
        return String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    disconnect() {
        this.destroyed = true;
        clearTimeout(this.reconnectTimer);
        clearInterval(this.analyserTimer);

        if (this.lkRoom) {
            try {
                this.lkRoom.disconnect();
            } catch (e) {}
            this.lkRoom = null;
        }

        if (this.ws) {
            try {
                this.ws.close();
            } catch (e) {}
            this.ws = null;
        }

        for (const peerId of this.peerConnections.keys()) {
            this.closePeerConnection(peerId);
        }
        this.peerConnections.clear();

        if (this.localStream) {
            try {
                this.localStream.getTracks().forEach((t) => t.stop());
            } catch (e) {}
            this.localStream = null;
        }

        if (this.audioContext) {
            try {
                this.audioContext.close();
            } catch (e) {}
            this.audioContext = null;
        }

        this.isConnected = false;
        this.isConnecting = false;
    }
}

export const courtVoiceEngine = new CourtVoiceEngine();
