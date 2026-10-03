// ==========================================================================
// 📻 js/radio.js — مشغل راديو محكمة الأدوار الشامل (Persistent Global Radio)
// - كائن صوتي واحد دائم (Single Audio Instance) يعمل باستمرار طوال الجلسة
// - لا يتم تدمير أو إعادة إنشاء الصوت عند التنقل بين صفحات الموقع
// - بدون إعادة تشغيل أو فجوات زمنية أو اعتماد على currentTime
// ==========================================================================

import "./transitions.js";

export const RADIO_STATIONS = [
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
        src: "https://res.cloudinary.com/x7aizl6a/video/upload/v1790955512/radioo.mp3"
    },
    {
        id: "court_tension",
        name: "(2)موسيقى محكمة الأدوار",
        freq: "107.8 FM",
        desc: "نغمات التشويق والترقب في قاعة المحاكمة",
        src: "https://res.cloudinary.com/x7aizl6a/video/upload/v1790953278/radioooo.mp3"
    }
];

const STORAGE_POWER_KEY = "court_radio_power";
const STORAGE_STATION_KEY = "court_radio_station";
const STORAGE_VOLUME_KEY = "court_radio_volume";

let radioAudio = null;
let currentStationIndex = 0;
let isRadioPowerOn = false;
let currentVolume = 0.5;

// البحث عن الحاضنة الدائمة للصوت (Single Persistent Audio Host)
export function getPersistentAudioHost() {
    try {
        if (window.__courtRadioHost) return window;
        if (window.parent && window.parent !== window && window.parent.__courtRadioHost) return window.parent;
        if (window.top && window.top !== window && window.top.__courtRadioHost) return window.top;
    } catch (e) {}
    return null;
}

export function initCourtRadio() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // 1. فحص وجود الحاضنة الدائمة للصوت في نافذة الجلسة
    const host = getPersistentAudioHost();
    const isChildFrame = host && host !== window;

    if (isChildFrame) {
        // إطار فرعي: يتصل بالحاضنة الدائمة ولا يُنشئ كائن audio جديد
        syncStateFromHost();
        buildRadioModal();
        attachSidebarButton();

        window.addEventListener("storage", syncStateFromHost);
        window.addEventListener("court-radio-update", syncStateFromHost);
        return;
    }

    // 2. النافذة الحاضنة الدائمة: تمتلك كائن الصوت الوحيد الفعلي
    const savedPower = localStorage.getItem(STORAGE_POWER_KEY);
    isRadioPowerOn = savedPower === "on";

    const savedStation = parseInt(localStorage.getItem(STORAGE_STATION_KEY) || "0", 10);
    currentStationIndex =
        isNaN(savedStation) || savedStation < 0 || savedStation >= RADIO_STATIONS.length ? 0 : savedStation;

    const savedVol = parseFloat(localStorage.getItem(STORAGE_VOLUME_KEY) || "0.5");
    currentVolume = isNaN(savedVol) ? 0.5 : Math.max(0, Math.min(1, savedVol));

    // إنشاء كائن الصوت الموحد الدائم (مرة واحدة فقط للجلسة)
    radioAudio = document.getElementById("courtroom-radio-audio");
    if (!radioAudio) {
        radioAudio = document.createElement("audio");
        radioAudio.id = "courtroom-radio-audio";
        radioAudio.preload = "auto";
        radioAudio.setAttribute("playsinline", "");
        radioAudio.style.display = "none";
        document.body.appendChild(radioAudio);
    }

    // بدون إعادة: عند انتهاء الصوت ينتقل تلقائياً إلى الصوت التالي (ويعود للأول بعد الأخير)
    radioAudio.loop = false;
    if (!radioAudio.dataset.autoNextBound) {
        radioAudio.dataset.autoNextBound = "1";
        radioAudio.addEventListener("ended", () => {
            if (!isRadioPowerOn) return;
            switchStation((currentStationIndex + 1) % RADIO_STATIONS.length);
        });
    }

    radioAudio.src = RADIO_STATIONS[currentStationIndex].src;
    radioAudio.volume = currentVolume;

    // تسجيل الحاضنة رسمياً
    window.__courtRadioHost = {
        play: playRadio,
        stop: stopRadio,
        togglePower: toggleRadioPower,
        switchStation: switchStation,
        setVolume: setRadioVolume,
        openModal: openRadioModal,
        closeModal: closeRadioModal,
        getState: () => ({
            isPowerOn: isRadioPowerOn,
            stationIndex: currentStationIndex,
            station: RADIO_STATIONS[currentStationIndex],
            volume: currentVolume,
            stations: RADIO_STATIONS
        })
    };

    buildRadioModal();
    attachSidebarButton();

    if (isRadioPowerOn) {
        playRadio();
    } else {
        updateRadioUI();
    }
}

function syncStateFromHost() {
    const host = getPersistentAudioHost();
    if (host && host.__courtRadioHost) {
        const state = host.__courtRadioHost.getState();
        isRadioPowerOn = state.isPowerOn;
        currentStationIndex = state.stationIndex;
        currentVolume = state.volume;
    } else {
        isRadioPowerOn = localStorage.getItem(STORAGE_POWER_KEY) === "on";
        currentStationIndex = parseInt(localStorage.getItem(STORAGE_STATION_KEY) || "0", 10) || 0;
        currentVolume = parseFloat(localStorage.getItem(STORAGE_VOLUME_KEY) || "0.5") || 0.5;
    }
    updateRadioUI();
}

function buildRadioModal() {
    if (document.getElementById("court-radio-modal")) return;

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

            <!-- شاشة التردد الرقمية LCD -->
            <div class="radio-lcd-screen">
                <div class="radio-lcd-top">
                    <span id="radio-freq-display" class="radio-freq-badge">${RADIO_STATIONS[currentStationIndex].freq}</span>
                    <span id="radio-onair-badge" class="radio-onair-badge ${isRadioPowerOn ? "is-on" : "is-off"}">
                        ${isRadioPowerOn ? "مباشر" : "وضع الاستعداد"}
                    </span>
                </div>
                <div id="radio-station-title" class="radio-station-title">${RADIO_STATIONS[currentStationIndex].name}</div>

                <div id="radio-wave-visualizer" class="radio-wave-bars ${isRadioPowerOn ? "is-active" : ""}">
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

            <!-- قائمة المحطات الإذاعية -->
            <div class="radio-stations-list">
                <div class="radio-section-label">المحطات المتاحة:</div>
                <div id="radio-stations-container" class="radio-stations-grid"></div>
            </div>

            <!-- أزرار التحكم ومستوى الصوت -->
            <div class="radio-controls-strip">
                <div class="radio-playback-controls">
                    <button type="button" id="btn-radio-prev" class="radio-ctrl-btn" title="المحطة السابقة" aria-label="المحطة السابقة">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <polygon points="19 20 9 12 19 4 19 20"></polygon>
                            <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></line>
                        </svg>
                    </button>
                    <button type="button" id="btn-radio-power" class="radio-power-btn ${isRadioPowerOn ? "is-on" : "is-off"}" title="تشغيل / إيقاف الراديو" aria-label="تشغيل / إيقاف الراديو">
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

    modal.querySelector("#btn-radio-close").addEventListener("click", closeRadioModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeRadioModal();
    });

    modal.querySelector("#btn-radio-power").addEventListener("click", toggleRadioPower);

    modal.querySelector("#btn-radio-prev").addEventListener("click", () => {
        const nextIdx = (currentStationIndex - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length;
        switchStation(nextIdx);
    });
    modal.querySelector("#btn-radio-next").addEventListener("click", () => {
        const nextIdx = (currentStationIndex + 1) % RADIO_STATIONS.length;
        switchStation(nextIdx);
    });

    const volSlider = modal.querySelector("#radio-volume-slider");
    if (volSlider) {
        volSlider.addEventListener("input", (e) => {
            setRadioVolume(parseFloat(e.target.value));
        });
    }
}

export function openRadioModal() {
    const host = getPersistentAudioHost();
    if (host && host !== window && host.__courtRadioHost) {
        host.__courtRadioHost.openModal();
        return;
    }

    let modal = document.getElementById("court-radio-modal");
    if (!modal) {
        buildRadioModal();
        modal = document.getElementById("court-radio-modal");
    }
    if (modal) {
        modal.style.display = "flex";
        updateRadioUI();
    }
}

export function closeRadioModal() {
    const host = getPersistentAudioHost();
    if (host && host !== window && host.__courtRadioHost) {
        host.__courtRadioHost.closeModal();
    }
    const modal = document.getElementById("court-radio-modal");
    if (modal) {
        modal.style.display = "none";
    }
}

export function switchStation(index) {
    const host = getPersistentAudioHost();
    if (host && host !== window && host.__courtRadioHost) {
        host.__courtRadioHost.switchStation(index);
        return;
    }

    currentStationIndex = index;
    localStorage.setItem(STORAGE_STATION_KEY, String(currentStationIndex));

    if (radioAudio) {
        radioAudio.src = RADIO_STATIONS[currentStationIndex].src;
        if (isRadioPowerOn) {
            playRadio();
        }
    }
    broadcastUpdate();
}

export async function playRadio() {
    const host = getPersistentAudioHost();
    if (host && host !== window && host.__courtRadioHost) {
        host.__courtRadioHost.play();
        return;
    }

    if (!radioAudio) return;
    isRadioPowerOn = true;
    localStorage.setItem(STORAGE_POWER_KEY, "on");

    try {
        await radioAudio.play();
    } catch (err) {
        const onFirstTouch = () => {
            if (isRadioPowerOn && radioAudio) radioAudio.play().catch(() => {});
            window.removeEventListener("click", onFirstTouch);
            window.removeEventListener("touchstart", onFirstTouch);
        };
        window.addEventListener("click", onFirstTouch, { once: true });
        window.addEventListener("touchstart", onFirstTouch, { once: true });
    }
    broadcastUpdate();
}

export function stopRadio() {
    const host = getPersistentAudioHost();
    if (host && host !== window && host.__courtRadioHost) {
        host.__courtRadioHost.stop();
        return;
    }

    isRadioPowerOn = false;
    localStorage.setItem(STORAGE_POWER_KEY, "off");
    if (radioAudio) {
        radioAudio.pause();
    }
    broadcastUpdate();
}

export function toggleRadioPower() {
    if (isRadioPowerOn) {
        stopRadio();
    } else {
        playRadio();
    }
}

export function setRadioVolume(val) {
    const host = getPersistentAudioHost();
    if (host && host !== window && host.__courtRadioHost) {
        host.__courtRadioHost.setVolume(val);
        return;
    }

    currentVolume = Math.max(0, Math.min(1, val));
    if (radioAudio) radioAudio.volume = currentVolume;
    localStorage.setItem(STORAGE_VOLUME_KEY, String(currentVolume));
    broadcastUpdate();
}

function broadcastUpdate() {
    updateRadioUI();
    window.dispatchEvent(new CustomEvent("court-radio-update"));

    const frame = document.getElementById("court-app-viewport");
    if (frame && frame.contentWindow) {
        try {
            frame.contentWindow.dispatchEvent(new CustomEvent("court-radio-update"));
        } catch (e) {}
    }
}

function updateRadioUI() {
    const modal = document.getElementById("court-radio-modal");
    const st = RADIO_STATIONS[currentStationIndex];

    if (modal && st) {
        const freqDisp = modal.querySelector("#radio-freq-display");
        const titleDisp = modal.querySelector("#radio-station-title");
        const onairBadge = modal.querySelector("#radio-onair-badge");
        const waveVis = modal.querySelector("#radio-wave-visualizer");
        const powerBtn = modal.querySelector("#btn-radio-power");
        const volSlider = modal.querySelector("#radio-volume-slider");
        const volPercent = modal.querySelector("#radio-vol-percent");
        const volIcon = modal.querySelector("#radio-vol-icon");

        if (freqDisp) freqDisp.textContent = st.freq;
        if (titleDisp) titleDisp.textContent = st.name;

        if (onairBadge) {
            onairBadge.className = `radio-onair-badge ${isRadioPowerOn ? "is-on" : "is-off"}`;
            onairBadge.textContent = isRadioPowerOn ? "مباشر" : "وضع الاستعداد";
        }

        if (waveVis) {
            waveVis.classList.toggle("is-active", isRadioPowerOn);
        }

        if (powerBtn) {
            powerBtn.classList.toggle("is-on", isRadioPowerOn);
            powerBtn.classList.toggle("is-off", !isRadioPowerOn);
        }

        if (volSlider) volSlider.value = currentVolume;
        if (volPercent) volPercent.textContent = `${Math.round(currentVolume * 100)}%`;
        if (volIcon) {
            if (currentVolume === 0) {
                volIcon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
            } else if (currentVolume < 0.5) {
                volIcon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
            } else {
                volIcon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`;
            }
        }

        modal.querySelectorAll(".radio-station-card").forEach((c, idx) => {
            c.classList.toggle("is-active", idx === currentStationIndex);
        });
    }

    const sidebarTag = document.getElementById("sidebar-radio-tag");
    const sidebarBtn = document.getElementById("btn-sidebar-radio");
    if (sidebarTag) {
        sidebarTag.textContent = isRadioPowerOn ? "يعمل" : "إيقاف";
        sidebarTag.className = `radio-status-tag ${isRadioPowerOn ? "is-playing" : "is-stopped"}`;
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
            content.appendChild(btn);
        }

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

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCourtRadio);
    } else {
        initCourtRadio();
    }
}
