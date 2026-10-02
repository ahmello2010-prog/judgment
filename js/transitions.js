// ==========================================================================
// 🎬 js/transitions.js
// محرك الانتقال السينمائي المتناغم بين صفحات اللعبة (Cinematic Page Transitions)
// - تأثير تلاشي (Fade-In) ناعم عند دخول أي صفحة لتعزيز الشعور السينمائي
// - تأثير تلاشي (Fade-Out) تدريجي إلى السواد عند التنقل بين الشاشات
// - متناغم تماماً مع استمرار الموسيقى التصويرية دون انقطاع
// ==========================================================================

const TRANSITION_DURATION_MS = 320;
let isNavigating = false;
let transitionOverlay = null;

export function initCinematicTransitions() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // تجنب التكرار
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

    // 3. إتاحة الدالة عالمياً لجميع ملفات المشروع للانتقال البرمجي السينمائي
    window.cinematicNavigate = function (url) {
        if (!url || isNavigating) return;

        // منع الانتقال إذا كان الرابط هو نفس الصفحة الحالية مع نفس المعاملات
        if (url === window.location.href || url === window.location.pathname) {
            return;
        }

        isNavigating = true;

        if (transitionOverlay) {
            transitionOverlay.classList.add("is-exiting");
            setTimeout(() => {
                window.location.href = url;
            }, TRANSITION_DURATION_MS);
        } else {
            window.location.href = url;
        }
    };

    // 4. التقاط كافة نقرات الروابط الداخلية (<a>) وتطبيق التلاشي التلقائي
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

            // التأكد من أن الرابط داخلي لنفس التطبيق
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

    // 5. استعادة الصفحة بسلاسة عند استخدام أزرار التقديم/الترجيع بالمتصفح (bfcache)
    window.addEventListener("pageshow", function (event) {
        isNavigating = false;
        if (transitionOverlay) {
            transitionOverlay.classList.remove("is-exiting");
        }
    });
}

// تفعيل تلقائي عند اكتمال جاهزية الصفحة
if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCinematicTransitions);
    } else {
        initCinematicTransitions();
    }
}
