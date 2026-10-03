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
            return 1000;
        }

        if (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) {
            return 1000;
        }
    } catch (e) {}

    return 1000;
}

let isNavigating = false;
let transitionOverlay = null;
let viewportNavigationToken = 0;

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

    // إذا كانت الصفحة داخل الـpersistent iframe، لا تُنشئ Transition خاصًا بها.
    // النافذة الحاضنة هي المالكة الوحيدة للـoverlay والتنقل، لمنع تداخل انتقالين.
    if (isInsideCourtViewport()) {
        window.cinematicNavigate = function (url) {
            if (!url || isNavigating) return;
            if (url === window.location.href || url === window.location.pathname) return;

            try {
                if (
                    window.parent &&
                    window.parent !== window &&
                    typeof window.parent.cinematicNavigate === "function"
                ) {
                    window.parent.cinematicNavigate(url);
                    return;
                }
            } catch (e) {}

            window.location.href = url;
        };

        return;
    }

    // استثناء صفحة اللوبي لأن لها شاشة تحميل سينمائية مخصصة خاصة بها
    // (4 ثوانٍ مع مؤشرات التقدم والعبارات)
    const isLobbyPage = window.location.pathname.includes("lobby.html");

    if (isLobbyPage) {
        sessionStorage.removeItem("court_page_transitioning");

        window.cinematicNavigate = function (url) {
            if (!url || isNavigating) return;
            if (url === window.location.href || url === window.location.pathname) return;

            isNavigating = true;
            launchSeamlessViewport(url, url.includes("lobby.html"));
            isNavigating = false;
        };

        return;
    }

    if (document.getElementById("cinematic-page-transition-overlay")) {
        return;
    }

    // 1. إنشاء طبقة التلاشي السينمائي في أعلى شجرة DOM
    // مع الشعار القضائي المذهب والهالة الضوئية
    transitionOverlay = document.createElement("div");
    transitionOverlay.id = "cinematic-page-transition-overlay";
    transitionOverlay.className = "cinematic-transition-overlay";

    transitionOverlay.innerHTML = `
        <div class="cinematic-transition-emblem">
            <div class="transition-emblem-halo"></div>

            <div class="transition-emblem-icon">
                <svg
                    viewBox="0 0 24 24"
                    width="44"
                    height="44"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
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

    // 2. تطبيق تأثير التلاشي التدريجي لدخول الصفحة
    document.body.classList.add("cinematic-fade-ready");

    // 3. تماسك الدخول بعد أي Navigation خارجي قد ترك علامة في sessionStorage.
    if (sessionStorage.getItem("court_page_transitioning") === "1") {
        sessionStorage.removeItem("court_page_transitioning");

        transitionOverlay.classList.add("is-exiting");

        waitForVisualReady(() => {
            if (transitionOverlay) {
                transitionOverlay.classList.remove("is-exiting");
            }
        }, getTransitionDuration());
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

        sessionStorage.setItem("court_page_transitioning", "1");

        // النافذة الرئيسية هي المالك الوحيد للـiframe والـtransition.
        launchSeamlessViewport(url, isTargetingLobby);

        isNavigating = false;
    };

    // 5. التقاط كافة نقرات الروابط الداخلية (<a>)
    // وتطبيق الانتقال السينمائي
    document.addEventListener(
        "click",
        function (e) {
            if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;

            const anchor = e.target.closest("a");
            if (!anchor) return;

            if (anchor.dataset.offlineLocked === "true" || anchor.classList.contains("btn-offline-locked")) {
                e.preventDefault();
                return;
            }

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

            if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
                return;
            }

            try {
                const targetUrl = new URL(anchor.href, window.location.href);

                if (targetUrl.origin !== window.location.origin) {
                    return;
                }
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
    window.addEventListener("popstate", () => {
        const frame = document.getElementById("court-app-viewport");

        if (frame && frame.contentWindow) {
            sessionStorage.setItem("court_page_transitioning", "1");
            launchSeamlessViewport(window.location.href, false);
        }
    });
}

function waitForVisualReady(callback, minimumDelay = 0) {
    const startedAt = performance.now();

    const finish = async () => {
        try {
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }
        } catch (e) {}

        await new Promise((resolve) => {
            requestAnimationFrame(() => resolve());
        });

        await new Promise((resolve) => {
            requestAnimationFrame(() => resolve());
        });

        const remaining = Math.max(0, minimumDelay - (performance.now() - startedAt));

        if (remaining > 0) {
            await new Promise((resolve) => {
                setTimeout(resolve, remaining);
            });

            await new Promise((resolve) => {
                requestAnimationFrame(() => resolve());
            });
        }

        callback();
    };

    void finish();
}

// إشعار الوحدات الأخرى بتغيّر حالة الـiframe viewport (إنشاء/إزالة) دون معرفة من يستمع
function notifyViewportChange() {
    try {
        window.dispatchEvent(new CustomEvent("court-viewport-change"));
    } catch (e) {}
}

// إزالة الـiframe viewport والعودة لعرض الصفحة الحاضنة، مع إشعار تغيّر الحالة
export function closeSeamlessViewport() {
    const frame = document.getElementById("court-app-viewport");
    if (!frame) return;

    viewportNavigationToken++;
    frame.__courtPendingNavigation = null;
    frame.remove();

    sessionStorage.removeItem("court_page_transitioning");

    if (transitionOverlay) {
        transitionOverlay.classList.remove("is-exiting");
    }

    notifyViewportChange();
}

// تشغيل إطار العرض السينمائي الكامل لضمان استمرار البث الصوتي
// بنفس الـ Audio Instance.
//
// الـiframe يحمل المحتوى تحت Overlay واحد ثابت،
// ثم يُكشف بعد اكتمال التحميل والـpaint.
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
            opacity: 1;
            transition: none;
        `;

        document.body.appendChild(frame);

        // إشعار فقط: الـviewport أصبح موجوداً (ملكية القارئ تُدار في tts.js)
        notifyViewportChange();

        frame.addEventListener("load", () => {
            const pending = frame.__courtPendingNavigation;

            if (!pending || pending.token !== viewportNavigationToken) {
                return;
            }

            if (pending.skipTransition) {
                sessionStorage.removeItem("court_page_transitioning");

                if (transitionOverlay) {
                    transitionOverlay.classList.remove("is-exiting");
                }

                return;
            }

            // لا نزيل الغطاء إلا بعد أن تكون الصفحة الجديدة
            // والـfonts قد استقرت وتم رسمها.
            const reveal = () => {
                if (pending.token !== viewportNavigationToken) {
                    return;
                }

                sessionStorage.removeItem("court_page_transitioning");

                if (transitionOverlay) {
                    transitionOverlay.classList.remove("is-exiting");
                }

                try {
                    if (frame.contentWindow && frame.contentWindow.location) {
                        const pathname = frame.contentWindow.location.pathname;

                        const search = frame.contentWindow.location.search;

                        window.history.replaceState(null, "", pathname + search);

                        if (frame.contentDocument?.title) {
                            document.title = frame.contentDocument.title;
                        }
                    }
                } catch (e) {}
            };

            try {
                const doc = frame.contentDocument;

                const fontsReady = doc?.fonts?.ready || Promise.resolve();

                Promise.resolve(fontsReady)
                    .catch(() => {})
                    .then(() => {
                        try {
                            frame.contentWindow.requestAnimationFrame(() => {
                                frame.contentWindow.requestAnimationFrame(() => {
                                    const elapsed = performance.now() - pending.startedAt;

                                    const remaining = Math.max(0, getTransitionDuration() - elapsed);

                                    if (remaining > 0) {
                                        setTimeout(reveal, remaining);
                                    } else {
                                        reveal();
                                    }
                                });
                            });
                        } catch (e) {
                            waitForVisualReady(
                                reveal,
                                Math.max(0, getTransitionDuration() - (performance.now() - pending.startedAt))
                            );
                        }
                    });
            } catch (e) {
                waitForVisualReady(
                    reveal,
                    Math.max(0, getTransitionDuration() - (performance.now() - pending.startedAt))
                );
            }
        });
    }

    const token = ++viewportNavigationToken;

    frame.__courtPendingNavigation = {
        token,
        startedAt: performance.now(),
        skipTransition
    };

    if (transitionOverlay && !skipTransition) {
        // اجعل الغطاء فوق الـiframe،
        // وليس في نفس مستوى الـz-index.
        transitionOverlay.style.zIndex = "2147483647";

        transitionOverlay.classList.add("is-exiting");
    } else if (transitionOverlay) {
        transitionOverlay.classList.remove("is-exiting");
    }

    // ابدأ تحميل الصفحة فورًا خلف الغطاء؛
    // لا ننتظر ثانية قبل بدء الـnetwork/load.
    frame.src = targetUrl;
}

// تفعيل تلقائي عند اكتمال جاهزية الصفحة
if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCinematicTransitions);
    } else {
        initCinematicTransitions();
    }
}
