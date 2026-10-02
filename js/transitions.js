// ==========================================================================
// 🎬 js/transitions.js
// محرك الانتقال السينمائي المتناغم بين صفحات اللعبة (Cinematic Page Transitions)
// - تأثير تلاشي تدريجي سينمائي (Fade-In / Fade-Out) عند التنقل
// - حماية الـ Audio Instance الموحد من الانقطاع عند الانتقال بين الصفحات
// - الحفاظ الكامل على دورة حياة JavaScript لكل صفحة دون أي تضارب
// ==========================================================================

import { getPersistentAudioHost } from "./radio.js";

const TRANSITION_DURATION_MS = 320;
let isNavigating = false;
let transitionOverlay = null;

function isInsideCourtViewport() {
    try {
        const host = getPersistentAudioHost();
        return !!(host && host !== window);
    } catch (e) {
        return false;
    }
}

export function initCinematicTransitions() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    if (document.getElementById("cinematic-page-transition-overlay")) {
        return;
    }

    // 1. إنشاء طبقة التلاشي السينمائي في أعلى شجرة DOM
    transitionOverlay = document.createElement("div");
    transitionOverlay.id = "cinematic-page-transition-overlay";
    transitionOverlay.className = "cinematic-transition-overlay";
    document.body.appendChild(transitionOverlay);

    // 2. تطبيق تأثير التلاشي التدريجي لدخول الصفحة (Fade-In)
    document.body.classList.add("cinematic-fade-ready");

    // 3. دالة الانتقال السينمائي الموحدة للمشروع
    window.cinematicNavigate = function (url) {
        if (!url || isNavigating) return;

        // منع الانتقال إذا كان الرابط هو نفس الصفحة الحالية
        if (url === window.location.href || url === window.location.pathname) {
            return;
        }

        isNavigating = true;

        // الحالة أ: داخل إطار العرض السينمائي (التنقل الداخلي مع بقاء الصوت حياً في النافذة الأصلية)
        if (isInsideCourtViewport()) {
            if (transitionOverlay) {
                transitionOverlay.classList.add("is-exiting");
                setTimeout(() => {
                    window.location.href = url;
                }, TRANSITION_DURATION_MS);
            } else {
                window.location.href = url;
            }
            return;
        }

        // الحالة ب: في النافذة الرئيسية (إطلاق إطار العرض السينمائي لمنع تفريغ الصفحة وحماية نفس الـ Audio Instance)
        launchSeamlessViewport(url);
        isNavigating = false;
    };

    // 4. التقاط كافة نقرات الروابط الداخلية (<a>) وتطبيق الانتقال السينمائي
    document.addEventListener(
        "click",
        function (e) {
            if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;

            const anchor = e.target.closest("a");
            if (!anchor) return;

            const href = anchor.getAttribute("href");
            if (
                !href ||
                href === "#" ||
                href.startsWith("#") ||
                href.startsWith("javascript:") ||
                href.startsWith("mailto:") ||
                href.startsWith("tel:")
            ) {
                return;
            }

            if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

            try {
                const targetUrl = new URL(anchor.href, window.location.href);
                if (targetUrl.origin !== window.location.origin) return;
            } catch (err) {
                return;
            }

            e.preventDefault();
            window.cinematicNavigate(anchor.href);
        },
        true
    );

    // 5. استعادة الصفحة بسلاسة عند استخدام أزرار التقديم/الترجيع بالمتصفح
    window.addEventListener("pageshow", function () {
        isNavigating = false;
        if (transitionOverlay) {
            transitionOverlay.classList.remove("is-exiting");
        }
    });

    // مزامنة أزرار المتصفح مع إطار العرض في النافذة الحاضنة
    if (!isInsideCourtViewport()) {
        window.addEventListener("popstate", () => {
            const frame = document.getElementById("court-app-viewport");
            if (frame && frame.contentWindow) {
                frame.contentWindow.location.href = window.location.href;
            }
        });
    }
}

// تشغيل إطار العرض السينمائي الكامل لضمان استمرار البث الصوتي بنفس الـ Audio Instance
function launchSeamlessViewport(targetUrl) {
    let frame = document.getElementById("court-app-viewport");

    if (!frame) {
        frame = document.createElement("iframe");
        frame.id = "court-app-viewport";
        frame.name = "court-app-viewport";
        frame.setAttribute("allow", "autoplay; microphone");
        frame.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            height: 100dvh;
            border: none;
            margin: 0;
            padding: 0;
            z-index: 2147483000;
            background: #050a12;
            opacity: 0;
            transition: opacity 0.28s ease;
        `;
        document.body.appendChild(frame);

        frame.onload = () => {
            frame.style.opacity = "1";
            try {
                if (frame.contentWindow && frame.contentWindow.location) {
                    const pathname = frame.contentWindow.location.pathname;
                    const search = frame.contentWindow.location.search;
                    window.history.replaceState(null, "", pathname + search);
                    if (frame.contentDocument && frame.contentDocument.title) {
                        document.title = frame.contentDocument.title;
                    }
                }
            } catch (e) {}
        };
    }

    if (transitionOverlay) {
        transitionOverlay.classList.add("is-exiting");
        setTimeout(() => {
            frame.src = targetUrl;
            setTimeout(() => {
                transitionOverlay.classList.remove("is-exiting");
            }, 60);
        }, TRANSITION_DURATION_MS);
    } else {
        frame.src = targetUrl;
    }
}

// تفعيل تلقائي عند اكتمال جاهزية الصفحة
if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCinematicTransitions);
    } else {
        initCinematicTransitions();
    }
}
