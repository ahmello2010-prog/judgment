// ==========================================================================
// 🛡️ Service Worker - محكمة الأدوار (Judgment Offline Mode)
// ==========================================================================

const CACHE_NAME = "judgment-cache-v1";

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

// اعتراض الطلبات وتقديم النسخ المخبأة أوفلاين
self.addEventListener("fetch", (event) => {
    const request = event.request;

    // لا نعترض طلبات غير GET
    if (request.method !== "GET") return;

    const url = new URL(request.url);

    // استثناء مسار TTS ومسارات الفيديو الكبيرة الخارجية
    if (url.pathname.startsWith("/api/speak") || url.hostname.includes("res.cloudinary.com")) {
        return;
    }

    // لطلبات التنقل بين الصفحات (HTML navigation)
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).catch(async () => {
                const cache = await caches.open(CACHE_NAME);
                const cachedPage = await cache.match(request);
                if (cachedPage) return cachedPage;

                // إذا طلب صفحة غير مخبأة وهو أوفلاين، نوجهه لـ rooms.html أو offline.html
                const fallback =
                    (await cache.match("/offline.html")) ||
                    (await cache.match("/rooms.html")) ||
                    (await cache.match("/index.html"));
                return fallback || new Response("Offline", { status: 503, statusText: "Service Unavailable" });
            })
        );
        return;
    }

    // لبقية الأصول الثابتة: Cache First مع التحديث في الخلفية أو السقوط على الشبكة
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
