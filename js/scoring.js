// ==========================================================================
// ⚖️ js/scoring.js — دوال النقاط والقفل البحتة (بدون Firebase وبدون DOM)
// معزولة هنا ليسهل اختبارها، ويستوردها app.js كمصدر وحيد لهذه الأرقام.
// ==========================================================================

// الحد الأدنى من الاستجوابات قبل إتاحة الحكم للقاضي أو الاتهام لمحامي الادعاء
export const MIN_INTERROGATIONS_FOR_VERDICT = 2;

// عقوبة عدم مشاركة محامي الادعاء (خصم واحد فقط إجمالاً)
export const PROSECUTOR_PASSIVITY_PENALTY = -10;

// مكافآت كاشف الشبهة عند القرار الصحيح فقط (الخاطئ = 0 دون خصم)
export const RADAR_BONUS_JUDGE = 5;
export const RADAR_BONUS_PROSECUTOR = 10;

// هل يُسمح بالاتهام/الحكم عند هذا العدد من الاستجوابات؟
export function isVerdictUnlocked(interrogationsCount) {
    return (Number(interrogationsCount) || 0) >= MIN_INTERROGATIONS_FOR_VERDICT;
}

// جدول الحسم المبكر (الاستجواب 2 أو 3 فقط) — مطابق للقيم الأصلية الموجودة في المشروع
// يرجع null خارج نافذة الحسم المبكر
export function earlyVerdictPoints(interrogationsCount) {
    if (interrogationsCount === 2) return { positive: 20, negative: 15 };
    if (interrogationsCount === 3) return { positive: 17, negative: 12 };
    return null;
}

// نقاط القاضي في الحسم المبكر
export function earlyJudgeDelta(interrogationsCount, isDecisionCorrect) {
    const t = earlyVerdictPoints(interrogationsCount);
    if (!t) return null;
    return isDecisionCorrect ? t.positive : -t.negative;
}

// محامي الادعاء يحصل على نفس نقاط الاتهام التي حصل عليها القاضي بالضبط
export function prosecutorMirrorDelta(judgeDelta) {
    return typeof judgeDelta === "number" ? judgeDelta : null;
}

// مكافأة الكاشف: تُضاف للاعب نفسه عند الصحة فقط
export function radarBonus(roleType, isCorrect) {
    if (!isCorrect) return 0;
    if (roleType === "judge") return RADAR_BONUS_JUDGE;
    if (roleType === "lawyer") return RADAR_BONUS_PROSECUTOR;
    return 0;
}

// خصم عدم المشاركة: -10 مرة واحدة إذا غاب الكاشف أو منصة الاتهام (أو كلاهما)
export function prosecutorPassivityDelta({ usedRadar, usedAccusationPlatform }) {
    return usedRadar && usedAccusationPlatform ? 0 : PROSECUTOR_PASSIVITY_PENALTY;
}

// هل استخدم اللاعب الكاشف فعلاً؟ (أي فحص مسجَّل سحابياً، صحيحاً كان أم خاطئاً)
export function hasUsedRadar(radarUsageForUid) {
    return !!radarUsageForUid && Object.keys(radarUsageForUid).length > 0;
}

// هل استخدم المحامي منصة الاتهام بنجاح؟ (سجل اتهام مؤكد الكتابة فقط — لا محاولة فاشلة)
export function hasUsedAccusationPlatform(prosecutorAccusations, prosecutorUid) {
    if (!prosecutorAccusations) return false;
    return Object.keys(prosecutorAccusations).some((k) => {
        const rec = prosecutorAccusations[k];
        return rec && rec.by === prosecutorUid && rec.confirmed === true;
    });
}

// حالة زر الاتهام لهدف معيّن — مصدر واحد لمنطق القفل في الواجهة وعند النقر
// state: "locked_interrogations" | "locked_final" | "pending_judge" | "submitting" | "unverified" | "ready"
export function accuseButtonState({
    interrogationsCount,
    alreadyAccusedTarget,
    pendingJudgeAction,
    inFlight,
    unverified
}) {
    if (alreadyAccusedTarget) return "locked_final";
    if (inFlight) return "submitting";
    if (unverified) return "unverified";
    if (!isVerdictUnlocked(interrogationsCount)) return "locked_interrogations";
    if (pendingJudgeAction) return "pending_judge";
    return "ready";
}
