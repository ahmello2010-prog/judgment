// ==========================================================================
// ⚖️ js/offline-engine.js — محرك المحاكمة المحلية (Pass & Play Offline Engine)
// ==========================================================================

import { GAME_MODES, normalizeGameMode, isImprovisationMode, buildImprovisationGuidance } from "./improv.js";

const OFFLINE_STORAGE_KEY = "court_offline_game_state";
let cachedCases = null;

// تحميل موسوعة القضايا من cases.json
export async function loadCases() {
    if (cachedCases && cachedCases.length > 0) return cachedCases;
    try {
        const res = await fetch("cases.json");
        if (!res.ok) throw new Error("Failed to load cases.json");
        cachedCases = await res.json();
        return cachedCases;
    } catch (err) {
        console.error("[OfflineEngine] Error loading cases:", err);
        throw err;
    }
}

export async function getCaseById(caseId) {
    const allCases = await loadCases();
    return allCases.find((c) => String(c.id) === String(caseId)) || null;
}

// ==========================================================================
// توزيع الأدوار وفق القواعد المعتمدة للمشروع محلياً 100%
// ==========================================================================
export function distributeRoles(activeCase, playersList, gameMode = GAME_MODES.SCRIPTED) {
    const totalPlayers = playersList.length;
    if (totalPlayers < 3) {
        throw new Error("الحد الأدنى لبدء المحاكمة هو 3 لاعبين.");
    }

    const shuffledPlayers = [...playersList].sort(() => Math.random() - 0.5);
    let finalRoles = [];

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
            character_context: card.character_context || null
        }));
        suspects.sort(() => Math.random() - 0.5);

        // إذا كان 5 لاعبين أو أكثر: محامي الادعاء
        if (totalPlayers >= 5) {
            const assistantCard = suspects.pop();
            finalRoles.push({
                role_name: "محامي الادعاء بالحق المدني",
                public_story: "أنا هنا لتمثيل الضحية والمطالبة بالقصاص العادل وإدانة الجاني.",
                secret_interest: assistantCard?.secret_interest || "كشف الثغرات المصلحية وإدانة الجاني.",
                is_guilty: false,
                role_type: "lawyer"
            });
        }

        // إكمال بقية المقاعد من المشتبه بهم
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
        let improvGuidance = null;
        if (gameMode === GAME_MODES.IMPROVISATION) {
            try {
                improvGuidance = buildImprovisationGuidance(assignedRole, activeCase);
            } catch (e) {
                console.warn("[OfflineEngine] Improv guidance error:", e);
            }
        }

        assignments[player.id] = {
            playerId: player.id,
            playerName: player.name,
            pin: player.pin,
            role_name: assignedRole.role_name,
            role_type: assignedRole.role_type,
            public_story: assignedRole.public_story,
            secret_interest: assignedRole.secret_interest,
            is_guilty: assignedRole.is_guilty,
            radar_choices: assignedRole.radar_choices || [],
            radar_correct_choice: assignedRole.radar_correct_choice || null,
            claims: assignedRole.claims || [],
            character_context: assignedRole.character_context || null,
            improvGuidance,
            viewed: false
        };
    });

    return assignments;
}

// استخراج أسئلة الاستجواب الخاصة بدور محدد
export function getQuestionsForRole(activeCase, roleName) {
    if (!activeCase) return [];
    const questions = [];

    // من radar_questions_pool
    if (Array.isArray(activeCase.radar_questions_pool)) {
        activeCase.radar_questions_pool.forEach((item) => {
            if (item.target_role === roleName || !item.target_role) {
                questions.push(item);
            }
        });
    }

    // إضافة الادعاءات الخاصة بالشخصية
    if (activeCase.roles_pool?.real_guilty?.role_name === roleName) {
        const claims = activeCase.roles_pool.real_guilty.claims || [];
        claims.forEach((c) =>
            questions.push({ text: `ادعاء المشتبه به: "${c.text}" - هل تؤكد هذا الادعاء تحت القسم؟` })
        );
    }

    const suspect = (activeCase.suspects_pool || []).find((s) => s.role_name === roleName);
    if (suspect && Array.isArray(suspect.claims)) {
        suspect.claims.forEach((c) => questions.push({ text: `ادعاء المشتبه به: "${c.text}" - ما هو ردك التفصيلي؟` }));
    }

    return questions;
}

// استخراج الأدلة الخاصة بالدفاع للقضية
export function getCluesForDefense(activeCase) {
    if (!activeCase) return [];
    if (Array.isArray(activeCase.lawyers_evidence_pool)) {
        return activeCase.lawyers_evidence_pool;
    }
    return [];
}

// إدارة وتخزين الحالة المحلية
export function saveOfflineSession(state) {
    try {
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn("[OfflineEngine] Failed to save local session:", e);
    }
}

export function loadOfflineSession() {
    try {
        const saved = localStorage.getItem(OFFLINE_STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch (e) {
        return null;
    }
}

export function clearOfflineSession() {
    try {
        localStorage.removeItem(OFFLINE_STORAGE_KEY);
    } catch (e) {}
}

// احتساب نتائج الحكم النهائي وتوزيع النقاط
export function evaluateVerdict(accusedPlayerId, assignments) {
    const accused = assignments[accusedPlayerId];
    if (!accused) return null;

    const isCorrect = accused.is_guilty === true;

    // العثور على الجاني الفعلي
    let realGuilty = null;
    Object.values(assignments).forEach((p) => {
        if (p.is_guilty === true) realGuilty = p;
    });

    // احتساب النقاط
    const scores = {};
    Object.values(assignments).forEach((player) => {
        let pts = 0;
        if (player.role_type === "judge") {
            pts = isCorrect ? 15 : 0;
        } else if (player.role_type === "lawyer") {
            pts = isCorrect ? 5 : 12; // محامي الدفاع يكسب نقاطاً أعلى إذا تمت تبرئة المتهم أو التشكيك
        } else if (player.is_guilty) {
            pts = isCorrect ? 0 : 20; // الجاني يفوز بالجائزة الكبرى إذا أفلت من القاضي
        } else {
            // مشتبه به بريء
            pts = player.playerId === accusedPlayerId ? 2 : 10;
        }
        scores[player.playerId] = {
            name: player.playerName,
            role_name: player.role_name,
            points: pts,
            is_guilty: player.is_guilty
        };
    });

    return {
        isCorrect,
        accusedPlayer: accused,
        realGuiltyPlayer: realGuilty,
        scores
    };
}
