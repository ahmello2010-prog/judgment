// ==========================================================================
// ⚖️ js/offline-engine.js — محرك المحاكمة المحلية (Pass & Play Offline Engine)
// محرك متكامل ومستقل 100% لإدارة جلسات الأوفلاين المحلية بدون أي اعتماد على سيرفر أو إنترنت
// ==========================================================================

import { resolvePerformanceHelp, classifyRole, escapeHtml } from "./improv.js";

export const PERMANENT_PLAYERS_STORAGE_KEY = "court_offline_permanent_players";
export const OFFLINE_SESSION_STORAGE_KEY = "court_offline_game_state";

let cachedCases = null;

// ==========================================================================
// 1. تحميل وإدارة القضايا محلياً
// ==========================================================================
export async function loadCases() {
    if (cachedCases && cachedCases.length > 0) return cachedCases;
    try {
        const res = await fetch("cases.json");
        if (!res.ok) throw new Error("فشل في تحميل ملف cases.json محلياً");
        cachedCases = await res.json();
        return cachedCases;
    } catch (err) {
        console.error("[OfflineEngine] Error loading cases:", err);
        throw err;
    }
}

export async function getCaseById(caseId) {
    const all = await loadCases();
    return all.find((c) => String(c.id) === String(caseId)) || null;
}

// ==========================================================================
// 2. إدارة اللاعبين الدائمين والرموز السرية (Unique 4-Character PINs)
// ==========================================================================
export function loadPermanentPlayers() {
    try {
        const raw = localStorage.getItem(PERMANENT_PLAYERS_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length >= 3 ? parsed : null;
    } catch (e) {
        return null;
    }
}

export function savePermanentPlayers(playersList) {
    try {
        if (!Array.isArray(playersList)) return;
        localStorage.setItem(PERMANENT_PLAYERS_STORAGE_KEY, JSON.stringify(playersList));
    } catch (e) {
        console.warn("[OfflineEngine] Failed to save permanent players:", e);
    }
}

/**
 * توليد رمز سري عشوائي مميز من 4 أرقام غير مكرر داخل مجموعة الرموز القائمة
 */
export function generateUniquePin(existingPins = []) {
    const disallowed = new Set(existingPins.map((p) => String(p || "").trim()));
    let attempts = 0;
    while (attempts < 1000) {
        attempts++;
        // 4 خانات رقمية عشوائية سهلة الإدخال والحفظ
        const num = Math.floor(1000 + Math.random() * 9000);
        const pin = String(num);
        if (!disallowed.has(pin)) {
            return pin;
        }
    }
    // احتياط في الحالات النادرة
    return String(Math.floor(Date.now() % 9000 + 1000));
}

/**
 * التحقق من تفرد الرموز السرية وعدم وجود تطابق
 */
export function validatePinsUnique(playersList = []) {
    const seen = new Map();
    for (const player of playersList) {
        const pin = String(player.pin || "").trim();
        if (!pin || pin.length < 4) {
            return {
                valid: false,
                error: `الرمز السري للاعب (${player.name || "مجهول"}) يجب أن يتكون من 4 خانات.`,
                playerId: player.id
            };
        }
        if (seen.has(pin)) {
            const otherName = seen.get(pin);
            return {
                valid: false,
                error: `رمز اللاعب (${player.name}) يطابق رمز صديقه (${otherName}). يرجى تغييره.`,
                playerId: player.id,
                duplicatePin: pin
            };
        }
        seen.set(pin, player.name);
    }
    return { valid: true };
}

// ==========================================================================
// 3. مطابقة الأدلة والأسئلة وفق بنية المشروع المعتمدة
// ==========================================================================
export function resolveEvidenceItemMatchGlobal(item, playerCard) {
    if (!item || !playerCard) return false;
    const targetRole = String(item.target_role || "");
    if (!targetRole) return false;

    if (targetRole.includes("الجاني الحقيقي") && playerCard.is_guilty === true) {
        return true;
    }
    const roleName = String(playerCard.role_name || "");
    if (!roleName) return false;

    return targetRole.includes(roleName) || roleName.includes(targetRole);
}

export function isDefenseLawyerCard(card) {
    return !!card && card.role_type === "lawyer" && String(card.role_name || "").includes("دفاع");
}

export function buildTargetedQuestionPool(fullPool = [], targetCard = {}, clientRoleName = "") {
    if (isDefenseLawyerCard(targetCard)) {
        const client = String(clientRoleName || "");
        return fullPool.filter(
            (q) =>
                q.text &&
                Array.isArray(q.fragments) &&
                (!q.about_role || !client || client.includes(q.about_role) || String(q.about_role).includes(client))
        );
    }
    return fullPool.filter(
        (q) => !Array.isArray(q.fragments) && (!q.target_role || resolveEvidenceItemMatchGlobal(q, targetCard))
    );
}

// ==========================================================================
// 4. استخراج الأسئلة المخصصة للمستهدف بحسب هوية السائل
// ==========================================================================
export function getQuestionsForTarget(activeCase, targetCard, askerRoleType = "judge", clientRoleName = "") {
    if (!activeCase || !targetCard) return [];
    const fullPool = Array.isArray(activeCase.radar_questions_pool) ? activeCase.radar_questions_pool : [];
    const questions = [];

    if (askerRoleType === "defense_lawyer") {
        // محامي الدفاع: إذا كان يستجوب موكله ولديه أسئلة مرافعة fragments
        const isClient = clientRoleName && String(targetCard.role_name || "").includes(clientRoleName);
        if (isClient) {
            const defenseFragmentsQuestions = fullPool.filter(
                (q) =>
                    q.text &&
                    Array.isArray(q.fragments) &&
                    (!q.about_role ||
                        !clientRoleName ||
                        clientRoleName.includes(q.about_role) ||
                        String(q.about_role).includes(clientRoleName))
            );
            if (defenseFragmentsQuestions.length > 0) {
                return defenseFragmentsQuestions;
            }
        }
        // استجواب مشتبه به آخر لإلقاء الشبهة عليه
        const targeted = fullPool.filter(
            (q) => !Array.isArray(q.fragments) && (!q.target_role || resolveEvidenceItemMatchGlobal(q, targetCard))
        );
        questions.push(...targeted);
    } else {
        // القاضي أو محامي الادعاء
        const targeted = fullPool.filter(
            (q) => !Array.isArray(q.fragments) && (!q.target_role || resolveEvidenceItemMatchGlobal(q, targetCard))
        );
        questions.push(...targeted);

        // إضافة ادعاءات الشخصية (claims) للاستجواب المباشر
        if (Array.isArray(targetCard.claims)) {
            targetCard.claims.forEach((c) => {
                if (c && c.text) {
                    questions.push({
                        question_id: `claim_${c.id || Math.random().toString(36).slice(2, 6)}`,
                        text: `ادعاء رسمي: "${c.text}" — هل تؤكد هذا الادعاء أمام المحكمة بالكامل؟`,
                        target_role: targetCard.role_name
                    });
                }
            });
        }
    }

    return questions;
}

// ==========================================================================
// 5. استخراج الأدلة الجنائية المخصصة للمستهدف بحسب هوية السائل
// ==========================================================================
export function getEvidenceForTarget(activeCase, targetCard, askerRoleType = "judge") {
    if (!activeCase || !activeCase.lawyers_evidence_pool || !targetCard) return [];
    const poolType = askerRoleType === "defense_lawyer" ? "defense_evidence" : "court_evidence";
    const rawList = activeCase.lawyers_evidence_pool[poolType] || [];

    return rawList.filter((item) => resolveEvidenceItemMatchGlobal(item, targetCard));
}

// ==========================================================================
// 6. توزيع الأدوار وفق القواعد المعتمدة للمشروع محلياً 100%
// ==========================================================================
export function distributeRoles(activeCase, playersList) {
    const totalPlayers = playersList.length;
    if (totalPlayers < 3) {
        throw new Error("الحد الأدنى لبدء المحاكمة هو 3 لاعبين.");
    }

    const shuffledPlayers = [...playersList].sort(() => Math.random() - 0.5);
    let finalRoles = [];
    let defenseClientUID = null;

    if (totalPlayers === 3) {
        // فرز تكتيكي لـ 3 لاعبين (36% جاني، 32% مشتبه به، 32% بريء محتال)
        let selectedSuspectCard = {};
        const diceRoll = Math.random() * 100;

        if (diceRoll <= 36) {
            // الجاني الحقيقي
            selectedSuspectCard = {
                role_name: activeCase.roles_pool?.real_guilty?.role_name || "المتهم الرئيسي",
                public_story: activeCase.roles_pool?.real_guilty?.public_story || "",
                secret_interest: activeCase.roles_pool?.real_guilty?.secret_interest || "تضليل القاضي لتنجو بجريمتك.",
                is_guilty: true,
                role_type: "suspect",
                radar_choices: activeCase.roles_pool?.real_guilty?.radar_choices || [],
                radar_correct_choice: null,
                claims: activeCase.roles_pool?.real_guilty?.claims || [],
                character_context: activeCase.roles_pool?.real_guilty?.character_context || null
            };
        } else if (diceRoll > 36 && diceRoll <= 68) {
            // مشتبه به بجريمة جانبية
            const suspects = activeCase.suspects_pool || [];
            if (suspects.length > 0) {
                const randomSuspect = suspects[Math.floor(Math.random() * suspects.length)];
                selectedSuspectCard = {
                    role_name: randomSuspect.role_name,
                    public_story: randomSuspect.public_story,
                    secret_interest: randomSuspect.secret_interest,
                    is_guilty: false,
                    role_type: "suspect",
                    radar_choices: randomSuspect.radar_choices || [],
                    radar_correct_choice: randomSuspect.radar_correct_choice || null,
                    claims: randomSuspect.claims || [],
                    character_context: randomSuspect.character_context || null
                };
            } else {
                selectedSuspectCard = {
                    role_name: activeCase.roles_pool?.real_guilty?.role_name || "المتهم الرئيسي",
                    public_story: activeCase.roles_pool?.real_guilty?.public_story || "",
                    secret_interest:
                        activeCase.roles_pool?.real_guilty?.secret_interest || "تضليل القاضي لتنجو بجريمتك.",
                    is_guilty: true,
                    role_type: "suspect",
                    radar_choices: activeCase.roles_pool?.real_guilty?.radar_choices || [],
                    radar_correct_choice: null
                };
            }
        } else {
            // بريء محتال
            const suspects = activeCase.suspects_pool || [];
            const randomSuspect = suspects[Math.floor(Math.random() * suspects.length)] || {};
            const wrongOnly = (randomSuspect.radar_choices || []).filter(
                (ch) => ch !== randomSuspect.radar_correct_choice
            );
            const otherSuspect = suspects.find((s) => s.role_name !== randomSuspect.role_name) || {};
            const extraDecoy = (otherSuspect.radar_choices || []).find(
                (ch) => ch !== otherSuspect.radar_correct_choice && !wrongOnly.includes(ch)
            );
            const impostorChoices = extraDecoy
                ? [...wrongOnly, extraDecoy].slice(0, 4)
                : [...(randomSuspect.radar_choices || [])];

            selectedSuspectCard = {
                role_name: randomSuspect.role_name || "مشتبه به غامض",
                public_story: randomSuspect.public_story || "",
                secret_interest:
                    "أنت بريء تماماً من التهمة الكبرى، ولكن عليك تلفيق الأكاذيب والحوارات البارعة ضد أدلة القاضي لتضليله وتشتيت الجلسة.",
                is_guilty: false,
                role_type: "innocent_impostor",
                radar_choices: impostorChoices,
                radar_correct_choice: null,
                claims: randomSuspect.claims || [],
                character_context: randomSuspect.character_context || null
            };
        }

        finalRoles = [
            {
                role_name: activeCase.roles_pool?.judge?.role_name || "القاضي المحقق",
                public_story: activeCase.roles_pool?.judge?.public_story || "",
                secret_interest: activeCase.roles_pool?.judge?.secret_interest || "إدارة التحقيق والوصول للحقيقة.",
                is_guilty: false,
                role_type: "judge",
                character_context: activeCase.roles_pool?.judge?.character_context || null
            },
            {
                role_name: activeCase.roles_pool?.defense_lawyer?.role_name || "محامي الدفاع",
                public_story: activeCase.roles_pool?.defense_lawyer?.public_story || "",
                secret_interest:
                    activeCase.roles_pool?.defense_lawyer?.secret_interest || "حماية موكلك وتبرئته بكافة الثغرات.",
                is_guilty: false,
                role_type: "lawyer",
                character_context: activeCase.roles_pool?.defense_lawyer?.character_context || null
            },
            selectedSuspectCard
        ];
    } else {
        // 4 لاعبين فأكثر
        finalRoles.push({
            role_name: activeCase.roles_pool?.judge?.role_name || "القاضي المحقق",
            public_story: activeCase.roles_pool?.judge?.public_story || "",
            secret_interest: activeCase.roles_pool?.judge?.secret_interest || "إدارة التحقيق والوصول للحقيقة.",
            is_guilty: false,
            role_type: "judge",
            character_context: activeCase.roles_pool?.judge?.character_context || null
        });

        finalRoles.push({
            role_name: activeCase.roles_pool?.defense_lawyer?.role_name || "محامي الدفاع",
            public_story: activeCase.roles_pool?.defense_lawyer?.public_story || "",
            secret_interest:
                activeCase.roles_pool?.defense_lawyer?.secret_interest || "حماية موكلك وتبرئته بكافة الثغرات.",
            is_guilty: false,
            role_type: "lawyer",
            character_context: activeCase.roles_pool?.defense_lawyer?.character_context || null
        });

        // الجاني الحقيقي دائماً موجود
        finalRoles.push({
            role_name: activeCase.roles_pool?.real_guilty?.role_name || "المتهم الرئيسي الجاني",
            public_story: activeCase.roles_pool?.real_guilty?.public_story || "",
            secret_interest:
                activeCase.roles_pool?.real_guilty?.secret_interest || "تضليل العدالة تماماً لتنجو بجريمتك.",
            is_guilty: true,
            role_type: "suspect",
            radar_choices: activeCase.roles_pool?.real_guilty?.radar_choices || [],
            radar_correct_choice: null,
            claims: activeCase.roles_pool?.real_guilty?.claims || [],
            character_context: activeCase.roles_pool?.real_guilty?.character_context || null
        });

        // جلب المشتبه بهم
        let suspects = (activeCase.suspects_pool || []).map((card) => ({
            role_name: card.role_name,
            public_story: card.public_story,
            secret_interest: card.secret_interest,
            is_guilty: false,
            role_type: "suspect",
            radar_choices: card.radar_choices || [],
            radar_correct_choice: card.radar_correct_choice || null,
            claims: card.claims || [],
            character_context: card.character_context || null,
            linked_to: card.linked_to || null,
            link_type: card.link_type || null,
            link_hint: card.link_hint || null
        }));
        suspects.sort(() => Math.random() - 0.5);

        // إذا كان 5 لاعبين أو أكثر: إضافة محامي الادعاء بالحق المدني
        if (totalPlayers >= 5) {
            const assistantCard = suspects.pop();
            finalRoles.push({
                role_name: "محامي الادعاء بالحق المدني",
                public_story: "أنا هنا لتمثيل الضحية والمطالبة بالقصاص العادل وإدانة الجاني الحقيقي بكل قوة أمام المحكمة.",
                secret_interest: assistantCard?.secret_interest || "كشف الثغرات المصلحية وإدانة الجاني.",
                is_guilty: false,
                role_type: "lawyer",
                character_context: {
                    what_you_know: "أنت محامي الادعاء، مهمتك توجيه الأسئلة وإبراز الأدلة الجنائية لإدانة القاتل الحقيقي.",
                    what_you_hide: "لا تخفي سراً شخصياً؛ مصلحتك هي كشف الجاني وإسقاط محاولات التضليل.",
                    acting_goal: "حاصر المشتبه بهم بالأسئلة والأدلة وأثبت تهمة القتل."
                }
            });
        }

        // إكمال بقية المقاعد من مسبح المشتبه بهم
        while (suspects.length > 0 && finalRoles.length < totalPlayers) {
            finalRoles.push(suspects.pop());
        }
    }

    // خلط الأدوار عشوائياً
    finalRoles.sort(() => Math.random() - 0.5);

    // ربط الأدوار باللاعبين
    const assignments = {};
    shuffledPlayers.forEach((player, index) => {
        const assignedRole = finalRoles[index];
        assignments[player.id] = {
            playerId: player.id,
            playerName: player.name,
            pin: player.pin,
            role_name: assignedRole.role_name,
            role_type: assignedRole.role_type,
            public_story: assignedRole.public_story,
            secret_interest: assignedRole.secret_interest,
            is_guilty: assignedRole.is_guilty === true,
            radar_choices: assignedRole.radar_choices || [],
            radar_correct_choice: assignedRole.radar_correct_choice || null,
            claims: assignedRole.claims || [],
            character_context: assignedRole.character_context || null,
            viewed: false
        };
    });

    // تعيين موكل محامي الدفاع الثابت (defense_client_uid)
    const allSuspects = Object.values(assignments).filter(
        (a) => a.role_type === "suspect" || a.role_type === "innocent_impostor"
    );
    if (allSuspects.length > 0) {
        const randomClient = allSuspects[Math.floor(Math.random() * allSuspects.length)];
        defenseClientUID = randomClient.playerId;
    }

    return {
        assignments,
        defenseClientUID
    };
}

// ==========================================================================
// 7. إدارة جلسة اللعب الحالية وتخزينها الآمن المستمر
// ==========================================================================
export function saveOfflineSession(state) {
    try {
        if (!state) return;
        localStorage.setItem(OFFLINE_SESSION_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn("[OfflineEngine] Failed to save offline session:", e);
    }
}

export function loadOfflineSession() {
    try {
        const saved = localStorage.getItem(OFFLINE_SESSION_STORAGE_KEY);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        // التحقق من صحة الجلسة المحفوظة
        if (parsed && parsed.caseId && parsed.assignments && typeof parsed.assignments === "object") {
            return parsed;
        }
        return null;
    } catch (e) {
        return null;
    }
}

export function clearOfflineSession() {
    try {
        localStorage.removeItem(OFFLINE_SESSION_STORAGE_KEY);
    } catch (e) {}
}

// ==========================================================================
// 8. احتساب الحكم النهائي والخاتمة
// ==========================================================================
export function evaluateVerdict(accusedPlayerId, assignments, activeCase) {
    const accused = assignments[accusedPlayerId];
    if (!accused) return null;

    const isCorrect = accused.is_guilty === true;

    // العثور على الجاني الفعلي
    let realGuilty = null;
    Object.values(assignments).forEach((p) => {
        if (p.is_guilty === true) realGuilty = p;
    });

    // احتساب النقاط التنافسية
    const scores = {};
    Object.values(assignments).forEach((player) => {
        let pts = 0;
        if (player.role_type === "judge") {
            pts = isCorrect ? 25 : 0;
        } else if (player.role_type === "lawyer") {
            const isDefense = String(player.role_name || "").includes("دفاع");
            if (isDefense) {
                // الدفاع يكسب نقاطاً أعلى إذا ثبتت براءة موكله أو شكك في الاتهام
                pts = isCorrect ? 8 : 18;
            } else {
                // الادعاء
                pts = isCorrect ? 20 : 5;
            }
        } else if (player.is_guilty) {
            pts = isCorrect ? 0 : 30; // الجاني يكسب الجائزة الكبرى إن خدع المحكمة
        } else {
            // مشتبه به بريء
            pts = player.playerId === accusedPlayerId ? 5 : 15;
        }

        scores[player.playerId] = {
            name: player.playerName,
            role_name: player.role_name,
            points: pts,
            is_guilty: player.is_guilty
        };
    });

    // استخراج قصة الجاني الحقيقي وخاتمة القضية
    const guiltyStory =
        realGuilty?.character_context?.what_you_hide ||
        realGuilty?.secret_interest ||
        activeCase?.roles_pool?.real_guilty?.secret_interest ||
        "تم ارتكاب الجريمة بدهاء واستغلال ثغرات المكان.";

    const caseEpilogue =
        activeCase?.description ||
        "أغلقت المحكمة ملف القضية بعد مداولات شاقة واستعراض كافة الأدلة ومواجهة المشتبه بهم.";

    return {
        isCorrect,
        accusedPlayer: accused,
        realGuiltyPlayer: realGuilty,
        guiltyStory,
        caseEpilogue,
        scores
    };
}
