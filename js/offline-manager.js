// ==========================================================================
// 🌐 js/offline-manager.js — مدير الجاهزية والاتصال لوضع الأوفلاين
// ==========================================================================

const CACHE_NAME = "judgment-cache-v3"; // يتطابق مع CACHE_NAME في sw.js
const OFFLINE_READY_FLAG = "judgment_offline_ready";

// رسالة التنبيه المعتمدة عند محاولة استخدام ميزات الأونلاين أثناء انقطاع الإنترنت
export const OFFLINE_ONLINE_REQUIRED_MSG =
    "لا يمكن استخدام إنشاء أو الانضمام إلى غرفة بدون اتصال بالإنترنت.\nفعّل الإنترنت ثم حاول مرة أخرى.";

// التحقق الفعلي من اكتمال تخزين الملفات الجوهرية داخل Cache Storage
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

// فحص حقيقي لوجود اتصال إنترنت خارجي فعلي
// ⚠️ لا يعتمد على navigator.onLine وحده ولا يعتبر طلب السيرفر المحلي دليلاً على الإنترنت
export async function checkRealInternet(timeoutMs = 3000) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return false;
    }

    // فحص نقاط شبكية خارجية حقيقية بنمط no-cors
    const externalProbes = ["https://www.google.com/generate_204", "https://cloudflare.com/cdn-cgi/trace"];

    for (const url of externalProbes) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            await fetch(url, {
                method: "HEAD",
                mode: "no-cors",
                cache: "no-store",
                signal: controller.signal
            });
            clearTimeout(timer);
            return true;
        } catch (e) {
            // فشل الطلب الخارجي، ننتقل للنقطة التالية
        }
    }

    // إذا فشلت كافة المحاولات الخارجية، يعتبر الجهاز في وضع أوفلاين قطعي
    return false;
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
                padding: 30px 22px;
                max-width: 440px;
                width: 100%;
                text-align: center;
                box-shadow: 0 16px 40px rgba(0,0,0,0.8), 0 0 25px rgba(213, 167, 92, 0.25);
                color: #ffffff;
            ">
                <div style="
                    width: 64px; height: 64px;
                    margin: 0 auto 16px;
                    border-radius: 50%;
                    background: rgba(213, 167, 92, 0.15);
                    border: 2px solid var(--gold-glow, #d5a75c);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.8rem;
                ">
                    ⚖️
                </div>
                <h2 style="
                    color: var(--gold-glow, #d5a75c);
                    font-size: 1.25rem;
                    font-weight: 800;
                    margin: 0 0 14px 0;
                ">تجهيز اللعبة للعمل بدون إنترنت</h2>
                <p style="
                    font-family: 'Harmattan', sans-serif;
                    font-size: 1.3rem;
                    line-height: 1.6;
                    color: rgba(255, 255, 255, 0.9);
                    margin: 0 0 22px 0;
                ">
                    هذه أول مرة يتم فيها تشغيل Judgment على هذا الجهاز بدون اتصال بالإنترنت.
                    <br/><br/>
                    لتجهيز اللعبة للعمل بدون إنترنت، يجب تشغيل الإنترنت مرة واحدة على الأقل.
                </p>
                <div style="display: flex; gap: 10px;">
                    <button id="btn-offline-dismiss" type="button" style="
                        flex: 1;
                        padding: 12px 14px;
                        background: rgba(255, 255, 255, 0.08);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        color: #ffffff;
                        border-radius: 12px;
                        font-family: 'Alexandria', sans-serif;
                        font-size: 0.95rem;
                        font-weight: 700;
                        cursor: pointer;
                        transition: background 0.2s;
                    ">حسناً، فهمت</button>
                    <button id="btn-offline-retry" type="button" style="
                        flex: 1;
                        padding: 12px 14px;
                        background: linear-gradient(135deg, #d5a75c 0%, #b8860b 100%);
                        color: #050a12;
                        border: none;
                        border-radius: 12px;
                        font-family: 'Alexandria', sans-serif;
                        font-size: 0.95rem;
                        font-weight: 800;
                        cursor: pointer;
                        box-shadow: 0 4px 16px rgba(213, 167, 92, 0.35);
                        transition: transform 0.2s, opacity 0.2s;
                    ">إعادة المحاولة</button>
                </div>
                <div id="offline-retry-status" style="
                    margin-top: 12px;
                    font-size: 0.82rem;
                    color: #cbd5e1;
                    min-height: 18px;
                "></div>
            </div>
        `;
        document.body.appendChild(modal);

        const dismissBtn = modal.querySelector("#btn-offline-dismiss");
        const retryBtn = modal.querySelector("#btn-offline-retry");
        const statusEl = modal.querySelector("#offline-retry-status");

        dismissBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });

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

let roomsNoticeActiveSeq = 0;
let isCheckingRoomsNotice = false;

// تحديث وإظهار/إخفاء تنبيه الأوفلاين في صفحة rooms.html
export async function updateRoomsOfflineNotice(force = false) {
    const notice = document.getElementById("rooms-offline-notice");
    if (!notice) return;

    // 1. إذا كان المتصفح يصرح صراحةً بأنه Offline: إظهار فوري بدون انتظار
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        roomsNoticeActiveSeq++;
        notice.style.display = "flex";
        isCheckingRoomsNotice = false;
        return;
    }

    // 2. إذا كان هناك فحص جارٍ بالفعل ولم يتم طلب الفحص القسري: نترك الفحص النشط يكتمل
    if (isCheckingRoomsNotice && !force) {
        return;
    }

    const currentSeq = ++roomsNoticeActiveSeq;
    isCheckingRoomsNotice = true;

    try {
        // فحص الاتصال الخارجي الحقيقي
        let hasInternet = await checkRealInternet(2500);

        // حماية ضد الـ stale checks: إذا بدأ فحص أحدث خلال هذا الوقت، نتجاهل النتيجة
        if (currentSeq !== roomsNoticeActiveSeq) return;

        // إذا فشل الفحص الأول، نقوم بإعادة محاولة تأكيدية (Retry) لمنع الإنذارات الكاذبة الناتجة عن تعثر شبكي عابر
        if (!hasInternet) {
            await new Promise((r) => setTimeout(r, 600));
            if (currentSeq !== roomsNoticeActiveSeq) return;
            hasInternet = await checkRealInternet(2500);
            if (currentSeq !== roomsNoticeActiveSeq) return;
        }

        // تطبيق النتيجة النهائية على واجهة المستخدم
        if (hasInternet) {
            notice.style.display = "none";
        } else {
            notice.style.display = "flex";
        }
    } catch (e) {
        if (currentSeq === roomsNoticeActiveSeq) {
            notice.style.display = "flex";
        }
    } finally {
        if (currentSeq === roomsNoticeActiveSeq) {
            isCheckingRoomsNotice = false;
        }
    }
}

// عرض المودال الموحد عند محاولة دخول ميزة تتطلب اتصالاً بالإنترنت
export function showOnlineRequiredAlert(message) {
    const text = message || OFFLINE_ONLINE_REQUIRED_MSG;
    const modal = document.getElementById("custom-alert-modal");
    const msgEl = document.getElementById("modal-alert-message");
    const titleEl = document.getElementById("modal-alert-title");

    if (modal && msgEl) {
        if (titleEl) titleEl.textContent = "تنبيه قضائي";
        msgEl.textContent = text;
        modal.classList.remove("modal-overlay-hidden");
        modal.classList.add("modal-overlay-active");
        modal.style.removeProperty("display");
        return;
    }
    try {
        window.alert(text);
    } catch (_) {}
}

// إغلاق المودال الموحد بأمان
export function hideAlertModal() {
    const modal = document.getElementById("custom-alert-modal");
    if (modal) {
        modal.classList.remove("modal-overlay-active");
        modal.classList.add("modal-overlay-hidden");
        modal.style.setProperty("display", "none", "important");
    }
}

// فحص سريع وموثوق للاتصال بالإنترنت قبل السماح بالدخول لميزات الغرف الأونلاين
export async function canAccessOnlineFeature() {
    // 1. فحص فوري وسريع من المتصفح / الـ WebView
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return false;
    }

    // 2. إذا كان شريط تنبيه الأوفلاين ظاهراً بالفعل في rooms.html
    const notice = document.getElementById("rooms-offline-notice");
    if (notice && notice.style.display === "flex") {
        // فحص سريع جداً لتأكيد الحالة الحالية
        const isOnline = await checkRealInternet(1200);
        return isOnline;
    }

    // 3. فحص الاتصال الخارجي الحقيقي
    return await checkRealInternet(2200);
}

// حماية صفحات الأونلاين (create.html و join.html) عند محاولة الدخول المباشر إليها أوفلاين
export async function guardOnlinePage() {
    if (typeof window === "undefined") return;
    const pathname = (window.location.pathname || "").toLowerCase();
    const isOnlinePage =
        pathname.endsWith("create.html") ||
        pathname.endsWith("join.html") ||
        pathname.includes("/create") ||
        pathname.includes("/join");

    if (!isOnlinePage) return;

    // 1. إرجاع فوري إذا كان المتصفح يصرح بعدم وجود اتصال
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        try {
            sessionStorage.setItem("judgment_offline_redirect_alert", "1");
        } catch (_) {}
        window.location.replace("rooms.html");
        return;
    }

    // 2. فحص الإنترنت الخارجي الحقيقي
    const hasInternet = await checkRealInternet(2500);
    if (!hasInternet) {
        try {
            sessionStorage.setItem("judgment_offline_redirect_alert", "1");
        } catch (_) {}
        window.location.replace("rooms.html");
    }
}

// حارس النقر الاستباقي لبطاقات الغرف الأونلاين في rooms.html لمنع أي تسريب للتوجيه أوفلاين
export function setupRoomsClickGuard() {
    if (typeof document === "undefined" || window.__roomsClickGuardBound) return;
    window.__roomsClickGuardBound = true;

    document.addEventListener(
        "click",
        async (e) => {
            const card =
                e.target.closest && (e.target.closest("#card-create-room") || e.target.closest("#card-join-room"));
            if (!card) return;

            const notice = document.getElementById("rooms-offline-notice");
            const isKnownOffline =
                (typeof navigator !== "undefined" && navigator.onLine === false) ||
                (notice && notice.style.display === "flex");

            if (isKnownOffline) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                if (notice) notice.style.display = "flex";
                showOnlineRequiredAlert();
            }
        },
        true // تفعيل مرحلة الـ Capture للسبق الفوري
    );
}

// دالة البدء الرئيسية لفحص الحالة وتسجيل الخدمة
export async function initOfflineManager() {
    // حماية مباشرة: فحص ما إذا كنا داخل create.html أو join.html بدون إنترنت
    guardOnlinePage();

    // تفعيل حارس النقر الفوري لبطاقات الغرف
    setupRoomsClickGuard();

    // 1. تسجيل مستمعي تغير الشبكة لتحديث التنبيه تلقائياً
    if (typeof window !== "undefined") {
        window.addEventListener("online", () => {
            updateRoomsOfflineNotice(true);
            // تحديث الكاش إن لزم عند عودة الشبكة
            prepareOfflineAssets().catch(() => {});
        });
        window.addEventListener("offline", () => {
            updateRoomsOfflineNotice(true);
        });
        updateRoomsOfflineNotice();

        // فحص ما إذا كان المستخدم قد تم تحويله من صفحة أونلاين بسبب انقطاع الإنترنت
        try {
            if (sessionStorage.getItem("judgment_offline_redirect_alert") === "1") {
                sessionStorage.removeItem("judgment_offline_redirect_alert");
                const notice = document.getElementById("rooms-offline-notice");
                if (notice) notice.style.display = "flex";
                showOnlineRequiredAlert();
            }
        } catch (_) {}

        // ربط زر إغلاق المودال لضمان عمله في كل الحالات
        if (!window.__modalCloseBound) {
            window.__modalCloseBound = true;
            document.addEventListener("click", (e) => {
                if (e.target && (e.target.id === "btn-modal-close" || e.target.closest("#btn-modal-close"))) {
                    hideAlertModal();
                }
            });
        }

        // ⏱️ آلية Polling دورية (كل 10 ثوانٍ) مخصصة لبيئة Android WebView
        // تضمن رصد انقطاع/عودة الإنترنت حتى لو لم يطلق النظام أحداث offline/online
        // الآلية محمية بـ isCheckingRoomsNotice و sequence token لمنع تداخل وفوضى الـ checks
        if (!window.__roomsOfflinePollingBound) {
            window.__roomsOfflinePollingBound = true;
            setInterval(() => {
                if (document.getElementById("rooms-offline-notice") && !isCheckingRoomsNotice) {
                    updateRoomsOfflineNotice();
                }
            }, 10000);
        }
    }

    // 2. تسجيل الـ Service Worker إن كان مدعوماً
    if ("serviceWorker" in navigator) {
        try {
            await navigator.serviceWorker.register("/sw.js");
            console.log("[OfflineManager] ServiceWorker registered.");
        } catch (e) {
            console.warn("[OfflineManager] SW registration error:", e);
        }
    }

    // 3. التحقق الحقيقي من جاهزية الأوفلاين عبر Cache Storage
    const ready = await isOfflineReady();

    if (!ready) {
        // فحص وجود اتصال بالإنترنت
        const hasInternet = await checkRealInternet();
        if (hasInternet) {
            // إنترنت متوفر في الزيارة الأولى: نقوم بتجهيز الكاش بالكامل في الخلفية
            prepareOfflineAssets();
        } else {
            // أول زيارة بدون إنترنت واللعبة غير مجهزة في الكاش: عرض المودال المطلوب
            showFirstTimeOfflineModal();
        }
    } else {
        // اللعبة مجهزة مسبقاً في Cache Storage
        localStorage.setItem(OFFLINE_READY_FLAG, "true");
        if (navigator.onLine) {
            prepareOfflineAssets().catch(() => {});
        }
    }
}

// إتاحة الدوال على كائن window للتكامل السلس دون استيراد معقد
if (typeof window !== "undefined") {
    window.isOfflineReady = isOfflineReady;
    window.checkRealInternet = checkRealInternet;
    window.showFirstTimeOfflineModal = showFirstTimeOfflineModal;
    window.updateRoomsOfflineNotice = updateRoomsOfflineNotice;
    window.showOnlineRequiredAlert = showOnlineRequiredAlert;
    window.hideAlertModal = hideAlertModal;
    window.canAccessOnlineFeature = canAccessOnlineFeature;
    window.guardOnlinePage = guardOnlinePage;
    window.setupRoomsClickGuard = setupRoomsClickGuard;
}

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initOfflineManager);
    } else {
        initOfflineManager();
    }
}
