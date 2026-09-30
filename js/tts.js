// ==========================================================================
// 🔊 js/tts.js — قارئ النصوص الذاتي المدمج لمحكمة الأدوار
// نظام صوتي مدمج 100% بدون أي مكتبات خارجية (HTML5 Audio + Web Speech API)
// ==========================================================================

export const TTS_CONFIG = {
    languageCode: "ar-SA",
    defaultRate: 1.0,
    maxChunkChars: 200
};

const HAS_DOM = typeof document !== "undefined" && typeof window !== "undefined";

// مشغل HTML5 Audio الموحد (يعمل على كافة الأجهزة والمتصفحات بدون مشاكل أو أخطاء نطق)
const nativeAudioPlayer = HAS_DOM ? new Audio() : null;
if (nativeAudioPlayer) {
    nativeAudioPlayer.preload = "auto";
}

// حالة القارئ
const readerState = {
    token: 0,
    isPlaying: false,
    isPaused: false,
    currentRate: 1.0,
    selectedVoiceMode: "direct", // "direct" (صوت مباشر بدون سيرفر) أو "device" (صوت الجهاز المحلي)
    selectedVoiceURI: null,
    activeElement: null,
    activeWrapper: null,
    clickToReadEnabled: false,
    pageQueue: [],
    queueIndex: 0,
    statusText: "جاهز للاستماع",
    currentChunkIndex: 0,
    currentChunks: [],
    audioUnlocked: false
};

// كلمات/نصوص محظورة لحماية المصلحة السرية للاعبين
const forbiddenSecrets = new Set();

// فك قفل الصوت تلقائياً عند أول نقرة أو لمسة لمراعاة سياسات المتصفحات للهواتف
function unlockAudioContext() {
    if (readerState.audioUnlocked || !nativeAudioPlayer) return;
    try {
        nativeAudioPlayer.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
        const p = nativeAudioPlayer.play();
        if (p && p.catch) p.catch(() => {});
        readerState.audioUnlocked = true;
    } catch (e) {
        // تجاهل
    }
}

if (HAS_DOM) {
    document.addEventListener("click", unlockAudioContext, { once: true });
    document.addEventListener("touchstart", unlockAudioContext, { once: true });
}

// ==========================================================================
// 1️⃣ تنظيف ومعالجة النصوص وقواعد السرية
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

export function registerForbiddenSpeech(secretText) {
    const n = normalizeForCompare(secretText);
    if (n.length >= 10) forbiddenSecrets.add(n);
}

export function isForbiddenSpeech(text) {
    const n = normalizeForCompare(text);
    if (!n) return false;
    for (const f of forbiddenSecrets) {
        if (n.includes(f)) return true;
        if (n.length >= 20 && f.includes(n)) return true;
    }
    return false;
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
            const words = s.split(/\s+/);
            let piece = "";
            words.forEach((w) => {
                if ((piece + " " + w).length > max) {
                    if (piece) chunks.push(piece.trim());
                    piece = w;
                } else {
                    piece += (piece ? " " : "") + w;
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
// 2️⃣ محرك تشغيل الصوت (HTML5 Audio مع بديل المتصفح المباشر)
// ==========================================================================

// تشغيل مقطع صوتي عبر مسار الصوت عالي الدقة مع بديل المتصفح
async function playAudioChunk(chunkText, token) {
    if (token !== readerState.token) return false;

    // الطبقة 1: تجربة مسار الصوت عالي النقاء (/api/speak)
    // يعمل في الخادم المحلي وفي Vercel Serverless Function مجاناً وبدون أي متطلبات
    if (nativeAudioPlayer) {
        const audioUrl = `/api/speak?text=${encodeURIComponent(chunkText)}&voice=ar-SA-HamedNeural`;
        const serverOk = await tryPlayAudioUrl(audioUrl, token);
        if (serverOk) return true;
        if (token !== readerState.token) return false;
    }

    // الطبقة 2: بديل محرك المتصفح المحلي (Web Speech API)
    if ("speechSynthesis" in window) {
        const browserOk = await speakWithBrowserUtterance(chunkText, token);
        if (browserOk) return true;
    }

    return false;
}

// دالة مساعدة لتشغيل رابط صوت عبر مشغل HTML5
function tryPlayAudioUrl(url, token) {
    return new Promise((resolve) => {
        if (!nativeAudioPlayer) {
            resolve(false);
            return;
        }

        let finished = false;
        const cleanup = (result) => {
            if (finished) return;
            finished = true;
            nativeAudioPlayer.onended = null;
            nativeAudioPlayer.onerror = null;
            resolve(result);
        };

        try {
            nativeAudioPlayer.pause();
            nativeAudioPlayer.src = url;
            nativeAudioPlayer.playbackRate = readerState.currentRate;

            nativeAudioPlayer.onended = () => cleanup(true);
            nativeAudioPlayer.onerror = () => cleanup(false);

            const p = nativeAudioPlayer.play();
            if (p && p.catch) {
                p.catch(() => cleanup(false));
            }
        } catch (e) {
            cleanup(false);
        }
    });
}

// محرك المتصفح المحلي (SpeechSynthesis) مع كشف التخطي الصامت
function speakWithBrowserUtterance(text, token) {
    return new Promise((resolve) => {
        if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
            resolve(false);
            return;
        }

        try {
            window.speechSynthesis.cancel();
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }

            const utter = new SpeechSynthesisUtterance(text);
            utter.rate = readerState.currentRate;

            const voices = window.speechSynthesis.getVoices() || [];
            let chosenVoice = null;

            if (readerState.selectedVoiceURI) {
                chosenVoice = voices.find(
                    (v) =>
                        (v.voiceURI && v.voiceURI === readerState.selectedVoiceURI) ||
                        v.name === readerState.selectedVoiceURI
                );
            }

            if (!chosenVoice) {
                const arVoices = voices.filter((v) => /^ar/i.test(v.lang) || /arabic/i.test(v.name));
                chosenVoice =
                    arVoices.find((v) => /hamed|shakir|naayf|maged|tariq|male|ذكر|hoda/i.test(v.name)) ||
                    arVoices[0] ||
                    null;
            }

            if (chosenVoice) {
                utter.voice = chosenVoice;
                utter.lang = chosenVoice.lang || "ar";
            } else {
                utter.lang = "ar";
            }

            const startTime = Date.now();
            let resolved = false;
            const finish = (val) => {
                if (resolved) return;
                resolved = true;
                window._activeReaderUtterance = null;
                resolve(val);
            };

            utter.onend = () => {
                const elapsed = Date.now() - startTime;
                // كشف مشكلة التخطي الصامت في كروم عندما لا يكون الصوت العربي مثبتاً في الويندوز
                if (elapsed < 120 && text.trim().length > 4) {
                    console.warn("Silent skip detected in SpeechSynthesis (no sound was produced)");
                    finish(false);
                } else {
                    finish(true);
                }
            };

            utter.onerror = (e) => {
                console.warn("SpeechSynthesis error:", e && e.error);
                finish(false);
            };

            window._activeReaderUtterance = utter;
            window.speechSynthesis.speak(utter);
        } catch (e) {
            resolve(false);
        }
    });
}

// ==========================================================================
// 3️⃣ الدالة المركزية للقراءة (speakText)
// ==========================================================================
export async function speakText(rawText, options = {}) {
    unlockAudioContext();

    const kind = options.kind || "public";
    const wrapper = options.wrapper || null;
    const targetElement = options.targetElement || null;

    if (
        kind === "secret" ||
        (targetElement && targetElement.closest && targetElement.closest('[data-tts-block="secret"]'))
    ) {
        showReaderToast("🔒 المصلحة السرية لا تُقرأ بصوتٍ عالٍ حفاظاً على سرية اللعبة.");
        return false;
    }

    const text = sanitizeForSpeech(rawText);
    if (!text) return false;

    if (isForbiddenSpeech(text)) {
        showReaderToast("🔒 هذا النص يتضمن معلومة سرية ولن يُقرأ بصوتٍ عالٍ.");
        return false;
    }

    // إيقاف أي صوت سابق
    stopSpeech();

    const token = ++readerState.token;
    readerState.isPlaying = true;
    readerState.isPaused = false;
    readerState.activeWrapper = wrapper;
    readerState.activeElement = targetElement;

    highlightElement(targetElement);
    if (wrapper) setUiState(wrapper, "playing");

    const chunks = splitIntoChunks(text);
    readerState.currentChunks = chunks;

    for (let i = 0; i < chunks.length; i++) {
        if (token !== readerState.token) break;
        readerState.currentChunkIndex = i;
        readerState.statusText = chunks[i];
        updateReaderUi();

        const ok = await playAudioChunk(chunks[i], token);
        if (!ok) {
            if (token === readerState.token) {
                stopSpeech();
                showReaderToast(
                    "⚠️ تعذر تشغيل الصوت. إذا كنت تشغل المشروع محلياً، تأكد من تشغيل الأمر: node server.js"
                );
            }
            return false;
        }
    }

    if (token === readerState.token) {
        readerState.isPlaying = false;
        readerState.isPaused = false;
        readerState.statusText = "اكتملت القراءة";
        unhighlightElement();
        if (wrapper) setUiState(wrapper, "idle");
        updateReaderUi();
    }

    return true;
}

export function pauseSpeech() {
    if (!readerState.isPlaying) return;
    if (nativeAudioPlayer && !nativeAudioPlayer.paused) {
        nativeAudioPlayer.pause();
    }
    if ("speechSynthesis" in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
    }
    readerState.isPaused = true;
    readerState.statusText = "موقوف مؤقتاً";
    updateReaderUi();
}

export function resumeSpeech() {
    if (!readerState.isPlaying || !readerState.isPaused) return;
    if (nativeAudioPlayer && nativeAudioPlayer.paused && nativeAudioPlayer.src) {
        nativeAudioPlayer.play().catch(() => {});
    }
    if ("speechSynthesis" in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }
    readerState.isPaused = false;
    readerState.statusText = "جارٍ الاستماع...";
    updateReaderUi();
}

export function stopSpeech() {
    readerState.token++;
    readerState.isPlaying = false;
    readerState.isPaused = false;
    readerState.pageQueue = [];
    readerState.queueIndex = 0;
    readerState.statusText = "جاهز للاستماع";

    if (nativeAudioPlayer) {
        try {
            nativeAudioPlayer.pause();
            nativeAudioPlayer.currentTime = 0;
            nativeAudioPlayer.removeAttribute("src");
        } catch (e) {
            // تجاهل
        }
    }

    if (HAS_DOM && "speechSynthesis" in window) {
        try {
            window.speechSynthesis.cancel();
        } catch (e) {
            // تجاهل
        }
    }

    if (readerState.activeWrapper) {
        setUiState(readerState.activeWrapper, "idle");
        readerState.activeWrapper = null;
    }

    unhighlightElement();
    updateReaderUi();
}

export function isSpeaking() {
    return readerState.isPlaying;
}

// ==========================================================================
// 4️⃣ تمييز النصوص بصرياً
// ==========================================================================
function highlightElement(el) {
    unhighlightElement();
    if (!el || !el.classList) return;
    readerState.activeElement = el;
    el.classList.add("tts-active-reading");
    try {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) {
        // تجاهل
    }
}

function unhighlightElement() {
    if (readerState.activeElement && readerState.activeElement.classList) {
        readerState.activeElement.classList.remove("tts-active-reading");
    }
    readerState.activeElement = null;
}

// ==========================================================================
// 5️⃣ قراءة الصفحة كاملة تلقائياً بالتسلسل
// ==========================================================================
export async function readCurrentPage() {
    if (!HAS_DOM) return;
    unlockAudioContext();
    stopSpeech();

    const selectors = [
        "h1",
        "h2",
        "h3",
        ".welcome-title",
        ".welcome-subtitle",
        ".accordion-trigger span",
        ".accordion-panel p",
        ".guide-text",
        ".case-overview-text",
        ".room-title",
        "p:not(.tts-ignore)"
    ];

    const elements = Array.from(document.querySelectorAll(selectors.join(","))).filter((el) => {
        if (!el || !el.offsetParent) return false;
        if (el.closest('[data-tts-block="secret"]') || el.closest(".tts-ignore")) return false;
        const txt = sanitizeForSpeech(el.textContent);
        return txt.length >= 5;
    });

    if (elements.length === 0) {
        showReaderToast("لم يتم العثور على نصوص قابلة للقراءة في هذه الصفحة.");
        return;
    }

    const token = ++readerState.token;
    readerState.isPlaying = true;
    readerState.pageQueue = elements;
    readerState.queueIndex = 0;
    updateReaderUi();

    for (let i = 0; i < elements.length; i++) {
        if (token !== readerState.token) break;
        readerState.queueIndex = i;
        const el = elements[i];
        const text = sanitizeForSpeech(el.textContent);
        if (!text || isForbiddenSpeech(text)) continue;

        highlightElement(el);
        const chunks = splitIntoChunks(text);

        for (const chunk of chunks) {
            if (token !== readerState.token) break;
            readerState.statusText = chunk;
            updateReaderUi();
            const ok = await playAudioChunk(chunk, token);
            if (!ok) {
                if (token === readerState.token) {
                    stopSpeech();
                    showReaderToast("⚠️ تعذر تشغيل الصوت. إذا كنت تشغل المشروع محلياً، تأكد من تشغيل: node server.js");
                }
                return;
            }
        }
    }

    if (token === readerState.token) {
        stopSpeech();
        showReaderToast("اكتملت قراءة الصفحة بالكامل.");
    }
}

// ==========================================================================
// 6️⃣ أدوات العناصر المضمنة (الأزرار على البطاقات والأسئلة والأدلة)
// ==========================================================================
const mountedWeak = new WeakMap();

function setUiState(wrapper, uiState) {
    if (!wrapper) return;
    wrapper.dataset.ttsState = uiState;
    const play = wrapper.querySelector(".tts-play");
    const label = wrapper.querySelector(".tts-play-label");
    if (play) {
        play.dataset.active = uiState === "playing" ? "true" : "false";
    }
    if (label) {
        label.textContent = uiState === "playing" ? "جارٍ القراءة..." : "استمع";
    }
}

export function mountVoiceControls(targetEl, options = {}) {
    if (!HAS_DOM || !targetEl || typeof targetEl.closest !== "function") return null;
    const kind = options.kind || "public";
    if (kind === "secret" || targetEl.closest('[data-tts-block="secret"]')) return null;
    injectReaderStyles();

    const existing = mountedWeak.get(targetEl);
    if (existing && existing.wrapper.isConnected) {
        existing.options = options;
        return existing.wrapper;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "tts-inline-controls" + (options.compact ? " tts-compact" : "");
    wrapper.dataset.ttsState = "idle";
    wrapper.innerHTML = `
        <button type="button" class="tts-inline-btn tts-play" aria-label="قراءة النص صوتياً">
            <span aria-hidden="true">🔊</span>
            <span class="tts-play-label">استمع</span>
        </button>
        <button type="button" class="tts-inline-btn tts-stop" aria-label="إيقاف">
            <span aria-hidden="true">⏹</span>
        </button>
    `;

    const entry = { wrapper, options };
    mountedWeak.set(targetEl, entry);

    wrapper.querySelector(".tts-play").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        unlockAudioContext();
        const textToRead = typeof options.getText === "function" ? options.getText() : targetEl.textContent;
        speakText(textToRead, { kind, wrapper, targetElement: targetEl });
    });

    wrapper.querySelector(".tts-stop").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        stopSpeech();
    });

    if (options.placement === "inside-end") {
        targetEl.appendChild(wrapper);
    } else {
        targetEl.insertAdjacentElement("afterend", wrapper);
    }

    return wrapper;
}

export function mountVoiceControlsAll(root, selector, options = {}) {
    if (!root) return 0;
    const nodes = root.querySelectorAll(selector);
    nodes.forEach((el) => mountVoiceControls(el, options));
    return nodes.length;
}

// ==========================================================================
// 7️⃣ واجهة القارئ الذاتي العائم الشامل في كل صفحات الموقع
// ==========================================================================
function injectReaderStyles() {
    if (!HAS_DOM || document.getElementById("native-tts-styles")) return;
    const style = document.createElement("style");
    style.id = "native-tts-styles";
    style.textContent = `
        .tts-active-reading {
            outline: 2px solid var(--gold-glow, #d5a75c) !important;
            outline-offset: 3px;
            background-color: rgba(213, 167, 92, 0.18) !important;
            border-radius: 6px;
            transition: all 0.3s ease;
        }

        .tts-inline-controls {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin: 6px 0;
            direction: rtl;
        }
        .tts-inline-controls[hidden] { display: none !important; }
        .tts-inline-btn {
            all: unset;
            box-sizing: border-box;
            cursor: pointer;
            font-family: 'Alexandria', system-ui, sans-serif;
            font-weight: 700;
            font-size: 0.72rem;
            padding: 5px 10px;
            border-radius: 8px;
            border: 1.5px solid var(--gold-glow, #d5a75c);
            color: var(--gold-glow, #d5a75c);
            background: rgba(10, 17, 24, 0.75);
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: all 0.2s ease;
            -webkit-tap-highlight-color: transparent;
        }
        .tts-inline-btn:hover { background: rgba(213, 167, 92, 0.2); }
        .tts-inline-btn:active { transform: scale(0.96); }
        .tts-inline-btn.tts-stop { border-color: #ff5252; color: #ff5252; }
        .tts-play[data-active="true"] {
            background: var(--gold-glow, #d5a75c) !important;
            color: #050a12 !important;
            animation: ttsGlowPulse 1.4s infinite ease-in-out;
        }
        @keyframes ttsGlowPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(213, 167, 92, 0.6); }
            50% { box-shadow: 0 0 0 8px rgba(213, 167, 92, 0); }
        }
.tts-floating-container {
    position: fixed;
    bottom: 16px;
    left: 16px;
    /* استخدام أعلى قيمة رسمية مدعومة عالمياً في جميع المتصفحات والهواتف */
    z-index: 2147483647 !important;
    direction: rtl;
    font-family: 'Alexandria', system-ui, sans-serif;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
}

        .tts-fab-btn {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border: 1.5px solid var(--gold-glow, #d5a75c);
            color: var(--gold-glow, #d5a75c);
            border-radius: 50px;
            padding: 10px 16px;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
            font-weight: 700;
            font-size: 0.8rem;
            transition: all 0.25s ease;
            outline: none;
        }
        .tts-fab-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 28px rgba(213, 167, 92, 0.25);
            background: #1e293b;
        }
        .tts-fab-btn.is-active {
            border-color: #4ade80;
            color: #4ade80;
            animation: ttsGlowPulse 2s infinite ease-in-out;
        }

        .tts-dock-panel {
            position: absolute;
            bottom: 54px;
            left: 0;
            width: 310px;
            max-width: 90vw;
            background: rgba(13, 23, 38, 0.96);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1.5px solid rgba(213, 167, 92, 0.5);
            border-radius: 16px;
            padding: 14px;
            box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
            color: #fff;
            display: none;
            flex-direction: column;
            gap: 10px;
            animation: ttsFadeSlide 0.25s ease forwards;
        }
        .tts-dock-panel.is-open { display: flex; }
        @keyframes ttsFadeSlide {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .tts-dock-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(213, 167, 92, 0.2);
            padding-bottom: 8px;
        }
        .tts-dock-title {
            font-size: 0.85rem;
            font-weight: 800;
            color: var(--gold-glow, #d5a75c);
            display: flex;
            align-items: center;
            gap: 6px;
            margin: 0;
        }
        .tts-dock-close {
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            font-size: 1.1rem;
            padding: 0 4px;
            line-height: 1;
        }
        .tts-dock-close:hover { color: #fff; }

        .tts-dock-status {
            font-size: 0.72rem;
            color: #cbd5e1;
            background: rgba(0, 0, 0, 0.35);
            padding: 6px 10px;
            border-radius: 8px;
            border-right: 3px solid var(--gold-glow, #d5a75c);
            max-height: 48px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .tts-dock-actions {
            display: flex;
            gap: 8px;
            justify-content: center;
        }
        .tts-dock-btn {
            flex: 1;
            padding: 8px 10px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            background: rgba(255, 255, 255, 0.06);
            color: #fff;
            font-family: inherit;
            font-size: 0.75rem;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            transition: all 0.2s;
        }
        .tts-dock-btn:hover {
            background: rgba(213, 167, 92, 0.15);
            border-color: var(--gold-glow, #d5a75c);
            color: var(--gold-glow, #d5a75c);
        }
        .tts-dock-btn.active {
            background: var(--gold-glow, #d5a75c);
            color: #050a12;
            border-color: var(--gold-glow, #d5a75c);
        }

        .tts-dock-speed-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.72rem;
            color: #94a3b8;
            padding-top: 4px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .tts-speed-btns {
            display: flex;
            gap: 4px;
        }
        .tts-speed-chip {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #cbd5e1;
            padding: 3px 8px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.68rem;
            font-weight: 600;
        }
        .tts-speed-chip.active {
            background: var(--gold-glow, #d5a75c);
            color: #050a12;
            border-color: var(--gold-glow, #d5a75c);
        }

        .tts-toast {
            position: fixed;
            bottom: 74px;
            left: 50%;
            transform: translateX(-50%);
            max-width: 90%;
            z-index: 100000;
            background: rgba(5, 10, 18, 0.96);
            border: 1.5px solid var(--gold-glow, #d5a75c);
            color: #fff;
            font-family: 'Alexandria', system-ui, sans-serif;
            font-size: 0.8rem;
            font-weight: 600;
            padding: 10px 18px;
            border-radius: 12px;
            text-align: center;
            direction: rtl;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.7);
        }

        .tts-selection-pill {
            position: fixed;
            z-index: 100001;
            background: var(--gold-glow, #d5a75c);
            color: #050a12;
            border: none;
            border-radius: 20px;
            padding: 6px 14px;
            font-family: 'Alexandria', system-ui, sans-serif;
            font-size: 0.75rem;
            font-weight: 800;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
            cursor: pointer;
            display: none;
            align-items: center;
            gap: 6px;
            direction: rtl;
            transform: translate(-50%, -100%);
            animation: ttsFadeSlide 0.2s ease;
        }
        .tts-selection-pill:hover {
            transform: translate(-50%, -105%) scale(1.03);
        }
    `;
    document.head.appendChild(style);
}

let toastTimeout = null;
export function showReaderToast(message) {
    if (!HAS_DOM) return;
    injectReaderStyles();
    const old = document.getElementById("native-tts-toast");
    if (old) old.remove();
    clearTimeout(toastTimeout);
    const toast = document.createElement("div");
    toast.id = "native-tts-toast";
    toast.className = "tts-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    toastTimeout = setTimeout(() => toast.remove(), 3200);
}

function updateReaderUi() {
    if (!HAS_DOM) return;
    const fab = document.getElementById("tts-fab-toggle");
    const dockStatus = document.getElementById("tts-dock-status");
    const playPauseBtn = document.getElementById("tts-dock-playpause");

    if (fab) {
        fab.classList.toggle("is-active", readerState.isPlaying);
        const icon = fab.querySelector(".tts-fab-icon");
        if (icon) icon.textContent = readerState.isPlaying ? "🔊" : "🔈";
    }

    if (dockStatus) {
        dockStatus.textContent = readerState.statusText;
    }

    if (playPauseBtn) {
        if (!readerState.isPlaying) {
            playPauseBtn.innerHTML = "<span>قراءة الصفحة</span>";
        } else if (readerState.isPaused) {
            playPauseBtn.innerHTML = "<span>استئناف</span>";
        } else {
            playPauseBtn.innerHTML = "<span>إيقاف مؤقت</span>";
        }
    }
}

export function initGlobalTextReader() {
    if (!HAS_DOM || document.getElementById("tts-global-root")) return;
    injectReaderStyles();

    const root = document.createElement("div");
    root.id = "tts-global-root";
    root.className = "tts-floating-container";
    root.innerHTML = `
        <button type="button" id="tts-fab-toggle" class="tts-fab-btn" aria-label="فتح القارئ الصوتي الذاتي">

            <span>القارئ الذاتي</span>
        </button>

        <div id="tts-dock-panel" class="tts-dock-panel">
            <div class="tts-dock-header">
                <h4 class="tts-dock-title">
                    <span>🎙️</span>
                    <span>القارئ الصوتي الذاتي</span>
                </h4>
                <button type="button" id="tts-dock-close" class="tts-dock-close" aria-label="إغلاق">&times;</button>
            </div>

            <div id="tts-dock-status" class="tts-dock-status">جاهز للاستماع</div>

            <div class="tts-dock-actions">
                <button type="button" id="tts-dock-playpause" class="tts-dock-btn" title="قراءة محتوى الصفحة">
                    <span>▶️</span>
                    <span>قراءة الصفحة</span>
                </button>
                <button type="button" id="tts-dock-stop" class="tts-dock-btn" title="إيقاف القراءة">
                    <span>⏹️</span>
                    <span>إيقاف</span>
                </button>
            </div>

            <div class="tts-dock-actions">
                <button type="button" id="tts-dock-clickread" class="tts-dock-btn" title="انقر على أي فقرة أو سؤال لسماعه">
                    <span>👆</span>
                    <span>انقر للقراءة</span>
                </button>
            </div>

            <div class="tts-dock-speed-row">
                <span>سرعة القراءة:</span>
                <div class="tts-speed-btns">
                    <button type="button" class="tts-speed-chip" data-speed="0.8">0.8x</button>
                    <button type="button" class="tts-speed-chip active" data-speed="1.0">عادي</button>
                    <button type="button" class="tts-speed-chip" data-speed="1.25">1.25x</button>
                </div>
            </div>

            <div class="tts-dock-voice-row" style="display:flex;align-items:center;justify-content:space-between;padding-top:6px;border-top:1px solid rgba(255,255,255,0.08);font-size:0.72rem;color:#cbd5e1;">
                <span>صوت المتحدث:</span>
                <select id="tts-voice-select" style="background:#0a1118;border:1px solid rgba(213,167,92,0.5);color:var(--gold-glow,#d5a75c);border-radius:6px;padding:3px 6px;font-family:inherit;font-size:0.68rem;cursor:pointer;outline:none;max-width:180px;">
                    <option value="__device_auto__" selected>🎙️ صوت النظام الافتراضي (Web Speech)</option>
                </select>
            </div>

            <div class="tts-dock-actions" style="margin-top:6px;">
                <button type="button" id="tts-dock-test" class="tts-dock-btn" style="border-color:#4ade80;color:#4ade80;" title="فحص نطق الصوت في متصفحك">
                    <span>🧪</span>
                    <span>فحص الصوت في جهازك</span>
                </button>
            </div>
        </div>

        <button type="button" id="tts-selection-pill" class="tts-selection-pill">
            <span>🔊</span>
            <span>استمع للمحدد</span>
        </button>
    `;

    document.body.appendChild(root);

    let currentX = 0;
    let currentY = 0;

    // دالة فحص وتحديث اتجاه فتح المودال بناءً على المحاور الأربعة للشاشة
    function adjustPanelDirection() {
        const panel = root.querySelector("#tts-dock-panel");
        if (!panel) return;

        const rect = root.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // أولاً: تكييف المحور العمودي (شمال / جنوب)
        if (rect.top < screenHeight / 2) {
            panel.style.bottom = "auto";
            panel.style.top = "54px";
        } else {
            panel.style.top = "auto";
            panel.style.bottom = "54px";
        }

        // ثانياً: تكييف المحور الأفقي (شرق / غرب)
        // إذا كان الزر قريباً من الحافة اليمنى (الشرق)، يفتح المودال بالكامل نحو اليسار (الغرب)
        if (rect.left > screenWidth - 320) {
            panel.style.left = "auto";
            panel.style.right = "0px";
        } else {
            panel.style.right = "auto";
            panel.style.left = "0px";
        }
    }

    // استعادة الموقع المحفوظ للاعب
    const savedTransformX = localStorage.getItem("tts-trans-x");
    const savedTransformY = localStorage.getItem("tts-trans-y");
    if (savedTransformX !== null && savedTransformY !== null) {
        currentX = parseInt(savedTransformX, 10);
        currentY = parseInt(savedTransformY, 10);
        root.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        setTimeout(adjustPanelDirection, 50);
    }

    makeReaderButtonDraggable(root);

    function makeReaderButtonDraggable(container) {
        let isDragging = false;
        let startX = 0,
            startY = 0;

        container.addEventListener("mousedown", dragStart);
        container.addEventListener("touchstart", dragStart, { passive: false });

        document.addEventListener("mousemove", dragMove);
        document.addEventListener("touchmove", dragMove, { passive: false });

        document.addEventListener("mouseup", dragEnd);
        document.addEventListener("touchend", dragEnd);

        function dragStart(e) {
            if (
                e.target.closest("#tts-dock-panel") ||
                e.target.closest(".tts-speed-chip") ||
                e.target.closest("select")
            ) {
                return;
            }
            isDragging = true;
            startX = e.type === "touchstart" ? e.touches.clientX : e.clientX;
            startY = e.type === "touchstart" ? e.touches.clientY : e.clientY;
            if (e.cancelable) e.preventDefault();
        }

        function dragMove(e) {
            if (!isDragging) return;
            if (e.cancelable) e.preventDefault();

            const clientX = e.type === "touchmove" ? e.touches.clientX : e.clientX;
            const clientY = e.type === "touchmove" ? e.touches.clientY : e.clientY;

            const deltaX = clientX - startX;
            const deltaY = clientY - startY;

            currentX += deltaX;
            currentY += deltaY;

            const rect = container.getBoundingClientRect();
            if (rect.left < 0) currentX -= rect.left;
            if (rect.top < 0) currentY -= rect.top;
            if (rect.right > window.innerWidth) currentX -= rect.right - window.innerWidth;
            if (rect.bottom > window.innerHeight) currentY -= rect.bottom - window.innerHeight;

            container.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;

            startX = clientX;
            startY = clientY;

            adjustPanelDirection();
        }

        function dragEnd() {
            if (isDragging) {
                localStorage.setItem("tts-trans-x", currentX);
                localStorage.setItem("tts-trans-y", currentY);
                adjustPanelDirection();
            }
            isDragging = false;
        }
    }
    const fab = root.querySelector("#tts-fab-toggle");
    const panel = root.querySelector("#tts-dock-panel");
    const closeBtn = root.querySelector("#tts-dock-close");
    const playPauseBtn = root.querySelector("#tts-dock-playpause");
    const stopBtn = root.querySelector("#tts-dock-stop");
    const clickReadBtn = root.querySelector("#tts-dock-clickread");
    const selectionPill = root.querySelector("#tts-selection-pill");
    const speedChips = root.querySelectorAll(".tts-speed-chip");

    fab.addEventListener("click", (e) => {
        e.stopPropagation();
        unlockAudioContext();
        if (typeof adjustPanelDirection === "function") {
            adjustPanelDirection();
        }
        panel.classList.toggle("is-open");
    });

    closeBtn.addEventListener("click", () => {
        panel.classList.remove("is-open");
    });

    playPauseBtn.addEventListener("click", () => {
        unlockAudioContext();
        if (!readerState.isPlaying) {
            readCurrentPage();
        } else if (readerState.isPaused) {
            resumeSpeech();
        } else {
            pauseSpeech();
        }
    });

    stopBtn.addEventListener("click", () => {
        stopSpeech();
    });

    clickReadBtn.addEventListener("click", () => {
        unlockAudioContext();
        readerState.clickToReadEnabled = !readerState.clickToReadEnabled;
        clickReadBtn.classList.toggle("active", readerState.clickToReadEnabled);
        if (readerState.clickToReadEnabled) {
            showReaderToast("تم تفعيل وضع القراءة بالنقر: اضغط على أي نص أو كارت لسماعه.");
        } else {
            showReaderToast("تم إلغاء وضع القراءة بالنقر.");
        }
    });

    speedChips.forEach((chip) => {
        chip.addEventListener("click", () => {
            speedChips.forEach((c) => c.classList.remove("active"));
            chip.classList.add("active");
            readerState.currentRate = parseFloat(chip.dataset.speed) || 1.0;
            if (nativeAudioPlayer) nativeAudioPlayer.playbackRate = readerState.currentRate;
            showReaderToast(`تم ضبط سرعة القراءة: ${chip.textContent}`);
        });
    });

    const voiceSelect = root.querySelector("#tts-voice-select");

    function populateLocalVoices() {
        if (!voiceSelect || !("speechSynthesis" in window)) return;
        const voices = window.speechSynthesis.getVoices() || [];
        const arVoices = voices.filter((v) => /^ar/i.test(v.lang) || /arabic/i.test(v.name));

        voiceSelect.innerHTML = "";

        if (arVoices.length > 0) {
            arVoices.forEach((v, idx) => {
                const opt = document.createElement("option");
                opt.value = v.voiceURI || v.name;
                opt.textContent = `🎙️ ${v.name}`;
                if (idx === 0) opt.selected = true;
                voiceSelect.appendChild(opt);
            });
            readerState.selectedVoiceURI = voiceSelect.value;
        } else {
            const opt = document.createElement("option");
            opt.value = "__device_auto__";
            opt.textContent = "🎙️ صوت النظام الافتراضي (Web Speech)";
            opt.selected = true;
            voiceSelect.appendChild(opt);
            readerState.selectedVoiceURI = null;
        }
    }

    populateLocalVoices();
    if ("speechSynthesis" in window && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateLocalVoices;
    }

    if (voiceSelect) {
        voiceSelect.addEventListener("change", (e) => {
            const val = e.target.value;
            readerState.selectedVoiceURI = val === "__device_auto__" ? null : val;
            const selectedText = e.target.options[e.target.selectedIndex].text;
            showReaderToast(`تم تفعيل: ${selectedText}`);
        });
    }

    const testBtn = root.querySelector("#tts-dock-test");
    if (testBtn) {
        testBtn.addEventListener("click", () => {
            unlockAudioContext();
            showReaderToast("⏳ جارٍ فحص الصوت في جهازك...");
            speakText("مرحباً بك، هذا فحص عمل الصوت في متصفحك.").then((ok) => {
                if (ok) {
                    showReaderToast("✅ الصوت يعمل بنجاح في جهازك!");
                }
            });
        });
    }

    document.addEventListener(
        "click",
        (e) => {
            if (!readerState.clickToReadEnabled) return;
            if (root.contains(e.target)) return;

            const target = e.target.closest(
                "p, h1, h2, h3, h4, li, span, button, .accordion-trigger, .guide-text, .image-showcase-box"
            );
            if (!target) return;

            const text = sanitizeForSpeech(target.textContent);
            if (text && text.length >= 3) {
                e.preventDefault();
                e.stopPropagation();
                unlockAudioContext();
                speakText(text, { targetElement: target });
            }
        },
        true
    );

    document.addEventListener("selectionchange", () => {
        const selection = window.getSelection();
        const selectedText = selection ? selection.toString().trim() : "";

        if (selectedText.length >= 2 && !isForbiddenSpeech(selectedText)) {
            try {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    selectionPill.style.top = `${Math.max(10, rect.top + window.scrollY - 10)}px`;
                    selectionPill.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
                    selectionPill.style.display = "inline-flex";
                    return;
                }
            } catch (err) {
                // تجاهل
            }
        }
        selectionPill.style.display = "none";
    });

    selectionPill.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        unlockAudioContext();
        const selection = window.getSelection();
        const selectedText = selection ? selection.toString().trim() : "";
        if (selectedText) {
            speakText(selectedText);
            selectionPill.style.display = "none";
        }
    });

    document.addEventListener("click", (e) => {
        if (!root.contains(e.target)) {
            panel.classList.remove("is-open");
        }
    });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopSpeech();
    });
    window.addEventListener("pagehide", stopSpeech);
    window.addEventListener("beforeunload", stopSpeech);
}

if (HAS_DOM) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initGlobalTextReader);
    } else {
        initGlobalTextReader();
    }
}
