// ==========================================================================
// 🛡️ Service Worker - محكمة الأدوار (Judgment Offline Mode)
// ==========================================================================

// ⚠️ لازم يتطابق مع CACHE_NAME في js/offline-manager.js
// غيّر الرقم (v2 → v3 ...) كل ما تعدّل ملفات اللعبة عشان يتحدّث الكاش عند المستخدمين
const CACHE_NAME = "judgment-cache-v3";

// قائمة الملفات الأساسية والضرورية لتشغيل اللعبة أوفلاين بالكامل
const ESSENTIAL_ASSETS = [
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
    "/web-app-manifest-192x192.png",
    "/web-app-manifest-512x512.png",
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
    // نسخ مكتبات Firebase من الـ CDN حتى لا يتعطل استيراد app.js عند غياب الإنترنت
    "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js",
    "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js"
];

// مهلة انتظار الشبكة قبل السقوط على الكاش (للملفات اللي لازم تكون أحدث نسخة)
const NETWORK_TIMEOUT_MS = 4000;

// تثبيت الـ Service Worker والتخزين المسبق للأصول
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log("[SW] Pre-caching essential assets for offline mode...");
            // نستخدم Promise.allSettled حتى لو تعثر أصل فرعي لا يفشل التثبيت بالكامل
            const results = await Promise.allSettled(
                ESSENTIAL_ASSETS.map((url) =>
                    fetch(url, { cache: "reload" }).then((response) => {
                        if (!response.ok) {
                            throw new Error(`Failed to fetch ${url} (status: ${response.status})`);
                        }
                        return cache.put(url, response);
                    })
                )
            );

            const fulfilledCount = results.filter((r) => r.status === "fulfilled").length;
            console.log(`[SW] Pre-cached ${fulfilledCount}/${ESSENTIAL_ASSETS.length} assets.`);
            return self.skipWaiting();
        })
    );
});

// تفعيل وتنظيف الكاش القديم
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => {
                return Promise.all(
                    keys.map((key) => {
                        if (key !== CACHE_NAME) {
                            console.log("[SW] Removing old cache:", key);
                            return caches.delete(key);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// ---------- دوال مساعدة ----------

// الشبكة أولاً مع تحديث الكاش بالنسخة الجديدة، وإن فشلت أو تأخرت نرجع للكاش
function networkFirst(request, cacheKey, fallbackFn) {
    return new Promise((resolve) => {
        let settled = false;
        const done = (res) => {
            if (!settled) {
                settled = true;
                resolve(res);
            }
        };

        const fromCache = async () => {
            const cache = await caches.open(CACHE_NAME);
            const hit = (await cache.match(cacheKey, { ignoreSearch: true })) || (await cache.match(request));
            if (hit) return hit;
            return fallbackFn ? fallbackFn(cache) : null;
        };

        const timer = setTimeout(async () => {
            const cached = await fromCache();
            if (cached) done(cached);
        }, NETWORK_TIMEOUT_MS);

        fetch(request)
            .then((response) => {
                clearTimeout(timer);
                if (response && response.status === 200 && response.type === "basic") {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, copy));
                }
                done(response);
            })
            .catch(async () => {
                clearTimeout(timer);
                const cached = await fromCache();
                done(cached || new Response("Offline", { status: 503, statusText: "Service Unavailable" }));
            });
    });
}

// صفحة بديلة مناسبة لو الصفحة المطلوبة مش مخزنة (تدعم الروابط بدون .html)
async function pageFallback(cache, url) {
    const path = url.pathname;
    const candidates = [];
    if (path === "/" || path === "") candidates.push("/index.html");
    if (!path.endsWith(".html") && path !== "/") candidates.push(path + ".html");
    candidates.push("/rooms.html", "/index.html", "/offline.html");

    for (const candidate of candidates) {
        const hit = await cache.match(candidate);
        if (hit) return hit;
    }
    return null;
}

// اعتراض الطلبات وتقديم النسخ المخبأة أوفلاين
self.addEventListener("fetch", (event) => {
    const request = event.request;

    // لا نعترض طلبات غير GET
    if (request.method !== "GET") return;

    // طلبات الصوت/الفيديو الجزئية (Range) تترك للشبكة مباشرة
    if (request.headers.has("range")) return;

    const url = new URL(request.url);

    // استثناء مسار TTS ومسارات الفيديو الكبيرة الخارجية
    if (url.pathname.startsWith("/api/speak") || url.hostname.includes("res.cloudinary.com")) {
        return;
    }

    const sameOrigin = url.origin === self.location.origin;

    // 1) صفحات HTML (التنقل العادي وداخل الـ iframe): شبكة أولاً + تحديث الكاش + بديل ذكي
    if (request.mode === "navigate") {
        const cacheKey = url.origin + url.pathname;
        event.respondWith(networkFirst(request, cacheKey, (cache) => pageFallback(cache, url)));
        return;
    }

    // 2) كود اللعبة والتنسيقات والبيانات (JS / CSS / JSON): شبكة أولاً عشان أي تعديل يظهر فوراً
    const isAppCode =
        sameOrigin &&
        (request.destination === "script" ||
            request.destination === "style" ||
            url.pathname.endsWith(".js") ||
            url.pathname.endsWith(".css") ||
            url.pathname.endsWith(".json") ||
            url.pathname.endsWith(".webmanifest"));

    if (isAppCode) {
        event.respondWith(networkFirst(request, request.url));
        return;
    }

    // 3) بقية الأصول الثابتة (صور/خطوط/صوت/مكتبات CDN): الكاش أولاً مع التحديث في الخلفية
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // محاولة تحديث الكاش بهدوء إن كان الاتصال متاحاً
                fetch(request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
                            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
                        }
                    })
                    .catch(() => {});
                return cachedResponse;
            }

            return fetch(request).then((networkResponse) => {
                if (
                    networkResponse &&
                    networkResponse.status === 200 &&
                    (networkResponse.type === "basic" || request.url.includes("gstatic.com"))
                ) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
                }
                return networkResponse;
            });
        })
    );
});
