// ==========================================================================
// 🌍 js/i18n.js — Comprehensive Internationalization (Arabic & English) Engine
// محرك الترجمة الشامل الموحد لموقع محكمة الأدوار (عربي / إنجليزي)
// ==========================================================================

export const LANGUAGE_STORAGE_KEY = "court_language";
export const DEFAULT_LANGUAGE = "ar";

export const translations = {
    ar: {
        // App branding & General
        "app.name": "محكمة الأدوار",
        "app.tagline": "لعبة التحقيق والاستراتيجية الذهنية",
        "btn.lang_label": "EN",
        "btn.lang_title": "التحويل إلى اللغة الإنجليزية (Switch to English)",
        "btn.back": "رجوع",
        "btn.close": "إغلاق",
        "btn.cancel": "إلغاء",
        "btn.confirm": "تأكيد",
        "btn.continue": "متابعة",
        "btn.save": "حفظ",
        "btn.ok": "حسناً",
        "btn.understood": "حسناً، فهمت",
        "btn.leave": "مغادرة",
        "btn.exit": "خروج",
        "btn.refresh": "تحديث",
        "status.loading": "جاري التحميل...",
        "status.processing": "جاري معالجة البيانات...",
        "custom_alert_title": "تنبيه قضائي",
        "personal_score_label": "رصيدك",

        // First time offline modal & alerts
        "offline.first_time_title": "تنبيه الزيارة الأولى",
        "offline.first_time_msg": "عزيزي اللاعب .. مرحبا بك في محكمة الأدوار .. لكي تبدأ التجربة في زيارتك الاولى يرجى تشغيل الانترنت حتى يتاح لك اللعب بلا انترنت في اي وقت اخر .. شكرا لصبرك",
        "offline.online_required_msg": "لا يمكن استخدام إنشاء أو الانضمام إلى غرفة بدون اتصال بالإنترنت.\nفعّل الإنترنت ثم حاول مرة أخرى.",
        "offline.notice_banner": "⚠️ وضع عدم الاتصال مفعل: يمكنك بدء الجلسات الأوفلاين فوراً، بينما تتطلب الغرف الجماعية عبر الإنترنت اتصالاً بالشبكة.",
        "offline.redirect_alert": "تم توجيهك إلى وضع عدم الاتصال نظراً لانقطاع شبكة الإنترنت.",

        // index.html (Splash)
        "index.welcome_title": "محكمة الأدوار",
        "index.welcome_part1": "مرحباً بك في محكمة الأدوار",
        "index.welcome_part2": "حيث عالم التحقيق والاستراتيجية الذهنية",
        "index.start_game": "ابدأ اللعبة",
        "index.page_title": "محكمة الأدوار - شاشة الترحيب",

        // rooms.html (Foyer / Lobby Selection)
        "rooms.page_title": "محكمة الأدوار - بهو القضايا والتحقيق",
        "rooms.sidebar_title": "قائمة الإعدادات",
        "rooms.radio_title": "مشغل الراديو",
        "rooms.radio_playing": "تشغيل",
        "rooms.radio_stopped": "إيقاف",
        "rooms.user_guide": "دليل المستخدم",
        "rooms.rooms_log": "سجل الغرف",
        "rooms.translation_notice_title": "تنبيه الترجمة",
        "rooms.translation_notice_body": "الترجمة لا تزال قيد الإنجاز ولم تكتمل بعد على جميع نصوص اللعبة، بالأخص نصوص القضايا وتفاصيل الأدوار. ترقبوا آخر التحديثات حتى تحصلوا على الترجمة كاملة!",
        "rooms.download_game": "📥 تحميل اللعبة",
        "rooms.download_note": "رابط لعبتي لا تنسى تحميله لتحظى بتجربة لعب امتع",
        "rooms.foyer_badge": "بهو القضايا والتحقيق",
        "rooms.foyer_title": "محكمة الأدوار",
        "rooms.foyer_subtitle": "اختر إنشاء جولة جديدة أو انضم لغرفة أصدقائك لبدء المحاكمة",
        "rooms.card_create_title": "إنشاء غرفة",
        "rooms.card_create_desc": "ابدأ محاكمة جديدة وشارك كود الغرفة مع أصدقائك.",
        "rooms.card_create_badge": "مضيف",
        "rooms.feat_private_code": "كود خاص",
        "rooms.feat_full_control": "تحكم كامل",
        "rooms.feat_auto_save": "حفظ تلقائي",
        "rooms.card_join_title": "انضمام لغرفة",
        "rooms.card_join_desc": "أدخل كود صديقك وادخل الجلسة.",
        "rooms.card_join_badge": "لاعب",
        "rooms.feat_quick_join": "دخول سريع",
        "rooms.feat_random_role": "دور عشوائي",
        "rooms.feat_voice_chat": "مشاركة صوتية",
        "rooms.card_offline_title": "لعب اوف لاين",
        "rooms.card_offline_desc": "العب مع أصدقائك على جهاز واحد بدون اتصال.",
        "rooms.card_offline_badge": "أوفلاين",
        "rooms.feat_single_device": "جهاز واحد",
        "rooms.feat_secret_pin": "رمز سري PIN",
        "rooms.feat_no_net": "بلا شبكة",
        "rooms.storage_tip": "للتحكم في مساحة التطبيق يرجى زيارة صفحة سجل الغرف ومسح كل الغرف القديمة حتى تحظى بتجربة لعب مريحة",

        // create.html
        "create.page_title": "محكمة الأدوار - غرفة الانتظار",
        "create.header_title": "محكمة الأدوار",
        "create.step1_title": "الخطوة الأولى",
        "create.host_name_label": "اسم القاضي / المضيف",
        "create.host_name_placeholder": "مثال: المستشار أحمد",
        "create.step2_title": "الخطوة الثانية: اختيار القضية",
        "create.case_label": "القضية الجنائية",
        "create.case_placeholder": "اختر القضية الجنائية...",
        "create.mode_label": "نمط المحاكمة المعتمد",
        "create.mode_classic": "المحكمة الكلاسيكية (مع شاشات مساعدة بالذكاء الاصطناعي)",
        "create.mode_improv": "المحكمة الحرة والارتجال (بدون أدلة أو أسئلة موجهة)",
        "create.voice_toggle_label": "تفعيل المحادثات الصوتية المباشرة (Voice Chat)",
        "create.voice_toggle_hint": "يسمح للقاضي واللاعبين بالتحدث صوتياً مباشرة أثناء الجلسة",
        "create.btn_submit": "إنشاء الغرفة وبدء المحكمة",
        "create.btn_exit_aria": "الخروج من الغرفة",
        "create.alert_fill_fields": "يرجى كتابة اسمك واختيار القضية أولاً!",
        "create.alert_creating": "جاري إنشاء قاعة المحكمة...",

        // join.html
        "join.page_title": "محكمة الأدوار - الانضمام لمحكمة",
        "join.header_title": "محكمة الأدوار",
        "join.step1_title": "الخطوة الأولى",
        "join.name_label": "اسمك المستعار في المحكمة",
        "join.name_placeholder": "مثال: المحامي خالد",
        "join.step2_title": "الخطوة الثانية: كود المحكمة",
        "join.code_label": "كود الغرفة (4 أرقام)",
        "join.code_placeholder": "مثال: 1234",
        "join.btn_submit": "دخول قاعة المحكمة",
        "join.alert_fill_both": "يرجى كتابة الاسم وكود الغرفة كاملاً (4 أرقام)!",
        "join.alert_room_not_found": "عذراً، الغرفة غير موجودة أو انتهت صلاحيتها!",
        "join.alert_room_full": "عذراً، هذه الغرفة ممتلئة بالكامل!",
        "join.alert_game_started": "عذراً، الجلسة بدأت بالفعل في هذه الغرفة!",

        // lobby.html & create.html
        "lobby.page_title": "محكمة الأدوار - قاعة الانتظار",
        "lobby.chamber_title": "غرفة الانتظار",
        "lobby.room_code_label": "كود الغرفة",
        "lobby.present_count_label": "المتواجدون في القاعة:",
        "lobby.label_admin_name": "إضغط لتعديل إسمك",
        "lobby.code_copy_hint": "اضغط على الكود لنسخه ومشاركته مع أصدقائك",
        "lobby.host_badge": "المستشار / القاضي",
        "lobby.case_summary_title": "ملخص القضية المختارة",
        "lobby.attendees_title": "اللاعبون المتواجدون حالياً",
        "lobby.btn_start_trial": "بدء جولة المحاكمة",
        "lobby.waiting_for_judge": "في انتظار إشارة البدء من القاضي...",
        "lobby.btn_leave_room": "مغادرة الجلسة",
        "lobby.leave_confirm_title": "تأكيد المغادرة",
        "lobby.leave_confirm_msg": "هل انت متأكد من تسجيل خروجك من الغرفة؟",
        "lobby.btn_stay": "تراجع، البقاء",
        "lobby.btn_leave_confirm": "نعم، مغادرة",
        "lobby.kick_confirm_title": "إنذار طرد اللاعب",
        "lobby.kick_confirm_msg": "هل أنت متأكد من طرد هذا اللاعب من الغرفة؟",
        "lobby.kicked_alert": "جاري تسجيل خروجك من الغرفة",
        "lobby.min_players_warning": "الحد الأدنى لبدء القضية هو {min} لاعبين! (المتواجدون حالياً: {count})",
        "lobby.table_center": "ميزان<br>العدالة",

        // game.html (Courtroom Trial)
        "game.page_title": "محكمة الأدوار - قاعة المحاكمة",
        "game.header_title": "موسوعة القضايا",
        "game.subtitle": "اختر حبكة الجريمة لبدء توزيع كروت الأدوار السرية وتحقيق المحكمة",
        "game.stage1_badge": "مرحلة التعرف على الدور والأسرار",
        "game.stage2_badge": "مرحلة الاستجواب والمرافعة",
        "game.stage3_badge": "كاشف الشبهة والاتهام",
        "game.stage4_badge": "المداولة والنطق بالحكم النهائي",
        "game.btn_my_role": "بطاقتي السرية 📜",
        "game.btn_points_guide": "ميثاق النقاط ⚖️",
        "game.points_guide_title": "دليلك لتتعرف على نظام النقاط",
        "game.points_guide_close": "إغلاق الدليل",

        // Game Roles
        "role.judge": "القاضي المحقق",
        "role.prosecutor": "محامي الادعاء",
        "role.defense": "محامي الدفاع",
        "role.civil_prosecutor": "محامي الادعاء بالحق المدني",
        "role.real_guilty": "الجاني الحقيقي",
        "role.suspect": "مشتبه به",
        "role.innocent": "بريء",
        "role.lawyer": "محامٍ",
        "role.waste_driver": "سائق شاحنة النفايات",
        "role.housemaid": "خادمة الضحية اليومية",
        "role.cyber_director": "مدير قطاع الأمن السيبراني",
        "role.bird_merchant": "تاجر طيور الزينة بالسوق",
        "role.videographer": "المصور والمونتير الخاص بالضحية",
        "role.neighbor_engineer": "جار الضحية (مهندس ميكانيكا)",
        "role.legal_accountant": "المحاسب القانوني للعائلة",
        "role.night_pharmacist": "طبيب الصيدلية الليلية",
        "role.art_restorer": "الفنان والرسام المحترف (مُرمم اللوحات)",
        "role.hotel_manager": "مدير عام الفندق التراثي",
        "role.bomb_expert": "خبير تفتيت المتفجرات المستدعى",

        // Role Card Modal
        "card.title": "دورك السري في القضية",
        "card.secret_interest": "جريمتك المخفاة عن الكل 🤫:",
        "card.public_story": "روايتك العلنية أمام الحضور:",
        "card.what_you_know": "ما تعرفه في هذه القضية:",
        "card.what_you_hide": "ما تخفيه وتحرص على ستره:",
        "card.acting_goal": "هدف التمثيل والارتجال:",
        "card.btn_close": "حفظ وإغلاق البطاقة",
        "card.btn_reveal_role": "إكشف دوري السري",
        "card.case_story_header": "تفاصيل ومجريات القصة:",
        "card.case_story_warning": "⚠️ تنبيه قضائي: اقرأ تفاصيل القضية جيداً!",
        "card.judicial_decree": "مرسوم السيادة القضائية النزيهة:",

        // Judge Bench & Actions
        "judge.bench_title": "منصة القاضي المحقق",
        "judge.btn_interrogate": "استجواب لاعب",
        "judge.btn_pick_seat": "اختر كرسياً...",
        "judge.interrogations_count": "الاستجوابات",
        "judge.btn_verdict": "إصدار الحكم",
        "judge.btn_questions": "🗨️ الأسئلة",
        "judge.btn_detect_radar": "اكتشف الشبهة",
        "judge.penalty_warning": "⚠️ تحذير: عند بلوغ الاستجواب {milestone} سيتم خصم 5 نقاط من رصيدك فوراً!",
        "judge.select_player_title": "🗨️ استجواب لاعب محدد",
        "judge.select_player_label": "اختر اللاعب الذي تريد استجوابه:",
        "judge.btn_start_inquiry": "بدء الاستجواب",
        "judge.improv_modal_title": "🎭 استجواب ارتجالي",
        "judge.improv_hint": "اطرح سؤالك شفهياً وباشر استجواب المتهم الآن",
        "judge.interrogate_first_warning": "🔒 اختر لاعباً للاستجواب أولاً بالضغط على زر 'استجواب لاعب' قبل استخدام الأسئلة.",
        "judge.revoke_speaker_bar": "🎙️ المتحدث الآن:",
        "judge.btn_revoke_speech": "سحب الكلمة فوراً",
        "judge.speak_req_title": "🎙️ {name} يطلب الكلمة",
        "judge.speak_req_role": "الدور: {role}",
        "judge.btn_grant_speech": "✅ السماح بالكلام",
        "judge.btn_ignore_speech": "✕ تجاهل",

        // Lawyer / Prosecutor Panel
        "lawyer.panel_title": "لوحة محامي الادعاء",
        "lawyer.clues_tab": "أدلة الإدانة",
        "lawyer.questions_tab": "الأسئلة الموجهة",
        "lawyer.btn_present_clue": "عرض الدليل",
        "lawyer.btn_ask_question": "طرح السؤال",
        "lawyer.btn_accuse": "🔴 اتهام",
        "lawyer.btn_accused_done": "🔒 تم الاتهام",
        "lawyer.accuse_sent_pending": "✅ أُرسل الاتهام وهو بانتظار قرار القاضي.",
        "lawyer.accuse_failed_net": "❌ لم يصل الاتهام إلى الخادم. لم يُسجَّل أي قفل، ويمكنك المحاولة مجدداً.",
        "lawyer.accuse_need_2_interrogations": "🔒 لا يمكن الاتهام قبل إكمال استجوابين.",
        "lawyer.accuse_already_accused": "🔒 سبق اتهام هذا المتهم.",
        "lawyer.accuse_pending_judge": "⏳ هناك اتهام بانتظار قرار القاضي.",
        "defense.speak_btn": "طلب الكلمة",
        "defense.cards_label": "كروت الدفاع",
        "defense.objection_btn": "اعتراض قسري",

        // Suspicion Detector (Radar)
        "radar.title": "كاشف الشبهات",
        "radar.select_target_label": "1. اختر الشخصية التي تريد فحصها:",
        "radar.select_crime_label": "2. اختر التهمة الجانبية التي تعتقد أن الشخصية ارتكبتها:",
        "radar.btn_confirm_scan": "🔒 تأكيد الفحص",
        "radar.tag_revealed": " ✅ (انكشفت شبهته)",
        "radar.tag_locked_for_me": " 🔒 (مغلق لك)",
        "radar.success_alert": "🎯 تم كشف الشبهة بنجاح! المتهم متورط بالفعل في هذه الجريمة الجانبية!",
        "radar.fail_alert": "❌ نتيجة سلبية: المتهم لا علاقة له بهذه الجريمة الجانبية المحددة.",

        // Verdict & Accusation Modals
        "verdict.modal_title": "منصة الحكم القضائي",
        "verdict.select_accused_label": "حدد المتهم المراد إصدار الحكم عليه:",
        "verdict.btn_convict": "إدانة المتهم",
        "verdict.btn_acquit": "براءة المتهم",
        "verdict.confirm_prompt": "سيادة القاضي، حدد حكم المحكمة النهائي والقطعي بحق المتهم الرئيسي الآن:",
        "verdict.forced_end_title": "إنهاء المحاكمة قسرياً",
        "verdict.forced_end_confirm": "هل أنت متأكد من رغبتك في إنهاء المحكمة الحالية فوراً؟ سيتم إعادة جميع اللاعبين إلى موسوعة القضايا.",
        "verdict.lawyer_ruling_title": "🚨 حسم قضائي من محامي المحكمة",

        // Voice Controls
        "voice.mic_live": "المايك مفعّل",
        "voice.mic_muted": "المايك مغلق",
        "voice.mic_locked": "المايك مقفل",
        "voice.request_speech": "طلب الكلمة",
        "voice.speech_requested": "تم طلب الكلمة، بانتظار القاضي...",
        "voice.speech_allowed": "مسموح لك بالكلام الآن",
        "voice.badge_speaking": "يتحدث الآن",
        "voice.badge_allowed": "مسموح",
        "voice.badge_requested": "طلب كلمة",
        "voice.badge_muted": "صامت",

        // Ticker Messages
        "ticker.msg1": "اجتمع مع أصدقائك أو أحبابك لتحظى بتجربة لعب مميزة",
        "ticker.msg2": "محكمة الأدوار لعبة لا تمت للواقع بصلة و نكن جميع الاحترام لسلطة القضاء",
        "ticker.msg3": "نظراً لعدم توفر المايك في الوقت الحالي يمكنك إجراء مكالمة جماعية ويلعب كل لاعب من بيته في الوضع الأونلاين",
        "ticker.msg4": "ماذا تنتظر؟ أنشئ غرفة وادعو أصدقائك أو العب مود الأوفلاين",
        "ticker.msg5": "لتعرف المزيد عن اللعبة وكيفية الإستمتاع بها يرجى زيارة صفحة دليل المستخدم",
        "ticker.msg6": "للتحكم في مساحة التطبيق يرجى زيارة صفحة سجل الغرف ومسح كل الغرف القديمة حتى تحظى بتجربة لعب مريحة",

        // results.html
        "results.page_title": "محكمة الأدوار - النطق بالحكم والنتائج",
        "results.header_title": "⚖️ شاشة النتائج الكبرى",
        "results.loading_case": "جاري استرجاع أرشيف القضية...",
        "results.col_player": "اللاعب",
        "results.col_secret_role": "الدور السري الحقيقي",
        "results.col_round_points": "نقاط هذه الجولة",
        "results.col_total_points": "الرصيد التراكمي",
        "results.loading_players": "جاري تحميل بيانات اللاعبين...",
        "results.narrative_box_title": "📜 سرد أحداث القضية",
        "results.narrative_loading": "جاري كتابة الفصل الأخير من هذه القضية الجنائية...",
        "results.waiting_admin": "في انتظار الأدمن للعودة بالجميع لموسوعة القضايا...",
        "results.btn_return": "🏛️ العودة لموسوعة القضايا",

        // guide.html
        "guide.page_title": "محكمة الأدوار - دليل المستخدم",
        "guide.header_title": "دليل المستخدم",
        "guide.subtitle": "اضغط على أي سؤال لقراءة القوانين والميكانيكيات التفصيلية وكيفية اللعب",
        "guide.q1": "ما هي فكرة لعبة \"محكمة الأدوار\" وكيف تبدأ؟",
        "guide.a1": "اللعبة تعتمد على التحقيق واستنباط الأسرار النفسية وتضارب المصالح. تبدأ الجولة بتجميع اللاعبين في غرفة جولة أونلاين بكود دخول غرفة صديقك. الحد الأدنى البرمجي لبدء أي قضية هو 3 لاعبين، وتدعم اللعبة حتى 10 لاعبين كحد أقصى في الغرفة الواحدة لضمان مواجهات تفاعلية متوازنة.",
        "guide.q2": "كيف يتم توزيع الأدوار والبطاقات على اللاعبين؟",
        "guide.a2": "عند الضغط على بدء اللعبة، يقوم المحرك البرمجي بخلط الأدوار وتوزيع الكروت سرياً. ينقسم اللاعبون إلى: قاضٍ محقق (يدير الجلسة ويستجوب)، ومحامين، ومتهمين يحمي كل منهم \"سراً مصلحياً\" يخفيه عن البقية. يتم إجبار القاضي والمحامين تلقائياً على أن يكونوا أبرياء تماماً من الجريمة لضمان نزاهة المحاكمة الشرعية.",
        "guide.q3": "ما هي ميكانيكية \"القطع المفقودة وتضارب المصالح\"؟",
        "guide.a3": "كل لاعب يحصل على قصة علنية يشهد بها أمام المحكمة، ولكن لديه \"مصلحة سرية\" أو جريمة جانبية يخفيها (مثل تزوير، رشوة، أو سرقة مستندات). اللعبة لا تعتمد على البحث الجنائي الميداني، بل على استجواب اللاعبين لبعضهم البعض لكشف التناقضات ومحاولة تلفيق أو إثبات التهمة بناءً على تضارب الأسرار.",
        "guide.q4": "كيف يعمل نظام حساب النقاط وخطر \"الحكم المبكر\"؟",
        "guide.a4": "يتفعل زر الحكم للقاضي، وزر الاتهام لمحامي الادعاء، بعد إكمال استجوابين. الحكم المبكر (عند الاستجواب 2 أو 3) له نقاط أعلى: الحكم الصحيح يمنح القاضي +20 عند الاستجواب 2 و+17 عند الثالث، والخاطئ يخصم منه -15 و-12 على الترتيب. بعد ذلك تصبح المرحلة العامة: +10 للحكم الصحيح و-10 للخاطئ.",
        "guide.q5": "كم عدد القضايا المتاحة وما هي القضية المثبتة في الأعلى؟",
        "guide.a5": "الموسوعة تحتوي على 11 قضية محبوكة بدقة (مثل سرقة الخاتم، اختراق الخادم، الخطف في سوق الجمعة، واختطاف المليونير من البرج). تم نقل قضية \"القاتل المتسلسل وفوضى تجميع 6 لاعبين\" لتكون القضية رقم 1 المثبتة إجبارياً في أعلى الواجهة كطعم تشويقي لحث اللاعبين على دعوة أصدقائهم.",
        "guide.q6": "كيف تنتهي اللعبة وما هي ميكانيكية \"الاعتراف النهائي وسرد القصة\"؟",
        "guide.a6": "بعد صدور الحكم، يتم تشغيل دالة الكشف (Reveal). إذا كُشف الجاني، يظهر أمامه نص إجباري يقرأه بصوت عالٍ يعترف فيه بجريمته ويكشف ديناميكياً عن مكان إخفاء الضحية. وإذا أفلت الجاني وخسر القاضي، يظهر النص الذهبي للجاني ليفضح ذكائه ويسخر من المحكمة ويكشف أين خبأ الضحية بعد أن أصبح في أمان تماماً!",
        "guide.q7": "من هو مطور اللعبة و اخر اعماله",
        "guide.a7": "اعرفكم بنفسي انا مطور المواقع Ahmed|Web و قررت انشاء هذه اللعبة كاملا لتنال اعجابكوا كفكرة و كتصميم و اعمل اصلا في مجال برمجة المواقع و لكني اخترت ان اصمم اللعبة حتى تستمتع باحدث الأفكار و متعة الغموض و الاثارة اما ان كنت تريد فهذا موقع يعرض جميع اعمالي",
        "guide.btn_visit_portfolio": "زر موقعي",

        // admin.html
        "admin.page_title": "محكمة الأدوار - سجل الغرف",
        "admin.header_title": "سجل الغرف النشطة",
        "admin.rooms_subtitle": "كل سجلات الغرف المسجلة في السيرفر (غرفك مميّزة بشارة)",
        "admin.back_rooms": "‹ عودة لصفحة الغرف",
        "admin.btn_delete_all": "🗑️ حذف جميع الغرف",
        "admin.refresh_btn": "تحديث",
        "admin.loading_rooms": "جاري فحص ذاكرة جهازك ...",
        "admin.no_rooms": "لا توجد أي غرف مسجلة حالياً.",
        "admin.single_delete_title": "إنذار نهائي",
        "admin.single_delete_confirm": "نعم، حذف نهائي",
        "admin.all_delete_title": "⚠️ حذف شامل لكل الغرف",
        "admin.all_delete_label": "للتأكيد اكتب كلمة حذف في الخانة:",
        "admin.all_delete_placeholder": "اكتب: حذف",
        "admin.all_delete_confirm_btn": "نعم، احذف الكل",

        // offline.html
        "offline.page_title": "محكمة الأدوار - الوضع الفردي الأوفلاين",
        "offline.header_title": "محكمة الأدوار",
        "offline.back_rooms": "‹ قائمة الغرف",
        "offline.step_choose_case": "📁 اختيار القضية",
        "offline.choose_case_desc": "اختر القضية الجنائية التي ستُدار حولها جلسة المحاكمة اليوم:",
        "offline.loading_local_cases": "جاري تحميل القضايا المحلية...",
        "offline.btn_confirm_case": "المتابعة وتحديد اللاعبين",
        "offline.step_setup_players": "👥 إعداد اللاعبين ورمز الحماية (PIN)",
        "offline.selected_case_label": "القضية المختارة:",
        "offline.players_count_label": "عدد اللاعبين:",
        "offline.mode_scripted": "📜 وضع السكريبتات",
        "offline.mode_improv": "🎭 وضع الارتجال القضائي",
        "offline.pin_hint": "🔒 أدخل اسم كل لاعب مع رمز PIN سري مكون من 4 أرقام لحماية دوره عند تمرير الجهاز:",
        "offline.btn_start_offline": "⚖️ توزيع الأدوار وبدء الجلسة",
        "offline.court_hub_title": "🏛️ قاعة المحاكمة (Pass & Play)",
        "offline.hub_desc": "📱 طريقة اللعب: مرّر الجهاز لكل لاعب على حدة ليضغط على اسمه ويدخل الـ PIN الخاص به للاطلاع على دوره والمصلحة السرية، ثم يضغط إخفاء وقفل لتسليمه للّاعب التالي!",
        "offline.judge_panel_title": "🔨 لوحة القاضي (الاستجواب)",
        "offline.defense_panel_title": "🛡️ أدلة الدفاع",
        "offline.verdict_panel_title": "⚖️ إصدار الحكم النهائي وإسدال الستار",
        "offline.btn_new_round": "🔄 جولة جديدة",
        "offline.btn_home": "الرئيسية",

        // Auto Reader / TTS
        "tts.auto_reader": "القارئ الذاتي",
        "tts.dock_title": "القارئ الصوتي الذاتي",
        "tts.fab_aria": "فتح القارئ الصوتي الذاتي",
        "tts.ready": "جاهز للاستماع",
        "tts.read_page": "قراءة الصفحة",
        "tts.stop": "إيقاف",
        "tts.click_to_read": "انقر للقراءة",
        "tts.speed": "سرعة القراءة:",
        "tts.speed_normal": "عادي",
        "tts.voice": "صوت المتحدث:",
        "tts.default_voice": "صوت النظام الافتراضي (Web Speech)",
        "tts.test_voice": "فحص الصوت في جهازك",
        "tts.read_selection": "استمع للمحدد",
        "tts.status_active": "مفعّل",
        "tts.status_stopped": "متوقف",
        "tts.toast_enabled": "تم تفعيل القارئ الذاتي، ستجده أسفل الشاشة ويمكنك سحبه.",
        "tts.toast_disabled": "تم إلغاء القارئ الذاتي."
    },
    en: {
        // App branding & General
        "app.name": "Court of Roles",
        "app.tagline": "The Social Investigation & Mental Strategy Game",
        "btn.lang_label": "AR",
        "btn.lang_title": "Switch to Arabic (التحويل إلى العربية)",
        "btn.back": "Back",
        "btn.close": "Close",
        "btn.cancel": "Cancel",
        "btn.confirm": "Confirm",
        "btn.continue": "Continue",
        "btn.save": "Save",
        "btn.ok": "OK",
        "btn.understood": "Understood",
        "btn.leave": "Leave",
        "btn.exit": "Exit",
        "btn.refresh": "Refresh",
        "status.loading": "Loading...",
        "status.processing": "Processing data...",
        "custom_alert_title": "Judicial Notice",
        "personal_score_label": "Your Score",

        // First time offline modal & alerts
        "offline.first_time_title": "First Visit Notice",
        "offline.first_time_msg": "Dear player, welcome to Court of Roles! To begin your first visit, please turn on internet connectivity so you can enjoy offline play anytime later. Thank you for your patience.",
        "offline.online_required_msg": "Creating or joining a room requires an internet connection.\nPlease enable internet and try again.",
        "offline.notice_banner": "⚠️ Offline mode active: Local games available immediately, while online multiplayer requires network connection.",
        "offline.redirect_alert": "You have been redirected to offline mode due to loss of internet connection.",

        // index.html (Splash)
        "index.welcome_title": "Court of Roles",
        "index.welcome_part1": "Welcome to Court of Roles",
        "index.welcome_part2": "Where mental strategy and investigation collide",
        "index.start_game": "Start Game",
        "index.page_title": "Court of Roles - Welcome",

        // rooms.html (Foyer / Lobby Selection)
        "rooms.page_title": "Court of Roles - Cases & Trials Foyer",
        "rooms.sidebar_title": "Settings Menu",
        "rooms.radio_title": "Radio Player",
        "rooms.radio_playing": "Playing",
        "rooms.radio_stopped": "Off",
        "rooms.user_guide": "User Guide",
        "rooms.rooms_log": "Rooms Registry",
        "rooms.translation_notice_title": "Translation Notice",
        "rooms.translation_notice_body": "Translation is still in progress and does not yet cover all game texts, especially case stories and role details. Stay tuned for upcoming updates to get the complete translation!",
        "rooms.download_game": "📥 Download Game",
        "rooms.download_note": "My game link, don't forget to download it for a more enjoyable playing experience",
        "rooms.foyer_badge": "Cases & Trials Foyer",
        "rooms.foyer_title": "Court of Roles",
        "rooms.foyer_subtitle": "Create a new trial round or join your friends' courtroom to begin",
        "rooms.card_create_title": "Create Room",
        "rooms.card_create_desc": "Start a new trial and share the room code with your friends.",
        "rooms.card_create_badge": "Host",
        "rooms.feat_private_code": "Private Code",
        "rooms.feat_full_control": "Full Control",
        "rooms.feat_auto_save": "Auto Save",
        "rooms.card_join_title": "Join Room",
        "rooms.card_join_desc": "Enter your friend's code and step into the courtroom.",
        "rooms.card_join_badge": "Player",
        "rooms.feat_quick_join": "Quick Join",
        "rooms.feat_random_role": "Random Role",
        "rooms.feat_voice_chat": "Voice Audio",
        "rooms.card_offline_title": "Play Offline",
        "rooms.card_offline_desc": "Play with friends on a single device without internet connection.",
        "rooms.card_offline_badge": "Offline",
        "rooms.feat_single_device": "Single Device",
        "rooms.feat_secret_pin": "Secret PIN",
        "rooms.feat_no_net": "No Network Needed",
        "rooms.storage_tip": "To manage app storage, please visit the Rooms Registry and clear old rooms for a smoother experience.",

        // create.html
        "create.page_title": "Court of Roles - Waiting Room",
        "create.header_title": "Court of Roles",
        "create.step1_title": "Step 1",
        "create.host_name_label": "Judge / Host Name",
        "create.host_name_placeholder": "e.g., Chief Judge Alex",
        "create.step2_title": "Step 2: Choose Case",
        "create.case_label": "Criminal Case",
        "create.case_placeholder": "Select criminal case...",
        "create.mode_label": "Courtroom Mode",
        "create.mode_classic": "Classic Courtroom (with AI assistant screens)",
        "create.mode_improv": "Free Improv Courtroom (no guided clues or questions)",
        "create.voice_toggle_label": "Enable Live Voice Chat",
        "create.voice_toggle_hint": "Allows judge and players to speak live during trial",
        "create.btn_submit": "Create Room & Begin Court",
        "create.btn_exit_aria": "Exit Room",
        "create.alert_fill_fields": "Please enter your name and select a case first!",
        "create.alert_creating": "Creating courtroom chamber...",

        // join.html
        "join.page_title": "Court of Roles - Join Court",
        "join.header_title": "Court of Roles",
        "join.step1_title": "Step 1",
        "join.name_label": "Your Courtroom Nickname",
        "join.name_placeholder": "e.g., Counsel Robert",
        "join.step2_title": "Step 2: Court Code",
        "join.code_label": "Room Code (4 digits)",
        "join.code_placeholder": "e.g., 1234",
        "join.btn_submit": "Enter Courtroom",
        "join.alert_fill_both": "Please enter both your name and full room code (4 digits)!",
        "join.alert_room_not_found": "Sorry, room does not exist or has expired!",
        "join.alert_room_full": "Sorry, this courtroom is completely full!",
        "join.alert_game_started": "Sorry, trial has already started in this room!",

        // lobby.html & create.html
        "lobby.page_title": "Court of Roles - Waiting Lobby",
        "lobby.chamber_title": "Waiting Room",
        "lobby.room_code_label": "Room Code",
        "lobby.present_count_label": "Present in Chamber:",
        "lobby.label_admin_name": "Click to edit your name",
        "lobby.code_copy_hint": "Click code to copy and share with friends",
        "lobby.host_badge": "Chief Judge / Host",
        "lobby.case_summary_title": "Selected Case Briefing",
        "lobby.attendees_title": "Currently Connected Players",
        "lobby.btn_start_trial": "Start Trial Round",
        "lobby.waiting_for_judge": "Waiting for the Judge's opening gavel...",
        "lobby.btn_leave_room": "Leave Session",
        "lobby.leave_confirm_title": "Confirm Departure",
        "lobby.leave_confirm_msg": "Are you sure you want to log out of the room?",
        "lobby.btn_stay": "Stay in Room",
        "lobby.btn_leave_confirm": "Yes, Leave",
        "lobby.kick_confirm_title": "Player Kick Warning",
        "lobby.kick_confirm_msg": "Are you sure you want to kick this player from the room?",
        "lobby.kicked_alert": "Logging you out of the room...",
        "lobby.min_players_warning": "Minimum players required is {min}! (Currently present: {count})",
        "lobby.table_center": "Scales of<br>Justice",

        // game.html (Courtroom Trial)
        "game.page_title": "Court of Roles - Trial Courtroom",
        "game.header_title": "Case Encyclopedia",
        "game.subtitle": "Choose crime plot to begin secret role distribution and court investigation",
        "game.stage1_badge": "Phase 1: Role Briefing & Secrets",
        "game.stage2_badge": "Phase 2: Interrogation & Examination",
        "game.stage3_badge": "Phase 3: Suspicion Detector & Accusation",
        "game.stage4_badge": "Phase 4: Deliberation & Final Verdict",
        "game.btn_my_role": "My Secret Role 📜",
        "game.btn_points_guide": "Points Charter ⚖️",
        "game.points_guide_title": "Judicial Points Guide",
        "game.points_guide_close": "Close Guide",

        // Game Roles
        "role.judge": "Investigating Judge",
        "role.prosecutor": "Prosecution Lawyer",
        "role.defense": "Defense Lawyer",
        "role.civil_prosecutor": "Civil Prosecution Lawyer",
        "role.real_guilty": "True Culprit",
        "role.suspect": "Suspect",
        "role.innocent": "Innocent",
        "role.lawyer": "Lawyer",
        "role.waste_driver": "Waste Truck Driver",
        "role.housemaid": "Daily Housemaid",
        "role.cyber_director": "Cybersecurity Director",
        "role.bird_merchant": "Pet Birds Merchant",
        "role.videographer": "Victim's Videographer",
        "role.neighbor_engineer": "Victim's Neighbor (Engineer)",
        "role.legal_accountant": "Family Legal Accountant",
        "role.night_pharmacist": "Night Pharmacy Doctor",
        "role.art_restorer": "Professional Art Restorer",
        "role.hotel_manager": "Heritage Hotel General Manager",
        "role.bomb_expert": "Explosives Disposal Expert",

        // Role Card Modal
        "card.title": "Your Secret Role in this Case",
        "card.secret_interest": "Your Hidden Secret Crime 🤫:",
        "card.public_story": "Your Public Cover Story in Court:",
        "card.what_you_know": "What You Know in this Case:",
        "card.what_you_hide": "What You Must Conceal:",
        "card.acting_goal": "Your Acting & Improv Goal:",
        "card.btn_close": "Save & Close Card",
        "card.btn_reveal_role": "Reveal My Secret Role",
        "card.case_story_header": "Case Story & Events:",
        "card.case_story_warning": "⚠️ Judicial Notice: Read the case details carefully!",
        "card.judicial_decree": "Decree of Judicial Integrity:",

        // Judge Bench & Actions
        "judge.bench_title": "Judge's Bench",
        "judge.btn_interrogate": "Interrogate Player",
        "judge.btn_pick_seat": "Choose a seat...",
        "judge.interrogations_count": "Interrogations",
        "judge.btn_verdict": "Deliver Verdict",
        "judge.btn_questions": "🗨️ Questions",
        "judge.btn_detect_radar": "Detect Suspicion",
        "judge.penalty_warning": "⚠️ Warning: Reaching interrogation #{milestone} will deduct 5 points immediately!",
        "judge.select_player_title": "🗨️ Interrogate Specific Player",
        "judge.select_player_label": "Select the player you wish to examine:",
        "judge.btn_start_inquiry": "Commence Examination",
        "judge.improv_modal_title": "🎭 Freeform Interrogation",
        "judge.improv_hint": "Ask your question aloud and examine the suspect now",
        "judge.interrogate_first_warning": "🔒 Please select a player by clicking 'Interrogate Player' before using questions.",
        "judge.revoke_speaker_bar": "🎙️ Current Speaker:",
        "judge.btn_revoke_speech": "Revoke Speech Now",
        "judge.speak_req_title": "🎙️ {name} requests to speak",
        "judge.speak_req_role": "Role: {role}",
        "judge.btn_grant_speech": "✅ Grant Speech",
        "judge.btn_ignore_speech": "✕ Dismiss",

        // Lawyer / Prosecutor Panel
        "lawyer.panel_title": "Prosecution Lawyer Panel",
        "lawyer.clues_tab": "Incriminating Clues",
        "lawyer.questions_tab": "Directed Questions",
        "lawyer.btn_present_clue": "Present Clue",
        "lawyer.btn_ask_question": "Direct Question",
        "lawyer.btn_accuse": "🔴 Accuse",
        "lawyer.btn_accused_done": "🔒 Accused",
        "lawyer.accuse_sent_pending": "✅ Accusation filed. Awaiting Judge's decision.",
        "lawyer.accuse_failed_net": "❌ Accusation could not reach server. No lock applied, please try again.",
        "lawyer.accuse_need_2_interrogations": "🔒 Cannot file accusation before completing 2 interrogations.",
        "lawyer.accuse_already_accused": "🔒 This defendant has already been accused.",
        "lawyer.accuse_pending_judge": "⏳ An accusation is currently pending the Judge's decision.",
        "defense.speak_btn": "Request Speech",
        "defense.cards_label": "Defense Cards",
        "defense.objection_btn": "Forced Objection",

        // Suspicion Detector (Radar)
        "radar.title": "Suspicion Detector",
        "radar.select_target_label": "1. Select the character you wish to scan:",
        "radar.select_crime_label": "2. Select the clandestine side crime they committed:",
        "radar.btn_confirm_scan": "🔒 Confirm Scan",
        "radar.tag_revealed": " ✅ (Suspicion Unmasked)",
        "radar.tag_locked_for_me": " 🔒 (Locked for you)",
        "radar.success_alert": "🎯 Suspicion Confirmed! Suspect is indeed involved in this clandestine crime!",
        "radar.fail_alert": "❌ Negative Result: Suspect has no involvement in this specified side crime.",

        // Verdict & Accusation Modals
        "verdict.modal_title": "Judicial Verdict Bench",
        "verdict.select_accused_label": "Select defendant for final judgment:",
        "verdict.btn_convict": "Convict Defendant",
        "verdict.btn_acquit": "Acquit Defendant",
        "verdict.confirm_prompt": "Chief Judge, deliver the final and binding verdict on the primary suspect now:",
        "verdict.forced_end_title": "Forced Courtroom Closure",
        "verdict.forced_end_confirm": "Are you sure you want to forcibly terminate the trial? All players will be returned to the archive.",
        "verdict.lawyer_ruling_title": "🚨 Judicial Ruling from Court Lawyer",

        // Voice Controls
        "voice.mic_live": "Mic Live",
        "voice.mic_muted": "Mic Muted",
        "voice.mic_locked": "Mic Locked",
        "voice.request_speech": "Request Speech",
        "voice.speech_requested": "Speech requested, awaiting Judge...",
        "voice.speech_allowed": "You may speak now",
        "voice.badge_speaking": "Speaking",
        "voice.badge_allowed": "Allowed",
        "voice.badge_requested": "Requested",
        "voice.badge_muted": "Muted",

        // Ticker Messages
        "ticker.msg1": "Gather with friends or family for an unforgettable social deduction experience",
        "ticker.msg2": "Court of Roles is a fictional social game with utmost respect for the judiciary",
        "ticker.msg3": "Use live voice chat or group calls to play seamlessly from home",
        "ticker.msg4": "What are you waiting for? Create a room, invite friends, or play offline",
        "ticker.msg5": "To learn more about the rules and mechanics, visit the User Guide",
        "ticker.msg6": "To manage app storage, visit the Rooms Registry and clear old entries",

        // results.html
        "results.page_title": "Court of Roles - Verdict & Results",
        "results.header_title": "⚖️ Grand Verdict & Standings",
        "results.loading_case": "Retrieving case archives...",
        "results.col_player": "Player",
        "results.col_secret_role": "True Secret Role",
        "results.col_round_points": "Round Points",
        "results.col_total_points": "Cumulative Score",
        "results.loading_players": "Loading player results...",
        "results.narrative_box_title": "📜 Case Chronicle & Revelations",
        "results.narrative_loading": "Writing the final chapter of this criminal case...",
        "results.waiting_admin": "Waiting for the Host to return everyone to cases archive...",
        "results.btn_return": "🏛️ Return to Cases Archive",

        // guide.html
        "guide.page_title": "Court of Roles - User Guide",
        "guide.header_title": "User Guide",
        "guide.subtitle": "Click any question to view detailed rules, mechanics, and gameplay strategies",
        "guide.q1": "What is the concept of \"Court of Roles\" and how does it start?",
        "guide.a1": "The game relies on investigation, uncovering psychological secrets, and conflicting interests. The round begins by gathering players in an online room using your friend's room entry code. The system minimum to start any case is 3 players, and the game supports up to 10 players maximum per room to ensure balanced, interactive showdowns.",
        "guide.q2": "How are roles and secret cards distributed to players?",
        "guide.a2": "When Start Game is clicked, the engine shuffles roles and secretly deals cards. Players are divided into: an Investigating Judge (who manages the session and interrogates), Lawyers, and Suspects, each guarding a \"vested secret\" hidden from the rest. The Judge and Lawyers are automatically enforced to be completely innocent of the crime to preserve the integrity of the judicial trial.",
        "guide.q3": "What is the \"Missing Pieces & Conflict of Interest\" mechanic?",
        "guide.a3": "Every player receives a public story to testify before the court, but also possesses a \"secret motive\" or secondary crime they hide (such as forgery, bribery, or document theft). The game does not rely on physical forensic search, but on players cross-examining each other to uncover contradictions and frame or prove charges based on clashing secrets.",
        "guide.q4": "How does the scoring system and the risk of \"Early Verdict\" work?",
        "guide.a4": "The Judge's verdict button and the Prosecution's indictment button activate after completing two interrogations. An early verdict (at interrogation 2 or 3) carries higher stakes: a correct verdict awards the Judge +20 points at interrogation 2 and +17 at the 3rd, while an incorrect verdict deducts -15 and -12 points respectively. Afterward, standard scoring applies: +10 for correct and -10 for incorrect.",
        "guide.q5": "How many cases are available and which case is pinned at the top?",
        "guide.a5": "The compendium features 11 meticulously crafted cases (including The Ring Theft, Server Breach, Friday Market Kidnapping, and The Tower Tycoon Kidnapping). Case #1 \"The Serial Killer & 6-Player Chaos\" is pinned at the very top as an enticing hook encouraging players to invite their friends.",
        "guide.q6": "How does the game end and what is the \"Final Confession & Story Reveal\" mechanic?",
        "guide.a6": "After the verdict is pronounced, the Reveal engine runs. If the culprit is exposed, they must read aloud a mandatory confession text admitting their crime and dynamically revealing where the victim was hidden. If the culprit escapes and the Judge fails, a golden triumph text appears for the culprit mocking the court and revealing where the victim was hidden now that they are completely safe!",
        "guide.q7": "Who is the developer of the game and what are their latest projects?",
        "guide.a7": "Allow me to introduce myself: I am web developer Ahmed|Web. I created this entire game hoping you will love both its concept and design. I specialize in web programming, and crafted this game so you can enjoy fresh ideas, mystery, and suspense. You can explore all my works on my portfolio website.",
        "guide.btn_visit_portfolio": "Visit My Portfolio",

        // admin.html
        "admin.page_title": "Court of Roles - Rooms Registry",
        "admin.header_title": "Active Rooms Registry",
        "admin.rooms_subtitle": "All server room records (your hosted rooms marked with a star)",
        "admin.back_rooms": "‹ Back to Rooms",
        "admin.btn_delete_all": "🗑️ Delete All Rooms",
        "admin.refresh_btn": "Refresh",
        "admin.loading_rooms": "Scanning local device cache...",
        "admin.no_rooms": "No active rooms found.",
        "admin.single_delete_title": "Final Warning",
        "admin.single_delete_confirm": "Yes, Permanently Delete",
        "admin.all_delete_title": "⚠️ Purge All Rooms",
        "admin.all_delete_label": "To confirm, type DELETE in the box below:",
        "admin.all_delete_placeholder": "Type: DELETE",
        "admin.all_delete_confirm_btn": "Yes, Purge Everything",

        // offline.html
        "offline.page_title": "Court of Roles - Offline Single-Device Court",
        "offline.header_title": "Court of Roles",
        "offline.back_rooms": "‹ Rooms List",
        "offline.step_choose_case": "📁 Choose Case",
        "offline.choose_case_desc": "Select the criminal case to conduct trial on today:",
        "offline.loading_local_cases": "Loading local case files...",
        "offline.btn_confirm_case": "Continue & Setup Players",
        "offline.step_setup_players": "👥 Players & PIN Security Setup",
        "offline.selected_case_label": "Selected Case:",
        "offline.players_count_label": "Number of Players:",
        "offline.mode_scripted": "📜 Scripted Mode",
        "offline.mode_improv": "🎭 Improv Trial Mode",
        "offline.pin_hint": "🔒 Enter each player's name and a secret 4-digit PIN to secure their role when passing the device:",
        "offline.btn_start_offline": "⚖️ Distribute Roles & Start Session",
        "offline.court_hub_title": "🏛️ Courtroom (Pass & Play)",
        "offline.hub_desc": "📱 How to play: Pass device to each player to tap their name and enter their PIN to view their role and secret agenda, then lock it for the next player!",
        "offline.judge_panel_title": "🔨 Judge Bench (Interrogation)",
        "offline.defense_panel_title": "🛡️ Defense Evidence",
        "offline.verdict_panel_title": "⚖️ Issue Final Verdict & Conclude",
        "offline.btn_new_round": "🔄 New Round",
        "offline.btn_home": "Home",

        // Auto Reader / TTS
        "tts.auto_reader": "Auto Reader",
        "tts.dock_title": "Auto Voice Reader",
        "tts.fab_aria": "Open Auto Voice Reader",
        "tts.ready": "Ready to listen",
        "tts.read_page": "Read Page",
        "tts.stop": "Stop",
        "tts.click_to_read": "Click to Read",
        "tts.speed": "Reading Speed:",
        "tts.speed_normal": "Normal",
        "tts.voice": "Speaker Voice:",
        "tts.default_voice": "Default System Voice (Web Speech)",
        "tts.test_voice": "Test Audio on Device",
        "tts.read_selection": "Read Selection",
        "tts.status_active": "Active",
        "tts.status_stopped": "Off",
        "tts.toast_enabled": "Auto Reader enabled. You can find it at the bottom of the screen and drag it.",
        "tts.toast_disabled": "Auto Reader disabled."
    }
};

// Case titles & descriptions translation dictionary
export const caseTranslations = {
    1: {
        title_ar: "قاتل متسلسل",
        title_en: "Serial Killer",
        desc_en: "Behind the dense fog on the outskirts of the city lies the abandoned valley farm, a quiet haven concealing dark crimes..."
    },
    2: {
        title_ar: "لغز الشقة الصامتة",
        title_en: "The Silent Apartment Mystery",
        desc_en: "Behind the elegant walls of the quiet Jasmine quarter, a mysterious crime shook the residential complex..."
    },
    3: {
        title_ar: "شفرة المخابرات.. تسريب شاشات الظلام",
        title_en: "Intelligence Cipher: Dark Screen Leak",
        desc_en: "In the heart of the capital within the most fortified security facility, the Falcon Digital System suffered a critical breach..."
    },
    4: {
        title_ar: "شبح السيدة عائشة.. اختفاء في سوق الجمعة",
        title_en: "Ghost of Sayeda Aisha: Friday Market Disappearance",
        desc_en: "On a bustling Friday amidst the suffocating crowds of the famous Sayeda Aisha market, a chilling disappearance unfolded..."
    },
    5: {
        title_ar: "سقوط الأقنعة.. جريمة في فيلا التجمع",
        title_en: "Fallen Masks: Crime at the Tagamoa Villa",
        desc_en: "On a lavish night inside an upscale Fifth Settlement villa, renowned creators gathered, until a deadly shot shattered the party..."
    },
    6: {
        title_ar: "اللحن الأخير.. خدعة الطابق العاشر",
        title_en: "The Final Melody: 10th Floor Deception",
        desc_en: "On a quiet winter night at the Sadeem Tower in Maadi, the body of the young virtuoso musician was found..."
    },
    7: {
        title_ar: "شفرة النسيان.. الخدعة البنكية الصامتة",
        title_en: "Cipher of Oblivion: The Silent Bank Heist",
        desc_en: "In the serenity of historic Garden City inside the estate of the retired tycoon, a silent digital theft occurred..."
    },
    8: {
        title_ar: "العشوائية المرسومة.. جثة خلف الحاوية",
        title_en: "Calculated Chaos: Body Behind the Container",
        desc_en: "In an obscure corner of an alley in Downtown where waste containers pile high, a mysterious body was found..."
    },
    9: {
        title_ar: "اللوحة الباكية.. خدعة المزاد المغلق",
        title_en: "The Crying Portrait: Closed Auction Fraud",
        desc_en: "On the top floor of the Orient Louvre auction hall, a private auction showcased a masterpiece, until a shocking deceit was revealed..."
    },
    10: {
        title_ar: "سراب الواحة.. جريمة الفندق المعزول",
        title_en: "Oasis Mirage: Crime at the Isolated Hotel",
        desc_en: "Deep in the Siwa desert inside a heritage hotel trapped by a violent sandstorm cutting all communications, a murder took place..."
    },
    11: {
        title_ar: "ساعة الصفر.. الرمز الموقوت",
        title_en: "Zero Hour: The Timed Cipher",
        desc_en: "Inside safety locker #14 at the Central Train Station, a briefcase containing a sophisticated timed explosive was discovered..."
    }
};

// Comprehensive Arabic -> English phrase dictionary for runtime dynamically injected text
export const phraseMap = {
    // Alert titles & system banners
    "إنهاء المحاكمة قسرياً": "Forced Courtroom Closure",
    "تنبيه قضائي صارم": "Strict Judicial Warning",
    "🗨️ استجواب لاعب محدد": "🗨️ Interrogate Specific Player",
    "🎭 استجواب ارتجالي": "🎭 Freeform Interrogation",
    "حسم قرار المحكمة النهائي": "Court Final Decision",
    "منصة الحكم القضائي": "Judicial Verdict Bench",
    "🚨 حسم قضائي من محامي المحكمة": "🚨 Judicial Decision from Court Lawyer",
    "💼 حقيبة الأدلة الجنائية": "💼 Forensic Evidence Briefcase",
    "كاشف الشبهات": "Suspicion Detector",
    "تنبيه قضائي": "Judicial Notice",
    "إنذار نهائي": "Final Warning",
    "تأكيد الخروج": "Confirm Exit",
    "تأكيد المغادرة": "Confirm Departure",
    "إنذار طرد اللاعب": "Player Kick Warning",
    "موسوعة القضايا": "Case Encyclopedia",

    // Common buttons & actions
    "ابدأ اللعبة": "Start Game",
    "إنشاء غرفة": "Create Room",
    "انضمام لغرفة": "Join Room",
    "انضمام الى غرفة": "Join Room",
    "انضمام": "Join",
    "لعب اوف لاين": "Play Offline",
    "حسناً": "OK",
    "حسناً، فهمت": "Understood",
    "تراجع، البقاء": "Cancel, Stay",
    "نعم، مغادرة": "Yes, Leave",
    "نعم، طرد": "Yes, Kick",
    "تراجع، إبقاء": "Cancel, Keep",
    "نعم، إنهاء الآن": "Yes, Terminate Now",
    "تراجع واستمرار": "Cancel & Continue",
    "العودة للمحاكمة": "Return to Trial",
    "إدانة المتهم": "Convict Defendant",
    "براءة المتهم": "Acquit Defendant",
    "نعم، احذف الكل": "Yes, Delete All",
    "نعم، احذف الغرفة": "Yes, Delete Room",
    "نعم، حذف نهائي": "Yes, Permanently Delete",
    "حذف نهائي": "Delete",
    "حذف جميع الغرف": "Delete All Rooms",
    "تحديث": "Refresh",
    "إغلاق": "Close",
    "طلب الكلمة": "Request Speech",
    "اعتراض قسري": "Forced Objection",
    "استجواب لاعب": "Interrogate Player",
    "اختر كرسياً...": "Choose a seat...",
    "إصدار الحكم": "Deliver Verdict",
    "بدء الاستجواب": "Begin Interrogation",
    "عرض الدليل": "Present Clue",
    "طرح السؤال": "Ask Question",
    "اكتشف الشبهة": "Detect Suspicion",
    "🗨️ الأسئلة": "🗨️ Questions",
    "🔒 تأكيد الفحص": "🔒 Confirm Scan",
    "إكشف دوري السري": "Reveal My Secret Role",
    "أخفِ دوري ومرّر للهاتف التالي 🔒": "Conceal Role & Pass Phone 🔒",
    "المتابعة وتحديد اللاعبين": "Continue & Setup Players",
    "بدء جولة المحاكمة": "Start Trial Round",
    "🏛️ العودة لموسوعة القضايا": "🏛️ Return to Cases Archive",
    "عودة للصفحة الرئيسية": "Back to Home",
    "‹ قائمة الغرف": "‹ Rooms List",
    "‹ عودة لصفحة الغرف": "‹ Back to Rooms",
    "‹ رجوع": "‹ Back",
    "الرئيسية": "Home",
    "مسح": "Clear",
    "إلغاء": "Cancel",
    "تأكيد": "Confirm",
    "متابعة": "Continue",
    "القارئ الذاتي": "Auto Reader",
    "القارئ الصوتي الذاتي": "Auto Voice Reader",
    "فتح القارئ الصوتي الذاتي": "Open Auto Voice Reader",
    "جاهز للاستماع": "Ready to listen",
    "قراءة الصفحة": "Read Page",
    "إيقاف القراءة": "Stop Reading",
    "انقر للقراءة": "Click to Read",
    "استمع للمحدد": "Read Selection",
    "فحص الصوت في جهازك": "Test Audio on Device",
    "سرعة القراءة:": "Reading Speed:",
    "صوت المتحدث:": "Speaker Voice:",
    "صوت النظام الافتراضي (Web Speech)": "Default System Voice (Web Speech)",
    "تم تفعيل القارئ الذاتي، ستجده أسفل الشاشة ويمكنك سحبه.": "Auto Reader enabled. You can find it at the bottom of the screen and drag it.",
    "تم إلغاء القارئ الذاتي.": "Auto Reader disabled.",
    "تنبيه الترجمة": "Translation Notice",
    "الترجمة لا تزال قيد الإنجاز ولم تكتمل بعد على جميع نصوص اللعبة، بالأخص نصوص القضايا وتفاصيل الأدوار. ترقبوا آخر التحديثات حتى تحصلوا على الترجمة كاملة!": "Translation is still in progress and does not yet cover all game texts, especially case stories and role details. Stay tuned for upcoming updates to get the complete translation!",
    "📥 تحميل اللعبة": "📥 Download Game",
    "تحميل اللعبة": "Download Game",
    "رابط لعبتي لا تنسى تحميله لتحظى بتجربة لعب امتع": "My game link, don't forget to download it for a more enjoyable playing experience",

    // System notifications and alerts
    "انتظر الأدمن ليختار القضية وتبدأ اللعبة.": "Waiting for the Host to choose a case and begin the game.",
    "مرحباً بك! انتظر الأدمن ليختار القضية المناسبة لبدء جولة المحاكمة.": "Welcome! Waiting for the Host to select a suitable case to begin the trial.",
    "هل أنت متأكد من رغبتك في إنهاء المحكمة الحالية فوراً؟ سيتم إعادة جميع اللاعبين إلى موسوعة القضايا.": "Are you sure you want to terminate the current court immediately? All players will be returned to the cases archive.",
    "عذراً، المغادرة محظورة تماماً!": "Sorry, departure is strictly prohibited!",
    "لا يمكنك مغادرة الجلسة القضائية الحية الحالية إلا بإذن منشئ الغرفة (المشرف). يرجى الانتظار حتى يقوم المسؤول بإنهاء المحاكمة بنفسه وسحبك للخارج.": "You cannot leave this live trial session without permission from the room host. Please wait until the host ends the trial.",
    "🔒 اختر لاعباً للاستجواب أولاً بالضغط على زر 'استجواب لاعب' قبل استخدام الأسئلة.": "🔒 Please select a player by clicking 'Interrogate Player' before using questions.",
    "🔒 يجب طلب الكلمة أو استخدام الاعتراض القسري أولاً، والحصول على فرصة التحدث من القاضي.": "🔒 You must request to speak or use a forced objection first, and be granted permission by the Judge.",
    "سيادة قضائية نزيهة: أنت مبرأ تماماً من أي تهمة أو مصلحة سرية في هذه الجلسة.": "Integrity of the Bench: You are completely free of any charges or secret malice in this session.",
    "مرسوم السيادة القضائية النزيهة:": "Decree of Judicial Integrity:",
    "أنت مبرأ تماماً من أي تهمة أو مصلحة سرية خبيثة in هذه الجلسة. مصلحتك هي نصرة ميزان العدالة.": "You are completely free of any charges or ulterior motives in this session. Your sole interest is upholding justice.",
    "روايتك العلنية أمام الحضور:": "Your public testimony before the court:",
    "جريمتك المخفاة عن الكل 🤫:": "Your hidden secret crime 🤫:",
    "🔒 المصلحة السرية لا تُقرأ صوتياً حفاظاً على سرية اللعبة.": "🔒 Secret agendas are not read aloud to maintain game confidentiality.",
    "⚠️ تنبيه قضائي: اقرأ تفاصيل القضية جيداً!": "⚠️ Judicial Notice: Read the case details carefully!",
    "تفاصيل ومجريات القصة:": "Case Story & Events:",
    "ميزان العدالة": "Scales of Justice",
    "الاستجوابات": "Interrogations",
    "كروت الدفاع": "Defense Cards",
    "رصيدك": "Your Score",
    "؟ نقاط": "Pts",
    "كود الغرفة": "Room Code",
    "غرفة الانتظار": "Waiting Room",
    "اللاعبون المتواجدون حالياً": "Currently Connected Players",
    "إضغط لتعديل إسمك": "Click to edit your name",
    "اضغط على الكود لنسخه ومشاركته مع أصدقائك": "Click code to copy and share with friends",
    "جاري تسجيل خروجك من الغرفة": "Logging you out of the room...",
    "جاري تحميل بيانات اللاعبين...": "Loading player data...",
    "جاري استرجاع أرشيف القضية...": "Retrieving case archives...",
    "جاري تحميل القضايا المحلية...": "Loading local cases...",
    "جاري فحص خادم الغرف...": "Checking room servers...",
    "جاري فحص ذاكرة جهازك ...": "Checking device memory...",
    "لا توجد أي غرف مسجلة حالياً.": "No rooms registered currently.",
    "السيرفر فارغ تماماً من الغرف.": "Server is completely empty of rooms.",
    "لا توجد غرف في السيرفر حالياً.": "No rooms currently on the server.",
    "عذراً، تعذر تحميل القضايا حالياً.": "Sorry, unable to load cases at this time.",
    "يرجى كتابة اسمك واختيار القضية أولاً!": "Please enter your name and select a case first!",
    "جاري إنشاء قاعة المحكمة...": "Creating courtroom chamber...",
    "يرجى كتابة الاسم وكود الغرفة كاملاً (4 أرقام)!": "Please enter both your name and full room code (4 digits)!",
    "عذراً، الغرفة غير موجودة أو انتهت صلاحيتها!": "Sorry, room does not exist or has expired!",
    "عذراً، هذه الغرفة ممتلئة بالكامل!": "Sorry, this courtroom is completely full!",
    "عذراً، الجلسة بدأت بالفعل في هذه الغرفة!": "Sorry, trial has already started in this room!"
};

/**
 * Get the current active language ('ar' or 'en')
 */
export function getLanguage() {
    try {
        const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved === "en" || saved === "ar") {
            return saved;
        }
    } catch (_) {}
    return DEFAULT_LANGUAGE;
}

/**
 * Translate a key into the given or current language
 */
export function t(key, params = {}, lang = null) {
    const currentLang = lang || getLanguage();
    const dict = translations[currentLang] || translations.ar;
    let text = dict[key] || translations.ar[key] || key;

    // Parameter interpolation: {name} -> params.name
    if (params && typeof params === "object") {
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
        }
    }
    return text;
}

/**
 * Translate a raw Arabic phrase or key into English (if active language is en)
 */
export function translatePhrase(text) {
    if (!text || typeof text !== "string") return text;
    if (getLanguage() !== "en") return text;

    const trimmed = text.trim();
    if (phraseMap[trimmed]) return phraseMap[trimmed];
    if (translations.en[trimmed]) return translations.en[trimmed];

    // Check role translation
    const role = translateRoleTitle(trimmed);
    if (role !== trimmed) return role;

    return text;
}

/**
 * Translate case title
 */
export function translateCaseTitle(caseId, fallbackTitle) {
    const lang = getLanguage();
    if (lang === "en" && caseTranslations[caseId]) {
        return caseTranslations[caseId].title_en;
    }
    return fallbackTitle;
}

/**
 * Translate case description
 */
export function translateCaseDesc(caseId, fallbackDesc) {
    const lang = getLanguage();
    if (lang === "en" && caseTranslations[caseId]) {
        return caseTranslations[caseId].desc_en;
    }
    return fallbackDesc;
}

/**
 * Translate role titles across cases and game modes
 */
export function translateRoleTitle(roleName) {
    if (!roleName) return "";
    const lang = getLanguage();
    if (lang === "ar") return roleName;

    const trimmed = String(roleName).trim();

    // Exact role matching
    const exactRoleMap = {
        "القاضي المحقق": "Investigating Judge",
        "محامي الدفاع": "Defense Lawyer",
        "محامي الادعاء": "Prosecution Lawyer",
        "محامي الادعاء بالحق المدني": "Civil Prosecution Lawyer",
        "سائق شاحنة النفايات": "Waste Truck Driver",
        "خادمة الضحية اليومية": "Daily Housemaid",
        "مدير قطاع الأمن السيبراني": "Cybersecurity Director",
        "تاجر طيور الزينة بالسوق": "Pet Birds Merchant",
        "المصور والمونتير الخاص بالضحية": "Victim's Videographer",
        "جار الضحية (مهندس ميكانيكا)": "Victim's Neighbor (Engineer)",
        "المحاسب القانوني للعائلة": "Family Legal Accountant",
        "طبيب الصيدلية الليلية": "Night Pharmacy Doctor",
        "الفنان والرسام المحترف (مُرمم اللوحات)": "Professional Art Restorer",
        "مدير عام الفندق التراثي": "Heritage Hotel General Manager",
        "خبير تفتيت المتفجرات المستدعى": "Explosives Disposal Expert",
        "المتهم الرئيسي": "Chief Suspect",
        "المتهم الرئيسي الجاني": "Chief Accused Culprit",
        "مشتبه به إضافي": "Additional Suspect",
        "مشتبه به غامض": "Mysterious Suspect",
        "الجاني الحقيقي": "True Culprit",
        "مشتبه به": "Suspect",
        "بريء": "Innocent",
        "محامٍ": "Lawyer",
        "أحد المحامين": "One of the Lawyers",
        "أحد أطراف المحكمة": "Court Party Member"
    };

    if (exactRoleMap[trimmed]) return exactRoleMap[trimmed];

    const lower = trimmed.toLowerCase();
    if (lower.includes("قاض") || lower.includes("judge")) return t("role.judge");
    if (lower.includes("ادعاء") || lower.includes("prosecut")) return t("role.prosecutor");
    if (lower.includes("دفاع") || lower.includes("defense")) return t("role.defense");
    if (lower.includes("جاني") || lower.includes("guilty") || lower.includes("قاتل")) return t("role.real_guilty");
    if (lower.includes("مشتبه") || lower.includes("suspect")) return t("role.suspect");
    if (lower.includes("بريء") || lower.includes("innocent")) return t("role.innocent");

    return roleName;
}

/**
 * Apply translations to the DOM
 */
export function applyTranslations(root = document) {
    const lang = getLanguage();
    const isEn = lang === "en";

    // Set document level language and direction
    if (root === document || root === document.documentElement) {
        document.documentElement.lang = lang;
        document.documentElement.dir = isEn ? "ltr" : "rtl";
        if (document.body) {
            document.body.classList.toggle("lang-en", isEn);
            document.body.classList.toggle("lang-ar", !isEn);
        }
    }

    // Elements with data-i18n (textContent)
    root.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (key) {
            const val = t(key);
            if (val && val !== key) {
                el.textContent = val;
            }
        }
    });

    // Elements with data-i18n-html (innerHTML)
    root.querySelectorAll("[data-i18n-html]").forEach((el) => {
        const key = el.getAttribute("data-i18n-html");
        if (key) {
            const val = t(key);
            if (val && val !== key) {
                el.innerHTML = val;
            }
        }
    });

    // Elements with data-i18n-placeholder
    root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (key) {
            el.setAttribute("placeholder", t(key));
        }
    });

    // Elements with data-i18n-title
    root.querySelectorAll("[data-i18n-title]").forEach((el) => {
        const key = el.getAttribute("data-i18n-title");
        if (key) {
            el.setAttribute("title", t(key));
        }
    });

    // Elements with data-i18n-aria
    root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
        const key = el.getAttribute("data-i18n-aria");
        if (key) {
            el.setAttribute("aria-label", t(key));
        }
    });

    // Elements with data-i18n-case-id
    root.querySelectorAll("[data-i18n-case-id]").forEach((el) => {
        const caseId = el.getAttribute("data-i18n-case-id");
        if (caseId && caseTranslations[caseId]) {
            el.textContent = isEn ? `${caseId}. ${caseTranslations[caseId].title_en}` : `${caseId}. ${caseTranslations[caseId].title_ar}`;
        }
    });

    // Dynamic translation scan for known phrases when in English mode
    if (isEn) {
        // Buttons, sidebar links, labels, and status tags with known phrases
        root.querySelectorAll("button, .btn-main, .sidebar-link, .sidebar-radio-title span, .radio-status-tag, #sidebar-tts-label, #sidebar-tts-tag, .sidebar-download-btn, .sidebar-download-note").forEach((btn) => {
            if (btn.classList.contains("btn-lang")) return;
            const text = btn.textContent.trim();
            if (phraseMap[text]) {
                btn.textContent = phraseMap[text];
            }
        });

        // Modal title if known
        const modalTitle = root.querySelector("#modal-alert-title");
        if (modalTitle) {
            const titleText = modalTitle.textContent.trim();
            if (phraseMap[titleText]) {
                modalTitle.textContent = phraseMap[titleText];
            } else if (titleText.startsWith("ملف القضية:")) {
                const casePart = titleText.replace("ملف القضية:", "").trim();
                modalTitle.textContent = `Case File: ${translatePhrase(casePart)}`;
            } else {
                modalTitle.textContent = translateRoleTitle(titleText);
            }
        }
    }

    // Update all language toggle buttons
    updateLanguageButtons();

    // Specific page title update if tagged
    const titleEl = document.querySelector("title[data-i18n]");
    if (titleEl) {
        document.title = t(titleEl.getAttribute("data-i18n"));
    }
}

/**
 * Update button text and state across all .btn-lang elements
 */
export function updateLanguageButtons() {
    const lang = getLanguage();
    const buttonText = lang === "ar" ? "EN" : "AR";
    const buttonTitle = t("btn.lang_title");

    document.querySelectorAll(".btn-lang, #btn-lang-toggle").forEach((btn) => {
        btn.textContent = buttonText;
        btn.setAttribute("title", buttonTitle);
        btn.setAttribute("aria-label", buttonTitle);
        btn.setAttribute("data-current-lang", lang);
    });
}

/**
 * Change the active language
 */
export function setLanguage(lang) {
    if (lang !== "ar" && lang !== "en") return;
    try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (_) {}

    applyTranslations(document);

    // Dispatch global event so page scripts can react dynamically
    window.dispatchEvent(
        new CustomEvent("court_language_changed", {
            detail: { lang, isEn: lang === "en" }
        })
    );
}

/**
 * Toggle between Arabic and English
 */
export function toggleLanguage() {
    const current = getLanguage();
    const next = current === "ar" ? "en" : "ar";
    setLanguage(next);
    return next;
}

/**
 * Bind click handlers to language buttons
 */
export function bindLanguageButtons() {
    document.querySelectorAll(".btn-lang, #btn-lang-toggle").forEach((btn) => {
        if (!btn.__langBound) {
            btn.__langBound = true;
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleLanguage();
            });
        }
    });
    updateLanguageButtons();
}

/**
 * Language toggle is solely hosted in the settings drawer of rooms.html.
 * Automatic injection into headers or body is disabled to prevent UI clutter.
 */
export function mountHeaderLanguageToggle() {
    updateLanguageButtons();
}

/**
 * Initialize i18n on page load
 */
export function initI18n() {
    const lang = getLanguage();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "en" ? "ltr" : "rtl";

    const setup = () => {
        applyTranslations(document);
        bindLanguageButtons();
        mountHeaderLanguageToggle();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setup);
    } else {
        setup();
    }

    // Set up lightweight observer for dynamic elements created with data-i18n or alert dialogs
    if (typeof MutationObserver !== "undefined" && document.body) {
        let timer = null;
        const observer = new MutationObserver((mutations) => {
            let hasNewI18n = false;
            for (const m of mutations) {
                if (m.addedNodes.length > 0) {
                    for (const node of m.addedNodes) {
                        if (node.nodeType === 1) {
                            if (
                                node.hasAttribute("data-i18n") ||
                                node.hasAttribute("data-i18n-placeholder") ||
                                node.id === "modal-alert-message" ||
                                node.id === "custom-alert-modal" ||
                                node.classList?.contains("modal-overlay-active") ||
                                node.querySelector?.("[data-i18n], [data-i18n-placeholder], #modal-alert-message")
                            ) {
                                hasNewI18n = true;
                                break;
                            }
                        }
                    }
                }
                if (hasNewI18n) break;
            }

            if (hasNewI18n) {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    applyTranslations(document);
                    bindLanguageButtons();
                }, 40);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }
}

// Automatically initialize when imported
initI18n();

// Export to window for non-module inline scripts
if (typeof window !== "undefined") {
    window.__courtI18n = {
        getLanguage,
        setLanguage,
        toggleLanguage,
        t,
        applyTranslations,
        translateRoleTitle,
        translateCaseTitle,
        translateCaseDesc,
        translatePhrase,
        updateLanguageButtons,
        caseTranslations,
        translations
    };
}
