import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getDatabase,
    ref,
    onValue,
    set,
    get,
    push,
    update,
    remove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ==========================================================================
// 1. إدارة الأرقام العشوائية والبصمة الرقمية والذاكرة المحلية
// ==========================================================================
//
// توليد كود الغرفة العشوائي كلاسيكياً فورياً لضمان ظهوره دايماً وثباته
if (!sessionStorage.getItem("activeRoomCode")) {
    const generatedCode = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    sessionStorage.setItem("activeRoomCode", generatedCode);
}
const currentRoomCode = sessionStorage.getItem("activeRoomCode");

// البصمة الرقمية الثابتة للأجهزة لمنع التضارب وضياع الهوية عند الريفرش
let mySecretUID = localStorage.getItem("court_user_uid");
if (!mySecretUID) {
    mySecretUID = "player_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
    localStorage.setItem("court_user_uid", mySecretUID);
}

// حقن وطباعة كود الغرفة فوراً في شاشة create.html لمنع الاختفاء
const activeRoomCodeElement = document.getElementById("room-code-number");
if (activeRoomCodeElement && currentRoomCode) {
    activeRoomCodeElement.textContent = currentRoomCode;
}

// تهيئة وتأمين الاتصال المباشر مع سيرفر الفايربيس الخاص بمشروعك
const firebaseConfig = { databaseURL: "https://great-songs-e334c-default-rtdb.firebaseio.com" };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
// ==========================================================================
// 2. محرك القائمة الجانبية (Sidebar) ومحرك الأكورديون وعداد اللودينج
// ==========================================================================

const btnHamburger = document.getElementById("btn-hamburger");
const sidebarDrawer = document.getElementById("sidebar-drawer");
if (btnHamburger && sidebarDrawer) {
    btnHamburger.addEventListener("click", function (e) {
        e.stopPropagation();
        sidebarDrawer.classList.toggle("sidebar-drawer-active");
    });
    document.addEventListener("click", function (e) {
        if (!sidebarDrawer.contains(e.target) && e.target !== btnHamburger)
            sidebarDrawer.classList.remove("sidebar-drawer-active");
    });
}

const accordions = document.querySelectorAll(".accordion-trigger");
accordions.forEach(function (trigger) {
    trigger.addEventListener("click", function () {
        const panel = this.nextElementSibling;
        accordions.forEach(function (o) {
            if (o !== trigger) {
                o.classList.remove("arrow-rotate");
                if (o.nextElementSibling) o.nextElementSibling.style.maxHeight = null;
            }
        });
        this.classList.toggle("arrow-rotate");
        if (panel.style.maxHeight) {
            panel.style.maxHeight = null;
        } else {
            panel.style.maxHeight = panel.scrollHeight + "px";
        }
    });
});

// عداد اللودينج الكلاسيكي الصارم الشغال 100% بدون تهنيج
if (
    document.getElementById("progress-bar") &&
    document.getElementById("loading-component") &&
    document.getElementById("welcome-component")
) {
    const pBar = document.getElementById("progress-bar");
    const lComp = document.getElementById("loading-component");
    const wComp = document.getElementById("welcome-component");
    let w = 0;
    const interval = setInterval(function () {
        if (w >= 100) {
            clearInterval(interval);
            setTimeout(function () {
                lComp.style.display = "none";
                wComp.className = "fade-active";
            }, 400);
        } else {
            w += 1;
            pBar.style.width = w + "%";
        }
    }, 45);
}
// ==========================================================================
// 3. محرك صفحة الانضمام الحية (join.html) + الأنماط والتعبيرات القياسية ES6
// ==========================================================================
const roomCodeSearch = document.getElementById("room-code-search");
const playerNameJoin = document.getElementById("player-name-join");
const btnSearchJoin = document.getElementById("btn-search-join");
const errorRoomCode = document.getElementById("error-room-code");

if (btnSearchJoin) {
    // [حل JSHint الحاسم]: تحويل دالة إعادة التعيين لتعبير محمي ونقلها لأعلى البلوك لنسف خطأ W082
    const resetJoinButtonState = () => {
        btnSearchJoin.disabled = false;
        btnSearchJoin.style.opacity = "1";
        btnSearchJoin.textContent = "انضمام للغرفة";
    };

    btnSearchJoin.addEventListener("click", function () {
        const searchedCode = roomCodeSearch.value.trim();
        let joinedName = playerNameJoin.value.trim();

        if (errorRoomCode) {
            errorRoomCode.style.display = "none";
            roomCodeSearch.style.borderColor = "";
        }

        if (!searchedCode) {
            roomCodeSearch.style.borderColor = "#ff4d4d";
            if (errorRoomCode) {
                errorRoomCode.textContent = "برجاء إدخال كود الغرفة أولاً للبحث عنها!";
                errorRoomCode.style.display = "block";
            }
            return;
        }

        btnSearchJoin.disabled = true;
        btnSearchJoin.style.opacity = "0.5";
        btnSearchJoin.textContent = "جاري الانضمام...";

        const roomRef = ref(db, "rooms/" + searchedCode);
        get(roomRef)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const playersListRef = ref(db, "rooms/" + searchedCode + "/players");

                    get(playersListRef).then((playersSnapshot) => {
                        let currentPlayersCount = playersSnapshot.exists()
                            ? Object.keys(playersSnapshot.val()).length
                            : 0;

                        if (currentPlayersCount >= 10) {
                            roomCodeSearch.style.borderColor = "#ff4d4d";
                            if (errorRoomCode) {
                                errorRoomCode.textContent =
                                    "عذراً، اكتمل الحد الأقصى! الغرفة ممتلئة بالكامل (الحد الأقصى 10 لاعبين).";
                                errorRoomCode.style.display = "block";
                            }
                            resetJoinButtonState(); // استدعاء آمن ومطابق للمعايير
                        } else {
                            if (!joinedName) {
                                let nextPlayerNumber = currentPlayersCount + 1;
                                joinedName = "لاعب " + nextPlayerNumber;
                            }

                            const newPlayerRef = push(playersListRef);
                            set(newPlayerRef, {
                                name: joinedName,
                                uid: mySecretUID
                            }).then(() => {
                                sessionStorage.setItem("myPlayerKeyInRoom", newPlayerRef.key);
                                sessionStorage.setItem("activeRoomCode", searchedCode);
                                window.location.href = "create.html";
                            });
                        }
                    });
                } else {
                    roomCodeSearch.style.borderColor = "#FF0000";
                    if (errorRoomCode) {
                        errorRoomCode.textContent = "لم يتم العثور على غرفة تحمل هذا الكود أونلاين أو انتهت صلاحيتها!";
                        errorRoomCode.style.display = "block";
                    }
                    resetJoinButtonState(); // استدعاء آمن ومطابق للمعايير
                }
            })
            .catch(() => {
                resetJoinButtonState();
            });
    });
}

// ==========================================================================
// 4. محرك صفحة الانتظار والـ Lobby للأدمن (create.html) ومميزات الطرد
// ==========================================================================
let myPlayerKey = sessionStorage.getItem("myPlayerKeyInRoom") || null;

if (currentRoomCode && document.getElementById("room-code-number")) {
    const roomRef = ref(db, "rooms/" + currentRoomCode);
    const playersRef = ref(db, "rooms/" + currentRoomCode + "/players");

    get(roomRef).then((snapshot) => {
        if (!snapshot.exists()) {
            // حقن الطابع الزمني والـ hostUID لضمان تتبع الغرفة وتطهيرها لاحقاً
            set(roomRef, {
                code: currentRoomCode,
                hostUID: mySecretUID,
                createdAt: Date.now()
            });
            const firstPlayerRef = push(playersRef);
            myPlayerKey = firstPlayerRef.key;
            sessionStorage.setItem("myPlayerKeyInRoom", myPlayerKey);
            set(firstPlayerRef, { name: "لاعب 1", uid: mySecretUID });
            // [حقن التهيئة السحابية للرصيد الفردي عند دخول لاعب جديد]
            const playerIndividualScoreRef = ref(db, `rooms/${currentRoomCode}/players_scores/${mySecretUID}`);

            get(playerIndividualScoreRef).then((scoreSnapshot) => {
                if (!scoreSnapshot.exists()) {
                    // إذا كان لاعباً جديداً تماماً يدخل الغرفة لأول مرة، يمنح 0 نقاط وتثبت له
                    set(playerIndividualScoreRef, 0);
                    console.log("⚡ تم إنشاء محفظة سحابية تراكمية جديدة للاعب برصيد افتراضي: 0 نقاط.");
                } else {
                    // إذا كان لاعباً قديماً يعود للغرفة بعد ريفرش، يحتفظ بنقاطه التراكمية كاملة ولا تتصفر
                    console.log(`🔋 تم استعادة رصيدك التراكمي المحفوظ بأمان من السيرفر: ${scoreSnapshot.val()} نقاط.`);
                }
            });
        } else {
            get(playersRef).then((playersSnapshot) => {
                playersSnapshot.forEach((child) => {
                    if (child.val().uid === mySecretUID) {
                        myPlayerKey = child.key;
                        sessionStorage.setItem("myPlayerKeyInRoom", myPlayerKey);
                    }
                });
            });
        }
    });

    // تحديث الاسم الذكي بحدث change لمنع حفظ الحروف المقطوعة أونلاين
    const nameInput = document.getElementById("admin-name-input");
    if (nameInput) {
        nameInput.addEventListener("change", function () {
            const updatedName = nameInput.value.trim() || "إسم اللاعب";
            if (myPlayerKey) {
                const specificPlayerRef = ref(db, "rooms/" + currentRoomCode + "/players/" + myPlayerKey);
                update(specificPlayerRef, { name: updatedName });
                console.log("تحديث سحابي آمن للاسم الكامل فقط:", updatedName);
            }
        });
    }
    // 🌟 المراقب العام المشرف على التحويل الفوري المتزامن لصفحة القضايا
    const gameStateRef = ref(db, "rooms/" + currentRoomCode + "/game_state");
    onValue(gameStateRef, (snapshot) => {
        const gameState = snapshot.val();
        if (gameState) {
            if (gameState.status === "go-to-game") {
                window.location.href = "game.html";
                return;
            }
            // يلتقط الحالة فوراً دون اشتراط وجود داتا معقدة داخل الـ assignments
            else if (gameState.status === "game_over") {
                sessionStorage.removeItem("lobby_initial_card_opened");
                window.location.href = "game.html";
                return;
            }
        }
    });

    let roomPlayersListCount = [];

    // محرك عرض الأسماء وميزة الطرد المخصصة للأدمن فقط حياً لمنع الاختراق
    onValue(playersRef, (snapshot) => {
        const list = document.getElementById("lobby-players-list");
        if (list) {
            list.innerHTML = "";
            roomPlayersListCount = [];

            get(roomRef).then((roomSnapshot) => {
                const isHost = roomSnapshot.exists() && roomSnapshot.val().hostUID === mySecretUID;

                snapshot.forEach((child) => {
                    const playerKey = child.key;
                    const playerData = child.val();

                    roomPlayersListCount.push(playerData.name);

                    const li = document.createElement("li");
                    li.style.cssText = "display: flex; justify-content: space-between; align-items: center;";

                    const nameSpan = document.createElement("span");
                    nameSpan.textContent = playerData.name;
                    li.appendChild(nameSpan);

                    // [تم التحديث]: إلغاء الـ confirm التقليدي وربط الأزرار بالمودال البوكس المخصص
                    if (isHost && playerData.uid !== mySecretUID) {
                        const btnKick = document.createElement("button");
                        btnKick.textContent = "طرد";
                        btnKick.style.cssText =
                            "background-color: #ff5252; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-family: 'Alexandria', sans-serif; font-size: 0.75rem; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2);";

                        // تغيير السلوك ليفتح المودال البوكس بدلاً من نافذة المتصفح المزعجة
                        btnKick.addEventListener("click", function (e) {
                            e.stopPropagation();

                            const kickModal = document.getElementById("kick-confirm-modal");
                            const targetNameSpan = document.getElementById("kick-target-name");
                            const confirmBtn = document.getElementById("btn-kick-confirm");
                            const cancelBtn = document.getElementById("btn-kick-cancel");

                            if (kickModal && targetNameSpan) {
                                // حقن اسم اللاعب المستهدف ديناميكياً في المودال
                                targetNameSpan.textContent = playerData.name;
                                // فتح المودال في الصدارة المطلقة
                                kickModal.style.setProperty("display", "flex", "important");

                                // قفل وتفعيل زر الطرد النهائي الفعلي عند النقر
                                const onConfirmKick = function () {
                                    const specificPlayerRef = ref(
                                        db,
                                        "rooms/" + currentRoomCode + "/players/" + playerKey
                                    );
                                    set(specificPlayerRef, null).then(() => {
                                        kickModal.style.setProperty("display", "none", "important");
                                    });
                                    // تنظيف المستمعات بعد الاستجابة لمنع التراكم والتكرار البرمجي
                                    confirmBtn.removeEventListener("click", onConfirmKick);
                                };
                                confirmBtn.addEventListener("click", onConfirmKick);

                                // زر التراجع وإلغاء الطرد
                                const onCancelKick = function () {
                                    kickModal.style.setProperty("display", "none", "important");
                                    cancelBtn.removeEventListener("click", onCancelKick);
                                };
                                cancelBtn.addEventListener("click", onCancelKick);
                            }
                        });
                        li.appendChild(btnKick);
                    }

                    list.appendChild(li);
                });
            });
        }
    });

    // قفل زر البدء تلقائياً لغير صاحب الغرفة حماية للسيادة القضائية
    const btnStartGame = document.getElementById("btn-start-game");
    get(roomRef).then((snapshot) => {
        if (snapshot.exists()) {
            const roomData = snapshot.val();
            if (roomData.hostUID !== mySecretUID) {
                if (btnStartGame) {
                    btnStartGame.disabled = true;
                    btnStartGame.style.opacity = "0.5";
                    btnStartGame.style.cursor = "not-allowed";
                    btnStartGame.textContent = "بانتظار منشئ الغرفة لبدء المحاكمة...";
                }
            }
        }
    });
    // [تم التحديث]: إلغاء الـ alert القديم وتفعيل المودال الزجاجي الفخم للاعب المطرود قسرياً
    if (myPlayerKey) {
        const myPlayerKeyRef = ref(db, "rooms/" + currentRoomCode + "/players/" + myPlayerKey);
        onValue(myPlayerKeyRef, (snapshot) => {
            // بمجرد أن يمسح الأدمن الـ Key الخاص بهذا اللاعب من السيرفر
            if (!snapshot.exists()) {
                const kickModal = document.getElementById("player-kick-modal");

                if (kickModal) {
                    // فتح وإظهار المودال الشيك في الصدارة المطلقة فوراً
                    kickModal.style.setProperty("display", "flex", "important");
                } else {
                    // كخيار أمان احتياطي لو المودال غير مبني بالـ HTML
                    alert("لقد تم طردك من الغرفة بواسطة منشئ المحاكاة!");
                }

                // مهلة زمنية دقيقة مدتها ثانيتين ليقرأ رسالة الطرد الفخمة، ثم قذفه للخارج
                setTimeout(() => {
                    sessionStorage.clear(); // تنظيف الذاكرة لمنع التعليق
                    window.location.href = "rooms.html"; // سحب وطرد اللاعب إجبارياً لصفحة الغرف
                }, 2000);
            }
        });
    }
} // نهاية قفل شرط حماية شاشة create.html الحارس

// ==========================================================================
// 5. محرك صفحة عرض القضايا وحمايتها (game.html) والتحكم السحابي بالأدمن
// ==========================================================================

async function loadAndDisplayCases() {
    const container = document.getElementById("cases-container");
    if (!container) return;

    try {
        const response = await fetch("cases.json");
        if (!response.ok) throw new Error("فشل في تحميل ملف القضايا");

        const casesData = await response.json();
        container.innerHTML = "";

        casesData.forEach((item) => {
            const caseBox = document.createElement("div");
            caseBox.className = "image-showcase-box";
            caseBox.setAttribute("data-id", item.id);

            // تكييف الاستايل ليتناسب مع وجود الصورة والتايتل في المنتصف بشكل فخم ومتناسق بصرياً
            caseBox.style.cssText = `
                height: auto; padding: 20px 15px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; cursor: pointer;
                ${item.is_pinned ? "border: 3px solid var(--gold-glow); box-shadow: 0 0 15px rgba(213, 167, 92, 0.3);" : ""}
            `;

            let innerHTML = "";
            if (item.is_pinned) {
                innerHTML += `<span style="background-color: var(--gold-glow); color: var(--shadow-black); font-family: 'Alexandria', sans-serif; font-weight: 700; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; margin-bottom: 12px; display: inline-block;">📌 قضية مثبتة (تتطلب ${item.required_players} لاعبين)</span>`;
            }

            // تحديد مسار الصورة ديناميكياً بناءً على الـ id الخاص بكل قضية (مثال: assets/cases/1.png)
            // إذا كان ملف الـ JSON يحتوي على رابط مخصص للصورة يمكنك استخدام item.image مباشرة
            const caseImage = item.image || `assets/cases/${item.id}.png`;

            innerHTML += `
                <!-- حاوية الصورة المعبرة بتصميم متناسق ودائري الأطراف مع وجود حماية لو الصورة مش موجودة -->
                <div style="width: 100%; max-width: 130px; aspect-ratio: 1; border-radius: 12px; overflow: hidden; margin-bottom: 12px; border: 1px solid rgba(213, 167, 92, 0.2); box-shadow: 0 4px 10px rgba(0,0,0,0.4);">
                    <img src="${caseImage}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.src='https://placehold.co{item.id}'">
                </div>

                <!-- عنوان القضية متموضع بالكامل في المنتصف بدون وصف -->
                <h3 style="font-family: 'Alexandria', sans-serif; font-weight: ${item.is_pinned ? "800" : "700"}; font-size: ${item.is_pinned ? "1.15rem" : "1.1rem"}; color: var(--gold-glow); margin: 0; line-height: 1.4;">${item.id}. ${item.title}</h3>
            `;

            caseBox.innerHTML = innerHTML;
            container.appendChild(caseBox);
        });

        activateCasesClickEngine();
    } catch (error) {
        console.error("حدث خطأ في موسوعة القضايا:", error);
        container.innerHTML = "<p style='color: red; text-align: center;'>عذراً، تعذر تحميل القضايا حالياً.</p>";
    }
}

function activateCasesClickEngine() {
    if (!currentRoomCode) return;

    const roomRef = ref(db, "rooms/" + currentRoomCode);
    const playersRef = ref(db, "rooms/" + currentRoomCode + "/players");
    const gameStateRef = ref(db, "rooms/" + currentRoomCode + "/game_state");

    // [تعديل السطر 262]: توحيد الفحص الفوري لمرة واحدة عند تحميل الموسوعة لفك تضارب الإنترنت
    get(gameStateRef)
        .then((snapshot) => {
            const gameState = snapshot.val();
            if (gameState && (gameState.status === "case_selected" || gameState.status === "go-to-game")) {
                // ✅ تم التعديل هنا لـ go-to-game
                update(gameStateRef, { status: "lobby", caseId: "none" });
            }
        })
        .catch((err) => console.log("انتظار استقرار الاتصال..."));

    document.querySelectorAll(".image-showcase-box").forEach((box) => {
        box.addEventListener("click", function () {
            const caseId = this.getAttribute("data-id");

            get(roomRef).then((snapshot) => {
                if (snapshot.exists()) {
                    const roomData = snapshot.val();
                    if (roomData.hostUID !== mySecretUID) {
                        showAdminOnlyAlert();
                        return;
                    }

                    console.log(`الأدمن اختار القضية ${caseId}. جاري سحب الأجهزة والخلط العشوائي للأدوار...`);

                    get(playersRef).then(async (playersSnapshot) => {
                        let playersList = [];
                        playersSnapshot.forEach((child) => {
                            playersList.push({ id: child.val().uid, name: child.val().name });
                        });
                        const totalPlayersInRoom = playersList.length;

                        try {
                            const response = await fetch("cases.json");
                            const allCases = await response.json();
                            const activeCase = allCases.find((c) => c.id == caseId); // تعديل أمان لضمان قراءة النص والرقم
                            if (!activeCase) return;

                            playersList.sort(() => Math.random() - 0.5);
                            let assignments = {};

                            const isSerialKillerCase = activeCase.title.includes("قاتل متسلسل") || caseId === "1";
                            if (isSerialKillerCase && totalPlayersInRoom < 6) {
                                const customAlertModal = document.getElementById("custom-alert-modal");
                                const modalAlertMessage = document.getElementById("modal-alert-message");
                                if (modalAlertMessage && customAlertModal) {
                                    modalAlertMessage.textContent =
                                        "عذراً! قضية 'القاتل المتسلسل' معقدة للغاية وتتطلب 6 لاعبين على الأقل لبدء الجلسة. انتظر اكتمال العدد.";
                                    customAlertModal.style.setProperty("display", "flex", "important");
                                    customAlertModal.className = "modal-overlay-active";
                                }
                                return;
                            }

                            let finalRolesToDistribute = [];
                            if (totalPlayersInRoom === 3) {
                                // 🎲 الفرز التكتيكي الصارم لـ 3 لاعبين بناءً على نسب الاحتمالات الدقيقة (36% جاني، 32% مشتبه به، 32% بريء محتال)
                                let selectedSuspectCard = {};
                                const diceRoll = Math.random() * 100; // توليد رقم عشوائي من 0 إلى 100

                                if (diceRoll <= 36) {
                                    // 🔴 وضعية (أ) بنسبة 36%: المتهم هو الجاني الحقيقي الفعلي المسحوب من الجسون
                                    selectedSuspectCard = {
                                        role_name: activeCase.roles_pool.real_guilty.role_name || "المتهم الرئيسي",
                                        public_story: activeCase.roles_pool.real_guilty.public_story,
                                        secret_interest:
                                            activeCase.roles_pool.real_guilty.secret_interest ||
                                            "تضليل القاضي لتنجو بجريمتك.",
                                        is_guilty: true,
                                        role_type: "suspect"
                                    };
                                    console.log(
                                        "🎲 النتيجة الحركية للخلط: حقن كارت (الجاني الحقيقي الفعلي) بنسبة 36%."
                                    );
                                } else if (diceRoll > 36 && diceRoll <= 68) {
                                    // 🟡 وضعية (ب) بنسبة 32%: المتهم مشتبه به مأخوذ من الـ suspects_pool يملك قصة وجريمة جانبية سرية من الـ JSON
                                    const suspectsPool = activeCase.suspects_pool || [];
                                    if (suspectsPool.length > 0) {
                                        const randomSuspect =
                                            suspectsPool[Math.floor(Math.random() * suspectsPool.length)];
                                        selectedSuspectCard = {
                                            role_name: randomSuspect.role_name,
                                            public_story: randomSuspect.public_story,
                                            secret_interest: randomSuspect.secret_interest, // جريمة جانبية حقيقية من الـ JSON
                                            is_guilty: false,
                                            role_type: "suspect"
                                        };
                                        console.log(
                                            `🎲 النتيجة الحركية للخلط: حقن كارت مشتبه به بجريمة جانبية (${randomSuspect.role_name}) بنسبة 32%.`
                                        );
                                    } else {
                                        // كارت احتياطي تأميني في حال عدم وجود المصفوفة لضمان عدم الانهيار
                                        selectedSuspectCard = {
                                            role_name: activeCase.roles_pool.real_guilty.role_name || "المتهم الرئيسي",
                                            public_story: activeCase.roles_pool.real_guilty.public_story,
                                            secret_interest: activeCase.roles_pool.real_guilty.secret_interest,
                                            is_guilty: true,
                                            role_type: "suspect"
                                        };
                                    }
                                } else {
                                    // 🟢 وضعية (ج) بنسبة 32%: كارت البريء تماماً المحتال (الجديد)
                                    const suspectsPool = activeCase.suspects_pool || [];
                                    if (suspectsPool.length > 0) {
                                        const randomSuspect =
                                            suspectsPool[Math.floor(Math.random() * suspectsPool.length)];
                                        selectedSuspectCard = {
                                            role_name: randomSuspect.role_name,
                                            public_story: randomSuspect.public_story,
                                            // نسف مصلحة الجسون القديمة وحقن التكليف السري الجديد الموحد هندسياً
                                            secret_interest:
                                                "أنت بريء تماماً من التهمة الكبرى، ولكن عليك تلفيق الأكاذيب والحوارات البارعة ضد أدلة القاضي لتضليله وتشتيت الجلسة.",
                                            is_guilty: false,
                                            role_type: "innocent_impostor" // رتبة مخصصة للنظام لتسهيل فرز النقاط لاحقاً
                                        };
                                        console.log(
                                            `🎲 النتيجة الحركية للخلط: حقن كارت (البريء تماماً المحتال) باستخدام مظهر (${randomSuspect.role_name}) بنسبة 32%.`
                                        );
                                    }
                                }

                                // رص الأدوار الثلاثة المتاحة للغرفة وتجهيزها للقذف السحابي المتزامن
                                finalRolesToDistribute = [
                                    {
                                        role_name: "القاضي المحقق",
                                        public_story: activeCase.roles_pool.judge.public_story,
                                        secret_interest: activeCase.roles_pool.judge.secret_interest,
                                        is_guilty: false,
                                        role_type: "judge"
                                    },
                                    {
                                        role_name: "محامي الدفاع",
                                        public_story: activeCase.roles_pool.defense_lawyer.public_story,
                                        secret_interest:
                                            activeCase.roles_pool.defense_lawyer.secret_interest ||
                                            "حماية موكلك وتبرئته بكافة الثغرات.",
                                        is_guilty: false,
                                        role_type: "lawyer"
                                    },
                                    selectedSuspectCard
                                ];
                                finalRolesToDistribute.sort(() => Math.random() - 0.5);
                            } else {
                                // 🌟 [تحديث حاسم لـ 4 لاعبين فأكثر]: ضمان حقن الجاني الحقيقي إجبارياً قطعياً
                                // 1. حقن وتثبيت الأدوار السيادية الأساسية للغرفة (القاضي والدفاع)
                                finalRolesToDistribute.push({
                                    role_name: "القاضي المحقق",
                                    public_story: activeCase.roles_pool.judge.public_story,
                                    secret_interest: activeCase.roles_pool.judge.secret_interest,
                                    is_guilty: false,
                                    role_type: "judge"
                                });
                                finalRolesToDistribute.push({
                                    role_name: "محامي الدفاع",
                                    public_story: activeCase.roles_pool.defense_lawyer.public_story,
                                    secret_interest:
                                        activeCase.roles_pool.defense_lawyer.secret_interest ||
                                        "حماية موكلك بكافة الثغرات.",
                                    is_guilty: false,
                                    role_type: "lawyer"
                                });

                                // 2. بناء كارت الجاني الحقيقي وتأمينه وحقنه مباشرة كعنصر إجباري ثالث في قائمة التوزيع
                                let mainGuiltyCard = {
                                    role_name: activeCase.roles_pool.real_guilty.role_name || "المتهم الرئيسي الجاني",
                                    public_story: activeCase.roles_pool.real_guilty.public_story,
                                    secret_interest:
                                        activeCase.roles_pool.real_guilty.secret_interest ||
                                        "تضليل العدالة تماماً لتنجو بجريمتك.",
                                    is_guilty: true, // الهوية السحابية للمذنب
                                    role_type: "suspect"
                                };
                                finalRolesToDistribute.push(mainGuiltyCard); // 🔴 حقن فوري مباشر لضمان وجوده بالجلسة دائماً

                                // 3. جلب مسبح المشتبه بهم العاديين وتجهيزهم لملء المقاعد المتبقية
                                let rawSuspects =
                                    activeCase.suspects_pool ||
                                    (activeCase.roles_pool ? activeCase.roles_pool.suspects_pool : []) ||
                                    [];
                                let regularSuspectsCards = rawSuspects.map((card) => ({
                                    role_name: card.role_name,
                                    public_story: card.public_story,
                                    secret_interest: card.secret_interest,
                                    is_guilty: false,
                                    role_type: "suspect"
                                }));

                                // خلط المشتبه بهم العاديين بصورة عشوائية
                                regularSuspectsCards.sort(() => Math.random() - 0.5);

                                // 4. شرط حقن محامي الادعاء بالحق المدني (إذا كان العدد 5 لاعبين أو أكثر)
                                if (totalPlayersInRoom >= 5) {
                                    const assistantCard = regularSuspectsCards.pop(); // سحب آمن لا يمس الجاني لأنه تم عزله وحقنه مسبقاً
                                    finalRolesToDistribute.push({
                                        role_name: "محامي الادعاء بالحق المدني",
                                        public_story: "أنا هنا لتمثيل الضحية والمطالبة بالقصاص العادل وإدانة الجاني.",
                                        secret_interest: assistantCard
                                            ? assistantCard.secret_interest || "كشف الثغرات المصلحية."
                                            : "مساعدة العدالة القضائية.",
                                        is_guilty: false,
                                        role_type: "lawyer"
                                    });
                                }

                                // 5. ملء بقية المقاعد الشاغرة في الغرفة من مسبح المشتبه بهم الأبرياء المتبقين حتى يتساوى عدد الأدوار مع المشتركين
                                while (
                                    regularSuspectsCards.length > 0 &&
                                    finalRolesToDistribute.length < totalPlayersInRoom
                                ) {
                                    const characterCard = regularSuspectsCards.pop();
                                    finalRolesToDistribute.push({
                                        role_name: characterCard ? characterCard.role_name : "مشتبه به إضافي",
                                        public_story: characterCard
                                            ? characterCard.public_story
                                            : "أنكر التهمة الموجهة إلي كلياً.",
                                        secret_interest: characterCard
                                            ? characterCard.secret_interest
                                            : "إثبات البراءة النزيهة.",
                                        is_guilty: false, // جميع المتبقين أبرياء قطعياً
                                        role_type: "suspect"
                                    });
                                }
                            }

                            // خلط المقاعد النهائي لجميع الأدوار (بما فيهم الجاني والسياديين) لعدم كشف موضع كرسيه قبل التوزيع السحابي
                            finalRolesToDistribute.sort(() => Math.random() - 0.5);
                            playersList.forEach((player, index) => {
                                assignments[player.id] = finalRolesToDistribute[index];
                            });

                            update(gameStateRef, {
                                status: "case_selected",
                                caseId: caseId,
                                assignments: assignments,
                                interrogationsCount: 0
                            }).then(() => {
                                window.location.href = `lobby.html?id=${caseId}`;
                            });
                        } catch (err) {
                            console.error("عطل في الخلط بالتفصيل:", err);
                        }
                    });
                }
            });
        });
    });

    // مراقب التحويل التلقائي للاعبين (تم تأمينه ليعمل فقط إذا كانت الحالة مستقرة وسليمة في السيرفر)
    const caseCheckInterval = setInterval(() => {
        if (!document.getElementById("cases-container")) {
            clearInterval(caseCheckInterval);
            return;
        }
        get(roomRef)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const roomData = snapshot.val();
                    const gameState = roomData.game_state || {};
                    if (
                        roomData.hostUID !== mySecretUID &&
                        gameState.status === "case_selected" &&
                        gameState.caseId &&
                        gameState.caseId !== "none"
                    ) {
                        clearInterval(caseCheckInterval);
                        window.location.href = `lobby.html?id=${gameState.caseId}`;
                    }
                }
            })
            .catch((err) => console.log("في انتظار استقرار الشبكة..."));
    }, 1500);

    get(roomRef).then((snapshot) => {
        if (snapshot.exists() && snapshot.val().hostUID !== mySecretUID) showInitialWaitingModal();
    });
}

function showAdminOnlyAlert() {
    const m = document.getElementById("custom-alert-modal");
    if (m) {
        document.getElementById("modal-alert-message").textContent = "انتظر الأدمن ليختار القضية وتبدأ اللعبة.";
        m.className = "modal-overlay-active";
    }
}

function showInitialWaitingModal() {
    const m = document.getElementById("custom-alert-modal");
    if (m) {
        document.getElementById("modal-alert-message").textContent =
            "مرحباً بك! انتظر الأدمن ليختار القضية المناسبة لبدء جولة المحاكمة.";
        m.className = "modal-overlay-active";
    }
}
// ==========================================================================
// دالة listenToFinalLobby المطهرة والمحمية هندسياً (نسخة المودال الزجاجي الفخم)
// ==========================================================================
function listenToFinalLobby() {
    if (!currentRoomCode) return;
    const roomRef = ref(db, "rooms/" + currentRoomCode);
    const gameStateRef = ref(db, "rooms/" + currentRoomCode + "/game_state");

    // لقط عنصر الزر من الـ HTML الأصلي الخاص بك
    const btnEndTrial = document.getElementById("btn-end-trial");

    // 🌟 [جدار حماية زمني]: تسجيل طابع دخول قاعة المحكمة الحالية لنسف الإشعارات السابقة
    if (!window.courtRoomEntryTimestamp) {
        window.courtRoomEntryTimestamp = Date.now();
    }

    onValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
            const roomData = snapshot.val();
            const playersData = roomData.players || {};
            const gameState = roomData.game_state || {};
            const assignments = gameState.assignments || {};
            const activeSpeakerUID = gameState.activeSpeakerUID || "none";

            // 🚨 [جدار الحماية الحارس المطور لمنع الريفرش وتنظيف المنظومة المحدثة]
            // بمجرد رصد انتهاء المحاكمة، يتم تصفير كل مصفوفات المشتبه بهم والعدادات الفردية فوراً
            if (gameState.status === "game_over" || !gameState.assignments) {
                console.log("🚨 تم رصد انتهاء الجلسة! جاري تدمير وتطهير سجلات الأسئلة والعدادات الفردية للاعبين...");
                sessionStorage.removeItem("lobby_initial_card_opened");

                // 1️⃣ [التطهير الشجري للأسئلة]: مسح وتدمير مصفوفات أسئلة الـ التحقيق الفردية المستقلة لكل لاعب
                Object.keys(sessionStorage).forEach((key) => {
                    if (
                        key.startsWith("remaining_questions_case_") ||
                        key.startsWith("remaining_prosecutor_questions_case_")
                    ) {
                        sessionStorage.removeItem(key);
                    }
                });

                // 2️⃣ [التطهير الشجري للأقفال]: فك وتدمير كافة أقفال الاتهامات والرادارات الفردية السابقة من الذاكرة المحلية
                Object.keys(localStorage).forEach((key) => {
                    if (
                        key.startsWith("locked_target_") ||
                        key.startsWith("locked_accuse_target_") ||
                        key.startsWith("locked_radar_target_")
                    ) {
                        localStorage.removeItem(key);
                    }
                });

                // 3️⃣ [التفكيك البصري الصارم]: مسح وتدمير منصة محامي المحكمة كلياً من الـ HTML لمنع تكرار وحقن المستمعات
                const oldPanel = document.getElementById("court-lawyer-verdict-panel");
                if (oldPanel) oldPanel.remove();

                // 4️⃣ تصفير جدار الحماية الاستكشافي للسماح بحقن اللوحة من جديد في الجولة القضائية التالية
                window.hasUnifiedCourtyardInjected = false;
                window.hasJudgeRadarButtonsInjected = false;

                window.location.href = "game.html";
                return;
            }

            // جدار حماية للأدمن (إظهار للأدمن فقط وإخفاء كلي للبقية) - كودك الأصلي
            if (btnEndTrial) {
                const isHost = roomData.hostUID === mySecretUID;
                if (isHost) {
                    btnEndTrial.style.setProperty("display", "block", "important");
                } else {
                    btnEndTrial.style.setProperty("display", "none", "important");
                }
            }

            const playersList = Object.keys(playersData).map((key) => ({
                id: playersData[key].uid,
                name: playersData[key].name
            }));
            if (document.getElementById("loading-screen"))
                document.getElementById("loading-screen").style.display = "none";
            if (document.getElementById("court-arena")) document.getElementById("court-arena").style.display = "block";

            renderCircularSeats(playersList, assignments);

            // 🌟 [تحديد الرتبة السحابية وتغذية حقيبة الأدلة للقاضي والمحاميين]
            const myRoleCard = assignments[mySecretUID] || {};
            let myLawyerType = "none";

            if (myRoleCard.role_type === "judge") {
                // إذا كان اللاعب الحالي هو القاضي، يحصل تلقائياً على أدلة المحكمة
                myLawyerType = "court_evidence";
            } else if (myRoleCard.role_type === "lawyer" && myRoleCard.role_name) {
                if (myRoleCard.role_name.includes("دفاع") || myRoleCard.role_name.includes("الدفاع")) {
                    myLawyerType = "defense_evidence";
                } else if (myRoleCard.role_name.includes("ادعاء") || myRoleCard.role_name.includes("المحكمة")) {
                    myLawyerType = "court_evidence";
                }
            }
            // جدار حماية وتوهج كرسي المحامي المعترض قسرياً عند الجميع - كودك الأصلي
            if (gameState.status === "objection_active" && gameState.activeSpeakerUID) {
                const objectorUID = gameState.activeSpeakerUID;
                document.querySelectorAll(".court-seat-node").forEach((node) => {
                    if (node.getAttribute("data-uid") === objectorUID) {
                        node.classList.add("objection-glow-active");
                    } else {
                        node.classList.remove("objection-glow-active");
                    }
                });
            } else {
                document.querySelectorAll(".court-seat-node").forEach((node) => {
                    node.classList.remove("objection-glow-active");
                });
            }
            // ==========================================================================
            // [إصلاح الجزء الثالث]: جدار الحماية الاستكشافي الموحد داخل دالة الاستماع
            // ==========================================================================
            // 🌟 [تحديث حاسم]: منع ومضات ومسح الأزرار.. الحقن يتم لمرة واحدة فقط في عمر الجولة
            if (!window.hasUnifiedCourtyardInjected) {
                window.hasUnifiedCourtyardInjected = true; // تفعيل قفل الحماية السحابي فوراً

                injectLawyerActionControls(
                    myRoleCard,
                    gameStateRef,
                    playersList.length,
                    myLawyerType,
                    assignments,
                    gameState,
                    activeSpeakerUID
                );
            }

            // الـ Kill-Feed المطور والمحمي للاعبين (طلب الكلمة يتلاشى تلقائياً)
            if (gameState.lastSpeakRequestName && gameState.requestTimestamp !== window.lastProcessedTimestamp) {
                window.lastProcessedTimestamp = gameState.requestTimestamp;

                if (gameState.requestTimestamp > window.courtRoomEntryTimestamp) {
                    // يتم استدعاؤه باسم اللاعب فقط، ليتلاشى تلقائياً بعد 4 ثوانٍ لحفظ نظافة الواجهة
                    triggerKillFeedAlert(gameState.lastSpeakRequestName);
                }
            }

            // [مراقب النقر السيادي]: مستمع حركي لزر إنهاء المحكمة - كودك الأصلي
            if (!window.hasEndTrialListenerAttached) {
                window.hasEndTrialListenerAttached = true;

                const executeForceEndTrial = () => {
                    const alertModal = document.getElementById("custom-alert-modal");
                    if (alertModal) {
                        alertModal.style.setProperty("display", "none", "important");
                        alertModal.classList.remove("modal-overlay-active");
                    }

                    // تصفير وتطهير ذاكرة الأسئلة التراكمية للجولة الجديدة قسرياً عند الأدمن
                    Object.keys(sessionStorage).forEach((key) => {
                        if (
                            key.startsWith("remaining_questions_case_") ||
                            key.startsWith("remaining_prosecutor_questions_case_")
                        ) {
                            sessionStorage.removeItem(key);
                        }
                    });

                    // ابحث عن دالة executeForceEndTrial بداخل كودك وحدث الـ update الأخير لها ليكون هكذا:
                    update(ref(db, "rooms/" + currentRoomCode + "/game_state"), {
                        status: "game_over",
                        caseId: "none",
                        assignments: null,
                        court_lawyer_action: null,
                        activeSpeakerUID: "none", // 🌟 تصفير المتحدث عند الإنهاء القسري
                        isInterrogatingMode: false,
                        interrogationsCount: 0
                    });
                };

                window.history.pushState({ noBack: true }, "");
                window.history.pushState({ noBack: true }, "");

                // 🌟 [حل JSHint الحاسم]: تحويل الإعلانات لتعبيرات سهمية محوية ومتغيرة لنسف تحذير W082 نهائياً
                const triggerCustomEndTrialModal = () => {
                    const modal = document.getElementById("custom-alert-modal");
                    if (!modal) return;
                    const btnModalClose = document.getElementById("btn-modal-close");
                    if (btnModalClose) btnModalClose.style.setProperty("display", "none", "important");

                    document.getElementById("modal-alert-title").textContent = "إنهاء المحاكمة قسرياً";
                    let endTrialHTML = `
                        <div style="text-align: right; font-family: 'Alexandria', sans-serif;">
                            <p style="color: var(--text-white); font-size: 0.95rem; margin-bottom: 20px; text-align: center;">هل أنت متأكد من رغبتك في إنهاء المحكمة الحالية فوراً؟ سيتم إعادة جميع اللاعبين إلى موسوعة القضايا.</p>
                            <div style="display: flex; gap: 12px; width: 100%;">
                                <button id="btn-confirm-end-force" style="flex: 1; padding: 12px; background: #1a1315; border: 2px solid #ff5252; color: #ff5252; font-family: 'Alexandria'; font-weight: 700; border-radius: 6px; cursor: pointer;">نعم، إنهاء الآن</button>
                                <button id="btn-cancel-end-force" style="flex: 1; padding: 12px; background: #131a18; border: 2px solid #52ff7d; color: #52ff7d; font-family: 'Alexandria'; font-weight: 700; border-radius: 6px; cursor: pointer;">تراجع واستمرار</button>
                            </div>
                        </div>
                    `;
                    document.getElementById("modal-alert-message").innerHTML = endTrialHTML;
                    modal.style.setProperty("display", "flex", "important");
                    modal.className = "modal-overlay-active";

                    document.getElementById("btn-confirm-end-force").addEventListener("click", function () {
                        executeForceEndTrial();
                    });

                    document.getElementById("btn-cancel-end-force").addEventListener("click", function () {
                        modal.style.setProperty("display", "none", "important");
                        modal.classList.remove("modal-overlay-active");
                        if (btnModalClose) btnModalClose.style.setProperty("display", "block", "important");
                    });
                };

                const triggerPlayerBlockExitModal = () => {
                    const modal = document.getElementById("custom-alert-modal");
                    if (!modal) return;
                    const btnModalClose = document.getElementById("btn-modal-close");
                    if (btnModalClose) {
                        btnModalClose.style.setProperty("display", "block", "important");
                        btnModalClose.textContent = "العودة للمحاكمة";
                    }
                    document.getElementById("modal-alert-title").textContent = "تنبيه قضائي صارم";
                    document.getElementById("modal-alert-message").innerHTML = `
                        <div style="text-align: right; font-family: 'Alexandria', sans-serif;">
                            <p style="color: #ff5252; font-size: 1rem; font-weight: 700; text-align: center; margin-bottom: 10px;">عذراً، المغادرة محظورة تماماً!</p>
                            <p style="color: var(--text-white); font-size: 0.9rem; text-align: center; line-height: 1.6;">
                                لا يمكنك مغادرة الجلسة القضائية الحية الحالية إلا بإذن منشئ الغرفة (المشرف). يرجى الانتظار حتى يقوم المسؤول بإنهاء المحاكمة بنفسه وسحبك للخارج.
                            </p>
                        </div>
                    `;
                    modal.style.setProperty("display", "flex", "important");
                    modal.className = "modal-overlay-active";

                    // مستمع زر التأكيد الفعلي لمسح اسم اللاعب العادي من السيرفر والخروج الفوري لـ rooms.html
                    document.getElementById("btn-player-confirm-exit").addEventListener("click", function () {
                        modal.style.setProperty("display", "none", "important");
                        modal.classList.remove("modal-overlay-active");

                        const playerKey = sessionStorage.getItem("myPlayerKeyInRoom");
                        if (playerKey) {
                            const exactPlayerPath = ref(db, "rooms/" + currentRoomCode + "/players/" + playerKey);
                            remove(exactPlayerPath).then(() => {
                                sessionStorage.removeItem("activeRoomCode");
                                sessionStorage.removeItem("myPlayerKeyInRoom");
                                window.location.href = "rooms.html";
                            });
                        } else {
                            window.location.href = "rooms.html";
                        }
                    });

                    // زر التراجع وإغلاق المودال
                    document.getElementById("btn-player-cancel-exit").addEventListener("click", function () {
                        modal.style.setProperty("display", "none", "important");
                        modal.classList.remove("modal-overlay-active");
                        if (btnModalClose) btnModalClose.style.setProperty("display", "block", "important");
                    });
                };

                if (!window.hasLobbyPopstateListenerAttached) {
                    window.hasLobbyPopstateListenerAttached = true;
                    window.addEventListener("popstate", function (event) {
                        window.history.pushState({ noBack: true }, "");
                        const isHost = roomData.hostUID === mySecretUID;
                        if (isHost) {
                            triggerCustomEndTrialModal();
                        } else {
                            // 🌟 تفعيل شرط الخروج الصارم للاعبين العاديين عبر المودال البوكس المخصص عند لمس مثلث الهاتف
                            triggerPlayerBlockExitModal();
                        }
                    });
                }

                if (btnEndTrial) {
                    btnEndTrial.addEventListener("click", function (e) {
                        e.preventDefault();
                        if (roomData.hostUID !== mySecretUID) return;
                        triggerCustomEndTrialModal();
                    });
                }
            }
        }
    });
}
function renderCircularSeats(playersList, assignments) {
    const container = document.getElementById("seats-container");
    if (!container) return;
    container.innerHTML = "";

    const totalSeats = playersList.length;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // 🌟 معادلة ذكية لتصغير حجم الكرسي ديناميكياً كلما زاد العدد
    // إذا كان العدد 3 أو 4 لاعبين يكون الحجم 110 بكسل، وعندما يصل لـ 10 لاعبين يصغر تدريجياً إلى 75 بكسل
    const seatSize = totalSeats <= 4 ? 110 : Math.max(75, 110 - (totalSeats - 4) * 6);
    const halfSize = seatSize / 2;

    // 🌟 زيادة نصف قطر الدائرة (Radius) ديناميكياً بناءً على عدد المقاعد لتوسيع المساحة
    const radiusMultiplier = totalSeats <= 4 ? 0.34 : Math.min(0.42, 0.34 + (totalSeats - 4) * 0.015);
    const radius = Math.min(window.innerWidth, window.innerHeight) * radiusMultiplier;

    let initialModalOpened = sessionStorage.getItem("lobby_initial_card_opened") || "false";

    get(ref(db, "rooms/" + currentRoomCode))
        .then((roomSnapshot) => {
            if (!roomSnapshot.exists()) return;

            const roomData = roomSnapshot.val() || {};
            const gameState = roomData.game_state || {};
            const activeSpeakerUID = gameState.activeSpeakerUID || "none";
            const currentInterrogationsCount = gameState.interrogationsCount || 0;
            const isInterrogatingMode = gameState.isInterrogatingMode || false;

            const myRoleCard = assignments[mySecretUID] || {};
            const isJudgeMe = myRoleCard.role_type === "judge";

            // ==========================================================================
            // محرك حقن أزرار واجهة القاضي الفرعية مع عداد الأسئلة التراكمي (دون مسح الكراسي)
            // ==========================================================================
            const judgePanel = document.getElementById("judge-control-panel");
            if (judgePanel) {
                if (isJudgeMe) {
                    judgePanel.style.setProperty("display", "flex", "important");

                    // تحديث عداد الاستجوابات الأصلي في الواجهة
                    const counterDisplay = document.getElementById("interrogation-count-number");
                    if (counterDisplay) counterDisplay.textContent = currentInterrogationsCount;

                    // 🌟 [جدار حماية هندسي]: بناء الأزرار لمرة واحدة فقط لمنع مسح مستمعات النقر والكراسي
                    if (!window.hasJudgeRadarButtonsInjected) {
                        window.hasJudgeRadarButtonsInjected = true;

                        // تنظيف اللوحة نفسها فقط لمرة واحدة عند البناء
                        judgePanel.innerHTML = "";

                        // 1. زر استجواب لاعب (الزر الأصلي المستقر)
                        const btnToggle = document.createElement("button");
                        btnToggle.id = "btn-interrogate-toggle";
                        btnToggle.className = "btn-judge-action btn-interrogate-style";
                        btnToggle.textContent = isInterrogatingMode ? "اختر كرسياً..." : "استجواب لاعب";
                        judgePanel.appendChild(btnToggle);

                        // 🌟 شرط الـ 3 و 4 لاعبين لحقن أدوات الرادار والكشف الاستكشافية المحدثة
                        if (playersList.length < 5) {
                            // حاوية عمودية واقية لزر كشف الشبهة والعداد المدمج أسفله مباشرة
                            const revealContainer = document.createElement("div");
                            revealContainer.style.cssText =
                                "display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; margin: 0 4px;";

                            // زر كشف الشبهة (يسحب كود القضية حياً من السيرفر ويقفل التكرار)
                            const btnRevealSuspect = document.createElement("button");
                            btnRevealSuspect.id = "btn-judge-reveal-suspect";
                            btnRevealSuspect.className = "btn-judge-action btn-interrogate-style";
                            btnRevealSuspect.style.width = "100%";
                            btnRevealSuspect.textContent = "الأسئة";

                            btnRevealSuspect.addEventListener("click", function (e) {
                                e.preventDefault();
                                e.stopPropagation();

                                // 🌟 جلب كود القضية حياً ومباشرة من السيرفر لحظة النقر لمنع مشكلة عدم الظهور
                                get(ref(db, "rooms/" + currentRoomCode + "/game_state")).then((gameStateSnapshot) => {
                                    if (!gameStateSnapshot.exists()) return;
                                    const currentGameState = gameStateSnapshot.val();
                                    const activeCaseId = currentGameState.caseId || "none";

                                    if (activeCaseId !== "none") {
                                        // تمرير كود القضية الفعلي المستقر للدالة الفرعية
                                        triggerUniqueJudgeQuestion(activeCaseId);
                                    } else {
                                        console.log("⚠️ انتظار استقرار مزامنة كود القضية السحابي...");
                                    }
                                });
                            });
                            revealContainer.appendChild(btnRevealSuspect);

                            // ب. 🌟 [النص الصغير المطور]: عداد الأسئلة الجنائية المتبقية أسفل الزر
                            const questionsCounterDisplay = document.createElement("span");
                            questionsCounterDisplay.id = "judge-questions-remaining-counter";
                            questionsCounterDisplay.style.cssText =
                                "font-family: 'Alexandria', sans-serif; font-size: 0.65rem; color: var(--gold-glow); font-weight: 600; margin-top: 4px; text-shadow: 0 1px 3px #000; direction: rtl;";
                            questionsCounterDisplay.textContent = "جاري حساب الأسئلة...";
                            revealContainer.appendChild(questionsCounterDisplay);

                            judgePanel.appendChild(revealContainer);

                            // زر رادار الشبهات (يفتح المودال البوكس الخاص بالقاضي للفحص)
                            const btnRadarTrigger = document.createElement("button");
                            btnRadarTrigger.id = "btn-judge-radar-trigger";
                            btnRadarTrigger.className = "btn-judge-action btn-interrogate-style";
                            btnRadarTrigger.textContent = "اكتشف الشبهة";
                            btnRadarTrigger.style.margin = "0 4px";
                            judgePanel.appendChild(btnRadarTrigger);
                        }

                        // 3. حاوية عداد الاستجوابات القضائية المركزي
                        const counterDiv = document.createElement("div");
                        counterDiv.id = "judge-counter-wrapper-node";
                        counterDiv.className = "judge-counter-display";
                        counterDiv.innerHTML = `الاستجوابات <strong id="interrogation-count-number">${currentInterrogationsCount}</strong>`;
                        judgePanel.appendChild(counterDiv);

                        // 4. زر إصدار الحكم النهائي (الزر الأصلي)
                        const btnVerdict = document.createElement("button");
                        btnVerdict.id = "btn-verdict-trigger";
                        btnVerdict.className = "btn-judge-action btn-verdict-style";
                        btnVerdict.textContent = "إصدار الحكم 🔨";
                        judgePanel.appendChild(btnVerdict);
                    }

                    // [تحديث حي وديناميكي للبيانات المتغيرة فقط دون مسح الواجهة أو الكراسي]
                    const liveToggleBtn = document.getElementById("btn-interrogate-toggle");
                    if (liveToggleBtn) {
                        if (isInterrogatingMode) {
                            liveToggleBtn.textContent = "اختر كرسياً...";
                            liveToggleBtn.style.backgroundColor = "var(--gold-glow)";
                            liveToggleBtn.style.color = "var(--shadow-black)";
                        } else {
                            liveToggleBtn.textContent = "استجواب لاعب";
                            liveToggleBtn.style.backgroundColor = "var(--inner-vintage)";
                            liveToggleBtn.style.color = "var(--text-white)";
                        }
                    }

                    const liveCounter = document.getElementById("interrogation-count-number");
                    if (liveCounter) liveCounter.textContent = currentInterrogationsCount;

                    const liveVerdictBtn = document.getElementById("btn-verdict-trigger");
                    if (liveVerdictBtn) {
                        liveVerdictBtn.disabled = currentInterrogationsCount < 2;
                        liveVerdictBtn.style.opacity = currentInterrogationsCount >= 2 ? "1" : "0.4";
                        liveVerdictBtn.style.cursor = currentInterrogationsCount >= 2 ? "pointer" : "not-allowed";
                    }

                    // 🌟 تحديث العداد الرقمي للأسئلة المتبقية حياً ومنع تعليق واجهة القاضي
                    updateQuestionsCounterText(gameState.caseId);
                } else {
                    judgePanel.style.setProperty("display", "none", "important");
                    window.hasJudgeRadarButtonsInjected = false;
                }
            }

            playersList.forEach((player, index) => {
                const angle = (index * 2 * Math.PI) / totalSeats - Math.PI / 2;
                // 🌟 استخدام المتغير الديناميكي halfSize بدلاً من الرقم الثابت 55 لضبط السنتر بالملي
                const posX = centerX + radius * Math.cos(angle) - halfSize;
                const posY = centerY + radius * Math.sin(angle) - halfSize;
                const roleCard = assignments[player.id];

                const seatBox = document.createElement("div");
                seatBox.className = "court-seat-node";
                seatBox.setAttribute("data-uid", player.id);
                seatBox.setAttribute("data-name", player.name);

                const isSpeaker = player.id === activeSpeakerUID;
                const isMeBorder =
                    player.id === mySecretUID ? "var(--gold-glow)" : isSpeaker ? "var(--gold-glow)" : "#222c3c";
                const isMeShadow =
                    player.id === mySecretUID
                        ? "0 0 15px rgba(213, 167, 92, 0.4)"
                        : isSpeaker
                          ? "0 0 25px var(--gold-glow)"
                          : "none";
                const isMeScale = isSpeaker ? "scale(1.18)" : "scale(1)";

                // 🌟 تطبيق العرض والارتفاع الديناميكي وتصغير الخطوط لتناسب الحجم الجديد عند الزحام
                const fontSizeName = totalSeats > 6 ? "0.75rem" : "0.85rem";
                const fontSizeRole = totalSeats > 6 ? "0.7rem" : "0.8rem";

                seatBox.style.cssText = `
                    position: absolute;
                    width: ${seatSize}px;
                    height: ${seatSize}px;
                    left: ${posX}px;
                    top: ${posY}px;
                    border-color: ${isMeBorder};
                    box-shadow: ${isMeShadow};
                    transform: ${isMeScale};
                    transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.3s ease, box-shadow 0.3s ease;
                `;

                const isMeLabel =
                    player.id === mySecretUID
                        ? '<span style="color:var(--gold-glow); font-size:0.65rem;">(أنت)</span>'
                        : "";
                // جعل المسمى الوظيفي للدور علنياً ومكشوفاً للجميع على كراسي قاعة المحكمة
                const cardNameLabel = roleCard ? roleCard.role_name : "جاري الاستلام...";

                let seatHTML = `
                    <div style="font-family:'Alexandria'; font-size:${fontSizeName}; color:#fff; font-weight:700; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; padding:0 4px;">${player.name} ${isMeLabel}</div>
                    <div style="font-family:'Harmattan'; font-size:${fontSizeRole}; color:var(--gold-glow); margin-top:4px; background:#131a26; padding:1px 6px; border-radius:4px; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:90%;">${cardNameLabel}</div>
                `;

                if (isSpeaker) {
                    seatHTML += `
                        <div style="position: absolute; top: -15px; left: 50%; transform: translateX(-50%); background: var(--gold-glow); color: var(--shadow-black); border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; box-shadow: 0 0 8px var(--gold-glow); animation: smoothPanelReveal 0.3s ease;">🎙️</div>
                    `;
                }

                seatBox.innerHTML = seatHTML;
                // ==========================================================================
                // [تحديث حاسم]: مراقب إطلاق شرارة المودال السينمائي المتتالي للاعب عند دخول اللوبي
                // ==========================================================================
                if (player.id === mySecretUID && roleCard && initialModalOpened === "false") {
                    sessionStorage.setItem("lobby_initial_card_opened", "true");

                    fetch("cases.json")
                        .then((res) => {
                            if (!res.ok) throw new Error("فشل في تحميل ملف القضايا");
                            return res.json();
                        })
                        .then((allCases) => {
                            const activeCase = allCases.find((c) => c.id == gameState.caseId);
                            if (activeCase) {
                                setTimeout(() => {
                                    // إطلاق المودال الأول (ملخص الجريمة العامة)
                                    openCaseStoryFirstModal(roleCard, activeCase);
                                }, 600);
                            } else {
                                console.log("⚠️ لم يتم العثور على تفاصيل القضية رقم: " + gameState.caseId);
                            }
                        })
                        .catch((err) => console.error("عطل في تهيئة المودال المتتالي:", err));
                }

                container.appendChild(seatBox);
            });
        })
        .catch((err) => console.log("انتظار استقرار مزامنة المقاعد...", err));
}
function openSecretCardInModal(roleCard) {
    const modal = document.getElementById("custom-alert-modal");
    if (!modal) return;

    // تحديد عنوان المودال باسم الدور الفعلي (مثال: القاضي المحقق) - كودك الأصلي
    document.getElementById("modal-alert-title").textContent = roleCard.role_name;

    // فحص نوع الرتبة بناءً على الاسم أو الـ role_type
    const roleName = roleCard.role_name || "";
    const isJudicialElement =
        roleName.includes("قاضي") ||
        roleName.includes("محامي") ||
        roleCard.role_type === "judge" ||
        roleCard.role_type === "lawyer";

    // 🌟 [الاصطياد السحابي الجذعي المرن]: فك لغز اختلاف الصياغات اللغوية في قضايا الـ JSON
    let displayedPublicStory = roleCard.public_story || "";
    if (roleCard.role_type === "lawyer" && (roleName.includes("دفاع") || roleName.includes("الدفاع"))) {
        let suspectRealName = "المتهم";
        let suspectJobTitle = "";

        if (currentRoomCode) {
            const roomRef = ref(db, "rooms/" + currentRoomCode);
            get(roomRef).then((snapshot) => {
                if (snapshot.exists()) {
                    const roomData = snapshot.val();
                    const playersData = roomData.players || {};
                    const gameState = roomData.game_state || {};
                    const currentAssignments = gameState.assignments || {};

                    // 1️⃣ اصطياد اللاعب المذنب أو المشتبه به في الجلسة وجلب اسمه ومسماه الوظيفي
                    Object.keys(currentAssignments).forEach((uid) => {
                        const playerRoleCard = currentAssignments[uid] || {};
                        if (playerRoleCard.is_guilty === true || playerRoleCard.role_type === "suspect") {
                            suspectJobTitle = playerRoleCard.role_name || "";

                            Object.keys(playersData).forEach((key) => {
                                if (playersData[key].uid === uid) {
                                    suspectRealName = playersData[key].name || "المتهم";
                                }
                            });
                        }
                    });

                    // 2️⃣ الاستبدال الجذعي المرن لنسف فوارق الكلمات الزائدة في الـ JSON
                    if (suspectRealName) {
                        // تنظيف النص من الأقواس التوضيحية أولاً (مثل: الجاني الحقيقي)
                        let cleanJob = suspectJobTitle.split(" (")[0].split("(")[0].trim();

                        // استخراج الكلمات الجذعية الأساسية (أول كلمتين من المسمى مثل: سكرتير المليونير)
                        let jobWords = cleanJob.split(" ");
                        let stemJobTitle = jobWords.slice(0, 2).join(" ");

                        // الفحص والفرز الشامل للنصوص وحقن الهوية الحركية بجانبها بالملي
                        if (displayedPublicStory.includes("المتهم الحاضر")) {
                            displayedPublicStory = displayedPublicStory.replace(
                                "المتهم الحاضر",
                                `المتهم الحاضر (${suspectRealName})`
                            );
                        } else if (stemJobTitle && displayedPublicStory.includes(stemJobTitle)) {
                            displayedPublicStory = displayedPublicStory.replace(
                                stemJobTitle,
                                `${stemJobTitle} (${suspectRealName})`
                            );
                        } else if (cleanJob && displayedPublicStory.includes(cleanJob)) {
                            displayedPublicStory = displayedPublicStory.replace(
                                cleanJob,
                                `${cleanJob} (${suspectRealName})`
                            );
                        } else if (displayedPublicStory.includes("المتهم")) {
                            displayedPublicStory = displayedPublicStory.replace(
                                "المتهم",
                                `المتهم (${suspectRealName})`
                            );
                        } else if (displayedPublicStory.includes("موكلك")) {
                            displayedPublicStory = displayedPublicStory.replace("موكلك", `موكلك (${suspectRealName})`);
                        }
                    }

                    // تحديث الفقرة نصياً داخل المودال حياً وتلقائياً بعد انتهاء جلب البيانات السحابية
                    const textContentElement = document.querySelector("#custom-alert-modal p");
                    if (textContentElement) {
                        textContentElement.textContent = displayedPublicStory;
                    }
                }
            });
        }
    }

    // بناء الهيكل البصري للقصة العلنية (يظهر لجميع اللاعبين)
    let modalHTML = `
        <div style="text-align: right;">
            <span style="color: var(--gold-glow); font-weight: bold;">القصة العلنية أمام المحكمة:</span>
            <p style="background: #161c26; padding: 10px; border-radius: 6px; color: #fff; margin-bottom: 15px;">${displayedPublicStory}</p>
    `;

    // الشرط السيادي الحاسم: إذا لم يكن عنصراً قضائياً، يظهر له صندوق المصلحة السرية (المتهم والشهود فقط)
    if (!isJudicialElement) {
        modalHTML += `
            <span style="color: #ff5252; font-weight: bold;">المصلحة السرية المخفية:</span>
            <p style="background: #1e1315; padding: 10px; border-radius: 6px; border: 1px dashed #ff5252; color: #fff;">${roleCard.secret_interest}</p>
        `;
    } else {
        // إذا كان قاضياً أو محامياً، يتم إخفاء الصندوق الشرير واستبداله بختم النزاهة القانوني الفخم
        modalHTML += `
            <div style="background: rgba(213, 167, 92, 0.1); padding: 12px; border-radius: 6px; border: 1px solid var(--gold-glow); color: var(--gold-glow); text-align: center; font-size: 0.9rem; font-weight: 700; margin-top: 5px; box-shadow: inset 0 0 10px rgba(213, 167, 92, 0.15);">
                سيادة قضائية نزيهة: أنت مبرأ تماماً من أي تهمة أو مصلحة سرية في هذه الجلسة.
            </div>
        `;
    }

    modalHTML += `</div>`;

    // حقن الكود البصري المحدث داخل رسالة المودال وإظهاره في الصدارة
    document.getElementById("modal-alert-message").innerHTML = modalHTML;
    modal.style.setProperty("display", "flex", "important");
    modal.className = "modal-overlay-active";
}

// ==========================================================================
// مراقب النقر الكلي المطور والمنعزل تماماً ضد تضارب المودالات (Global Listener المحدث)
// ==========================================================================
document.addEventListener("click", function (event) {
    // [جدار حماية هندسي للموبايل]: التقاط نقرات أزرار المحامي قسرياً قبل تداخل الطبقات
    if (event.target.closest("#evidence-bag-button-node") || event.target.closest(".btn-evidence-bag-custom-node")) {
        // إذا ضغط المستخدم على زر الحقيبة، نتركه للمستمع المباشر الخاص به بعد إيقاف انتشار الحدث
        event.stopPropagation();
    }
    if (event.target.closest("#btn-lawyer-radar-trigger")) {
        // إذا ضغط المستخدم على زر رادار المحامي، نتركه للمستمع المباشر الخاص به بعد إيقاف انتشار الحدث
        event.stopPropagation();
    }

    if (event.target.id === "btn-modal-close" || event.target.closest("#btn-modal-close")) {
        const alertModal = document.getElementById("custom-alert-modal");
        if (alertModal) {
            alertModal.style.setProperty("display", "none", "important");
            alertModal.className = "modal-overlay-hidden";
        }
        return; // هنا الـ return يحمي المودال ويقفل الدالة بأمان دون مساس بالأزرار الأخرى
    }

    // ==========================================================================
    // [إصلاح الجزء الثالث]: حارس الجلوبال لسنر الذكي لفك تضارب رادار القاضي والمحامي
    // ==========================================================================
    if (event.target.closest("#btn-judge-radar-trigger")) {
        event.preventDefault();
        event.stopPropagation();

        console.log("📡 سيادة القاضي ضغط على الرادار.. جاري سحب داتا المحكمة الحية...");

        const gameStateRef = ref(db, "rooms/" + currentRoomCode + "/game_state");
        get(ref(db, "rooms/" + currentRoomCode)).then((roomSnapshot) => {
            if (!roomSnapshot.exists()) return;
            const latestRoomData = roomSnapshot.val();
            const latestPlayersData = latestRoomData.players || {};
            const latestGameState = latestRoomData.game_state || {};
            const latestAssignments = latestGameState.assignments || {};

            const latestPlayersList = Object.keys(latestPlayersData).map((key) => ({
                id: latestPlayersData[key].uid,
                name: latestPlayersData[key].name
            }));

            // يفتح مودال الرادار الخاص بالقاضي فقط
            openJudgeRadarModal(latestPlayersList, latestAssignments, gameStateRef);
        });
        return;
    }
    if (event.target.closest("#btn-lawyer-radar-trigger")) {
        event.preventDefault();
        event.stopPropagation(); // نسف التضارب فوراً لعمل الزر في الموبايل

        console.log("📡 محامي الادعاء ضغط على الرادار في الموبايل.. جاري فتح كاشف الشبهات...");

        const gameStateRef = ref(db, "rooms/" + currentRoomCode + "/game_state");
        get(ref(db, "rooms/" + currentRoomCode)).then((roomSnapshot) => {
            if (!roomSnapshot.exists()) return;
            const latestRoomData = roomSnapshot.val();
            const latestPlayersData = latestRoomData.players || {};
            const latestGameState = latestRoomData.game_state || {};
            const latestAssignments = latestGameState.assignments || {};

            const latestPlayersList = Object.keys(latestPlayersData).map((key) => ({
                id: latestPlayersData[key].uid,
                name: latestPlayersData[key].name
            }));

            // إطلاق واستدعاء المودال الموحد لرادار الفحص حياً
            openJudgeRadarModal(latestPlayersList, latestAssignments, gameStateRef);
        });
        return;
    }
    // 3️⃣ مراقب زر بدء المحاكمة المتزامن والمنعزل تماماً
    if (event.target && event.target.id === "btn-start-game") {
        if (event.target.disabled) return;

        console.log("تم رصد النقر على بدء المحاكمة بنجاح. جاري جلب عدد اللاعبين الحركي...");

        get(ref(db, "rooms/" + currentRoomCode + "/players")).then((snapshot) => {
            let actualCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;

            if (actualCount < 3) {
                const alertModal = document.getElementById("custom-alert-modal");
                const alertMessage = document.getElementById("modal-alert-message");
                const alertTitle = document.getElementById("modal-alert-title");

                if (alertMessage)
                    alertMessage.textContent =
                        "تنبيه! أنت لم تكمل الحد الأدنى من اللاعبين المطلوبة لبدء المحاكمة (الحد الأدنى 3 لاعبين لبدء الخلط).";
                if (alertTitle) alertTitle.textContent = "عجز في العدد";

                const globalCloseBtn = document.getElementById("btn-modal-close");
                if (globalCloseBtn) {
                    globalCloseBtn.textContent = "حسناً";
                    globalCloseBtn.style.setProperty("display", "block", "important");
                }

                if (alertModal) {
                    alertModal.style.setProperty("display", "flex", "important");
                    alertModal.className = "modal-overlay-active";
                }
            } else {
                console.log("اكتمل النصاب القانوني (3 لاعبين فأكثر). جاري الانتقال لموسوعة القضايا...");

                update(ref(db, "rooms/" + currentRoomCode), {
                    game_state: {
                        status: "go-to-game",
                        caseId: "none",
                        assignments: {},
                        interrogationsCount: 0
                    }
                })
                    .then(() => {
                        console.log("تمت المزامنة السحابية بنجاح! جاري التوجيه الفوري لصفحة القضايا...");
                        window.location.href = "game.html";
                    })
                    .catch((err) => {
                        console.error("عطل في تحديث الفايربيس عند البدء:", err);
                    });
            }
        });
        return;
    }

    // 4️⃣ محرك شبكة الغرف لصفحة rooms.html المعتمد على الـ closest المانع للتعطيل
    const cardCreate = event.target.closest("#card-create-room");
    if (cardCreate) {
        window.location.href = "create.html";
        return;
    }

    const cardJoin = event.target.closest("#card-join-room");
    if (cardJoin) {
        window.location.href = "join.html";
        return;
    }

    const cardOffline = event.target.closest("#card-offline-play");
    if (cardOffline) {
        const alertModal = document.getElementById("custom-alert-modal");
        const modalMessage = document.getElementById("modal-alert-message");
        if (alertModal && modalMessage) {
            document.getElementById("modal-alert-title").textContent = "المحاكمة المحلية";
            modalMessage.textContent =
                "جاري تجهيز جولة محاكاة الأوفلاين المحلية قريباً بدون إنترنت! انتظروا التحديث القادم.";

            const globalCloseBtn = document.getElementById("btn-modal-close");
            if (globalCloseBtn) {
                globalCloseBtn.textContent = "حسناً";
                globalCloseBtn.style.setProperty("display", "block", "important");
            }

            alertModal.style.setProperty("display", "flex", "important");
            alertModal.className = "modal-overlay-active";
        }
        return;
    }
});

// انطلاق دوال التحميل الكلية الآمنة عند رصد الصفحة المعنية لمنع التضارب
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("cases-container")) loadAndDisplayCases();

    // [تطوير ذكي]: عند فتح صفحة ساحة اللعب (اللوبي)، يطلق شاشة التحميل السينمائية أولاً لتغطية تحميل السيرفر
    if (document.getElementById("seats-container")) {
        runLobbyLoadingEngine(function () {
            console.log("اكتمل التحميل السينمائي بنجاح! يتم الآن ربط مستمع السيرفر واللاعبين.");
            listenToFinalLobby(); // استدعاء دالتك الأصلية بعد انتهاء اللودينج بنعومة كاملا
        });
    }
});

// ==========================================================================
// 4. المحرك السينمائي لتشغيل شاشة لودينج اللوبي المطورة (نسخة العداد المستقر)
// ==========================================================================
function runLobbyLoadingEngine(callback) {
    const loadingScreen = document.getElementById("lobby-loading-screen");
    const progressBar = document.getElementById("progress-bar-fill");
    const progressCounter = document.getElementById("progress-counter-text");
    const hintText = document.getElementById("loading-dynamic-hint");

    // إذا لم تكن صفحة اللوبي أو وسم الـ HTML غير متواجد، يتوقف بأمان دون أخطاء
    if (!loadingScreen) {
        if (typeof callback === "function") callback();
        return;
    }

    // فتح شاشة اللودينج في الصدارة المطلقة
    loadingScreen.style.display = "flex";
    loadingScreen.style.opacity = "1";

    let progress = 0;
    const hints = [
        { limit: 30, text: "جاري تجميع اللاعبين" },
        { limit: 60, text: "جاري توزيع الأدوار" },
        { limit: 85, text: "جاري تجهيز المقاعد" },
        { limit: 100, text: "لقد بدأت الجلسة" }
    ];

    const interval = setInterval(() => {
        progress += 1;

        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressCounter) progressCounter.textContent = `${progress}%`;

        // تبديل الجمل والعبارات المشوقة بنعومة تامة
        const currentHint = hints.find((h) => progress <= h.limit);
        if (currentHint && hintText && hintText.textContent !== currentHint.text) {
            hintText.style.opacity = 0;
            setTimeout(() => {
                hintText.textContent = currentHint.text;
                hintText.style.opacity = 1;
            }, 150);
        }

        // عند اكتمال الـ 100% تتلاشى الشاشة بنعومة وتختفي لتكشف عن اللوبي الجاهز
        if (progress >= 100) {
            clearInterval(interval);
            loadingScreen.style.transition = "opacity 0.5s ease-out";
            loadingScreen.style.opacity = "0";

            setTimeout(() => {
                loadingScreen.style.display = "none";
                if (typeof callback === "function") callback(); // إطلاق ساحة المحكمة الأصلية المتزامنة
            }, 500);
        }
    }, 50); // يستغرق حوالي 5 ثوانٍ إجمالياً لإعطاء هيبة وتشويق للمحاكمة
}

// ==========================================================================
// محرك زر المغادرة المباشر وحبس مثلث الهاتف (نسخة الأمان الصارمة الموحدة للجميع)
// ==========================================================================

document.addEventListener("DOMContentLoaded", function () {
    // شرط الأمان الحاسم: الكود يعمل فقط وحصرياً إذا كان المستخدم داخل صفحة الانتظار create.html
    if (!window.location.pathname.includes("create.html")) return;

    // التحقق الصارم من وجود الحاويات وكود الغرفة قبل التشغيل لمنع أي أخطاء
    if (!document.getElementById("room-code-number") || !currentRoomCode) return;

    const roomRef = ref(db, "rooms/" + currentRoomCode);
    const btnHostDestroy = document.getElementById("btn-host-destroy-room");
    const hostExitModal = document.getElementById("host-exit-modal");
    const btnHostCancelExit = document.getElementById("btn-host-cancel-exit");
    const btnHostConfirmExit = document.getElementById("btn-host-confirm-exit");

    // إجبار المودال المعزول على الاختفاء الكلي فور دخول الصفحة لتنظيف واجهة اللاعبين
    if (hostExitModal) {
        hostExitModal.classList.remove("host-overlay-active");
        hostExitModal.classList.add("host-overlay-hidden");
    }

    // 1️⃣ الاستماع الحي والمستمر للسيرفر لإدارة جدار حماية مثلث الهاتف للأدمن حصرياً
    onValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
            const roomData = snapshot.val();
            const isHost = roomData.hostUID === mySecretUID;

            // قفل مثلث الهاتف الخلفي للأدمن فقط لحماية السيرفر من الخروج العفوي والتدمير بالخطأ
            if (isHost) {
                window.history.pushState({ noBack: true }, "");
                window.history.pushState({ noBack: true }, "");

                if (!window.hasPopstateListenerAttached) {
                    window.hasPopstateListenerAttached = true;
                    window.addEventListener("popstate", function (event) {
                        window.history.pushState({ noBack: true }, "");
                        if (hostExitModal) {
                            hostExitModal.classList.remove("host-overlay-hidden");
                            hostExitModal.classList.add("host-overlay-active");
                        }
                    });
                }
            }
        }
    });
    // [دالة النسف والتطهير الشامل للسيرفر والذاكرة المحلية للأدمن]
    const executeSmartExitProcess = () => {
        get(roomRef).then((snapshot) => {
            if (snapshot.exists()) {
                const roomData = snapshot.val();

                if (roomData.hostUID === mySecretUID) {
                    console.log(
                        "💥 الأدمن ينسف الغرفة.. جاري تدمير ومسح كافة النقاط التراكمية وسجلات المشتبه بهم سحابياً..."
                    );

                    // 1️⃣ إطلاق إشارة الطرد الجماعي المتزامنة لجميع الأجهزة المتصلة
                    update(ref(db, "rooms/" + currentRoomCode), {
                        "game_state/status": "host_left"
                    }).then(() => {
                        setTimeout(() => {
                            // 2️⃣ النسف الكلي والقطعي لمجلد الغرفة بالكامل من الفايربيس (يمسح اللاعبين والأدوار والأرصدة)
                            remove(roomRef).then(() => {
                                clearSessionAndDestroyLocalMemory();
                            });
                        }, 500);
                    });
                } else {
                    // وضعية خروج لاعب عادي بشكل فردي: يتم مسح اسمه فقط وتبقى الغرفة مستمرة بأرصدة البقية
                    const myPlayerKey = sessionStorage.getItem("myPlayerKeyInRoom");
                    if (myPlayerKey) {
                        const exactPlayerPath = ref(db, "rooms/" + currentRoomCode + "/players/" + myPlayerKey);
                        remove(exactPlayerPath).then(() => {
                            clearSessionAndDestroyLocalMemory();
                        });
                    } else {
                        clearSessionAndDestroyLocalMemory();
                    }
                }
            } else {
                clearSessionAndRedirect();
            }
        });
    };

    const clearSessionAndDestroyLocalMemory = () => {
        // 3️⃣ تدمير وتصفير الذاكرة المحلية والـ Session للجهاز الحالي لنسف أثر الجولة السابقة
        sessionStorage.removeItem("activeRoomCode");
        sessionStorage.removeItem("myPlayerKeyInRoom");
        sessionStorage.removeItem("lobby_initial_card_opened");

        if (hostExitModal) hostExitModal.className = "host-overlay-hidden";
        window.location.href = "rooms.html"; // قذف المستخدم لصفحة الغرف الرئيسية للبدء من جديد
    };

    // 3️⃣ ربط الزر وإدارة آلية الضغط والتنبيهات المخصصة
    if (btnHostDestroy) {
        btnHostDestroy.addEventListener("click", (e) => {
            e.preventDefault();

            // فحص سريع ومباشر لتحديد السلوك التكتيكي عند النقر
            get(roomRef)
                .then((snapshot) => {
                    if (snapshot.exists() && snapshot.val().hostUID === mySecretUID) {
                        // الأدمن يرى المودال التحذيري الشيك أولاً لتأكيد الخروج
                        if (hostExitModal) {
                            hostExitModal.classList.remove("host-overlay-hidden");
                            hostExitModal.classList.add("host-overlay-active");
                        }
                    } else {
                        // اللاعب العادي ينطلق فوراً لتنفيذ عملية مسح اسمه والمغادرة المباشرة دون تعليق
                        executeSmartExitProcess();
                    }
                })
                .catch(() => {
                    executeSmartExitProcess();
                });
        });
    }

    // زر التأكيد النهائي باللون الأحمر داخل المودال (للأدمن فقط)
    if (btnHostConfirmExit) {
        btnHostConfirmExit.addEventListener("click", function (e) {
            e.preventDefault();
            executeSmartExitProcess();
        });
    }

    // زر التراجع داخل المودال (للأدمن فقط)
    if (btnHostCancelExit) {
        btnHostCancelExit.addEventListener("click", function (e) {
            e.preventDefault();
            if (hostExitModal) {
                hostExitModal.classList.remove("host-overlay-active");
                hostExitModal.classList.add("host-overlay-hidden");
            }
        });
    }

    // الجدار الناري المتزامن للاعبين لتنظيف الذاكرة والتصفير الفوري عند نسف الغرفة
    onValue(ref(db, "rooms/" + currentRoomCode + "/game_state/status"), (snapshot) => {
        if (snapshot.exists() && snapshot.val() === "host_left") {
            console.log("🚨 الأدمن قام بنسف الغرفة! جاري تصفير ذاكرة الجهاز والتحويل الفوري...");

            // تصفير وتنظيف الذاكرة تماماً لعدم تعليق الأرصدة القديمة عند إنشاء غرفة جديدة
            sessionStorage.clear();
            window.location.href = "rooms.html";
        }
    });
});

// ==========================================================================
// محرك الخروج السيادي لصفحة القضايا (game.html) وحبس مثلث الهاتف
// ==========================================================================
document.addEventListener("DOMContentLoaded", function () {
    // شرط الأمان: يعمل فقط وحصرياً إذا كان المتصفح داخل حاوية صفحة القضايا
    if (!document.getElementById("cases-container") || !currentRoomCode) return;

    console.log("🎯 [محرك القضايا المطور]: تم تأمين مثلث الهاتف وزر الخروج بنجاح...");

    const roomRef = ref(db, "rooms/" + currentRoomCode);
    const playersListRef = ref(db, "rooms/" + currentRoomCode + "/players");
    const gameStateRef = ref(db, "rooms/" + currentRoomCode + "/game_state");

    const btnHostDestroy = document.getElementById("btn-host-destroy-room");
    const hostExitModal = document.getElementById("host-exit-modal");
    const btnHostCancelExit = document.getElementById("btn-host-cancel-exit");
    const btnHostConfirmExit = document.getElementById("btn-host-confirm-exit");
    // 🌟 إصلاح دالة الانبثاق: ربط المودال بكلاس الـ CSS الموحد المعتمد في ملف التنسيق
    const triggerSmartGameExitUI = () => {
        get(roomRef).then((snapshot) => {
            if (!snapshot.exists()) return;
            const roomData = snapshot.val();
            const isHost = roomData.hostUID === mySecretUID;

            // اصطياد عناصر المودال الداعمة المكتوبة في الـ HTML الأصلي الخاص بك
            const modalTitle =
                document.getElementById("modal-alert-title") || document.querySelector("#host-exit-modal h2");
            const modalMessage =
                document.getElementById("modal-alert-message") || document.querySelector("#host-exit-modal p");

            if (isHost) {
                // [وضعية الأدمن]: نسف وتدمير جماعي للغرفة أونلاين
                if (modalTitle) modalTitle.textContent = "💥 تدمير الغرفة أونلاين";
                if (modalMessage)
                    modalMessage.textContent =
                        "سيادة المسؤول، خروجك الآن سيؤدي إلى نسف وإلغاء هذه الغرفة كلياً وطرد جميع اللاعبين المتصلين إلى شاشة الرومز الرئيسية. هل أنت متأكد؟";

                if (hostExitModal) {
                    hostExitModal.style.setProperty("display", "flex", "important");
                    hostExitModal.className = "modal-overlay-active"; // 🌟 الاعتماد على كلاس الـ CSS الموحد لديك
                }
            } else {
                // [وضعية اللاعب العادي]: خروج فردي مشروط بالخط الأحمر لـ 3 لاعبين
                if (modalTitle) modalTitle.textContent = "🚪 مغادرة الغرفة الحالية";
                if (modalMessage)
                    modalMessage.textContent =
                        "هل أنت متأكد من رغبتك في المغادرة؟ تنبيه: إذا غادرت وقل عدد اللاعبين في السيرفر عن 3 لاعبين، فسيتم تدمير الغرفة تلقائياً وطرد الجميع.";

                if (hostExitModal) {
                    hostExitModal.style.setProperty("display", "flex", "important");
                    hostExitModal.className = "modal-overlay-active"; // 🌟 الاعتماد على كلاس الـ CSS الموحد لديك
                }
            }
        });
    };

    const clearSessionAndRedirect = () => {
        sessionStorage.removeItem("activeRoomCode");
        sessionStorage.removeItem("myPlayerKeyInRoom");
        if (hostExitModal) {
            hostExitModal.style.setProperty("display", "none", "important");
            hostExitModal.className = "host-overlay-hidden";
        }
        window.location.href = "rooms.html";
    };

    if (hostExitModal) {
        hostExitModal.style.setProperty("display", "none", "important");
        hostExitModal.className = "host-overlay-hidden";
    }

    // 1️⃣ حبس وتأمين مثلث الهاتف الخلفي لجميع اللاعبين وإجبار المودال البوكس على الانبثاق
    window.history.pushState({ noBack: true }, "");
    window.history.pushState({ noBack: true }, "");

    if (!window.hasGamePopstateListenerAttached) {
        window.hasGamePopstateListenerAttached = true;
        window.addEventListener("popstate", function (event) {
            window.history.pushState({ noBack: true }, "");
            triggerSmartGameExitUI();
        });
    }

    // 2️⃣ ربط وتفعيل زر الخروج المباشر الأصلي المتواجد في واجهتك
    if (btnHostDestroy) {
        btnHostDestroy.addEventListener("click", function (e) {
            e.preventDefault();
            triggerSmartGameExitUI();
        });
    }

    // 3️⃣ زر التأكيد النهائي باللون الأحمر داخل المودال (يفصل بدقة بين رتبة الأجهزة المتصلة)
    if (btnHostConfirmExit) {
        btnHostConfirmExit.addEventListener("click", function (e) {
            e.preventDefault();

            get(roomRef).then((snapshot) => {
                if (!snapshot.exists()) {
                    clearSessionAndRedirect();
                    return;
                }
                const roomData = snapshot.val();
                const isHost = roomData.hostUID === mySecretUID;

                if (isHost) {
                    // الأدمن يغادر: تدمير وإلغاء الغرفة كلياً وطرد الجميع فوراً
                    update(gameStateRef, { status: "host_left" }).then(() => {
                        setTimeout(() => {
                            remove(roomRef).then(() => {
                                clearSessionAndRedirect();
                            });
                        }, 500);
                    });
                } else {
                    // اللاعب العادي يغادر: مسح اسمه بالـ UID أولاً ثم فحص العدد المتبقي لحسم قرار النسف
                    const myPlayerKey = sessionStorage.getItem("myPlayerKeyInRoom");
                    const exactPlayerPath = ref(db, "rooms/" + currentRoomCode + "/players/" + myPlayerKey);

                    remove(exactPlayerPath).then(() => {
                        get(playersListRef).then((playersSnapshot) => {
                            const currentCount = playersSnapshot.exists()
                                ? Object.keys(playersSnapshot.val()).length
                                : 0;

                            if (currentCount < 3) {
                                // الخط الأحمر للعدد: قل عن 3 لاعبين، تفعيل النسف التلقائي وطرد الجميع أونلاين
                                update(gameStateRef, { status: "host_left" }).then(() => {
                                    setTimeout(() => {
                                        remove(roomRef).then(() => {
                                            clearSessionAndRedirect();
                                        });
                                    }, 500);
                                });
                            } else {
                                // العدد آمن: يخرج اللاعب بصمت وتتقلص القائمة خلفه
                                clearSessionAndRedirect();
                            }
                        });
                    });
                }
            });
        });
    }

    // زر التراجع وإغلاق المودال التحذيري الأصلي
    if (btnHostCancelExit) {
        btnHostCancelExit.addEventListener("click", function (e) {
            e.preventDefault();
            if (hostExitModal) {
                hostExitModal.style.setProperty("display", "none", "important");
                hostExitModal.className = "host-overlay-hidden";
            }
        });
    }

    // 4️⃣ الجدار الناري المتزامن للاعبين المتواجدين بصفحة الجيم لطردهم فور مغادرة الأدمن
    onValue(ref(db, "rooms/" + currentRoomCode + "/game_state/status"), (snap) => {
        if (snap.exists() && snap.val() === "host_left") {
            sessionStorage.clear();
            window.location.href = "rooms.html";
        }
    });
});

// ==========================================================================
// محرك النقرات السيادية (حظر استجواب القاضي لنفسه ومنصة الحكم الذكية للمشتبه بهم)
// ==========================================================================
if (!window.hasJudgeInterrogationEngineAttached) {
    window.hasJudgeInterrogationEngineAttached = true;

    // 1️⃣ مستمع نقر زر الاستجواب لتغيير وضعية المحكمة سحابياً
    document.addEventListener("click", function (event) {
        const btnToggle = event.target.closest("#btn-interrogate-toggle");
        if (btnToggle) {
            if (btnToggle.disabled) return;

            const gameStateRef = ref(db, "rooms/" + currentRoomCode + "/game_state");
            get(gameStateRef).then((snapshot) => {
                const gameState = snapshot.val() || {};
                const currentMode = gameState.isInterrogatingMode || false;

                update(gameStateRef, { isInterrogatingMode: !currentMode });
            });
        }
    });

    // 2️⃣ مستمع نقر كراسي الحضور (حظر كلي لاستجواب القاضي لنفسه وحظر المحامي)
    document.addEventListener("click", function (event) {
        const seatNode = event.target.closest(".court-seat-node");
        if (seatNode && currentRoomCode) {
            const targetUID = seatNode.getAttribute("data-uid");
            const targetName = seatNode.getAttribute("data-name");

            // ❌ [تعديل الأمان]: إذا نقر القاضي على كرسيه هو شخصياً، يتم حظره فوراً ولا يحدث شيء
            if (targetUID === mySecretUID) {
                console.log("سيادة قضائية: لا يمكنك استجواب نفسك في الجلسة!");
                return;
            }

            const roomRef = ref(db, "rooms/" + currentRoomCode);
            get(roomRef).then((snapshot) => {
                if (!snapshot.exists()) return;

                const roomData = snapshot.val();
                const gameState = roomData.game_state || {};
                const assignments = gameState.assignments || {};

                const myRoleCard = assignments[mySecretUID] || {};
                if (myRoleCard.role_type !== "judge") return; // حظر المحامي أو أي لاعب من العبث بالأدوار

                const isInterrogatingMode = gameState.isInterrogatingMode || false;
                const activeSpeakerUID = gameState.activeSpeakerUID || "none";
                const currentInterrogationsCount = gameState.interrogationsCount || 0;

                if (!isInterrogatingMode) return;

                const gameStateRef = ref(db, "rooms/" + currentRoomCode + "/game_state");

                if (activeSpeakerUID === targetUID) {
                    update(gameStateRef, {
                        activeSpeakerUID: "none",
                        isInterrogatingMode: false
                    });
                } else {
                    const btnToggle = document.getElementById("btn-interrogate-toggle");
                    if (btnToggle) {
                        btnToggle.disabled = true;
                        let cooldownSeconds = 5;
                        btnToggle.textContent = `تجميد (${cooldownSeconds}ث)`;
                        btnToggle.style.cursor = "not-allowed";

                        const cooldownInterval = setInterval(() => {
                            cooldownSeconds--;
                            if (cooldownSeconds <= 0) {
                                clearInterval(cooldownInterval);
                                btnToggle.disabled = false;
                                btnToggle.textContent = "استجواب لاعب";
                                btnToggle.style.cursor = "pointer";
                            } else {
                                btnToggle.textContent = `تجميد (${cooldownSeconds}ث)`;
                            }
                        }, 1000);
                    }

                    // 🌟 [تعديل مستمع نقر كراسي الحضور للقاضي - دمج عقوبة مضاعفات 9]
                    const nextCount = currentInterrogationsCount + 1;

                    // 🔨 جدار حماية عقوبة تشتيت الجلسة: إذا وصل العداد للرقم 9 ومضاعفاتها، يخصم 5 نقاط فوراً من القاضي
                    if (nextCount > 0 && nextCount % 9 === 0) {
                        const judgeScoreRef = ref(db, `rooms/${currentRoomCode}/players_scores/${mySecretUID}`);
                        get(judgeScoreRef).then((scoreSnap) => {
                            const currentScore = scoreSnap.exists() ? scoreSnap.val() : 0;
                            set(judgeScoreRef, currentScore - 5);
                            console.log(
                                `⚠️ عقوبة تشتيت الجلسة! العداد المركزي وصل إلى (${nextCount})، تم خصم 5 نقاط من رصيد القاضي.`
                            );
                        });
                    }

                    // تحديث السيرفر بالعداد الجديد والمتحدث النشط
                    update(gameStateRef, {
                        activeSpeakerUID: targetUID,
                        isInterrogatingMode: false,
                        interrogationsCount: nextCount
                    });
                }
            });
        }
    });
    // 🔨 مستمع نقر زر إصدار الحكم والمنصة القضائية الذكية للقاضي (تحقيق الجدول الأول كاملاً)
    document.addEventListener("click", function (event) {
        const btnVerdict = event.target.closest("#btn-verdict-trigger");
        if (btnVerdict) {
            if (btnVerdict.disabled) return;

            const modal = document.getElementById("custom-alert-modal");
            if (!modal) return;

            // تثبيت قطعي وصارم: تعديل نص زر الإغلاق الموحد ليصبح "إستئناف المحكمة" فوراً في مودال القاضي
            const globalCloseBtn = document.getElementById("btn-modal-close");
            if (globalCloseBtn) {
                globalCloseBtn.textContent = "إستئناف المحكمة";
            }

            get(ref(db, "rooms/" + currentRoomCode)).then((roomSnapshot) => {
                if (!roomSnapshot.exists()) return;

                const roomData = roomSnapshot.val();
                const playersData = roomData.players || {};
                const gameState = roomData.game_state || {};
                const assignments = gameState.assignments || {};
                const currentInterrogationsCount = gameState.interrogationsCount || 0;
                const totalPlayersCount = Object.keys(playersData).length;

                // اصطياد المعرف السحابي القطعي للجاني الحقيقي في الغرفة بناءً على الـ Flag
                let realGuiltyUID = "none";
                Object.keys(assignments).forEach((uid) => {
                    if (
                        assignments[uid] &&
                        (assignments[uid].is_guilty === true || assignments[uid].is_guilty === "true")
                    ) {
                        realGuiltyUID = uid;
                    }
                });

                // 🌟 [الإصلاح الجذري الشامل]: استدعاء دالتنا الكبرى الحرة مباشرة وإحالة الحسابات إليها
                const processVerdictLogic = (isCorrectDecision, targetedPlayerName, isConvictionAction, targetUID) => {
                    executeVerdictEndGame(
                        isCorrectDecision,
                        targetedPlayerName,
                        isConvictionAction,
                        targetUID,
                        assignments,
                        gameState,
                        modal,
                        globalCloseBtn
                    );
                };

                // 🌟 [الفرز السيادي والكامل لوضعية الـ 3 لاعبين]
                if (totalPlayersCount === 3) {
                    document.getElementById("modal-alert-title").textContent = "حسم قرار المحكمة النهائي";

                    let suspectName = "المتهم";
                    let suspectUID = "";
                    Object.keys(playersData).forEach((key) => {
                        const p = playersData[key];
                        if (
                            assignments[p.uid] &&
                            (assignments[p.uid].role_type === "suspect" || assignments[p.uid].is_guilty === true)
                        ) {
                            if (assignments[p.uid].role_type !== "judge" && assignments[p.uid].role_type !== "lawyer") {
                                suspectName = p.name;
                                suspectUID = p.uid;
                            }
                        }
                    });

                    let verdictHTML = `
                <div style="text-align: right; font-family: 'Alexandria', sans-serif;">
                    <p style="color: var(--text-white); font-size: 0.95rem; margin-bottom: 20px; text-align: center;">سيادة القاضي، حدد حكم المحكمة النهائي والقطعي بحق المتهم الرئيسي <strong>(${suspectName})</strong> الآن:</p>
                    <div style="display: flex; gap: 12px; width: 100%;">
                        <button id="btn-verdict-convict" style="flex: 1; padding: 12px; background: #1a1315; border: 2px solid #ff5252; color: #ff5252; font-family: 'Alexandria'; font-weight: 700; border-radius: 6px; cursor: pointer;">إدانة المتهم</button>
                        <button id="btn-verdict-acquit" style="flex: 1; padding: 12px; background: #131a18; border: 2px solid #52ff7d; color: #52ff7d; font-family: 'Alexandria'; font-weight: 700; border-radius: 6px; cursor: pointer;">براءة المتهم</button>
                    </div>
                </div>
                `;
                    document.getElementById("modal-alert-message").innerHTML = verdictHTML;

                    document.getElementById("btn-verdict-convict").addEventListener("click", function () {
                        const isCorrect = assignments[suspectUID] && assignments[suspectUID].is_guilty === true;
                        processVerdictLogic(isCorrect, suspectName, true);
                    });

                    document.getElementById("btn-verdict-acquit").addEventListener("click", function () {
                        const isCorrect = assignments[suspectUID] && assignments[suspectUID].is_guilty === false;
                        processVerdictLogic(isCorrect, suspectName, false);
                    });
                } else {
                    // وضعية الـ 4 لاعبين فأكثر تعود لنظام القائمة المفلترة للمتهمين والشهود فقط
                    document.getElementById("modal-alert-title").textContent = "منصة الحكم القضائي";

                    let verdictHTML = `
                <div style="text-align: right; font-family: 'Alexandria', sans-serif;">
                    <p style="color: var(--text-white); font-size: 0.95rem; margin-bottom: 15px; text-align: center;">سيادة القاضي، لقد اكتمل النصاب القانوني للحكم. اختر اللاعب الذي تدينه جنائياً بتهمة ارتكاب الجريمة من بين الحضور:</p>
                    <div id="verdict-players-pool" style="display: flex; flex-direction: column; gap: 10px; max-height: 180px; overflow-y: auto; padding: 5px;"></div>
                </div>
                `;
                    document.getElementById("modal-alert-message").innerHTML = verdictHTML;

                    const poolContainer = document.getElementById("verdict-players-pool");

                    Object.keys(playersData).forEach((key) => {
                        const player = playersData[key];
                        const playerRoleCard = assignments[player.uid] || {};
                        const roleName = playerRoleCard.role_name || "";

                        const isJudicialElement =
                            playerRoleCard.role_type === "judge" ||
                            playerRoleCard.role_type === "lawyer" ||
                            roleName.includes("قاضي") ||
                            roleName.includes("محامي") ||
                            roleName.includes("ادعاء");

                        if (!isJudicialElement) {
                            const btnPlayerCard = document.createElement("button");
                            btnPlayerCard.textContent = `إدانة الجاني: ${player.name} (${roleName})`;
                            btnPlayerCard.style.cssText = `
                            width: 100%; padding: 11px; background: #1a1315; border: 1px solid #ff5252;
                            color: #ff5252; font-family: 'Alexandria'; font-weight: 700; border-radius: 6px; cursor: pointer; text-align: center;
                            box-shadow: inset 0 0 10px rgba(255, 82, 82, 0.1); transition: all 0.2s ease; margin-bottom: 2px;
                        `;

                            btnPlayerCard.addEventListener("click", function () {
                                // فحص فوري للهوية السحابية للجاني
                                const isCorrect =
                                    playerRoleCard.is_guilty === true || playerRoleCard.is_guilty === "true";

                                // 🌟 تمرير الـ 4 متغيرات كاملة بالملي دون نقص لقذفها للدالة الكبرى
                                processVerdictLogic(isCorrect, player.name, true, player.uid);
                            });

                            poolContainer.appendChild(btnPlayerCard);
                        }
                    });
                }
                modal.style.setProperty("display", "flex", "important");
                modal.className = "modal-overlay-active";
            });
        }
    });
}

function injectLawyerActionControls(
    myRoleCard,
    gameStateRef,
    totalPlayersCount,
    myLawyerType,
    assignments,
    gameState,
    activeSpeakerUID
) {
    let appArena = document.getElementById("court-arena");
    if (!appArena) return;

    // استخراج اسم الدور لتحديد محامي المحكمة والقاضي بدقة مطلقة
    const roleName = myRoleCard.role_name || "";
    const isCourtLawyer =
        myRoleCard.role_type === "lawyer" && (roleName.includes("ادعاء") || roleName.includes("المحكمة"));
    const isJudgeMe = myRoleCard.role_type === "judge";
    // ==========================================================================
    // [ميزة محامي المحكمة الجديدة]: بناء وحقن منصة الحسم والقرارات القضائية
    // ==========================================================================
    if (isCourtLawyer && !document.getElementById("court-lawyer-verdict-panel")) {
        const verdictPanel = document.createElement("div");
        verdictPanel.id = "court-lawyer-verdict-panel";
        verdictPanel.style.cssText = `
            position: fixed; bottom: 85px; right: 4%; left: 4%;
            background: linear-gradient(135deg, rgba(5, 10, 18, 0.98) 0%, rgba(22, 28, 38, 0.98) 100%);
            border: 2px solid #cbb747; padding: 12px; border-radius: 12px; z-index: 999999 !important;
            box-shadow: 0 4px 25px rgba(82, 255, 125, 0.25); display: flex; flex-direction: column; gap: 8px; direction: rtl;
        `;

        const panelTitle = document.createElement("div");
        panelTitle.style.cssText =
            "font-family: 'Alexandria'; font-size: 0.8rem; color: #ffffff; font-weight: 700; text-align: center;";
        panelTitle.textContent = "منصة الحسم الجنائي";
        verdictPanel.appendChild(panelTitle);

        const listContainer = document.createElement("div");
        listContainer.style.cssText =
            "display: flex; flex-direction: column; gap: 6px; max-height: 120px; overflow-y: auto; padding-left: 4px;";

        // سحب قائمة اللاعبين الحركية لفلترة وحقن المتهمين فقط
        get(ref(db, "rooms/" + currentRoomCode + "/players")).then((playersSnapshot) => {
            if (!playersSnapshot.exists()) return;
            const playersData = playersSnapshot.val();

            Object.keys(playersData).forEach((key) => {
                const p = playersData[key];
                const playerRole = assignments[p.uid] || {};

                // ==========================================================================
                // [تعديل الجزء الأول]: منصة الحسم والتحقيق الجنائي المحدثة لمحامي المحكمة
                // ==========================================================================
                if (playerRole.role_type === "suspect") {
                    const row = document.createElement("div");
                    row.style.cssText =
                        "display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.04); padding: 7px 10px; border-radius: 6px; border: 1px solid rgba(82, 255, 125, 0.1); margin-bottom: 4px;";

                    // اسم المشتبه به ووظيفته علناً
                    const nameLabel = document.createElement("span");
                    nameLabel.style.cssText =
                        "font-family: 'Alexandria'; font-size: 0.75rem; color: #fff; font-weight: 600;";
                    nameLabel.textContent = `${p.name} (${playerRole.role_name})`;
                    row.appendChild(nameLabel);

                    // 🌟 [الشبكة المحدثة]: حاوية تجمع أزرار التحقيق والاتهام والعداد متجاورة أفقياً جنب بعضها
                    const actionsGrid = document.createElement("div");
                    actionsGrid.style.cssText = "display: flex; align-items: center; gap: 8px;";

                    // حاوية عمودية فرعية تجمع (زر السؤال والعداد الرقمي المدمج أسفله) لضمان نظافة التموضع
                    const questionWrapper = document.createElement("div");
                    questionWrapper.style.cssText =
                        "display: flex; flex-direction: column; align-items: center; justify-content: center;";

                    // أ. زر كشف الشبهة الفرعي المنسق لكل لاعب على حدة
                    const btnQuestion = document.createElement("button");
                    btnQuestion.className = `btn-question-node-${p.uid}`;
                    btnQuestion.textContent = "سؤال";
                    btnQuestion.style.cssText =
                        "padding: 5px 10px; background: var(--inner-vintage, #423423); border: 1px solid var(--gold-glow, #d5a75c); color: var(--text-white, #fff); font-family: 'Alexandria'; font-size: 0.7rem; border-radius: 4px; cursor: pointer; font-weight: 700;";
                    questionWrapper.appendChild(btnQuestion);

                    // ب. العداد الرقمي المدمج أسفل زر السؤال مباشرة لقراءة داتا هذا اللاعب
                    const questionCounter = document.createElement("span");
                    questionCounter.className = `court-questions-counter-${p.uid}`;
                    questionCounter.style.cssText =
                        "font-family: 'Alexandria', sans-serif; font-size: 0.55rem; color: var(--gold-glow, #d5a75c); font-weight: 600; margin-top: 3px; direction: rtl;";
                    questionCounter.textContent = "المتبقي: ..";
                    questionWrapper.appendChild(questionCounter);

                    // حقن حاوية الأسئلة بالكامل داخل الشبكة أفقياً
                    actionsGrid.appendChild(questionWrapper);
                    // ==========================================================================
                    // [تعديل الجزء الثاني]: محرك مسبح الأسئلة المستقل لكل لاعب + الـ Kill-Feed الخاص
                    // ==========================================================================
                    btnQuestion.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        get(gameStateRef).then((gameStateSnapshot) => {
                            if (!gameStateSnapshot.exists()) return;
                            const currentGameState = gameStateSnapshot.val();
                            const activeCaseId = currentGameState.caseId || "none";

                            if (activeCaseId === "none") {
                                console.log("⚠️ في انتظار استقرار مزامنة كود القضية السحابي...");
                                return;
                            }

                            const playerStorageKey = `remaining_prosecutor_questions_case_${activeCaseId}_${p.uid}_${currentRoomCode}`;

                            // 🌟 [تعديل حاسم للمحامي]: نسف ذاكرة التحقيق الفرعية ضد هذا اللاعب المعين فور رصد تحميل الصفحة الجديد
                            if (!window[`hasLawyerRefreshedQuestions_${p.uid}`]) {
                                window[`hasLawyerRefreshedQuestions_${p.uid}`] = true; // قفل أمان للجهاز الحالي
                                sessionStorage.removeItem(playerStorageKey); // قذف وتدمير السجلات المخزنة سابقاً قبل الريفرش
                            }

                            fetch("cases.json")
                                .then((res) => {
                                    if (!res.ok) throw new Error("فشل في تحميل ملف القضايا");
                                    return res.json();
                                })
                                .then((allCases) => {
                                    const activeCase = allCases.find((c) => c.id == activeCaseId);
                                    if (!activeCase) return;

                                    // إعادة تعبئة وتوليد المسبح كاملاً ومستقلاً للمحامي بدون أي نقص
                                    if (!sessionStorage.getItem(playerStorageKey)) {
                                        const rawPool = activeCase.radar_questions_pool || [];
                                        const questionTexts = rawPool.map((q) => q.text).filter((t) => t);
                                        sessionStorage.setItem(playerStorageKey, JSON.stringify(questionTexts));
                                    }

                                    let remainingQuestions = JSON.parse(sessionStorage.getItem(playerStorageKey));

                                    if (remainingQuestions.length === 0) {
                                        triggerKillFeedAlert(
                                            `🚨 تنبيه: لقد نفدت جميع الأسئلة المتاحة في حقيبة تحقيقاتك ضد اللاعب: ${p.name}!`,
                                            true
                                        );
                                        questionCounter.textContent = "المتبقي: 0";
                                        return;
                                    }

                                    const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
                                    const selectedQuestion = remainingQuestions[randomIndex];

                                    remainingQuestions.splice(randomIndex, 1);
                                    sessionStorage.setItem(playerStorageKey, JSON.stringify(remainingQuestions));

                                    questionCounter.textContent = `المتبقي: ${remainingQuestions.length}`;
                                    triggerKillFeedAlert(`سؤال للادعاء ضد (${p.name}): ${selectedQuestion}`, true);
                                })
                                .catch((err) => console.error("عطل في جلب الأسئلة العشوائية الفردية:", err));
                        });
                    });

                    // ==========================================================================
                    // [إضافة الجزء الثالث]: محرك التحديث التلقائي الفوري لعداد الأسئلة لكل لاعب
                    // ==========================================================================
                    get(gameStateRef).then((stateSnapshot) => {
                        if (!stateSnapshot.exists()) return;
                        const currentGameState = stateSnapshot.val();
                        const activeCaseId = currentGameState.caseId || "none";

                        if (activeCaseId !== "none") {
                            const playerStorageKey = `remaining_prosecutor_questions_case_${activeCaseId}_${p.uid}_${currentRoomCode}`;

                            // 1️⃣ فحص أولى: إذا كان هناك مصفوفة مخزنة مسبقاً لهذا اللاعب في الذاكرة
                            if (sessionStorage.getItem(playerStorageKey)) {
                                const remainingQuestions = JSON.parse(sessionStorage.getItem(playerStorageKey));
                                questionCounter.textContent = `المتبقي: ${remainingQuestions.length}`;

                                // قفل الحماية التلقائي في حال كان المحامي قد استنفد أسئلة هذا اللاعب في جولة سابقة
                                if (remainingQuestions.length === 0) {
                                    btnQuestion.disabled = true;
                                    btnQuestion.style.opacity = "0.4";
                                    btnQuestion.style.cursor = "not-allowed";
                                    btnQuestion.textContent = "🔒 نفد";
                                }
                            } else {
                                // 2️⃣ فحص احتياطي: سحب العدد الإجمالي الأصلي من الجيسون مباشرة قبل أي ضغط
                                fetch("cases.json")
                                    .then((res) => res.json())
                                    .then((allCases) => {
                                        const activeCase = allCases.find((c) => c.id == activeCaseId);
                                        const totalCount =
                                            activeCase && activeCase.radar_questions_pool
                                                ? activeCase.radar_questions_pool.length
                                                : 0;
                                        questionCounter.textContent = `المتبقي: ${totalCount}`;
                                    });
                            }
                        }
                    });

                    // ج. زر إرسال طلب اتهام جنائي الأصلي (بجوار حاوية الأسئلة مباشرة)
                    const btnAccuse = document.createElement("button");
                    btnAccuse.textContent = "🔴 اتهام";
                    btnAccuse.style.cssText =
                        "padding: 5px 10px; background: #1a1315; border: 1px solid #ff5252; color: #ff5252; font-family: 'Alexandria'; font-size: 0.7rem; border-radius: 4px; cursor: pointer; font-weight: 700; height: fit-content;";

                    // فحص القفل السحابي المحلي للاتهام لمنع الالتفاف بالريفرش
                    const isAccuseLocked = localStorage.getItem(`locked_accuse_target_${p.uid}_${currentRoomCode}`);
                    if (isAccuseLocked === "true") {
                        btnAccuse.disabled = true;
                        btnAccuse.style.opacity = "0.4";
                        btnAccuse.style.cursor = "not-allowed";
                        btnAccuse.textContent = "🔒 تم الاتهام";
                    }

                    // مستمع زر إرسال طلب اتهام جنائي المطور ليدفع المودال في وجه القاضي فوراً
                    btnAccuse.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        btnAccuse.disabled = true;
                        btnAccuse.style.opacity = "0.4";
                        btnAccuse.style.cursor = "not-allowed";
                        btnAccuse.textContent = "🔒 تم الاتهام";
                        localStorage.setItem(`locked_accuse_target_${p.uid}_${currentRoomCode}`, "true");

                        console.log(`🚀 محامي الادعاء يرسل مذكرة اتهام صارمة ضد المتهم: ${p.name}`);

                        // 🌟 [تأمين الدفع السحابي]: نحدث المرجع المباشر مع حقن كامل البيانات والطابع الزمني الفوري
                        const targetActionRef = ref(db, "rooms/" + currentRoomCode + "/game_state/court_lawyer_action");

                        set(targetActionRef, {
                            type: "convict",
                            targetUID: p.uid,
                            targetName: p.name,
                            lawyerName: myRoleCard.role_name || "محامي الادعاء",
                            timestamp: Date.now() // إجباري لكسر حماية متصفح القاضي وجعله ينبثق فوراً
                        })
                            .then(() => {
                                console.log("✅ تم حقن المذكرة في السيرفر بنجاح وفي انتظار اعتماد سيادة القاضي.");
                            })
                            .catch((err) => {
                                console.error("❌ عطل في دفع طلب المحامي للسيرفر:", err);
                            });
                    });

                    // حقن زر الاتهام داخل الشبكة المتجاورة
                    actionsGrid.appendChild(btnAccuse);

                    // حقن الشبكة بالكامل داخل الصف الرئيسي
                    row.appendChild(actionsGrid);
                    listContainer.appendChild(row);
                }
            });
        });

        verdictPanel.appendChild(listContainer);
        appArena.appendChild(verdictPanel);
    }
    // ==========================================================================
    // [مستمع القاضي السحابي]: استقطاب القرارات وقذف المودال الثالث الإجباري حياً
    // ==========================================================================
    // ==========================================================================
    // الجزء الأول: مستمع الفايربيس وبناء واجهة منصة الحسم القضائي للقاضي
    // ==========================================================================
    if (isJudgeMe && !window.hasCourtLawyerListenerAttached) {
        window.hasCourtLawyerListenerAttached = true;

        const courtActionRef = ref(db, "rooms/" + currentRoomCode + "/game_state/court_lawyer_action");
        onValue(courtActionRef, (snapshot) => {
            if (!snapshot.exists()) return;
            const actionData = snapshot.val();

            // جدار حماية لمنع انبثاق الطلبات القديمة الميتة المخزنة في السيرفر
            if (actionData.timestamp && actionData.timestamp > window.courtRoomEntryTimestamp) {
                const modal = document.getElementById("custom-alert-modal");
                if (!modal) return;

                // حجب زر الإغلاق الموحد لإجبار القاضي على حسم النزاع القضائي فوراً
                const globalCloseBtn = document.getElementById("btn-modal-close");
                if (globalCloseBtn) globalCloseBtn.style.setProperty("display", "none", "important");

                document.getElementById("modal-alert-title").textContent = "🚨 حسم قضائي من محامي المحكمة";

                const actionTypeText =
                    actionData.type === "convict"
                        ? "<span style='color:#ff5252; font-weight:800;'>[إدانة واتهام جنائي]</span>"
                        : "<span style='color:#52ff7d; font-weight:800;'>[تبرئة ساحة]</span>";

                let thirdModalHTML = `
                <div style="text-align: right; font-family: 'Alexandria', sans-serif;">
                    <p style="color: var(--text-white); font-size: 0.95rem; margin-bottom: 15px; text-align: center; line-height:1.6;">
                        سيادة القاضي، تقدم <strong>${actionData.lawyerName}</strong> بطلب رسمي قطعي يقتضي بـ ${actionTypeText} بحق المتهم: <strong>(${actionData.targetName})</strong>.
                    </p>
                    <p style="color: var(--gold-glow); font-size: 0.85rem; text-align: center; margin-bottom: 20px;">
                        بموجب سلطتك السيادية المباشرة، حدد قرار المحكمة تجاه هذا الطلب الآن:
                    </p>
                    <div style="display: flex; gap: 12px; width: 100%;">
                        <button id="btn-judge-approve-lawyer" style="flex: 1; padding: 12px; background: #131a18; border: 2px solid #52ff7d; color: #52ff7d; font-family: 'Alexandria'; font-weight: 700; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 10px rgba(82,255,125,0.15);">✅ موافقة واعتماد الحكم</button>
                        <button id="btn-judge-reject-lawyer" style="flex: 1; padding: 12px; background: #1a1315; border: 2px solid #ff5252; color: #ff5252; font-family: 'Alexandria'; font-weight: 700; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 10px rgba(255,82,82,0.15);">❌ رفض واستئناف الجلسة</button>
                    </div>
                </div>
            `;

                document.getElementById("modal-alert-message").innerHTML = thirdModalHTML;
                modal.style.setProperty("display", "flex", "important");
                modal.className = "modal-overlay-active";

                // استدعاء محرك ربط أحداث أزرار اتخاذ القرار (المسرود في الجزء الثاني)
                bindJudgeDecisionEvents(actionData, assignments, gameState, modal, globalCloseBtn);
            }
        });
    }
    // ==========================================================================
    // الجزء الثاني: محرك تشغيل وربط أحداث أزرار اتخاذ القرار المباشرة للقاضي
    // ==========================================================================
    function bindJudgeDecisionEvents(actionData, assignments, gameState, modal, globalCloseBtn) {
        // 🌟 أ. تفعيل زر موافقة واعتماد الحكم الصادر من محامي الادعاء
        const btnApprove = document.getElementById("btn-judge-approve-lawyer");
        if (btnApprove) {
            btnApprove.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation(); // 🛡️ منع المستمع العام من التدخل وإغلاق المودال صامتاً

                const targetUID = actionData.targetUID;
                const targetRoleInfo = assignments[targetUID] || {};
                const isTargetActuallyGuilty = targetRoleInfo.is_guilty === true;

                const prosecutorUID = Object.keys(assignments).find(
                    (uid) =>
                        assignments[uid]?.role_type === "lawyer" &&
                        (assignments[uid]?.role_name.includes("ادعاء") ||
                            assignments[uid]?.role_name.includes("المحكمة"))
                );
                const judgeScoreRef = ref(db, `rooms/${currentRoomCode}/players_scores/${mySecretUID}`);
                const prosecutorScoreRef = ref(db, `rooms/${currentRoomCode}/players_scores/${prosecutorUID}`);

                // التقط حالة النتيجة الصحيحة للرادار التي تم فحصها وتخزينها بالـ localStorage سابقاً
                const isRadarUsedAndMatched =
                    localStorage.getItem(`locked_radar_target_${targetUID}_${currentRoomCode}`) === "true";

                // 🎙️ ميزان حسابات اتهام محامي المنصة المباشر أو المدعوم بالرادار طبقاً للنظام الجديد
                if (!isRadarUsedAndMatched) {
                    // أ. حالات الاتهام المباشر (دون استخدام الرادار أو كتابة شبهة)
                    if (isTargetActuallyGuilty) {
                        alert(
                            `⚖️ اتهام مباشر صحيح بالمنصة الجنائية!\n- القاضي: +10 نقاط\n- محامي الادعاء: +10 نقاط\n(لم يتأثر أي فرد آخر بهذا القرار)`
                        );
                        updateScore(judgeScoreRef, 10);
                        updateScore(prosecutorScoreRef, 10);
                    } else {
                        alert(
                            `❌ اتهام مباشر خاطئ بالمنصة الجنائية!\n- القاضي: -10 نقاط\n- محامي الادعاء: -10 نقاط\n(لم يتأثر أي فرد آخر بهذا القرار)`
                        );
                        updateScore(judgeScoreRef, -10);
                        updateScore(prosecutorScoreRef, -10);
                    }
                } else {
                    // ب. حالات الاتهام بعد كشف الشبهة بالرادار
                    if (isTargetActuallyGuilty) {
                        alert(
                            `⚖️ اتهام ذكي صحيح مدعوم بالرادار!\n- القاضي: +10 نقاط\n- محامي الادعاء: +15 نقطة\n(لم يتأثر أي فرد آخر بهذا القرار)`
                        );
                        updateScore(judgeScoreRef, 10);
                        updateScore(prosecutorScoreRef, 15);
                    } else {
                        alert(
                            `❌ اتهام ذكي خاطئ مدعوم بالرادار!\n- القاضي: -10 نقاط\n- محامي الادعاء: -15 نقطة\n(لم يتأثر أي فرد آخر بهذا القرار)`
                        );
                        updateScore(judgeScoreRef, -10);
                        updateScore(prosecutorScoreRef, -15);
                    }
                }

                // تحديد ما إذا كان طلب المحامي هو إدانة (convict) أو براءة وتوجيهه لمعادلات الشجرة القضائية
                const isConviction = actionData.type === "convict";

                // استدعاء شجرة المعادلات الحسابية الكبرى (المسرودة في الجزء الثالث)
                executeVerdictEndGame(
                    isTargetActuallyGuilty,
                    actionData.targetName,
                    isConviction,
                    targetUID,
                    assignments,
                    gameState,
                    modal,
                    globalCloseBtn
                );
            });
        }

        // 🌟 ب. تفعيل زر رفض طلب محامي الادعاء وإغلاق المودال لاستئناف الجلسة
        const btnReject = document.getElementById("btn-judge-reject-lawyer");
        if (btnReject) {
            btnReject.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation(); // 🛡️ كسر تفشي النقرة لحماية الرتب والقيم البرمجية

                modal.style.setProperty("display", "none", "important");
                modal.className = "modal-overlay-hidden";
                if (globalCloseBtn) globalCloseBtn.style.setProperty("display", "block", "important");

                update(ref(db, "rooms/" + currentRoomCode + "/game_state"), { court_lawyer_action: null });
                console.log("⚖️ تم رفض طلب محامي الادعاء بنجاح واستئناف التحقيقات العامة.");
            });
        }
    }

    // دالة مساعدة داخلية لتحديث الأرصدة التراكمية بسلاسة دون تصفير
    const updateScore = (scoreRef, points) => {
        if (!scoreRef) return;
        get(scoreRef).then((snap) => {
            const current = snap.exists() ? snap.val() : 0;
            set(scoreRef, current + points);
        });
    };

    // ==========================================================================
    // الجزء الرابع: منصة التطهير السحابي الموحدة وجدار حماية عقوبة خمول الادعاء
    // ==========================================================================

    const executeForceEndTrial = () => {
        const alertModal = document.getElementById("custom-alert-modal");
        if (alertModal) {
            alertModal.style.setProperty("display", "none", "important");
            alertModal.classList.remove("modal-overlay-active");
        }

        get(ref(db, "rooms/" + currentRoomCode)).then((roomSnapshot) => {
            if (roomSnapshot.exists()) {
                const roomData = roomSnapshot.val();
                const gameState = roomData.game_state || {};
                const assignments = gameState.assignments || {};

                const prosecutorUID = Object.keys(assignments).find(
                    (uid) =>
                        assignments[uid]?.role_type === "lawyer" &&
                        (assignments[uid]?.role_name.includes("ادعاء") ||
                            assignments[uid]?.role_name.includes("المحكمة"))
                );

                // 1️⃣ [تطبيق عقوبة التخاذل القديمة المعدلة لـ -10 نقاط كما طلبت]:
                if (prosecutorUID && !gameState.court_lawyer_action) {
                    const prosecutorScoreRef = ref(db, `rooms/${currentRoomCode}/players_scores/${prosecutorUID}`);
                    get(prosecutorScoreRef).then((scoreSnap) => {
                        const currentScore = scoreSnap.exists() ? scoreSnap.val() : 0;
                        set(prosecutorScoreRef, currentScore - 10);
                        alert(
                            "🚨 عقوبة التخاذل! تم إنهاء الجلسة دون استخدام منصة محامي الادعاء، وتم خصم 10 نقاط من رصيده."
                        );
                    });
                }
            }

            // 2️⃣ استدعاء دالة التطهير الكبرى لترحيل الجميع بسلاسة أونلاين
            endCurrentCourtSession();
        });
    };

    if (myRoleCard.role_type === "lawyer" && !document.getElementById("objection-card-trigger")) {
        // 🌟 [تعديل حاسم]: إجبار العداد على العودة للرقم 2 فوراً عند الريفرش أو إعادة تحميل الواجهة
        sessionStorage.setItem("objection_cards_count", "2");

        const objectionHolder = document.createElement("div");
        objectionHolder.className = "btn-objection-holder";
        objectionHolder.id = "objection-card-trigger";

        const btnObjection = document.createElement("button");
        btnObjection.className = "btn-objection-card";

        // سيقرأ دائماً الرقم 2 عند بداية تحميل الصفحة (الريفرش)
        let count = sessionStorage.getItem("objection_cards_count");
        btnObjection.textContent = `🛑 اعتراض قضائي (${count})`;

        btnObjection.addEventListener("click", function () {
            let currentCount = parseInt(sessionStorage.getItem("objection_cards_count"));
            if (currentCount <= 0) return;

            currentCount--;
            sessionStorage.setItem("objection_cards_count", currentCount.toString());
            btnObjection.textContent = `🛑 اعتراض قضائي (${currentCount})`;

            update(gameStateRef, {
                status: "objection_active",
                activeSpeakerUID: mySecretUID,
                isInterrogatingMode: false
            });

            setTimeout(() => {
                update(gameStateRef, { status: "case_selected", activeSpeakerUID: "none" });
            }, 30000);

            if (currentCount === 0) objectionHolder.remove();
        });

        objectionHolder.appendChild(btnObjection);
        appArena.appendChild(objectionHolder);
    }

    // ==========================================================================
    // [إصلاح الجزء الخامس]: حارس إظهار حقيبة الأدلة الجنائية الموحد لجميع الرتب
    // ==========================================================================
    let showEvidenceButton = false;

    if (myRoleCard.role_type === "judge") {
        // القاضي يرى الحقيبة دائماً دون شروط
        showEvidenceButton = true;
    } else if (myRoleCard.role_type === "lawyer") {
        // المحاميان (سواء دفاع أو ادعاء) يريان الحقيبة دائماً لتدعيم المحاكمة
        showEvidenceButton = true;
    }
    if (showEvidenceButton && gameState.caseId && !document.getElementById("btn-evidence-bag-trigger")) {
        const evidenceHolder = document.createElement("div");
        evidenceHolder.id = "btn-evidence-bag-trigger";

        evidenceHolder.style.cssText =
            myRoleCard.role_type === "judge"
                ? "position: fixed; top: 70px; left: 4%; z-index: 9999999 !important; pointer-events: none !important;"
                : "position: fixed; top: 65px; left: 4%; z-index: 9999999 !important; pointer-events: none !important;";

        const btnEvidence = document.createElement("button");
        btnEvidence.className = "btn-evidence-bag-custom-node";
        btnEvidence.id = "evidence-bag-button-node";

        btnEvidence.style.cssText = `all: unset !important; background: linear-gradient(135deg, #161c26 0%, #423423 100%) !important; border: 2px solid var(--gold-glow, #d5a75c) !important; color: var(--gold-glow, #d5a75c) !important; font-family: 'Alexandria', sans-serif !important; font-weight: 700 !important; font-size: 0.69rem !important; padding: 10px 14px !important; border-radius: 8px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; box-shadow: 0 4px 15px rgba(213, 167, 92, 0.25) !important; box-sizing: border-box !important; text-align: center !important; transition: all 0.2s ease-in-out !important; pointer-events: auto !important; -webkit-tap-highlight-color: transparent !important; touch-action: manipulation !important;`;
        btnEvidence.textContent = "حقيبة الأدلة";

        // [حل JSHint الحاسم]: تحويل دالة فتح الحقيبة الموحدة لتعبير سهمي محمي لمنع خطأ W082 نهائياً وضمان عملها باللمس أو الكليك
        const openEvidenceBagHandler = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            console.log("💼 [لمس حاسم]: تم تفجير فتح حقيبة الأدلة الجنائية على الهاتف.");

            fetch("cases.json")
                .then((response) => {
                    if (!response.ok) throw new Error("فشل في تحميل ملف القضايا");
                    return response.json();
                })
                .then((allCases) => {
                    const activeCase = allCases.find((c) => c.id == gameState.caseId);
                    if (!activeCase || !activeCase.lawyers_evidence_pool) return;
                    const specificPool = activeCase.lawyers_evidence_pool[myLawyerType] || [];
                    const modal = document.getElementById("custom-alert-modal");
                    if (!modal) return;

                    document.getElementById("modal-alert-title").textContent = "💼 حقيبة الأدلة الجنائية";
                    let modalHTML = `<div class="custom-modal-scroll-area" style="text-align: right; font-family: 'Harmattan', sans-serif; font-size: 1.25rem; display: flex; flex-direction: column; gap: 12px; max-height: 280px; overflow-y: auto !important; padding: 4px 5px;">`;

                    specificPool.forEach((item) => {
                        let targetUID = "none";
                        Object.keys(assignments).forEach((uid) => {
                            const playerCard = assignments[uid] || {};
                            const roleNameInRoom = playerCard.role_name || "";
                            if (item.target_role.includes("الجاني الحقيقي") && playerCard.is_guilty === true)
                                targetUID = uid;
                            else if (
                                roleNameInRoom &&
                                item.target_role &&
                                (item.target_role.includes(roleNameInRoom) || roleNameInRoom.includes(item.target_role))
                            )
                                targetUID = uid;
                        });
                        const isTargetInterrogated = targetUID === activeSpeakerUID && activeSpeakerUID !== "none";
                        const glowClass = isTargetInterrogated
                            ? "evidence-modal-item active-evidence-glow"
                            : "evidence-modal-item";
                        modalHTML += `<p class="${glowClass}">${item.text}</p>`;
                    });
                    modalHTML += `</div>`;

                    document.getElementById("modal-alert-message").innerHTML = modalHTML;
                    modal.style.setProperty("display", "flex", "important");
                    modal.className = "modal-overlay-active";
                })
                .catch((err) => console.error("حدث خطأ في تحميل الأدلة:", err));
        };

        // [إصلاح ذهبي]: الربط المزدوج بحدث اللمس الفوري للموبايل والكليك العادي للكمبيوتر لمنع السقوط
        btnEvidence.addEventListener("touchstart", openEvidenceBagHandler, { passive: false });
        btnEvidence.addEventListener("click", openEvidenceBagHandler);

        evidenceHolder.appendChild(btnEvidence);
        appArena.appendChild(evidenceHolder);
    }

    setTimeout(() => {
        if (myRoleCard.role_type !== "judge" && !document.getElementById("request-speak-trigger")) {
            const speakHolder = document.createElement("div");
            speakHolder.id = "request-speak-trigger";
            speakHolder.style.cssText = "position: fixed; bottom: 160px; left: 4%; z-index: 999999 !important;";
            const btnSpeak = document.createElement("button");
            btnSpeak.className = "btn-request-speak";
            btnSpeak.style.cssText = `all: unset !important; background: linear-gradient(135deg, var(--deep-navy, #0d192b) 0%, var(--shadow-black, #050a18) 100%) !important; border: 2px solid var(--gold-glow, #d5a75c) !important; color: var(--gold-glow, #d5a75c) !important; font-family: 'Alexandria', sans-serif !important; font-weight: 700 !important; font-size: 0.7rem !important; padding: 10px 14px !important; border-radius: 8px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; box-shadow: 0 4px 15px rgba(213, 167, 92, 0.25) !important; box-sizing: border-box !important; text-align: center !important; transition: all 0.2s ease-in-out !important; -webkit-tap-highlight-color: transparent !important;`;
            btnSpeak.textContent = "🎙️ طلب الكلمة";
            btnSpeak.setAttribute("data-frozen", "false");
            btnSpeak.addEventListener("click", function () {
                if (btnSpeak.getAttribute("data-frozen") === "true") return;
                let myPlayerName =
                    document
                        .getElementById("seats-container")
                        ?.querySelector(`[data-uid="${mySecretUID}"]`)
                        ?.getAttribute("data-name") || "لاعب";
                update(gameStateRef, { lastSpeakRequestName: myPlayerName, requestTimestamp: Date.now() });
                btnSpeak.setAttribute("data-frozen", "true");
                btnSpeak.style.setProperty("cursor", "not-allowed", "important");
                btnSpeak.style.setProperty("opacity", "0.5", "important");
                let cooldownSeconds = 5;
                btnSpeak.textContent = `طلب الكلمة بعد(${cooldownSeconds}ث)`;
                const cooldownInterval = setInterval(() => {
                    cooldownSeconds--;
                    if (cooldownSeconds <= 0) {
                        clearInterval(cooldownInterval);
                        btnSpeak.setAttribute("data-frozen", "false");
                        btnSpeak.style.setProperty("cursor", "pointer", "important");
                        btnSpeak.style.setProperty("opacity", "1", "important");
                        btnSpeak.textContent = "🎙️ طلب الكلمة";
                    } else {
                        btnSpeak.textContent = `طلب الكلمة بعد(${cooldownSeconds}ث)`;
                    }
                }, 1000);
            });
            // ... (نهاية كود زر طلب الكلمة الحالي الخاص بك)
            speakHolder.appendChild(btnSpeak);
            appArena.appendChild(speakHolder);
        }
    }, 600);

    // ==========================================================================
    // [حقن الجزء الرابع]: زر رادار المحامي الطافي + فك قفل تراجع وإغلاق المودال
    // ==========================================================================
    if (isCourtLawyer && gameState.caseId && !document.getElementById("btn-lawyer-radar-trigger-holder")) {
        const radarHolder = document.createElement("div");
        radarHolder.id = "btn-lawyer-radar-trigger-holder";
        radarHolder.style.cssText =
            "position: fixed; top: 120px; left: 4%; z-index: 9999998 !important; pointer-events: none !important;";

        const btnRadar = document.createElement("button");
        btnRadar.className = "btn-court-lawyer-action";
        btnRadar.id = "btn-lawyer-radar-trigger";

        btnRadar.style.cssText = `all: unset !important; background: linear-gradient(135deg, #161c26 0%, #423423 100%) !important; border: 2px solid var(--gold-glow, #d5a75c) !important; color: var(--gold-glow, #d5a75c) !important; font-family: 'Alexandria', sans-serif !important; font-weight: 700 !important; font-size: 0.8rem !important; padding: 10px 14px !important; border-radius: 8px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; box-shadow: 0 4px 15px rgba(213, 167, 92, 0.25) !important; box-sizing: border-box !important; text-align: center !important; transition: all 0.2s ease-in-out !important; pointer-events: auto !important; -webkit-tap-highlight-color: transparent !important; touch-action: manipulation !important;`;
        btnRadar.textContent = "اكتشف الشبهة";

        // دالة فتح الرادار الموحدة بالفحص الفوري السحابي
        function openLawyerRadarHandler(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            console.log("📡 [لمس حاسم]: تم تفجير فتح رادار الشبهات للمحامي على الهاتف.");

            get(ref(db, "rooms/" + currentRoomCode)).then((roomSnapshot) => {
                if (!roomSnapshot.exists()) return;
                const latestRoomData = roomSnapshot.val();
                const latestPlayersData = latestRoomData.players || {};
                const latestGameState = latestRoomData.game_state || {};
                const latestAssignments = latestGameState.assignments || {};

                const latestPlayersList = Object.keys(latestPlayersData).map((key) => ({
                    id: latestPlayersData[key].uid,
                    name: latestPlayersData[key].name
                }));

                // فتح المودال مباشرة
                openJudgeRadarModal(latestPlayersList, latestAssignments, gameStateRef);

                setTimeout(() => {
                    const btnSurrender = document.getElementById("btn-radar-surrender");
                    const alertModal = document.getElementById("custom-alert-modal");
                    const globalCloseBtn = document.getElementById("btn-modal-close");

                    if (btnSurrender && alertModal) {
                        const cleanSurrenderAction = function (event) {
                            event.preventDefault();
                            event.stopPropagation();
                            alertModal.style.setProperty("display", "none", "important");
                            alertModal.className = "modal-overlay-hidden";

                            if (globalCloseBtn) {
                                globalCloseBtn.style.setProperty("display", "block", "important");
                            }
                            btnSurrender.removeEventListener("click", cleanSurrenderAction);
                            btnSurrender.removeEventListener("touchstart", cleanSurrenderAction);
                        };
                        btnSurrender.addEventListener("click", cleanSurrenderAction);
                        btnSurrender.addEventListener("touchstart", cleanSurrenderAction, { passive: false });
                    }
                }, 100);
            });
        }

        // [إصلاح ذهبي]: الربط الثنائي لضمان عمل الرادار على المتصفحات الميتة في الآيفون والأندرويد
        btnRadar.addEventListener("touchstart", openLawyerRadarHandler, { passive: false });
        btnRadar.addEventListener("click", openLawyerRadarHandler);

        radarHolder.appendChild(btnRadar);
        appArena.appendChild(radarHolder);
    }
}

function triggerKillFeedAlert(alertText, isJudgeReveal = false) {
    // 🌟 [تعديل الجزء السادس]: جدار الحماية لعزل إشعارات أسئلة المحامي وحجبها عن بقية اللاعبين
    const isPrivateLawyerAlert =
        alertText.startsWith("سؤال للادعاء") || alertText.startsWith("🚨 تنبيه: لقد نفدت جميع الأسئلة");

    // سحب رتبة اللاعب الحالي من الذاكرة لضمان المطابقة
    const myPlayerKey = sessionStorage.getItem("myPlayerKeyInRoom");

    // إذا كان الإشعار خاصاً بالتحقيق، ويستقبله جهاز لاعب آخر (غير محامي المحكمة)، يتم حظره فوراً ومنع بنائه
    if (isPrivateLawyerAlert && window.location.pathname.includes("game.html")) {
        // فحص إضافي: القاضي وبقية المشتبه بهم يخرجون من الدالة ولا يرون هذا الشريط السينمائي نهائياً
        if (myRoleCard.role_type !== "lawyer" || !myRoleCard.role_name.includes("ادعاء")) {
            return;
        }
    }

    let feedContainer = document.getElementById("kill-feed-box");
    if (!feedContainer) {
        feedContainer = document.createElement("div");
        feedContainer.id = "kill-feed-box";
        feedContainer.style.cssText = `
            position: fixed !important; top: 25px !important; left: 50% !important; transform: translateX(-50%) !important;
            display: flex !important; flex-direction: column !important; align-items: center !important; gap: 8px !important;
            z-index: 999999999 !important; width: 90% !important; max-width: 380px !important; pointer-events: auto !important;
        `;
        document.getElementById("court-arena")?.appendChild(feedContainer);
    }

    const alertNode = document.createElement("div");
    alertNode.className = "kill-feed-alert";
    alertNode.style.cssText = `
        background: linear-gradient(135deg, rgba(5, 10, 18, 0.98) 0%, rgba(13, 25, 43, 0.98) 100%) !important;
        border: 2px solid var(--gold-glow, #d5a75c) !important;
        border-right: 5px solid ${isJudgeReveal ? "#d5a75c" : "#52ff7d"} !important;
        border-radius: 8px !important; padding: 10px 16px !important; width: 100% !important;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6), 0 0 10px rgba(213, 167, 92, 0.1) !important;
        display: flex !important; align-items: center !important; justify-content: space-between !important;
        direction: rtl !important; transform: translateY(-20px) !important; opacity: 0 !important;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
    `;

    if (isJudgeReveal) {
        alertNode.innerHTML = `
            <span style="font-family: 'Alexandria', sans-serif !important; font-size: 0.85rem !important; color: #fff !important; font-weight: 600 !important; text-align: right !important; text-shadow: 0 2px 4px rgba(0,0,0,0.8) !important; flex: 1;">
                ${alertText}
            </span>
            <button class="btn-close-ticker-node" style="all: unset !important; color: #ff5252 !important; font-family: 'Alexandria', sans-serif !important; font-weight: 900 !important; font-size: 1.1rem !important; cursor: pointer !important; padding: 0 4px 0 10px !important; transition: transform 0.1s ease;">✕</button>
        `;

        alertNode.querySelector(".btn-close-ticker-node").addEventListener("click", function (e) {
            e.stopPropagation();
            alertNode.style.setProperty("transform", "translateY(-30px)", "important");
            alertNode.style.setProperty("opacity", "0", "important");
            setTimeout(() => {
                alertNode.remove();
            }, 400);
        });
    } else {
        alertNode.innerHTML = `
            <span style="font-family: 'Alexandria', sans-serif !important; font-size: 0.85rem !important; color: #fff !important; font-weight: 600 !important; text-align: center !important; text-shadow: 0 2px 4px rgba(0,0,0,0.8) !important; width: 100% !important;">
                🎙️ يطلب الكلمة: <strong style="color: var(--gold-glow, #d5a75c) !important; font-weight: 800 !important;">${alertText}</strong>
            </span>
        `;

        setTimeout(() => {
            if (alertNode.parentNode) {
                alertNode.style.setProperty("transition", "all 0.4s ease-in-out", "important");
                alertNode.style.setProperty("transform", "translateY(-30px)", "important");
                alertNode.style.setProperty("opacity", "0", "important");
                setTimeout(() => {
                    alertNode.remove();
                }, 400);
            }
        }, 4000);
    }

    feedContainer.appendChild(alertNode);
    setTimeout(() => {
        alertNode.style.setProperty("transform", "translateY(0)", "important");
        alertNode.style.setProperty("opacity", "1", "important");
    }, 50);
}

// ==========================================================================
// دالة فتح وإدارة مودال "رادار الشبهات" الموحد (نسخة الأمان المطلق)
// ==========================================================================
function openJudgeRadarModal(playersList, assignments, gameStateRef) {
    const modal = document.getElementById("custom-alert-modal");
    if (!modal) return;

    get(gameStateRef).then((stateSnap) => {
        const currentGameState = stateSnap.val() || {};
        const activeCaseId = currentGameState.caseId || "none";

        fetch("cases.json")
            .then((res) => res.json())
            .then((allCases) => {
                const activeCase = allCases.find((c) => c.id == activeCaseId);
                const evidencePool =
                    activeCase && activeCase.lawyers_evidence_pool
                        ? activeCase.lawyers_evidence_pool["court_evidence"] || []
                        : [];

                document.getElementById("modal-alert-title").textContent = "كاشف الشبهات";

                let htmlContent = `
                    <div style="text-align: right; font-family: 'Alexandria', sans-serif; direction: rtl;">
                        <label style="color: var(--gold-glow); font-size: 0.8rem; font-weight: 700; display: block; margin-bottom: 6px;">1. اختر اللاعب المستهدف:</label>
                        <select id="court-target-player" style="width: 100%; padding: 10px; background: #161c26; color: #fff; border: 1px solid var(--gold-glow); border-radius: 6px; font-family: 'Alexandria'; font-size: 0.85rem; outline: none; margin-bottom: 15px;">
                `;

                playersList.forEach((p) => {
                    const card = assignments[p.id] || {};
                    if (card.role_type !== "judge" && card.role_type !== "lawyer") {
                        htmlContent += `<option value="${p.id}">${p.name} (${card.role_name})</option>`;
                    }
                });

                htmlContent += `
                        </select>

                        <label style="color: var(--gold-glow); font-size: 0.8rem; font-weight: 700; display: block; margin-bottom: 6px;">2. اختار الدليل الذي ساعدك:</label>
                        <select id="court-verdict-type" style="width: 100%; padding: 10px; background: #161c26; color: #fff; border: 1px solid var(--gold-glow); border-radius: 6px; font-family: 'Alexandria'; font-size: 0.85rem; outline: none; margin-bottom: 15px;">
                `;

                if (evidencePool.length > 0) {
                    evidencePool.forEach((item, index) => {
                        htmlContent += `<option value="evidence_${index + 1}">${item.text}</option>`;
                    });
                } else {
                    htmlContent += `<option value="none">لا توجد أدلة مسجلة لهذه القضية حالياً</option>`;
                }

                htmlContent += `
                        </select>

                        <label style="color: var(--gold-glow); font-size: 0.8rem; font-weight: 700; display: block; margin-bottom: 6px;">3. اكتب الشبهة الجانبية المتوقعة (من 8 إلى 25 حرفاً):</label>
                        <input type="text" id="judge-radar-input" placeholder="اكتب الشبهة التي قد تشك فيها" maxlength="25" style="width:100%; padding:10px; background:#161c26; color:#fff; border:1px solid var(--gold-glow); border-radius:6px; font-family:'Alexandria'; font-size:0.75rem; outline:none; text-align:center; margin-bottom:4px;">

                        <div id="radar-status-message" style="font-size: 0.75rem; font-weight: 700; text-align: center; margin-bottom: 15px; height: 18px; color: #fff;">بانتظار كتابة الشبهة وإتمام الفحص...</div>

                        <div style="display: flex; gap: 12px; width: 100%;">
                            <button id="btn-radar-submit-reveal" disabled style="flex: 1; padding: 12px; background: #131a18; border: 2px solid #52ff7d; color: #52ff7d; font-family: 'Alexandria'; font-weight: 700; border-radius: 6px; cursor: not-allowed; opacity: 0.4;">🔒 الكشف</button>
                            <button id="btn-radar-surrender" style="flex: 1; padding: 12px; background: #1a1315; border: 2px solid #ff5252; color: #ff5252; font-family: 'Alexandria'; font-weight: 700; border-radius: 6px; cursor: pointer;">الإستسلام</button>
                        </div>
                    </div>
                `;

                // حقن الكود بالكامل
                document.getElementById("modal-alert-message").innerHTML = htmlContent;

                // حجب زر الإغلاق الموحد القديم
                const globalCloseBtn = document.getElementById("btn-modal-close");
                if (globalCloseBtn) globalCloseBtn.style.setProperty("display", "none", "important");

                // إظهار المودال فوراً
                modal.style.setProperty("display", "flex", "important");
                modal.className = "modal-overlay-active";

                // 🌟 [الربط الفوري والحاسم]: لقط الأزرار وتأمين حدث الإغلاق من المنبع لمنع التبخر الرقمي
                const inputField = document.getElementById("judge-radar-input");
                const statusMsg = document.getElementById("radar-status-message");
                const btnReveal = document.getElementById("btn-radar-submit-reveal");
                const btnSurrender = document.getElementById("btn-radar-surrender");

                if (btnSurrender) {
                    btnSurrender.addEventListener("click", function (event) {
                        event.preventDefault();
                        event.stopPropagation(); // كسر الـ Bubbling نهائياً وحماية الرتب

                        modal.style.setProperty("display", "none", "important");
                        modal.className = "modal-overlay-hidden";

                        if (globalCloseBtn) globalCloseBtn.style.setProperty("display", "block", "important");
                    });
                }

                // محرك الفحص والمطابقة الحية (شغال 100% بدون أي تجميد)
                inputField.addEventListener("input", function () {
                    const textVal = inputField.value.trim();
                    const targetUID = document.getElementById("court-target-player").value;
                    const targetRoleInfo = assignments[targetUID] || {};
                    const secretInterestText = targetRoleInfo.secret_interest || "";

                    if (textVal.length < 8) {
                        statusMsg.textContent = "⚠️ الشبهة قصيرة جداً (الحد الأدنى 8 حروف لصياغة التهمة)";
                        statusMsg.style.color = "#ffb34d";
                        btnReveal.disabled = true;
                        btnReveal.style.opacity = "0.4";
                        btnReveal.style.cursor = "not-allowed";
                        btnReveal.textContent = "🔒 الكشف";
                        return;
                    }

                    if (
                        textVal.includes("بريء") ||
                        textVal.includes("براءة") ||
                        textVal.includes("البريء") ||
                        textVal.includes("البراءة")
                    ) {
                        statusMsg.textContent = "❌ المنصة مخصصة لكشف التهمة الجنائية السرية وليس لإثبات البراءة!";
                        statusMsg.style.color = "#ff5252";
                        btnReveal.disabled = true;
                        btnReveal.style.opacity = "0.4";
                        btnReveal.style.cursor = "not-allowed";
                        btnReveal.textContent = "🔒 اكتب الشبهة";
                        return;
                    }

                    if (secretInterestText.includes(textVal) || textVal.includes(secretInterestText)) {
                        statusMsg.textContent = "✅ رصد دقيق! الشبهة متطابقة مع السجلات السرية المخفية للاعب.";
                        statusMsg.style.color = "#52ff7d";
                        btnReveal.disabled = false;
                        btnReveal.style.opacity = "1";
                        btnReveal.style.cursor = "pointer";
                        btnReveal.textContent = "تسجيل الشبهة الجانبية";
                    } else {
                        statusMsg.textContent = "❌ رصد خاطئ! لا توجد تهمة متطابقة في سجلات اللاعب السرية.";
                        statusMsg.style.color = "#ff5252";
                        btnReveal.disabled = true;
                        btnReveal.style.opacity = "0.4";
                        btnReveal.style.cursor = "not-allowed";
                        btnReveal.textContent = "خطأ في الكشف";
                    }
                });

                // ربط مستمع التأكيد السحابي للرادار
                btnReveal.addEventListener("click", () => {
                    if (btnReveal.disabled) return;
                    const targetUID = document.getElementById("court-target-player").value;
                    const targetSelect = document.getElementById("court-target-player");
                    const targetName = targetSelect.options[targetSelect.selectedIndex].text.split(" (")[0];

                    modal.style.setProperty("display", "none", "important");
                    if (globalCloseBtn) globalCloseBtn.style.setProperty("display", "block", "important");

                    // 1️⃣ حفظ محلي احتياطي للجهاز الحالي
                    localStorage.setItem(`locked_radar_target_${targetUID}_${currentRoomCode}`, "true");

                    const myRoleCard = assignments[mySecretUID] || {};
                    const isLawyerAction = myRoleCard.role_type === "lawyer";
                    const alertIdentityText = isLawyerAction
                        ? `📡 محامي الادعاء (${myRoleCard.role_name}) التقط شبهة جانبية صحيحة بحق: ${targetName}`
                        : `📡 سيادة القاضي التقط شبهة جانبية صحيحة بحق: ${targetName}`;

                    // 2️⃣ 🌟 [التوصيل السحابي]: دفع معرف اللاعب الذي تم كشفه إلى السيرفر تحت حقل مخصص ليعلم به الجميع فوراً
                    const sRef = ref(db, `rooms/${currentRoomCode}/game_state/radar_revealed_players/${targetUID}`);
                    set(sRef, true).then(() => {
                        // 3️⃣ تحديث التوقيت لبث الإشعار التيكر التلقائي
                        update(gameStateRef, {
                            radarSelectedUID: targetUID,
                            radarSelectedName: targetName,
                            radarTimestamp: Date.now()
                        }).then(() => {
                            triggerKillFeedAlert(alertIdentityText, true);
                        });
                    });
                });
            });
    });
}
// ==========================================================================
// دالة إدارة الأسئلة الفرعية للقاضي ومنع التكرار وحساب المتبقي حياً (النسخة المطهرة)
// ==========================================================================
function triggerUniqueJudgeQuestion(caseId) {
    if (!caseId || caseId === "none") return;

    fetch("cases.json")
        .then((res) => {
            if (!res.ok) throw new Error("فشل في تحميل ملف القضايا");
            return res.json();
        })
        .then((allCases) => {
            const activeCase = allCases.find((c) => c.id == caseId);
            if (!activeCase) {
                console.log("⚠️ لم يتم العثور على تفاصيل القضية رقم: " + caseId);
                return;
            }

            const storageKey = `remaining_questions_case_${caseId}_${currentRoomCode}`;

            // 🌟 [تعديل حاسم]: فحص لو كانت هذه أول نقرة بعد الريفرش، نقوم بمسح القديم وإعادة التهيئة إجبارياً
            if (!window.hasJudgeQuestionsRefreshedInCurrentSession) {
                window.hasJudgeQuestionsRefreshedInCurrentSession = true; // قفل لمنع التصفير أثناء الضغط المتتالي
                sessionStorage.removeItem(storageKey); // مسح الذاكرة القديمة العالقة قبل الريفرش
            }

            // إذا تم مسحها بالسطر السابق، سيقوم السيرفر بسحب المسبح كاملاً وجديداً بنسبة 100% من الجيسون
            if (!sessionStorage.getItem(storageKey)) {
                const rawPool = activeCase.radar_questions_pool || [];
                const questionTexts = rawPool.map((q) => q.text).filter((t) => t);
                sessionStorage.setItem(storageKey, JSON.stringify(questionTexts));
            }

            let remainingQuestions = JSON.parse(sessionStorage.getItem(storageKey));

            if (remainingQuestions.length === 0) {
                triggerKillFeedAlert("🚨 تنبيه: لقد نفدت جميع الأسئلة المتاحة في حقيبة التحقيقات لهذه القضية!", true);
                const counterTxt = document.getElementById("judge-questions-remaining-counter");
                if (counterTxt) counterTxt.textContent = "المتبقي: 0 أسئلة";
                return;
            }

            const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
            const selectedQuestion = remainingQuestions[randomIndex];

            remainingQuestions.splice(randomIndex, 1);
            sessionStorage.setItem(storageKey, JSON.stringify(remainingQuestions));

            const counterTxt = document.getElementById("judge-questions-remaining-counter");
            if (counterTxt) counterTxt.textContent = `المتبقي: ${remainingQuestions.length} أسئلة`;

            triggerKillFeedAlert("سؤال المحكمة: " + selectedQuestion, true);
        })
        .catch((err) => console.error("عطل في جلب الأسئلة العشوائية:", err));
}

// دالة تحديث نص عداد الأسئلة المتبقية دورياً لمنع حدوث ومضات فارغة في الواجهة
function updateQuestionsCounterText(caseId) {
    const counterTxt = document.getElementById("judge-questions-remaining-counter");
    if (!counterTxt || !caseId) return;

    const storageKey = `remaining_questions_case_${caseId}_${currentRoomCode}`;
    if (sessionStorage.getItem(storageKey)) {
        const remainingQuestions = JSON.parse(sessionStorage.getItem(storageKey));
        counterTxt.textContent = `المتبقي: ${remainingQuestions.length} أسئلة`;
    } else {
        // فحص أولي سريع لجلب العدد الكلي من ملف الجيسون قبل الضغط
        fetch("cases.json")
            .then((res) => res.json())
            .then((allCases) => {
                const activeCase = allCases.find((c) => c.id == caseId);
                const totalCount =
                    activeCase && activeCase.radar_questions_pool ? activeCase.radar_questions_pool.length : 0;
                counterTxt.textContent = `المتبقي: ${totalCount} أسئلة`;
            });
    }
}
// دالة الاستماع والعرض الحي للرصيد التراكمي في شاشة اللاعب (Personal Score Card)
function runLiveCloudScoreTracker() {
    if (!currentRoomCode || !mySecretUID) return;

    // المرجع السحابي المباشر لنقاط هذا الجهاز تحديداً داخل الغرفة الحالية
    const myScoreRef = ref(db, `rooms/${currentRoomCode}/players_scores/${mySecretUID}`);
    const scoreDisplayElement = document.getElementById("personal-current-score-text");

    // الاستماع اللحظي للسيرفر لتحديث الرقم فوراً عند العقوبات أو المكافآت
    onValue(myScoreRef, (snapshot) => {
        let liveScore = snapshot.exists() ? snapshot.val() : 0;

        if (scoreDisplayElement) {
            // تحديث الرقم التراكمي المحفوظ في واجهة الـ HTML السينمائية الخاصة بك
            scoreDisplayElement.textContent = liveScore;
            console.log(`📡 تحديث الرصيد السحابي المستمر للجهاز الحالي: ${liveScore} نقاط.`);
        }
    });
}

// تشغيل محرك تتبع النقاط تلقائياً عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
    runLiveCloudScoreTracker();
});
// ==========================================================================
// الجزء الثالث: شجرة المعادلات الحسابية الكبرى وقوانين النقاط القضائية المتقاطعة
// ==========================================================================
function executeVerdictEndGame(
    isCorrectDecision,
    targetedPlayerName,
    isConvictionAction,
    targetUID,
    assignments,
    gameState,
    modal,
    globalCloseBtn
) {
    if (modal) modal.style.setProperty("display", "none", "important");
    if (globalCloseBtn) globalCloseBtn.style.setProperty("display", "block", "important");

    // 🌟 [تأمين حارس قراءة الـ gameState]: ضمان قراءتها سواء تم تمريرها ككائن مستقل أو كجزء من الغرفة الكلية
    const activeGameState =
        gameState && gameState.interrogationsCount !== undefined ? gameState : gameState?.game_state || {};
    const currentInterrogationsCount = activeGameState.interrogationsCount || 0;

    // مراجع أرصدة اللاعبين المعنيين بالجلسة الحالية لتحديثها في نفس الوقت
    const judgeScoreRef = ref(db, `rooms/${currentRoomCode}/players_scores/${mySecretUID}`);
    const targetScoreRef = ref(db, `rooms/${currentRoomCode}/players_scores/${targetUID}`);

    // 1️⃣ 🌟 [الإصلاح الجذري لهوية الجاني]: البحث القطعي عن الجاني بناءً على الـ Flag السحابي الثابت (is_guilty === true)
    let realGuiltyUID = "none";
    let defenseLawyerUID = "none";

    Object.keys(assignments).forEach((uid) => {
        const roleCard = assignments[uid] || {};

        // فحص الهوية القطعي لضمان رصد الجاني بنسبة 100% في كافة القضايا دون تداخل لغوي
        if (roleCard.is_guilty === true || roleCard.is_guilty === "true") {
            realGuiltyUID = uid;
        }
        if (roleCard.role_type === "lawyer" && roleCard.role_name && roleCard.role_name.includes("دفاع")) {
            defenseLawyerUID = uid;
        }
    });

    const defenseScoreRef = ref(db, `rooms/${currentRoomCode}/players_scores/${defenseLawyerUID}`);
    const guiltyScoreRef = ref(db, `rooms/${currentRoomCode}/players_scores/${realGuiltyUID}`);

    // 🌟 [إصلاح حاسم للفحص الحركي للمتهم والتعرف القطعي على رتبته]:
    const targetRoleCard = assignments[targetUID] || {};
    const isTargetActuallyGuilty =
        (targetUID === realGuiltyUID && realGuiltyUID !== "none") ||
        targetRoleCard.is_guilty === true ||
        targetRoleCard.is_guilty === "true";

    // فحص ذكي: اللاعب يعتبر بريء لديه شبهة جانبية فقط إذا كان دور suspect ولديه جملة مصلحة سرية حقيقية غير العبارات الافتراضية للبريء
    const hasSideSuspect =
        targetRoleCard.role_type === "suspect" &&
        !isTargetActuallyGuilty &&
        targetRoleCard.secret_interest &&
        !targetRoleCard.secret_interest.includes("إثبات البراءة النزيهة") &&
        !targetRoleCard.secret_interest.includes("تلفيق الأكاذيب والحوارات");

    // ----------------------------------------------------------------------
    // 📊 قطاع أ: معالجة الاستجوابات المبكرة (الاستجواب الثاني والثالث فقط)
    // ----------------------------------------------------------------------
    // ==========================================================================
    // [تعديل سيادي]: شجرة الحسم المبكر المصححة بخصم صارم (15 للاستجواب 2) و (12 للاستجواب 3)
    // ==========================================================================
    if (currentInterrogationsCount === 2 || currentInterrogationsCount === 3) {
        let positivePoints = currentInterrogationsCount === 2 ? 20 : 17;
        let negativePoints = currentInterrogationsCount === 2 ? 15 : 12; // تثبيت العقوبة الصارمة بدقة بالملي

        get(judgeScoreRef).then((scoreSnap) => {
            const currentScore = scoreSnap.exists() ? scoreSnap.val() : 0;

            // 🛡️ [حارس الفحص السيادي الحركي]: تحديد رتبة وهوية اللاعب المستهدف حياً من الـ JSON
            const targetRoleCard = assignments[targetUID] || {};
            const isTargetInnocentImpostor = targetRoleCard.role_type === "innocent_impostor";
            const isTargetActuallyGuilty = targetRoleCard.is_guilty === true || targetRoleCard.is_guilty === "true";

            let finalPoints = 0;

            // حساب القرار بناءً على نوع الإجراء البرمجي المتخذ (إدانة أم براءة):
            if (isConvictionAction) {
                // أ. في حالة الإدانة: القرار صحيح فقط إذا كان المستهدف هو الجاني الحقيقي فعلياً
                if (isTargetActuallyGuilty) {
                    finalPoints = positivePoints;
                } else {
                    finalPoints = -negativePoints; // خصم 15 في الاستجواب 2، أو خصم 12 في الاستجواب 3
                }
            } else {
                // ب. في حالة البراءة: القرار صحيح 100% إذا كان المستهدف بريئاً تماماً (innocent_impostor) أو مشتبه به بريء
                if (isTargetInnocentImpostor || !isTargetActuallyGuilty) {
                    finalPoints = positivePoints; // 🎁 مكافأة فورية وصارمة ومنح الموجب (+20 أو +17) ومنع الخصم العكسي
                    console.log("⚖️ اعتماد سحابي سديد: براءة حقيقية لبريء محتال، تم حقن نقاط المكافأة بنجاح.");
                } else {
                    finalPoints = -negativePoints; // خصم 15 في الاستجواب 2، أو خصم 12 في الاستجواب 3 (إذا برأ الجاني)
                }
            }

            // حقن وتحديث الرصيد التراكمي الجديد في الفايربيس دون المساس بأرصدة الجولات السابقة
            set(judgeScoreRef, currentScore + finalPoints).then(() => {
                let msg =
                    finalPoints > 0
                        ? `🔨 حسم سريع وصحيح في الاستجواب (${currentInterrogationsCount})! ربحت +${positivePoints} نقطة كحكم مطلق صارم.`
                        : `⚠️ حكم خاطئ متسرع في الاستجواب (${currentInterrogationsCount})! خسرت -${negativePoints} نقطة كعقوبة مطلقة صارمة.`;
                alert(msg);
                endCurrentCourtSession();
            });
        });
        return;
    }

    // ----------------------------------------------------------------------
    // ⚖️ قطاع ب: مرحلة ما بعد الاستجواب المبكر (الرادار السحابي وشجرة الحسابات)
    // ----------------------------------------------------------------------
    // 📡 [التحقق السحابي الموحد]: قراءة حالة رادار هذا اللاعب حياً ومباشرة من داتا السيرفر
    const radarRevealedPlayers = activeGameState.radar_revealed_players || {};
    const isRadarUsedAndMatched = radarRevealedPlayers[targetUID] === true;

    if (isConvictionAction) {
        // 🔴 أولاً: شجرة حالات الإدانة (تُطبق في الـ 3 لاعبين، والـ 4 لاعبين فأكثر عند اختيار القاضي للاعب)
        if (isTargetActuallyGuilty) {
            // 1- لو المتهم جاني فعلي
            alert(
                `⚖️ حكم عادل ونزيه! أدان القاضي الجاني الفعلي (${targetedPlayerName}).\n- القاضي: +10 نقاط\n- الجاني: -10 نقاط\n- محامي الدفاع: -5 نقاط`
            );
            updateScore(judgeScoreRef, 10);
            updateScore(targetScoreRef, -10);
            updateScore(defenseScoreRef, -5);
        } else if (hasSideSuspect) {
            if (isRadarUsedAndMatched) {
                // 2- لو المتهم بريء لديه شبهة أخرى.. وقام القاضي/المحامي بكتابة شبهته بالرادار السحابي
                alert(
                    `❌ إدانة خاطئة لبريء مشبوه! لكن تم كشف وفضح شبهته بالرادار السحابي سابقاً.\n- القاضي: -5 نقاط\n- البريء المشبوه: +5 نقاط\n- محامي الدفاع: -10 نقاط`
                );
                updateScore(judgeScoreRef, -5);
                updateScore(targetScoreRef, 5);
                updateScore(defenseScoreRef, -10);
            } else {
                // 3- لو المتهم بريء لديه شبهة أخرى.. ولم يحدد القاضي شبهته من الرادار
                alert(
                    `❌ إدانة خاطئة لبريء مشبوه دون كشف الرادار السحابي!\n- القاضي: -10 نقاط\n- البريء المشبوه: +10 نقاط\n- محامي الدفاع: -5 نقاط`
                );
                updateScore(judgeScoreRef, -10);
                updateScore(targetScoreRef, 10);
                updateScore(defenseScoreRef, -5);
            }
            // منح الجاني الحقيقي المستخبّي مكافأة التضليل في حالة إدانة شخص مشتبه به آخر
            updateScore(guiltyScoreRef, 10);
        } else {
            // 4- لو المتهم بريء تماماً (ليس لديه أي شبهة جانبية في الـ JSON)
            alert(
                `❌ كارثة قضائية! تم إدانة لاعب بريء تماماً ليس لديه أي شبهة.\n- القاضي: -10 نقاط\n- الجاني الحقيقي: +10 نقاط (مكافأة تضليل)\n- المتهم البريء: +10 نقاط\n- محامي الدفاع: -15 نقطة`
            );
            updateScore(judgeScoreRef, -10);
            updateScore(guiltyScoreRef, 10);
            updateScore(targetScoreRef, 10);
            updateScore(defenseScoreRef, -15);
        }
    } else {
        // 🟢 ثانياً: شجرة حالات البراءة (تُطبق حصرياً في وضعية الـ 3 لاعبين فقط عند اختيار زر البراءة)
        if (!hasSideSuspect && !isTargetActuallyGuilty) {
            // 1- لو المتهم بريء تماماً حصل على براءة سديدة
            alert(
                `🚪 حكم عادل ونزيه! منح القاضي البراءة للاعب بريء تماماً.\n- القاضي: +10 نقاط\n- المتهم البريء: +10 نقاط\n- محامي الدفاع: +15 نقطة`
            );
            updateScore(judgeScoreRef, 10);
            updateScore(targetScoreRef, 10);
            updateScore(defenseScoreRef, 15);
        } else if (isTargetActuallyGuilty) {
            // 2- لو المتهم جاني وأفلت بالبراءة الخاطئة
            alert(
                `⚠️ كارثة قضائية! وقعت المحكمة في فخ التبرئة الخاطئة وأفلت الجاني الحقيقي بجريمته.\n- القاضي: -10 نقاط\n- الجاني الفعلي: +10 نقاط\n- محامي الدفاع: +20 نقطة (مكافأة التضليل الكبرى)`
            );
            updateScore(judgeScoreRef, -10);
            updateScore(targetScoreRef, 10);
            updateScore(defenseScoreRef, 20);
        } else if (hasSideSuspect) {
            if (isRadarUsedAndMatched) {
                // 3- لو المتهم بريء لديه شبهة .. مع اختيار الشبهة وتطابقها بالرادار السحابي
                alert(
                    `🔍 براءة مع كشف الشبهة! برأ القاضي المتهم من الجريمة الكبرى بذكاء وفضح شبهته بالرادار السحابي.\n- القاضي: +10 نقاط\n- المتهم المشبوه: -5 نقاط\n- محامي الدفاع: -5 نقاط`
                );
                updateScore(judgeScoreRef, 10);
                updateScore(targetScoreRef, -5);
                updateScore(defenseScoreRef, -5);
            } else {
                // 4- لو المتهم بريء لديه شبهة .. ولم يتم كشفها بالرادار
                alert(
                    `🚪 براءة طبيعية لمشتبه به! تبرئة من الكبرى مع نجاح المتهم في إخفاء شبهته الجانبية.\n- القاضي: +5 نقاط\n- المتهم المشبوه: +5 نقاط\n- محامي الدفاع: +10 نقاط`
                );
                updateScore(judgeScoreRef, 5);
                updateScore(targetScoreRef, 5);
                updateScore(defenseScoreRef, 10);
            }
            // منح الجاني الحقيقي المستخبّي مكافأة النجاح في التضليل
            updateScore(guiltyScoreRef, 10);
        }
    }

    // ==========================================================================
    // 🎁 قاعدة مكافأة بقية الحضور المخبأين (+5 نقاط تلقائية موثقة سحابياً)
    // ==========================================================================
    Object.keys(assignments).forEach((uid) => {
        const roleCard = assignments[uid] || {};
        const isRegularPlayer = roleCard.role_type === "suspect";
        const isNotTargeted = uid !== targetUID;

        // فحص هل اللاعب انكشف بالرادار سحابياً أو محلياً
        const isRevealedByRadar =
            radarRevealedPlayers[uid] === true ||
            localStorage.getItem(`locked_radar_target_${uid}_${currentRoomCode}`) === "true";

        if (isRegularPlayer && isNotTargeted && !isRevealedByRadar) {
            const regularPlayerScoreRef = ref(db, `rooms/${currentRoomCode}/players_scores/${uid}`);
            updateScore(regularPlayerScoreRef, 5);
            console.log(`🎁 تم منح 5 نقاط تلقائية للاعب الحاضر المخبأ بنجاح ذو المعرف: ${uid}`);
        }
    });

    // استدعاء محرك التطهير الآمن للتحويل الفوري المتزامن لجميع الأجهزة القضائية
    endCurrentCourtSession();
}

// دالة تتبع وتحديث الأرصدة التراكمية بسلاسة دون تصفير
const updateScore = (scoreRef, points) => {
    if (!scoreRef) return;
    get(scoreRef).then((snap) => {
        const current = snap.exists() ? snap.val() : 0;
        set(scoreRef, current + points);
    });
};

// 💥 دالة التطهير والإنهاء الكبرى لساحة المحكمة (تم تأمين المزامنة لمنع الـ Refresh)
const endCurrentCourtSession = () => {
    if (!currentRoomCode) return;
    const localGameStateUpdateRef = ref(db, "rooms/" + currentRoomCode + "/game_state");

    console.log("💥 إطلاق شرارة التطهير وبث التوجيه السحابي القطعي لجميع الأجهزة...");

    // 1️⃣ تنظيف الذاكرة المحلية والـ Session للجهاز الحالي للاستعداد للجولة القادمة
    sessionStorage.removeItem("lobby_initial_card_opened");
    Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith("remaining_questions_case_") || key.startsWith("remaining_prosecutor_questions_case_")) {
            sessionStorage.removeItem(key);
        }
    });

    // 2️⃣ البث السحابي الذكي: تحديث الـ status فقط لـ game_over مع الإبقاء على الـ assignments حية لتقرأها بقية الأجهزة
    // ويتم قذف جهاز القاضي فوراً إلى صفحة game.html، بينما بقية المشاهدين سيلتقطون الـ game_over من المراقب العام وينتقلون خلفه
    update(localGameStateUpdateRef, {
        status: "game_over",
        caseId: "none",
        court_lawyer_action: null,
        activeSpeakerUID: "none",
        isInterrogatingMode: false,
        interrogationsCount: 0
    }).then(() => {
        window.location.href = "game.html";
    });
};
// ==========================================================================
// 1️⃣ المودال الأول: منصة عرض السيناريو وملف الجريمة العام للغرفة (حجم مكبر فخم)
// ==========================================================================
function openCaseStoryFirstModal(roleCard, activeCase) {
    const modal = document.getElementById("custom-alert-modal");
    if (!modal) return;

    // لقط وتوسيع الحاوية الداخلية للمودال برمجياً لراحة العين ومنع الضغط
    const modalBox = modal.querySelector("div") || modal;
    if (modalBox) {
        modalBox.style.setProperty("width", "92%", "important");
        modalBox.style.setProperty("max-width", "540px", "important"); // تكبير العرض الأفقي
        modalBox.style.setProperty("min-height", "400px", "important"); // منح حد أدنى ممتاز للارتفاع
        modalBox.style.setProperty("padding", "25px 20px", "important"); // توزيع المساحة الداخلية
    }

    const globalCloseBtn = document.getElementById("btn-modal-close");
    if (globalCloseBtn) {
        globalCloseBtn.style.setProperty("display", "none", "important");
    }

    document.getElementById("modal-alert-title").textContent = `ملف القضية: ${activeCase.title}`;

    // الالتزام بنصوصك وتعديلاتك وأحجام خطوطك بدقة 100% مع زيادة الحد الأقصى للتمرير لـ 260px لضمان عدم الاختناق
    let modalHTML = `
        <div style="text-align: right; font-family: 'Alexandria', sans-serif; direction: rtl;">
            <span style="color: #52ff7d; font-weight: bold; font-size: 0.85rem; letter-spacing: 0.5px;">تفاصيل ومجريات القصة:</span>

            <p style="background: rgba(5, 10, 18, 0.6); padding: 15px; border-radius: 8px; color: #fff; font-family: 'Harmattan'; font-size: 1.2rem; line-height: 1.6; margin-top: 8px; margin-bottom: 20px; border-right: 4px solid #52ff7d; max-height: 260px; overflow-y: auto !important; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);">
                ${activeCase.description}
            </p>

            <div style="margin-bottom: 15px; background: rgba(213, 167, 92, 0.1); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(213, 167, 92, 0.2); font-size: 0.7rem; color: var(--gold-glow); text-align: center; font-weight: 600;">
                ⚠️ تنبيه قضائي: اقرأ تفاصيل القضية جيداً!
            </div>

            <button id="btn-next-to-secret-role" style="width: 100%; padding: 13px 0; background: linear-gradient(135deg, var(--gold-glow, #d5a75c) 0%, #b89149 100%); color: #050a18; font-family: 'Alexandria'; font-weight: 800; font-size: 0.8rem; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 15px rgba(213, 167, 92, 0.3); transition: all 0.2s ease; text-align: center; -webkit-tap-highlight-color: transparent;">
            إكشف دوري السري
            </button>
        </div>
    `;

    document.getElementById("modal-alert-message").innerHTML = modalHTML;
    modal.style.setProperty("display", "flex", "important");
    modal.className = "modal-overlay-active";

    document.getElementById("btn-next-to-secret-role").addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openSecretRoleSecondModal(roleCard);
    });
}

// ==========================================================================
// 2️⃣ المودال الثاني: منصة فض الأظرف وكشف الهويات والمصالح السرية (حجم مكبر فخم)
// ==========================================================================
function openSecretRoleSecondModal(roleCard) {
    const modal = document.getElementById("custom-alert-modal");
    if (!modal) return;

    // الحفاظ على الأبعاد الفخمة والمكبرة للمودال في الخطوة الثانية أيضاً
    const modalBox = modal.querySelector("div") || modal;
    if (modalBox) {
        modalBox.style.setProperty("width", "92%", "important");
        modalBox.style.setProperty("max-width", "540px", "important");
        modalBox.style.setProperty("min-height", "400px", "important");
        modalBox.style.setProperty("padding", "25px 20px", "important");
    }

    const globalCloseBtn = document.getElementById("btn-modal-close");
    if (globalCloseBtn) {
        globalCloseBtn.style.setProperty("display", "block", "important");
        globalCloseBtn.textContent = "إغلاق";

        globalCloseBtn.onclick = function () {
            modal.style.setProperty("display", "none", "important");
            modal.className = "modal-overlay-hidden";

            // تنظيف وإعادة تعيين أبعاد المودال الافتراضية عند الإغلاق تماماً حتى لا تؤثر على بقية اللعبة
            if (modalBox) {
                modalBox.style.width = "";
                modalBox.style.maxWidth = "";
                modalBox.style.minHeight = "";
                modalBox.style.padding = "";
            }
        };
    }

    document.getElementById("modal-alert-title").textContent = roleCard.role_name;

    // الالتزام بنصوصك وتعديلاتك وأحجام خطوطك المقترحة (1rem و 0.85rem و 0.7rem) بدقة 100%
    let modalHTML = `
        <div style="text-align: right; font-family: 'Alexandria', sans-serif; direction: rtl;">
            <span style="color: var(--gold-glow); font-weight: bold; font-size: 0.85rem;">روايتك العلنية أمام الحضور:</span>
            <p style="background: #161c26; padding: 12px; border-radius: 6px; color: #fff; font-family: 'Harmattan'; font-size: 1rem; line-height: 1.5; margin-top: 6px; margin-bottom: 18px; border: 1px solid rgba(213, 167, 92, 0.15);">
                ${roleCard.public_story}
            </p>
    `;

    if (roleCard.role_type !== "judge" && roleCard.role_type !== "lawyer") {
        modalHTML += `
            <span style="color: #ff5252; font-weight: bold; font-size: 0.85rem;">جريمتك المخفاة عن الكل 🤫:</span>
            <p style="background: #1e1315; padding: 12px; border-radius: 6px; border: 1px dashed #ff5252; color: #fff; font-family: 'Harmattan'; font-size: 1rem; line-height: 1.5; margin-top: 6px; box-shadow: inset 0 0 8px rgba(255,82,82,0.05);">
                ${roleCard.secret_interest}
            </p>
        `;
    } else {
        modalHTML += `
            <div style="background: rgba(213, 167, 92, 0.1); padding: 14px; border-radius: 6px; border: 1px solid var(--gold-glow); color: var(--gold-glow); text-align: center; font-size: 0.85rem; font-weight: 700; margin-top: 10px; box-shadow: inset 0 0 10px rgba(213, 167, 92, 0.15); line-height: 1.4;">
                مرسوم السيادة القضائية النزيهة:<br>
                <span style="font-weight:500; font-size:0.7rem; color:#aaa;">أنت مبرأ تماماً من أي تهمة أو مصلحة سرية خبيثة in هذه الجلسة. مصلحتك هي نصرة ميزان العدالة.</span>
            </div>
        `;
    }

    modalHTML += `</div>`;

    document.getElementById("modal-alert-message").innerHTML = modalHTML;
    modal.style.setProperty("display", "flex", "important");
    modal.className = "modal-overlay-active";
}
