// ==========================================================================
// 🎭 js/improv.js — محرك الارتجال القضائي وتوجيه الأداء (Performance + 8 Keys Engine)
// نظام توجيه الأداء ومفاتيح الارتجال الثمانية بدون أي إجابات جاهزة أو Lie/Neutral/Truth
// ==========================================================================

export const GAME_MODES = Object.freeze({
    SCRIPTED: "scripted",
    IMPROVISATION: "improvisation"
});

export const normalizeGameMode = (value) =>
    value === GAME_MODES.IMPROVISATION ? GAME_MODES.IMPROVISATION : GAME_MODES.SCRIPTED;

export const isImprovisationMode = (gameState) =>
    normalizeGameMode(gameState && gameState.gameMode) === GAME_MODES.IMPROVISATION;

export function escapeHtml(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// استخراج الجريمة الجانبية من الصيغة المعتمدة في cases.json: "... لكنك متورط في (تزوير فواتير) ..."
export function extractSideCrime(secretText) {
    const m = /[(（]([^)）]{3,80})[)）]/.exec(String(secretText || ""));
    return m ? m[1].trim() : "";
}

export function classifyRole(roleCard) {
    const card = roleCard || {};
    if (card.role_type === "judge" || card.role_type === "lawyer") return "generic";
    if (card.is_guilty === true) return "guilty";
    if (card.role_type === "innocent_impostor") return "impostor";
    if (extractSideCrime(card.secret_interest)) return "side_crime";
    return "generic";
}

// ==========================================================================
// 🛡️ نظام الـ Fallback الشامل لتوجيه الأداء ومفاتيح الارتجال الثمانية
// يُستخدم تلقائياً عند غياب performance أو keys في السؤال أو الدليل
// ==========================================================================
const FALLBACK_QUESTION_GUIDES = {
    guilty: {
        performance:
            "أنت الجاني الحقيقي ولكن لا تعترف أبداً! دافع بهدوء وهاجم بالتشكيك في توقيت الملاحظة أو دقة الشاهد. أظهر استغرابك الهادئ من الاتهام بدلاً من الغضب المتوتر، واختر تبريراً عاماً لحركتك ليلة الحادثة دون ذكر تفاصيل زائدة قد تتحول لثغرة. لا تتطوع بأي معلومة لم تُسأل عنها صراحة.",
        keys: [
            "توقيت غير دقيق",
            "تشكيك في الرؤية",
            "حجة غياب تقريبية",
            "هدوء واستغراب صريح",
            "إبعاد الشبهة لطرف ثانٍ",
            "تجنب التفاصيل الزائدة",
            "عدم وجود مصلحة مباشرة",
            "إنهاء الرد بجملة حاسمة"
        ]
    },
    impostor: {
        performance:
            "أنت بريء تماماً ولكن مهمتك تشتيت مسار التحقيق وزرع الشك! لا تؤكد ولا تنفِ بحدة، بل ألقِ تلميحاً غامضاً يلفت انتباه القاضي والمحامين إلى زاوية مريبة لم يفطن لها أحد. حافظ على وقار وهدوء وثقة، ودع الحضور يتعبون في تفسير كلامك.",
        keys: [
            "تلميح لحركة مريبة",
            "طرف غائب لم يُسأل",
            "تساؤل مشروع يربك الرواية",
            "تأويل يحتمل معنيين",
            "إعادة توجيه الاتهام",
            "ثقة مطلقة دون خوف",
            "حفظ سر البراءة في النفس",
            "ترك الباب مفتوحاً للشك"
        ]
    },
    side_crime: {
        performance:
            "أنت بريء تماماً من الجريمة الكبرى، لكن خطرك الحقيقي أن تنكشف مصلحتك السرية {crime}! دافع عن براءتك بثقة تامة واطلب دليلاً جنائياً مادياً، وقدم تفسيراً بريئاً لوجودك في المكان، وإذا اقترب السؤال من منطقتك المحظورة فارفض الخوض فيها باعتبارها شأناً شخصياً لا صلة له بالقتل.",
        keys: [
            "براءة قاطعة من الجريمة",
            "شأن شخصي بحت",
            "تفسير بريء للتواجد",
            "المطالبة بدليل جنائي صريح",
            "صدفة زمنية غير مقصودة",
            "التركيز على القضية الأصلية",
            "حماية السر من الانكشاف",
            "ثبات على الرواية الأولى"
        ]
    },
    generic: {
        performance:
            "أجب بصدق وهدوء مستنداً إلى موقعك ودورك الحقيقي في القضية. ركز على الوقائع الملموسة التي عاينتها بنفسك، وارفض التكهن بنوايا الآخرين أو تأويل ما لم تشهده. إجابتك الواثقة والمباشرة تبني مصداقيتك وتدفع الشبهة عنك تماماً.",
        keys: [
            "ما شاهدته بعيني فقط",
            "توقيت واقعي ومحدد",
            "طبيعة علاقتي بالضحية",
            "التعاون الكامل مع المحكمة",
            "نفي التكهنات والشائعات",
            "لا مصلحة لي في التضليل",
            "إجابة قصيرة ومباشرة",
            "الثبات على الحقيقة"
        ]
    }
};

const FALLBACK_EVIDENCE_GUIDES = {
    guilty: {
        performance:
            "هذا الدليل يضعك في موقف حرج! لا تنهار ولا تعترف. ركز على كسر الرابط الجنائي بين الدليل وبين نية القتل، وادّعِ وجود تفسير بديل أو أن شخصاً آخر كان قادراً على الوصول لنفس المكان أو استخدام نفس الأداة. شكك في سلسلة الحيازة أو دقة الفحص الجنائي.",
        keys: [
            "تفسير بديل لوجود الأثر",
            "كسر الرابط المباشر",
            "إمكانية وصول آخرين",
            "تشكيك في الفحص الفني",
            "الدليل لا يثبت القتل",
            "إلقاء الشبهة على الفاعل",
            "ثبات الموقف دون اعتراف",
            "طلب فحص بصمات إضافي"
        ]
    },
    impostor: {
        performance:
            "استغل هذا الدليل لإثارة مزيد من الحيرة والفضول في قاعة المحكمة! اربط الدليل بشيء غامض لاحظته سابقاً، وتحدث بنبرة من يملك قطعة مفقودة من اللغز لكنه ينتظر من القاضي أن يكتشفها بنفسه، دون أن تورط نفسك بدليل إدانة مباشر.",
        keys: [
            "ربط الدليل بواقعة غامضة",
            "توجيه الشك نحو ثغرة خفية",
            "تساؤل عن توقيت ظهور الدليل",
            "إظهار الفطنة لا الخوف",
            "تلميح بوجود فخ مدبر",
            "دعوة القاضي لإعادة النظر",
            "تشتيت تركيز الادعاء",
            "الحفاظ على هالة الغموض"
        ]
    },
    side_crime: {
        performance:
            "الدليل قد يقترب من تورطك في {crime}! اعترف بأن لديك أسراراً أو خلافات صغيرة إن حوصرت، لكن أكد بقوة أن هذا الدليل يتعلق بأمور تجارية أو شخصية لا تمت بصلة لجريمة القتل. افرق بوضوح بين الخطأ الجانبي والقتل العمد.",
        keys: [
            "الدليل يخص خلافاً جانبياً",
            "لا صلة له بالقتل العمد",
            "تفسير بديل لنشاطي",
            "عدم الخلط بين الأمرين",
            "أوراق وأدلة مستقلة",
            "الدفاع بشراسة عن البراءة",
            "حصر الضرر في أضيق نطاق",
            "المطالبة بربط الدليل بالجريمة"
        ]
    },
    generic: {
        performance:
            "هذا الدليل يواجهك به المحامي لمحاصرتك. واجهه بهدوء وبيّن أن وجودك أو توافق أي أثر معك كان أمراً اعتيادياً بحكم عملك أو موقعك، واشرح للمحكمة المنطق البسيط وراء الواقعة دون توتر.",
        keys: [
            "طبيعة عملي وتواجدي اليومي",
            "سياق طبيعي غير مريب",
            "عدم وجود بصمات تثبت الجريمة",
            "شهود يؤكدون حسن السيرة",
            "شرح المنطق بوضوح",
            "التأكيد على البراءة",
            "تفنيد تفسير المحامي",
            "احترام قرارات المحكمة"
        ]
    }
};

/**
 * يضمن إعادة مصفوفة تحتوي على 8 مفاتيح بالتمام والكمال
 */
function ensureEightKeys(rawKeys, fallbackKeys) {
    let list = [];
    if (Array.isArray(rawKeys) && rawKeys.length > 0) {
        list = rawKeys.map((k) => String(k).trim()).filter(Boolean);
    }
    if (list.length >= 8) {
        return list.slice(0, 8);
    }
    // إكمال النقص من الـ fallback لضمان 8 مفاتيح
    const pool = Array.isArray(fallbackKeys) ? fallbackKeys : [];
    for (const key of pool) {
        if (list.length >= 8) break;
        if (!list.includes(key)) {
            list.push(key);
        }
    }
    return list.slice(0, 8);
}

/**
 * 🌟 الدالة المركزية لحل توجيه الأداء ومفاتيح الارتجال (resolvePerformanceHelp)
 * تقرأ من JSON إن وُجدت (performance و keys)، وتلجأ للـ fallback الذكي تلقائياً
 */
export function resolvePerformanceHelp(context = {}) {
    const type = context.type === "evidence" ? "evidence" : "question";
    const item = context.item || {};
    const roleCard = context.roleCard || window.myCurrentRoleCard || {};
    const category = context.category || classifyRole(roleCard);
    // 🌟 [Judgment]: الـ fallback العام يُستخدم فقط لجسر وضع الارتجال القديم؛ المسار الأساسي يعتمد على بيانات العنصر نفسه
    const allowFallback = context.allowFallback === true;
    const crime = category === "side_crime" ? extractSideCrime(roleCard.secret_interest) : "";

    const fallbackSource = type === "evidence" ? FALLBACK_EVIDENCE_GUIDES : FALLBACK_QUESTION_GUIDES;
    const fallbackCategoryGuide = fallbackSource[category] || fallbackSource.generic;

    // 1. استخراج الـ Performance (التوجيه الأدائي)
    let performanceText = "";
    if (item.performance && typeof item.performance === "string") {
        performanceText = item.performance.trim();
    } else if (item.performance_direction && typeof item.performance_direction === "string") {
        performanceText = item.performance_direction.trim();
    } else if (item.performance && typeof item.performance === "object") {
        // دعم الصيغ الموجهة حسب الفئة (by_category) إن وجدت في الـ JSON مستقبلاً
        performanceText = (item.performance[category] || item.performance.default || "").trim();
    } else if (item.by_category && item.by_category[category] && item.by_category[category].performance) {
        performanceText = item.by_category[category].performance.trim();
    }

    if (!performanceText) {
        performanceText = allowFallback
            ? fallbackCategoryGuide.performance
            : "أجب من موقع شخصيتك ودورك في القضية، واستخدم ما تعرفه فقط دون اختراع وقائع جديدة.";
    }

    // استبدال {crime} باسم الجريمة الجانبية الحقيقية إن وجدت
    if (crime) {
        performanceText = performanceText.replace(/\{crime\}/g, `«${crime}»`);
    } else {
        performanceText = performanceText.replace(/\{crime\}/g, "مصلحتك السرية");
    }

    // 2. استخراج الـ Keys (المفاتيح الثمانية)
    let rawKeys = null;
    if (Array.isArray(item.keys)) {
        rawKeys = item.keys;
    } else if (Array.isArray(item.improvisation_keys)) {
        rawKeys = item.improvisation_keys;
    } else if (item.keys && typeof item.keys === "object" && Array.isArray(item.keys[category])) {
        rawKeys = item.keys[category];
    } else if (item.by_category && item.by_category[category] && Array.isArray(item.by_category[category].keys)) {
        rawKeys = item.by_category[category].keys;
    }

    const keys = allowFallback
        ? ensureEightKeys(rawKeys, fallbackCategoryGuide.keys)
        : Array.isArray(rawKeys)
          ? rawKeys
                .map((k) => String(k).trim())
                .filter(Boolean)
                .slice(0, 8)
          : [];

    return {
        type,
        category,
        performance: performanceText,
        keys
    };
}

// جسر توافق برمجي للمرجعيات السابقة
export function buildImprovisationGuidance(responseType, roleCard) {
    const help = resolvePerformanceHelp({ type: "question", roleCard, allowFallback: true });
    return {
        title: "توجيه الأداء والارتجال",
        category: help.category,
        bodyHtml: escapeHtml(help.performance),
        tipText: help.keys.slice(0, 3).join(" • "),
        speechText: `توجيه الأداء: ${help.performance}`
    };
}
