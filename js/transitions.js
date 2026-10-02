// ==========================================================================
// 🎬 js/transitions.js
// محرك الانتقال السينمائي المتناغم بين صفحات اللعبة (Cinematic Page Transitions)
// - تأثير تلاشي تدريجي سينمائي (Fade-In / Fade-Out) بشعار المحكمة المذهب والهالة الضوئية
// - استثناء صفحة lobby.html لأن لها شاشة تحميل سينمائية مخصصة (4 ثوانٍ مع مؤشرات التقدم)
// - حماية الـ Audio Instance الموحد من الانقطاع عند الانتقال بين الصفحات
// ==========================================================================

import { getPersistentAudioHost } from "./radio.js";

function getTransitionDuration() {
    try {
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return 150;
        }
        if (window.matchMedia && window.matchMedia("(max-width: 480px)").matches) {
            return 280;
        }
        if (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) {
            return 320;
        }
    } catch (e) {}
    return 360;
}
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

    // استثناء صفحة اللوبي لأن لها شاشة تحميل سينمائية مخصصة خاصة بها (4 ثوانٍ مع مؤشرات التقدم والعبارات)
    const isLobbyPage = window.location.pathname.includes("lobby.html");
    if (isLobbyPage) {
        sessionStorage.removeItem("court_page_transitioning");
        window.cinematicNavigate = function (url) {
            if (!url || isNavigating) return;
            if (url === window.location.href || url === window.location.pathname) return;

            isNavigating = true;
            const isTargetingLobby = url.includes("lobby.html");
            if (!isTargetingLobby) {
                sessionStorage.setItem("court_page_transitioning", "1");
            }
            if (isInsideCourtViewport()) {
                window.location.href = url;
            } else {
                launchSeamlessViewport(url, isTargetingLobby);
            }
            isNavigating = false;
        };
        return;
    }

    if (document.getElementById("cinematic-page-transition-overlay")) {
        return;
    }

    // 1. إنشاء طبقة التلاشي السينمائي في أعلى شجرة DOM مع الشعار القضائي المذهب
    transitionOverlay = document.createElement("div");
    transitionOverlay.id = "cinematic-page-transition-overlay";
    transitionOverlay.className = "cinematic-transition-overlay";
    transitionOverlay.innerHTML = `
        <div class="cinematic-transition-emblem">
            <div class="transition-emblem-halo"></div>
            <div class="transition-emblem-icon">
                <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
                    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
                    <path d="M7 21h10"></path>
                    <path d="M12 3v18"></path>
                    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"></path>
                </svg>
            </div>
            <div class="transition-flare-line"></div>
        </div>
    `;
    document.body.appendChild(transitionOverlay);

    // 2. تطبيق تأثير التلاشي التدريجي لدخول الصفحة (Fade-In)
    document.body.classList.add("cinematic-fade-ready");

    // 3. تماسك الدخول السينمائي عند الانتقال القادم من صفحة سابقة
    if (sessionStorage.getItem("court_page_transitioning") === "1") {
        sessionStorage.removeItem("court_page_transitioning");
        transitionOverlay.classList.add("is-exiting");
        requestAnimationFrame(() => {
            setTimeout(() => {
                transitionOverlay.classList.remove("is-exiting");
            }, 50);
        });
    }

    // 4. دالة الانتقال السينمائي الموحدة للمشروع
    window.cinematicNavigate = function (url) {
        if (!url || isNavigating) return;

        // منع الانتقال إذا كان الرابط هو نفس الصفحة الحالية
        if (url === window.location.href || url === window.location.pathname) {
            return;
        }

        isNavigating = true;

        const isTargetingLobby = url.includes("lobby.html");
        if (!isTargetingLobby) {
            sessionStorage.setItem("court_page_transitioning", "1");
        } else {
            sessionStorage.removeItem("court_page_transitioning");
        }

        // الحالة أ: داخل إطار العرض السينمائي (التنقل الداخلي مع بقاء الصوت حياً في النافذة الأصلية)
        if (isInsideCourtViewport()) {
            if (isTargetingLobby) {
                // استثناء مباشر: الانتقال فوراً لصفحة اللوبي لتبدأ شاشة التحميل المخصصة الخاصة بها فوراً دون تداخل
                window.location.href = url;
                return;
            }

            if (transitionOverlay) {
                transitionOverlay.classList.add("is-exiting");
                setTimeout(() => {
                    window.location.href = url;
                }, getTransitionDuration());
            } else {
                window.location.href = url;
            }
            return;
        }

        // الحالة ب: في النافذة الرئيسية (إطلاق إطار العرض السينمائي لمنع تفريغ الصفحة وحماية نفس الـ Audio Instance)
        launchSeamlessViewport(url, isTargetingLobby);
        isNavigating = false;
    };

    // 5. التقاط كافة نقرات الروابط الداخلية (<a>) وتطبيق الانتقال السينمائي
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

    // 6. استعادة الصفحة بسلاسة عند استخدام أزرار التقديم/الترجيع بالمتصفح
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
function launchSeamlessViewport(targetUrl, skipTransition = false) {
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

    if (!skipTransition && transitionOverlay) {
        transitionOverlay.classList.add("is-exiting");
        setTimeout(() => {
            frame.src = targetUrl;
            setTimeout(() => {
                transitionOverlay.classList.remove("is-exiting");
            }, 60);
        }, getTransitionDuration());
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
