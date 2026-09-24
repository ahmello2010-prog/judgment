// ==========================================================================
// 🔊 js/tts.js — المتحدث الصوتي لمحكمة الأدوار
// Google Cloud Text-to-Speech (WaveNet) + بديل تلقائي: speechSynthesis
// ==========================================================================
// قواعد السرية (مفروضة برمجياً وليست مجرد اتفاق):
//  1) kind: "secret"  → مرفوض دائماً ولا يُبنى له زر أصلاً (المصلحة السرية لا تُقرأ أبداً).
//  2) kind: "private" → لا يُقرأ إلا بعد تأكيد صريح بوضع السماعات.
//  3) kind: "public"  → يُقرأ مباشرة (القصة العلنية، وصف القضية، الأسئلة المبثوثة للجميع).
//  4) حارس إضافي: أي نص يتضمن المصلحة السرية للاعب الحالي يُمنع نطقه حتى لو مُرّر خطأً.
// ==========================================================================

export const TTS_CONFIG = {
    // وسيط خادمي اختياري (api/tts.js). اتركه فارغاً لاستخدام المفتاح المباشر بدون باك اند.
    proxyUrl: "",
    // 🔑 ضع مفتاح Google Cloud هنا (بين علامتي التنصيص) للاتصال المباشر بدون باك اند.
    directApiKey: "AIzaSyDFB8qTw1Zri54YJ_xF1awzEWbYCYEgzOg",
    directEndpoint: "https://texttospeech.googleapis.com/v1/text:synthesize",
    languageCode: "ar-XA",
    // أصوات عربية WaveNet: A/D أنثوية، B/C ذكورية. (Chirp3-HD متاحة أيضاً مثل ar-XA-Chirp3-HD-Charon)
    voiceName: "ar-XA-Wavenet-B",
    speakingRate: 0.92,
    pitch: -1.5, // يُتجاهل تلقائياً مع أصوات Chirp3-HD لأنها لا تدعمه
    maxChunkChars: 800, // حد Google 5000 بايت والعربية 2 بايت للحرف تقريباً
    requestTimeoutMs: 15000,
    cacheLimit: 24,
    browserLang: "ar-SA"
};

const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
const HAS_DOM = typeof document !== "undefined" && typeof window !== "undefined";

const player = typeof Audio !== "undefined" ? new Audio() : null;
if (player) player.preload = "auto";

const state = {
    token: 0,
    controller: null,
    abortPlayback: null,
    activeWrapper: null,
    observer: null
};

const audioCache = new Map();
let lastCloudError = null;
const forbiddenSecrets = new Set();

// ==========================================================================
// 1️⃣ أدوات النص
// ==========================================================================
export function sanitizeForSpeech(raw) {
    return String(raw == null ? "" : raw)
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u200E\u200F]/gu, " ")
        .replace(/[«»"“”[\]{}<>|*_#~^]/g, " ")
        .replace(/[\r\n]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function normalizeForCompare(text) {
    return String(text || "")
        .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
        .replace(/[أإآٱ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function splitIntoChunks(text, max = TTS_CONFIG.maxChunkChars) {
    const sentences = text.match(/[^.!?؟؛…\n]+[.!?؟؛…]*/g) || [text];
    const chunks = [];
    let cur = "";
    const flush = () => {
        if (cur.trim()) chunks.push(cur.trim());
        cur = "";
    };
    sentences.forEach((raw) => {
        const s = raw.trim();
        if (!s) return;
        if (s.length > max) {
            flush();
            let piece = "";
            s.split(/\s+/).forEach((w) => {
                if ((piece + " " + w).length > max) {
                    if (piece) chunks.push(piece.trim());
                    piece = w;
                } else {
                    piece += " " + w;
                }
            });
            if (piece.trim()) chunks.push(piece.trim());
            return;
        }
        if ((cur + " " + s).length > max) flush();
        cur += (cur ? " " : "") + s;
    });
    flush();
    return chunks;
}

// ==========================================================================
// 2️⃣ حارس السرية
// ==========================================================================
export function registerForbiddenSpeech(secretText) {
    const n = normalizeForCompare(secretText);
    if (n.length >= 12) forbiddenSecrets.add(n);
}

export function isForbiddenSpeech(text) {
    const n = normalizeForCompare(text);
    if (!n) return false;
    for (const f of forbiddenSecrets) {
        if (n.includes(f)) return true;
        if (n.length >= 25 && f.includes(n)) return true;
    }
    return false;
}

// ==========================================================================
// 3️⃣ الاتصال بـ Google Cloud TTS (مع مهلة وإلغاء وذاكرة مؤقتة)
// ==========================================================================
function buildRequestBody(text) {
    const audioConfig = { audioEncoding: "MP3", speakingRate: TTS_CONFIG.speakingRate };
    if (!/Chirp3/i.test(TTS_CONFIG.voiceName)) audioConfig.pitch = TTS_CONFIG.pitch;
    return {
        input: { text },
        voice: { languageCode: TTS_CONFIG.languageCode, name: TTS_CONFIG.voiceName },
        audioConfig
    };
}

function base64ToBlob(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: "audio/mpeg" });
}

async function requestAudio(url, body, parentSignal) {
    const ctrl = new AbortController();
    const onParentAbort = () => ctrl.abort();
    parentSignal.addEventListener("abort", onParentAbort);
    const timer = setTimeout(() => ctrl.abort(), TTS_CONFIG.requestTimeoutMs);
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: ctrl.signal
        });
        if (!res.ok) {
            let detail = "";
            try {
                const errBody = await res.json();
                detail = (errBody && (errBody.detail || errBody.error)) || "";
            } catch (e) {
                /* الاستجابة ليست JSON (مثلاً صفحة 404 من الاستضافة) */
            }
            const err = new Error("TTS HTTP " + res.status + (detail ? " — " + detail : ""));
            err.httpStatus = res.status;
            throw err;
        }
        const data = await res.json();
        if (!data || !data.audioContent) throw new Error("TTS empty audio");
        return base64ToBlob(data.audioContent);
    } finally {
        clearTimeout(timer);
        parentSignal.removeEventListener("abort", onParentAbort);
    }
}

async function synthesizeChunk(text, signal) {
    const key = TTS_CONFIG.voiceName + "|" + text;
    if (audioCache.has(key)) {
        const hit = audioCache.get(key);
        audioCache.delete(key);
        audioCache.set(key, hit);
        return hit;
    }
    const endpoints = [];
    if (TTS_CONFIG.proxyUrl) endpoints.push(TTS_CONFIG.proxyUrl);
    if (TTS_CONFIG.directApiKey) {
        endpoints.push(`${TTS_CONFIG.directEndpoint}?key=${encodeURIComponent(TTS_CONFIG.directApiKey)}`);
    }
    if (endpoints.length === 0) {
        const err = new Error("لم يُضبط directApiKey في TTS_CONFIG");
        err.code = "NO_KEY";
        throw err;
    }

    const body = buildRequestBody(text);
    let lastErr = null;
    for (const url of endpoints) {
        try {
            const blob = await requestAudio(url, body, signal);
            audioCache.set(key, blob);
            while (audioCache.size > TTS_CONFIG.cacheLimit) audioCache.delete(audioCache.keys().next().value);
            return blob;
        } catch (err) {
            if (signal.aborted) throw err;
            lastErr = err;
            lastCloudError = err;
        }
    }
    throw lastErr;
}

// ==========================================================================
// 4️⃣ التشغيل (Audio) + البديل (speechSynthesis)
// ==========================================================================
function primeAudioElement() {
    // فتح قفل التشغيل التلقائي على iOS/Android داخل لمسة المستخدم نفسها
    if (!player) return;
    try {
        player.src = SILENT_WAV;
        const p = player.play();
        if (p && p.catch) p.catch(() => {});
    } catch (e) {
        /* تجاهل */
    }
}

function playBlob(blob) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const cleanup = () => {
            player.onended = null;
            player.onerror = null;
            URL.revokeObjectURL(url);
            if (state.abortPlayback === abort) state.abortPlayback = null;
        };
        const abort = () => {
            cleanup();
            resolve("aborted");
        };
        state.abortPlayback = abort;
        player.onended = () => {
            cleanup();
            resolve("ended");
        };
        player.onerror = () => {
            cleanup();
            reject(new Error("audio element error"));
        };
        player.src = url;
        const p = player.play();
        if (p && p.catch) {
            p.catch((err) => {
                cleanup();
                reject(err);
            });
        }
    });
}

function pickBrowserVoice() {
    try {
        const voices = window.speechSynthesis.getVoices() || [];
        return voices.find((v) => /^ar[-_]SA/i.test(v.lang)) || voices.find((v) => /^ar/i.test(v.lang)) || null;
    } catch (e) {
        return null;
    }
}

function speakUtterance(text) {
    return new Promise((resolve) => {
        if (!HAS_DOM || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
            resolve(false);
            return;
        }
        try {
            const u = new SpeechSynthesisUtterance(text);
            u.lang = TTS_CONFIG.browserLang;
            u.rate = 0.95;
            u.pitch = 0.9;
            const v = pickBrowserVoice();
            if (v) u.voice = v;
            const abort = () => resolve(false);
            state.abortPlayback = abort;
            u.onend = () => {
                if (state.abortPlayback === abort) state.abortPlayback = null;
                resolve(true);
            };
            u.onerror = () => {
                if (state.abortPlayback === abort) state.abortPlayback = null;
                resolve(false);
            };
            window.speechSynthesis.speak(u);
        } catch (e) {
            resolve(false);
        }
    });
}

async function speakWithBrowser(text, token) {
    // مقاطع قصيرة لتفادي انقطاع الأصوات الطويلة في Chrome
    const parts = splitIntoChunks(text, 220);
    for (const part of parts) {
        if (token !== state.token) return false;
        const ok = await speakUtterance(part);
        if (!ok) return false;
    }
    return true;
}

async function playChunks(chunks, token, signal, wrapper) {
    const pending = [];
    const fetchOrNull = (i) =>
        synthesizeChunk(chunks[i], signal).catch((err) => {
            if (!signal.aborted) console.error("❌ فشل المتحدث السحابي (Google TTS):", err && err.message);
            return null;
        });

    pending[0] = fetchOrNull(0);
    let useBrowser = false;
    let warned = false;

    for (let i = 0; i < chunks.length; i++) {
        if (token !== state.token) return;

        if (!useBrowser) {
            const blob = await pending[i];
            if (token !== state.token) return;
            if (blob) {
                if (i + 1 < chunks.length && !pending[i + 1]) pending[i + 1] = fetchOrNull(i + 1); // تحميل مسبق
                setUiState(wrapper, "playing");
                try {
                    const result = await playBlob(blob);
                    if (result === "aborted" || token !== state.token) return;
                    continue;
                } catch (err) {
                    if (token !== state.token) return;
                    console.warn("⚠️ تعذر تشغيل الملف الصوتي:", err && err.message);
                }
            }
            useBrowser = true;
            if (!warned) {
                warned = true;
                showToast(describeCloudFailure(lastCloudError));
            }
        }

        if (token !== state.token) return;
        setUiState(wrapper, "playing");
        const ok = await speakWithBrowser(chunks[i], token);
        if (token !== state.token) return;
        if (!ok) {
            showToast("تعذّر تشغيل الصوت على هذا الجهاز. يمكنك متابعة القراءة يدوياً.");
            return;
        }
    }
}

function describeCloudFailure(err) {
    const status = err && err.httpStatus;
    const base = "تعذّر الوصول للمتحدث السحابي، جارٍ استخدام صوت المتصفح. ";
    if (err && err.code === "NO_KEY") return base + "(لم يُضع مفتاح Google في TTS_CONFIG.directApiKey)";
    if (status === 404) return base + "(الخطأ 404: ملف api/tts.js غير منشور على الاستضافة)";
    if (status === 405) return base + "(الخطأ 405: الاستضافة لا تنفّذ دوال الخادم)";
    if (status === 500) return base + "(الخطأ 500: متغير GOOGLE_TTS_API_KEY غير مضبوط أو الدالة تعطلت)";
    if (status === 403 || status === 400)
        return base + "(الخطأ " + status + ": المفتاح مرفوض أو واجهة Text-to-Speech غير مفعّلة)";
    if (status) return base + "(الخطأ " + status + ")";
    if (err && err.name === "AbortError") return base + "(انتهت مهلة الاتصال)";
    return base + "(افتح Console لمعرفة التفاصيل)";
}

// تشخيص سريع: اكتب ttsDiagnose() في Console المتصفح لتعرف سبب عدم عمل الصوت السحابي
export async function diagnoseTts() {
    const ctrl = new AbortController();
    const report = {
        proxyUrl: TTS_CONFIG.proxyUrl,
        hasDirectKey: !!TTS_CONFIG.directApiKey,
        voice: TTS_CONFIG.voiceName
    };
    try {
        const blob = await synthesizeChunk("اختبار المتحدث الصوتي", ctrl.signal);
        report.ok = true;
        report.bytes = blob.size;
    } catch (err) {
        report.ok = false;
        report.error = err && err.message;
    }
    console.log("🔎 تشخيص المتحدث الصوتي:", report);
    return report;
}
if (HAS_DOM) window.ttsDiagnose = diagnoseTts;

// ==========================================================================
// 5️⃣ الدالة المركزية + الإيقاف الفوري
// ==========================================================================
export async function speakText(rawText, options = {}) {
    const kind = options.kind || "public";
    const wrapper = options.wrapper || null;

    if (kind === "secret") {
        showToast("🔒 المصلحة السرية لا تُقرأ بصوتٍ عالٍ حفاظاً على سرية اللعبة.");
        return false;
    }

    const text = sanitizeForSpeech(rawText);
    if (!text) return false;

    const chunks = splitIntoChunks(text);
    if (isForbiddenSpeech(text) || chunks.some(isForbiddenSpeech)) {
        showToast("🔒 هذا النص يتضمن معلومة سرية ولن يُقرأ بصوتٍ عالٍ.");
        return false;
    }

    stopSpeech(); // إلغاء أي كلام سابق قبل أي شيء

    if (kind === "private") {
        const confirmed = await confirmHeadphones();
        if (!confirmed) return false;
        stopSpeech();
    }

    primeAudioElement();

    const token = ++state.token;
    state.controller = new AbortController();
    state.activeWrapper = wrapper;
    setUiState(wrapper, "loading");
    startWatchdog();

    try {
        await playChunks(chunks, token, state.controller.signal, wrapper);
    } catch (err) {
        console.error("خطأ غير متوقع في المتحدث الصوتي:", err);
        if (token === state.token) showToast("حدث خطأ في المتحدث الصوتي.");
    } finally {
        if (token === state.token) {
            state.controller = null;
            state.abortPlayback = null;
            resetUi();
            stopWatchdog();
        }
    }
    return true;
}

export function stopSpeech() {
    state.token++;
    if (state.controller) {
        try {
            state.controller.abort();
        } catch (e) {
            /* تجاهل */
        }
        state.controller = null;
    }
    if (typeof state.abortPlayback === "function") {
        const abort = state.abortPlayback;
        state.abortPlayback = null;
        try {
            abort();
        } catch (e) {
            /* تجاهل */
        }
    }
    if (player) {
        try {
            player.onended = null;
            player.onerror = null;
            player.pause();
            player.removeAttribute("src");
            player.load();
        } catch (e) {
            /* تجاهل */
        }
    }
    if (HAS_DOM && "speechSynthesis" in window) {
        try {
            window.speechSynthesis.cancel();
        } catch (e) {
            /* تجاهل */
        }
    }
    resetUi();
    stopWatchdog();
}

export function isSpeaking() {
    return state.activeWrapper !== null;
}

// ==========================================================================
// 6️⃣ الواجهة: أزرار "تشغيل المتحدث الصوتي" و"إيقاف"
// ==========================================================================
function injectStyles() {
    if (!HAS_DOM || document.getElementById("tts-styles")) return;
    const style = document.createElement("style");
    style.id = "tts-styles";
    style.textContent = `
        .tts-controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-start;margin:8px 0 14px;direction:rtl}
        .tts-controls[hidden]{display:none !important}
        .tts-btn{all:unset;box-sizing:border-box;cursor:pointer;font-family:'Alexandria',sans-serif;font-weight:700;font-size:.72rem;padding:8px 12px;border-radius:8px;border:1.5px solid var(--gold-glow,#d5a75c);color:var(--gold-glow,#d5a75c);background:rgba(5,10,18,.55);display:inline-flex;align-items:center;gap:6px;-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:transform .15s ease,background .2s ease}
        .tts-btn:active{transform:scale(.96)}
        .tts-btn[disabled]{opacity:.6;cursor:progress}
        .tts-play[data-active="true"]{background:var(--gold-glow,#d5a75c);color:var(--shadow-black,#050a12);animation:ttsPulse 1.4s ease-in-out infinite}
        .tts-stop{border-color:#ff5252;color:#ff5252}
        .tts-note{flex-basis:100%;margin:0;font-family:'Harmattan',sans-serif;font-size:1rem;color:#e2cba5;line-height:1.4}
        .tts-compact{margin:6px 0 0;flex-basis:100%}
        .tts-compact .tts-btn{font-size:.62rem;padding:6px 9px}
        @keyframes ttsPulse{0%,100%{box-shadow:0 0 0 0 rgba(213,167,92,.5)}50%{box-shadow:0 0 0 6px rgba(213,167,92,0)}}
        .tts-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);max-width:88%;z-index:2147483600;background:rgba(5,10,18,.96);border:2px solid var(--gold-glow,#d5a75c);color:#fff;font-family:'Alexandria',sans-serif;font-size:.8rem;font-weight:600;line-height:1.7;padding:10px 16px;border-radius:10px;text-align:center;direction:rtl;box-shadow:0 6px 24px rgba(0,0,0,.6)}
        .tts-overlay{position:fixed;inset:0;background:rgba(5,10,18,.9);display:flex;align-items:center;justify-content:center;z-index:2147483500;direction:rtl}
        .tts-dialog{width:88%;max-width:380px;background:var(--inner-vintage,#423423);border:3px solid var(--gold-glow,#d5a75c);border-radius:16px;padding:26px 20px;text-align:center;box-shadow:0 15px 40px rgba(0,0,0,.7);display:flex;flex-direction:column;gap:14px;align-items:center}
        .tts-dialog h3{margin:0;font-family:'Alexandria',sans-serif;font-size:1.2rem;font-weight:800;color:var(--gold-glow,#d5a75c)}
        .tts-dialog p{margin:0;font-family:'Harmattan',sans-serif;font-size:1.3rem;line-height:1.5;color:#fff}
        .tts-dialog-row{display:flex;gap:10px;width:100%}
        .tts-dialog-row button{flex:1;padding:10px 6px;border-radius:10px;font-family:'Alexandria',sans-serif;font-weight:700;font-size:.8rem;cursor:pointer;-webkit-tap-highlight-color:transparent}
        .tts-dialog-ok{background:var(--gold-glow,#d5a75c);color:#050a12;border:2px solid var(--gold-glow,#d5a75c)}
        .tts-dialog-cancel{background:transparent;color:var(--gold-glow,#d5a75c);border:2px solid var(--gold-glow,#d5a75c)}
    `;
    document.head.appendChild(style);
}

function setUiState(wrapper, uiState) {
    if (!wrapper) return;
    wrapper.dataset.ttsState = uiState;
    const play = wrapper.querySelector(".tts-play");
    const label = wrapper.querySelector(".tts-play-label");
    if (play) {
        play.disabled = uiState === "loading";
        play.dataset.active = uiState === "playing" ? "true" : "false";
    }
    if (label) label.textContent = uiState === "loading" ? "جارٍ تحضير الصوت..." : "تشغيل المتحدث الصوتي";
}

function resetUi() {
    const w = state.activeWrapper;
    state.activeWrapper = null;
    if (w) setUiState(w, "idle");
}

let toastTimer = null;
function showToast(message) {
    if (!HAS_DOM) return;
    injectStyles();
    const old = document.getElementById("tts-toast");
    if (old) old.remove();
    clearTimeout(toastTimer);
    const el = document.createElement("div");
    el.id = "tts-toast";
    el.className = "tts-toast";
    el.textContent = message;
    document.body.appendChild(el);
    toastTimer = setTimeout(() => el.remove(), 3800);
}

function confirmHeadphones() {
    return new Promise((resolve) => {
        injectStyles();
        const existing = document.getElementById("tts-headphones-overlay");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.id = "tts-headphones-overlay";
        overlay.className = "tts-overlay";
        overlay.innerHTML = `
            <div class="tts-dialog" role="alertdialog" aria-modal="true">
                <h3>🎧 نص خاص — السماعات أولاً</h3>
                <p>هذا النص خاص بك وحدك. ضع سماعات الأذن قبل التشغيل حتى لا يسمعه بقية الحاضرين في الغرفة.</p>
                <div class="tts-dialog-row">
                    <button type="button" class="tts-dialog-cancel">إلغاء</button>
                    <button type="button" class="tts-dialog-ok">وضعتُ السماعات، شغّل</button>
                </div>
            </div>`;
        const finish = (value) => {
            overlay.remove();
            resolve(value);
        };
        overlay.querySelector(".tts-dialog-ok").addEventListener("click", (e) => {
            e.stopPropagation();
            primeAudioElement(); // لمسة مستخدم صريحة لفتح قفل الصوت على الجوال
            finish(true);
        });
        overlay.querySelector(".tts-dialog-cancel").addEventListener("click", (e) => {
            e.stopPropagation();
            finish(false);
        });
        document.body.appendChild(overlay);
    });
}

const mounted = new WeakMap();

function readTargetText(targetEl, options) {
    return typeof options.getText === "function" ? options.getText() : targetEl.textContent;
}

export function mountVoiceControls(targetEl, options = {}) {
    if (!HAS_DOM || !targetEl || typeof targetEl.closest !== "function") return null;
    const kind = options.kind || "public";
    // 🔒 لا أزرار على المصلحة السرية إطلاقاً
    if (kind === "secret" || targetEl.closest('[data-tts-block="secret"]')) return null;
    injectStyles();

    const existing = mounted.get(targetEl);
    if (existing && existing.wrapper.isConnected) {
        existing.options = options;
        existing.wrapper.hidden = !sanitizeForSpeech(readTargetText(targetEl, options));
        return existing.wrapper;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "tts-controls" + (options.compact ? " tts-compact" : "");
    wrapper.dataset.ttsState = "idle";
    wrapper.dataset.ttsKind = kind;
    wrapper.innerHTML = `
        <button type="button" class="tts-btn tts-play" aria-label="تشغيل المتحدث الصوتي">
            <span aria-hidden="true">${kind === "private" ? "🎧" : "🔊"}</span>
            <span class="tts-play-label">تشغيل المتحدث الصوتي</span>
        </button>
        <button type="button" class="tts-btn tts-stop" aria-label="إيقاف الصوت">
            <span aria-hidden="true">⏹</span><span>إيقاف</span>
        </button>
        ${kind === "private" ? '<p class="tts-note">🎧 نص خاص: سيُطلب منك تأكيد وضع السماعات قبل التشغيل.</p>' : ""}
    `;

    const entry = { wrapper, options };
    mounted.set(targetEl, entry);

    wrapper.querySelector(".tts-play").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const opts = entry.options;
        speakText(readTargetText(targetEl, opts), { kind: opts.kind || "public", wrapper });
    });
    wrapper.querySelector(".tts-stop").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        stopSpeech();
    });

    if (options.placement === "inside-end") targetEl.appendChild(wrapper);
    else targetEl.insertAdjacentElement("afterend", wrapper);

    wrapper.hidden = !sanitizeForSpeech(readTargetText(targetEl, options));
    return wrapper;
}

export function mountVoiceControlsAll(root, selector, options = {}) {
    if (!root) return 0;
    const nodes = root.querySelectorAll(selector);
    nodes.forEach((el) => mountVoiceControls(el, options));
    return nodes.length;
}

// ==========================================================================
// 7️⃣ حارس الإيقاف الفوري: إغلاق المودال / اختفاء العنصر / مغادرة الصفحة
// ==========================================================================
function startWatchdog() {
    if (!HAS_DOM) return;
    stopWatchdog();
    state.observer = new MutationObserver(() => {
        const w = state.activeWrapper;
        if (!w) return;
        if (!w.isConnected || w.getClientRects().length === 0) stopSpeech();
    });
    state.observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["style", "class", "hidden"]
    });
}

function stopWatchdog() {
    if (state.observer) {
        state.observer.disconnect();
        state.observer = null;
    }
}

if (HAS_DOM) {
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopSpeech();
    });
    window.addEventListener("pagehide", stopSpeech);
    window.addEventListener("beforeunload", stopSpeech);
}
