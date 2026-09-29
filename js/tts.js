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
    selectedVoiceId: "ar-SA-HamedNeural", // الصوت الرجالي العصبي الفخم الأقرب للبشر
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

// تشغيل مقطع عبر مسار الصوت المدمج في الخادم بدون أي مكتبة خارجية
function playAudioChunk(chunkText, token) {
    return new Promise((resolve) => {
        if (!nativeAudioPlayer) {
            resolve(false);
            return;
        }

        const encodedText = encodeURIComponent(chunkText);
        const voiceParam = encodeURIComponent(readerState.selectedVoiceId || "ar-SA-HamedNeural");
        const streamUrl = `/api/speak?text=${encodedText}&voice=${voiceParam}`;

        let resolved = false;
        const finish = (ok) => {
            if (resolved) return;
            resolved = true;
            nativeAudioPlayer.onended = null;
            nativeAudioPlayer.onerror = null;
            resolve(ok);
        };

        nativeAudioPlayer.src = streamUrl;
        nativeAudioPlayer.playbackRate = readerState.currentRate;

        nativeAudioPlayer.onended = () => {
            finish(true);
        };

        nativeAudioPlayer.onerror = () => {
            // في حال فشل الاتصال بالمسار، التراجع لميزة المتصفح المحلية
            speakWithBrowserUtterance(chunkText).then(finish);
        };

        const playPromise = nativeAudioPlayer.play();
        if (playPromise && playPromise.catch) {
            playPromise.catch((err) => {
                console.warn("تعذر تشغيل الصوت عبر HTML5 Audio، تجربة محرك المتصفح:", err);
                speakWithBrowserUtterance(chunkText).then(finish);
            });
        }
    });
}

// بديل المتصفح المحلي (SpeechSynthesis) إذا كان الجهاز أوفلاين
function speakWithBrowserUtterance(text) {
    return new Promise((resolve) => {
        if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
            resolve(false);
            return;
        }

        try {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }

            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = "ar-SA";
            utter.rate = readerState.currentRate;

            // محاولة اختيار صوت عربي مناسب
            const voices = window.speechSynthesis.getVoices() || [];
            const arVoice = voices.find((v) => /^ar/i.test(v.lang));
            if (arVoice) utter.voice = arVoice;

            utter.onend = () => resolve(true);
            utter.onerror = () => resolve(false);

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
        if (token !== readerState.token || !ok) break;
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
            await playAudioChunk(chunk, token);
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
            z-index: 99999;
            direction: rtl;
            font-family: 'Alexandria', system-ui, sans-serif;
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
            playPauseBtn.innerHTML = "<span>▶️</span><span>قراءة الصفحة</span>";
        } else if (readerState.isPaused) {
            playPauseBtn.innerHTML = "<span>▶️</span><span>استئناف</span>";
        } else {
            playPauseBtn.innerHTML = "<span>⏸️</span><span>إيقاف مؤقت</span>";
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
            <span class="tts-fab-icon">🔈</span>
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
                <select id="tts-voice-select" style="background:#0a1118;border:1px solid rgba(213,167,92,0.5);color:var(--gold-glow,#d5a75c);border-radius:6px;padding:3px 6px;font-family:inherit;font-size:0.68rem;cursor:pointer;outline:none;">
                    <option value="ar-SA-HamedNeural" selected>🎙️ حامد (رجالي فخم - الأقرب للبشر)</option>
                    <option value="ar-EG-ShakirNeural">🎙️ شاكر (رجالي هادئ)</option>
                    <option value="ar-SA-ZariyahNeural">🎙️ زارية (نسائي طبيعي)</option>
                </select>
            </div>
        </div>

        <button type="button" id="tts-selection-pill" class="tts-selection-pill">
            <span>🔊</span>
            <span>استمع للمحدد</span>
        </button>
    `;

    document.body.appendChild(root);

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
    if (voiceSelect) {
        voiceSelect.addEventListener("change", (e) => {
            readerState.selectedVoiceId = e.target.value;
            const selectedText = e.target.options[e.target.selectedIndex].text;
            showReaderToast(`تم تفعيل: ${selectedText}`);
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
