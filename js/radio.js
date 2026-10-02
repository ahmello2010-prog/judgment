// ==========================================================================
// 📻 js/radio.js — مشغل راديو محكمة الأدوار (Courtroom Radio Player)
// - إلغاء الساوند تراك التلقائي والزر العائم الخارجي
// - مشغل راديو تفاعلي أنيق يتم فتحه من القائمة الجانبية (Sidebar)
// - اختيار المحطات وضبط مستوى الصوت وتأثيرات الأمواج الصوتية
// - استمرار البث بسلاسة بين الصفحات فقط إذا قام اللاعب بتشغيله
// ==========================================================================

import "./transitions.js";

const RADIO_STATIONS = [
    {
        id: "classic_court",
        name: "إذاعة محكمة الأدوار",
        freq: "98.4 FM",
        desc: "الموسيقى الكلاسيكية الغامضة لجلسات التحقيق",
        src: "https://res.cloudinary.com/x7aizl6a/video/upload/v1790947465/radio.mp4"
    },
    {
        id: "defense_plea",
        name: "إذاعة مرافعة الدفاع",
        freq: "91.0 FM",
        desc: "أنغام التحقيق الهادئة ومراجعة الأدلة",
        src: "https://res.cloudinary.com/x7aizl6a/video/upload/v1790949041/radiooo.mp4"
    },
    {
        id: "court_tension",
        name: "موسيقى محكمة الأدوار",
        freq: "104.2 FM",
        desc: "نغمات التشويق والترقب في قاعة المحاكمة",
        src: "https://res.cloudinary.com/x7aizl6a/video/upload/v1790947454/radioo.mp3"
    }
];

const STORAGE_POWER_KEY = "court_radio_power";
const STORAGE_STATION_KEY = "court_radio_station";
const STORAGE_VOLUME_KEY = "court_radio_volume";
const STORAGE_TIME_KEY = "court_radio_time";

let radioAudio = null;
let currentStationIndex = 0;
let isRadioPowerOn = false;
let currentVolume = 0.5;

export function initCourtRadio() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // منع التكرار
    if (document.getElementById("court-radio-modal")) {
        attachSidebarButton();
        return;
    }

    // 1. استعادة الإعدادات المخزنة
    const savedPower = localStorage.getItem(STORAGE_POWER_KEY);
    isRadioPowerOn = savedPower === "on";

    const savedStation = parseInt(localStorage.getItem(STORAGE_STATION_KEY) || "0", 10);
    currentStationIndex =
        isNaN(savedStation) || savedStation < 0 || savedStation >= RADIO_STATIONS.length ? 0 : savedStation;

    const savedVol = parseFloat(localStorage.getItem(STORAGE_VOLUME_KEY) || "0.5");
    currentVolume = isNaN(savedVol) ? 0.5 : Math.max(0, Math.min(1, savedVol));

    // 2. تهيئة عنصر الصوت المشترك للراديو
    radioAudio = document.getElementById("courtroom-radio-audio");
    if (!radioAudio) {
        radioAudio = document.createElement("audio");
        radioAudio.id = "courtroom-radio-audio";
        radioAudio.loop = true;
        radioAudio.preload = "auto";
        radioAudio.style.display = "none";
        document.body.appendChild(radioAudio);
    }

    radioAudio.src = RADIO_STATIONS[currentStationIndex].src;
    radioAudio.volume = currentVolume;

    // استعادة موضع البث إذا كان الراديو مشغلاً مسبقاً
    if (isRadioPowerOn) {
        const savedTime = parseFloat(sessionStorage.getItem(STORAGE_TIME_KEY) || "0");
        if (savedTime && !isNaN(savedTime) && savedTime > 0) {
            radioAudio.currentTime = savedTime;
        }
    }

    // حفظ موضع البث بصورة مستمرة إذا كان الراديو يعمل
    radioAudio.addEventListener("timeupdate", () => {
        if (isRadioPowerOn && radioAudio) {
            sessionStorage.setItem(STORAGE_TIME_KEY, String(radioAudio.currentTime));
        }
    });

    window.addEventListener("beforeunload", () => {
        if (radioAudio && isRadioPowerOn) {
            sessionStorage.setItem(STORAGE_TIME_KEY, String(radioAudio.currentTime));
        }
    });
    window.addEventListener("pagehide", () => {
        if (radioAudio && isRadioPowerOn) {
            sessionStorage.setItem(STORAGE_TIME_KEY, String(radioAudio.currentTime));
        }
    });

    // 3. بناء واجهة مشغل الراديو (Modal UI)
    buildRadioModal();

    // 4. ربط الزر في القائمة الجانبية
    attachSidebarButton();

    // تشغيل الراديو إن كان مفعلاً من قبل اللاعب
    if (isRadioPowerOn) {
        playRadio();
    } else {
        updateRadioUI();
    }
}

function buildRadioModal() {
    const modal = document.createElement("div");
    modal.id = "court-radio-modal";
    modal.className = "court-radio-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
        <div class="court-radio-chassis" role="dialog" aria-modal="true" aria-labelledby="radio-chassis-title">
            <div class="radio-header">
                <div class="radio-header-brand">
                    <span class="radio-brand-icon">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M16 3l-4.5 4"></path>
                            <circle cx="17" cy="14" r="2"></circle>
                            <line x1="6" y1="12" x2="10" y2="12"></line>
                            <line x1="6" y1="16" x2="10" y2="16"></line>
                        </svg>
                    </span>
                    <h3 id="radio-chassis-title" class="radio-brand-title">راديو محكمة الأدوار</h3>
                </div>
                <button type="button" id="btn-radio-close" class="radio-close-btn" aria-label="إغلاق مشغل الراديو">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <!-- شاشة التردد الرقمية LCD المصغرة -->
            <div class="radio-lcd-screen">
                <div class="radio-lcd-top">
                    <span id="radio-freq-display" class="radio-freq-badge">98.4 FM</span>
                    <span id="radio-onair-badge" class="radio-onair-badge is-off">وضع الاستعداد</span>
                </div>
                <div id="radio-station-title" class="radio-station-title">إذاعة محكمة الأدوار</div>

                <!-- مؤشر الأمواج الصوتية -->
                <div id="radio-wave-visualizer" class="radio-wave-bars">
                    <span class="r-bar r-bar-1"></span>
                    <span class="r-bar r-bar-2"></span>
                    <span class="r-bar r-bar-3"></span>
                    <span class="r-bar r-bar-4"></span>
                    <span class="r-bar r-bar-5"></span>
                    <span class="r-bar r-bar-6"></span>
                    <span class="r-bar r-bar-7"></span>
                    <span class="r-bar r-bar-8"></span>
                </div>
            </div>

            <!-- قائمة المحطات الإذاعية المدمجة -->
            <div class="radio-stations-list">
                <div class="radio-section-label">المحطات المتاحة:</div>
                <div id="radio-stations-container" class="radio-stations-grid"></div>
            </div>

            <!-- لوحة التحكم السفلية المدمجة -->
            <div class="radio-controls-strip">
                <div class="radio-playback-controls">
                    <button type="button" id="btn-radio-prev" class="radio-ctrl-btn" title="المحطة السابقة" aria-label="المحطة السابقة">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <polygon points="19 20 9 12 19 4 19 20"></polygon>
                            <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></line>
                        </svg>
                    </button>
                    <button type="button" id="btn-radio-power" class="radio-power-btn is-off" title="تشغيل / إيقاف الراديو" aria-label="تشغيل / إيقاف الراديو">
                        <svg class="r-power-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                            <line x1="12" y1="2" x2="12" y2="12"></line>
                        </svg>
                    </button>
                    <button type="button" id="btn-radio-next" class="radio-ctrl-btn" title="المحطة التالية" aria-label="المحطة التالية">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <polygon points="5 4 15 12 5 20 5 4"></polygon>
                            <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></line>
                        </svg>
                    </button>
                </div>

                <div class="radio-volume-control">
                    <span id="radio-vol-icon" class="radio-vol-icon">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon>
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        </svg>
                    </span>
                    <input type="range" id="radio-volume-slider" min="0" max="1" step="0.05" value="${currentVolume}" class="radio-vol-slider" aria-label="مستوى الصوت">
                    <span id="radio-vol-percent" class="radio-vol-percent">${Math.round(currentVolume * 100)}%</span>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // ربط المحطات داخل القائمة بشكل سطر مدمج أنيق
    const stationsContainer = modal.querySelector("#radio-stations-container");
    if (stationsContainer) {
        stationsContainer.innerHTML = RADIO_STATIONS.map(
            (st, idx) => `
            <button type="button" class="radio-station-card ${idx === currentStationIndex ? "is-active" : ""}" data-station-idx="${idx}">
                <span class="station-card-freq">${st.freq}</span>
                <span class="station-card-name">${st.name}</span>
                <span class="station-card-active-dot"></span>
            </button>
        `
        ).join("");

        stationsContainer.addEventListener("click", (e) => {
            const card = e.target.closest(".radio-station-card");
            if (!card) return;
            const idx = parseInt(card.dataset.stationIdx, 10);
            if (!isNaN(idx)) {
                switchStation(idx);
            }
        });
    }

    // زر الإغلاق
    modal.querySelector("#btn-radio-close").addEventListener("click", closeRadioModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeRadioModal();
        }
    });

    // زر التشغيل والإيقاف الرئيسي
    modal.querySelector("#btn-radio-power").addEventListener("click", toggleRadioPower);

    // أزرار التالي والسابق
    modal.querySelector("#btn-radio-prev").addEventListener("click", () => {
        const nextIdx = (currentStationIndex - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length;
        switchStation(nextIdx);
    });
    modal.querySelector("#btn-radio-next").addEventListener("click", () => {
        const nextIdx = (currentStationIndex + 1) % RADIO_STATIONS.length;
        switchStation(nextIdx);
    });

    // شريط الصوت
    const volSlider = modal.querySelector("#radio-volume-slider");
    const volPercent = modal.querySelector("#radio-vol-percent");
    const volIcon = modal.querySelector("#radio-vol-icon");
    if (volSlider) {
        volSlider.addEventListener("input", (e) => {
            const val = parseFloat(e.target.value);
            currentVolume = val;
            if (radioAudio) radioAudio.volume = val;
            localStorage.setItem(STORAGE_VOLUME_KEY, String(val));
            if (volPercent) volPercent.textContent = `${Math.round(val * 100)}%`;
            if (volIcon) {
                if (val === 0) {
                    volIcon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
                } else if (val < 0.5) {
                    volIcon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
                } else {
                    volIcon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`;
                }
            }
        });
    }
}

export function openRadioModal() {
    const modal = document.getElementById("court-radio-modal");
    if (!modal) {
        buildRadioModal();
    }
    const targetModal = document.getElementById("court-radio-modal");
    if (targetModal) {
        targetModal.style.display = "flex";
        updateRadioUI();
    }
}

export function closeRadioModal() {
    const modal = document.getElementById("court-radio-modal");
    if (modal) {
        modal.style.display = "none";
    }
}

function switchStation(index) {
    if (index === currentStationIndex && isRadioPowerOn) return;
    currentStationIndex = index;
    localStorage.setItem(STORAGE_STATION_KEY, String(currentStationIndex));

    if (radioAudio) {
        radioAudio.src = RADIO_STATIONS[currentStationIndex].src;
        radioAudio.currentTime = 0;
        sessionStorage.setItem(STORAGE_TIME_KEY, "0");
        if (isRadioPowerOn) {
            playRadio();
        }
    }
    updateRadioUI();
}

async function playRadio() {
    if (!radioAudio) return;
    isRadioPowerOn = true;
    localStorage.setItem(STORAGE_POWER_KEY, "on");

    try {
        await radioAudio.play();
    } catch (err) {
        // إذا كان المتصفح يتطلب لمسة/نقرة أولى
        const onFirstTouch = () => {
            if (isRadioPowerOn && radioAudio) radioAudio.play().catch(() => {});
            window.removeEventListener("click", onFirstTouch);
            window.removeEventListener("touchstart", onFirstTouch);
        };
        window.addEventListener("click", onFirstTouch, { once: true });
    }
    updateRadioUI();
}

function stopRadio() {
    isRadioPowerOn = false;
    localStorage.setItem(STORAGE_POWER_KEY, "off");
    if (radioAudio) {
        radioAudio.pause();
    }
    updateRadioUI();
}

function toggleRadioPower() {
    if (isRadioPowerOn) {
        stopRadio();
    } else {
        playRadio();
    }
}

function updateRadioUI() {
    const modal = document.getElementById("court-radio-modal");
    const st = RADIO_STATIONS[currentStationIndex];

    if (modal) {
        // تحديث التردد واسم المحطة
        const freqDisp = modal.querySelector("#radio-freq-display");
        const titleDisp = modal.querySelector("#radio-station-title");
        const descDisp = modal.querySelector("#radio-station-desc");
        const onairBadge = modal.querySelector("#radio-onair-badge");
        const waveVis = modal.querySelector("#radio-wave-visualizer");
        const powerBtn = modal.querySelector("#btn-radio-power");

        if (freqDisp) freqDisp.textContent = st.freq;
        if (titleDisp) titleDisp.textContent = st.name;
        if (descDisp) descDisp.textContent = st.desc;

        if (onairBadge) {
            if (isRadioPowerOn) {
                onairBadge.className = "radio-onair-badge is-on";
                onairBadge.textContent = "مباشر";
            } else {
                onairBadge.className = "radio-onair-badge is-off";
                onairBadge.textContent = "وضع الاستعداد";
            }
        }

        if (waveVis) {
            waveVis.classList.toggle("is-active", isRadioPowerOn);
        }

        if (powerBtn) {
            powerBtn.classList.toggle("is-on", isRadioPowerOn);
            powerBtn.classList.toggle("is-off", !isRadioPowerOn);
        }

        // تحديث البطاقات
        modal.querySelectorAll(".radio-station-card").forEach((c, idx) => {
            c.classList.toggle("is-active", idx === currentStationIndex);
        });
    }

    // تحديث الشارة في القائمة الجانبية
    const sidebarTag = document.getElementById("sidebar-radio-tag");
    const sidebarBtn = document.getElementById("btn-sidebar-radio");
    if (sidebarTag) {
        if (isRadioPowerOn) {
            sidebarTag.textContent = "يعمل";
            sidebarTag.className = "radio-status-tag is-playing";
        } else {
            sidebarTag.textContent = "إيقاف";
            sidebarTag.className = "radio-status-tag is-stopped";
        }
    }
    if (sidebarBtn) {
        sidebarBtn.classList.toggle("radio-is-playing", isRadioPowerOn);
    }
}

export function attachSidebarButton() {
    const sidebars = document.querySelectorAll("#sidebar-drawer .sidebar-content");
    sidebars.forEach((content) => {
        let btn = content.querySelector("#btn-sidebar-radio");
        if (!btn) {
            btn = document.createElement("button");
            btn.id = "btn-sidebar-radio";
            btn.className = "sidebar-link btn-sidebar-radio";
            btn.type = "button";
            btn.innerHTML = `
                <span class="sidebar-radio-title">
                    <span class="sidebar-radio-icon">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M16 3l-4.5 4"></path>
                            <circle cx="17" cy="14" r="2"></circle>
                            <line x1="6" y1="12" x2="10" y2="12"></line>
                            <line x1="6" y1="16" x2="10" y2="16"></line>
                        </svg>
                    </span>
                    <span>مشغل الراديو</span>
                </span>
                <span id="sidebar-radio-tag" class="radio-status-tag ${isRadioPowerOn ? "is-playing" : "is-stopped"}">
                    ${isRadioPowerOn ? "يعمل" : "إيقاف"}
                </span>
            `;

            // إدراجه قبل أو بعد روابط القائمة
            content.appendChild(btn);
        }

        // ربط حدث النقر لفتح الراديو وإغلاق القائمة الجانبية
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const drawer = document.getElementById("sidebar-drawer");
            if (drawer) {
                drawer.classList.remove("sidebar-drawer-active");
            }
            openRadioModal();
        };
    });
    updateRadioUI();
}

// تشغيل ذاتي عند تحميل الصفحة
if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCourtRadio);
    } else {
        initCourtRadio();
    }
}
