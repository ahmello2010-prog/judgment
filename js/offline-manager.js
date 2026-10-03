// ==========================================================================
// 🌐 js/offline-manager.js — مدير الجاهزية والاتصال لوضع الأوفلاين
// ==========================================================================

const CACHE_NAME = "judgment-cache-v1";
const OFFLINE_READY_FLAG = "judgment_offline_ready";

// التحقق من التخزين الفعلي للأصول الحيوية داخل Cache Storage
export async function isOfflineReady() {
    if (!("caches" in window)) return false;
    try {
        const hasCache = await caches.has(CACHE_NAME);
        if (!hasCache) return false;

        const cache = await caches.open(CACHE_NAME);
        // فحص وجود الملفات الجوهرية التي لا يمكن بدونها تشغيل اللعبة
        const requiredPaths = ["/offline.html", "/cases.json", "/css/style.css", "/js/offline-engine.js"];
        for (const path of requiredPaths) {
            const match = await cache.match(path);
            if (!match) return false;
        }
        return true;
    } catch (e) {
        console.warn("[OfflineManager] Cache check failed:", e);
        return false;
    }
}

// فحص حقيقي ودقيق لوجود اتصال إنترنت فعلي (بدون الاعتماد على navigator.onLine وحده ولا نفس السيرفر وحده)
export async function checkRealInternet(timeoutMs = 4000) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return false;
    }

    // محاولة فحص نقاط اتصال خارجية موثوقة وعالية التوافر
    const testEndpoints = [
        "https://dns.google/resolve?name=google.com&type=A",
        "https://cloudflare-dns.com/dns-query?name=cloudflare.com&type=A"
    ];

    for (const url of testEndpoints) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            const response = await fetch(url, {
                method: "GET",
                mode: "cors",
                cache: "no-store",
                signal: controller.signal
            });
            clearTimeout(timer);
            if (response.ok) return true;
        } catch (e) {
            // ننتقل للنقطة التالية
        }
    }

    // فحص احتياطي عبر استدعاء خفيف غير مخزن من أصلنا لو تعذرت الخدمات العالمية
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch("/site.webmanifest?_t=" + Date.now(), {
            method: "HEAD",
            cache: "no-store",
            signal: controller.signal
        });
        clearTimeout(timer);
        return res.ok;
    } catch (e) {
        return false;
    }
}

// تجهيز وتخزين كافة الأصول في الكاش عند توفر الإنترنت
export async function prepareOfflineAssets() {
    if (!("caches" in window)) return false;
    try {
        const cache = await caches.open(CACHE_NAME);
        const filesToCache = [
            "/",
            "/index.html",
            "/rooms.html",
            "/guide.html",
            "/offline.html",
            "/css/style.css",
            "/cases.json",
            "/site.webmanifest",
            "/favicon.ico",
            "/favicon.svg",
            "/favicon-96x96.png",
            "/apple-touch-icon.png",
            "/fonts/Alexandria-Bold.ttf",
            "/fonts/Harmattan-Medium.ttf",
            "/js/app.js",
            "/js/improv.js",
            "/js/radio.js",
            "/js/soundtrack.js",
            "/js/transitions.js",
            "/js/tts.js",
            "/js/offline-manager.js",
            "/js/offline-engine.js",
            "/img/backg.jpeg",
            "/img/create.jpg",
            "/img/join.jpg",
            "/img/jud1.png",
            "/img/logo.jpeg",
            "/img/off.png",
            "/img/uh (1).mp3",
            "/img/uh.mp3",
            "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js",
            "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js"
        ];

        await Promise.allSettled(
            filesToCache.map(async (url) => {
                try {
                    const res = await fetch(url, { cache: "reload" });
                    if (res.ok) await cache.put(url, res);
                } catch (err) {}
            })
        );

        const ready = await isOfflineReady();
        if (ready) {
            localStorage.setItem(OFFLINE_READY_FLAG, "true");
            window.dispatchEvent(new CustomEvent("judgment-offline-ready"));
            console.log("⚡ [OfflineManager] الجهاز مجهز الآن بنجاح لوضع الأوفلاين!");
            return true;
        }
    } catch (err) {
        console.warn("[OfflineManager] Pre-caching error:", err);
    }
    return false;
}

// عرض المودال المطلوب عند أول زيارة بدون إنترنت
export function showFirstTimeOfflineModal() {
    let modal = document.getElementById("first-time-offline-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "first-time-offline-modal";
        modal.className = "modal-overlay-active";
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: rgba(5, 10, 18, 0.94);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 2147483647;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            direction: rtl;
            box-sizing: border-box;
            font-family: 'Alexandria', sans-serif;
        `;

        modal.innerHTML = `
            <div style="
                background: linear-gradient(180deg, #162032 0%, #0d1523 100%);
                border: 2px solid var(--gold-glow, #d5a75c);
                border-radius: 20px;
                padding: 32px 24px;
                max-width: 440px;
                width: 100%;
                text-align: center;
                box-shadow: 0 16px 40px rgba(0,0,0,0.8), 0 0 25px rgba(213, 167, 92, 0.25);
                color: #ffffff;
            ">
                <div style="
                    width: 70px; height: 70px;
                    margin: 0 auto 20px;
                    border-radius: 50%;
                    background: rgba(213, 167, 92, 0.15);
                    border: 2px solid var(--gold-glow, #d5a75c);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 2rem;
                ">
                    ⚖️
                </div>
                <h2 style="
                    color: var(--gold-glow, #d5a75c);
                    font-size: 1.35rem;
                    font-weight: 800;
                    margin: 0 0 14px 0;
                ">تجهيز اللعبة للعب بدون إنترنت</h2>
                <p style="
                    font-family: 'Harmattan', sans-serif;
                    font-size: 1.35rem;
                    line-height: 1.6;
                    color: rgba(255, 255, 255, 0.85);
                    margin: 0 0 24px 0;
                ">
                    هذه أول مرة يتم فيها تشغيل Judgment على هذا الجهاز بدون اتصال بالإنترنت. لتجهيز اللعبة للعب Offline، يجب تشغيل الإنترنت مرة واحدة على الأقل.
                </p>
                <button id="btn-offline-retry" style="
                    width: 100%;
                    padding: 13px 20px;
                    background: linear-gradient(135deg, #d5a75c 0%, #b8860b 100%);
                    color: #050a12;
                    border: none;
                    border-radius: 12px;
                    font-family: 'Alexandria', sans-serif;
                    font-size: 1rem;
                    font-weight: 800;
                    cursor: pointer;
                    box-shadow: 0 6px 18px rgba(213, 167, 92, 0.35);
                    transition: transform 0.2s, opacity 0.2s;
                ">إعادة المحاولة</button>
                <div id="offline-retry-status" style="
                    margin-top: 14px;
                    font-size: 0.85rem;
                    color: #cbd5e1;
                    min-height: 20px;
                "></div>
            </div>
        `;
        document.body.appendChild(modal);

        const retryBtn = modal.querySelector("#btn-offline-retry");
        const statusEl = modal.querySelector("#offline-retry-status");

        retryBtn.addEventListener("click", async () => {
            retryBtn.disabled = true;
            retryBtn.style.opacity = "0.6";
            statusEl.textContent = "جاري التحقق من توفر الإنترنت...";

            const hasInternet = await checkRealInternet();
            if (hasInternet) {
                statusEl.textContent = "تم رصد الاتصال! جاري تجهيز ملفات اللعبة محلياً...";
                const success = await prepareOfflineAssets();
                if (success) {
                    statusEl.textContent = "اكتمل التجهيز بنجاح! يتم الآن فتح اللعبة...";
                    setTimeout(() => {
                        modal.style.display = "none";
                        modal.remove();
                        window.location.reload();
                    }, 1200);
                    return;
                }
            }

            statusEl.textContent = "تعذر الاتصال بالإنترنت، يرجى تفعيل الشبكة والمحاولة مجدداً.";
            retryBtn.disabled = false;
            retryBtn.style.opacity = "1";
        });
    } else {
        modal.style.display = "flex";
    }
}

// دالة البدء الرئيسية لفحص الحالة وتسجيل الخدمة
export async function initOfflineManager() {
    // 1. تسجيل الـ Service Worker إن كان مدعوماً
    if ("serviceWorker" in navigator) {
        try {
            await navigator.serviceWorker.register("/sw.js");
            console.log("[OfflineManager] ServiceWorker registered.");
        } catch (e) {
            console.warn("[OfflineManager] SW registration error:", e);
        }
    }

    // 2. التحقق من جاهزية الأوفلاين
    const ready = await isOfflineReady();

    if (!ready) {
        // فحص وجود اتصال بالإنترنت
        const hasInternet = await checkRealInternet();
        if (hasInternet) {
            // إنترنت متوفر في الزيارة الأولى: نقوم بتجهيز الكاش بالكامل في الخلفية
            prepareOfflineAssets();
        } else {
            // أول زيارة بدون إنترنت واللعبة غير مجهزة: عرض المودال المطلوب
            showFirstTimeOfflineModal();
        }
    } else {
        // اللعبة مجهزة مسبقاً: نضمن وجود العلامة
        localStorage.setItem(OFFLINE_READY_FLAG, "true");
        // تحديث خفيف في الخلفية إن توفر الإنترنت
        if (navigator.onLine) {
            prepareOfflineAssets().catch(() => {});
        }
    }
}

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initOfflineManager);
    } else {
        initOfflineManager();
    }
}
