// ==========================================================================
// 🎵 js/soundtrack.js
// محرك الموسيقى التصويرية الشامل والمستمر عبر جميع مراحل وشاشات اللعبة
// 1. الصوت يظل شغالاً باستمرار على مدار اللعبة مع حفظ موضع التشغيل بالثانية واستئنافه فوراً بين الصفحات
// 2. زر تحكم دائري صغير الحجم وأنيق (Compact Floating Button) في زاوية الشاشة
// ==========================================================================

const AUDIO_SRC = "bg_music.mp3";
const STORAGE_PREF_KEY = "court_bg_music_pref";
const STORAGE_TIME_KEY = "court_bg_music_time";
const DEFAULT_VOLUME = 0.36;

let audioInstance = null;
let buttonInstance = null;

export function initGlobalSoundtrack() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // تجنب الحقن المتكرر
    if (document.getElementById("global-soundtrack-container")) {
        return;
    }

    // 1. تهيئة عنصر الصوت المستمر
    audioInstance = document.getElementById("global-bg-soundtrack");
    if (!audioInstance) {
        audioInstance = document.createElement("audio");
        audioInstance.id = "global-bg-soundtrack";
        audioInstance.src = AUDIO_SRC;
        audioInstance.loop = true;
        audioInstance.preload = "auto";
        audioInstance.style.display = "none";
        document.body.appendChild(audioInstance);
    }
    audioInstance.volume = DEFAULT_VOLUME;

    // استعادة موضع التوقيت لضمان استمرار اللحن بسلاسة بين الانتقالات دون قطعه أو إعادته
    const savedTime = parseFloat(sessionStorage.getItem(STORAGE_TIME_KEY) || "0");
    if (savedTime && !isNaN(savedTime) && savedTime > 0) {
        audioInstance.currentTime = savedTime;
    }

    // 2. إنشاء زر التحكم الصغير والأنيق في الزاوية
    const container = document.createElement("div");
    container.id = "global-soundtrack-container";
    container.className = "global-soundtrack-corner";
    container.innerHTML = `
        <button id="btn-global-music-toggle" class="global-music-btn is-paused" aria-label="تشغيل أو إيقاف الموسيقى التصويرية" title="الموسيقى التصويرية (تشغيل / إيقاف)">
            <svg class="g-icon-play" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
            <svg class="g-icon-pause" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
            <span class="g-sound-pulse"></span>
        </button>
    `;
    document.body.appendChild(container);

    buttonInstance = document.getElementById("btn-global-music-toggle");

    function updateUI(isPlaying) {
        if (!buttonInstance) return;
        if (isPlaying) {
            buttonInstance.classList.add("is-playing");
            buttonInstance.classList.remove("is-paused");
            buttonInstance.setAttribute("title", "إيقاف الموسيقى التصويرية");
        } else {
            buttonInstance.classList.remove("is-playing");
            buttonInstance.classList.add("is-paused");
            buttonInstance.setAttribute("title", "تشغيل الموسيقى التصويرية");
        }
    }

    async function playAudio() {
        try {
            await audioInstance.play();
            updateUI(true);
            localStorage.setItem(STORAGE_PREF_KEY, "playing");
        } catch (err) {
            // المتصفح يمنع التشغيل التلقائي حتى أول تفاعل
            updateUI(false);
        }
    }

    function pauseAudio() {
        audioInstance.pause();
        updateUI(false);
        localStorage.setItem(STORAGE_PREF_KEY, "paused");
    }

    function toggleAudio() {
        if (audioInstance.paused) {
            playAudio();
        } else {
            pauseAudio();
        }
    }

    buttonInstance.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleAudio();
    });

    // تخزين موضع الصوت بصورة دورية لمواصلة التشغيل بسلاسة عند الانتقال بين الشاشات
    let lastSaved = 0;
    audioInstance.addEventListener("timeupdate", () => {
        const cur = audioInstance.currentTime;
        if (Math.abs(cur - lastSaved) > 0.6) {
            lastSaved = cur;
            sessionStorage.setItem(STORAGE_TIME_KEY, String(cur));
        }
    });

    // عند مغادرة الصفحة أو الانتقال لغرفة أخرى
    const saveStateBeforeLeave = () => {
        if (audioInstance) {
            sessionStorage.setItem(STORAGE_TIME_KEY, String(audioInstance.currentTime));
            sessionStorage.setItem("court_music_state", audioInstance.paused ? "paused" : "playing");
        }
    };
    window.addEventListener("beforeunload", saveStateBeforeLeave);
    window.addEventListener("pagehide", saveStateBeforeLeave);

    // الحالة الافتراضية: التشغيل المستمر ما لم يُفضل اللاعب كتمها
    const userPref = localStorage.getItem(STORAGE_PREF_KEY);
    if (userPref !== "paused") {
        playAudio();
    } else {
        updateUI(false);
    }

    // تفعيل الصوت عند أول تفاعل في حال تقييد المتصفح الأولي
    function onFirstInteraction() {
        if (audioInstance.paused && localStorage.getItem(STORAGE_PREF_KEY) !== "paused") {
            playAudio();
        }
        window.removeEventListener("click", onFirstInteraction);
        window.removeEventListener("touchstart", onFirstInteraction);
        window.removeEventListener("keydown", onFirstInteraction);
    }
    window.addEventListener("click", onFirstInteraction, { passive: true });
    window.addEventListener("touchstart", onFirstInteraction, { passive: true });
    window.addEventListener("keydown", onFirstInteraction, { passive: true });
}

// تفعيل تلقائي فور جاهزية الـ DOM
if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initGlobalSoundtrack);
    } else {
        initGlobalSoundtrack();
    }
}
