/* نصوص الواجهة بالعربية والإنجليزية. القصائد تبقى بالعربية دائمًا.
   لإضافة لغة أخرى: أضف كائنًا جديدًا بالمفاتيح نفسها. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./util.js'));
  else root.AbyaatI18n = factory(root.AbyaatUtil);
})(typeof self !== 'undefined' ? self : this, function (U) {
  const n = (x) => U.ar(x);
  const bt = (x) => U.baytCount(x);
  const dc = (x) => U.dayCount(x);

  const ar = {
    docTitle: 'أبيات',
    navLabel: 'التنقل الرئيسي', navHome: 'الحفظ والمراجعة', navLib: 'المكتب', navSettings: 'الإعدادات',
    modeLearn: 'الحفظ الجديد', modeNear: 'المراجعة القريبة', modeFar: 'المراجعة البعيدة',
    cancel: 'إلغاء', back: 'العودة', backToList: 'العودة إلى القائمة',
    optional: 'اختياري', chapterN: (p) => 'الفصل ' + (p.i < 10 ? ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'][p.i] : n(p.i + 1)),
    baytN: (p) => 'البيت ' + n(p.n),
    /* لوحة الحفظ والمراجعة */
    homeTitle: 'الحفظ والمراجعة',
    homeLedePoem: (p) => `القصيدة الحالية: ${p.title}.`, homeLedeNone: 'اختر قصيدة من المكتب لتبدأ.', homeChoose: ' اختر ما تريد أن تتابعه.',
    learnIdlePill: 'اختر قصيدة', learnIdleSub: 'ابدأ باختيار القصيدة من المكتب', learnAllSub: 'أتممت كل فصول هذه القصيدة',
    doneM: 'تم!', doneF: 'تمت!',
    learnDoneSub: (p) => `أتممت: ${bt(p.n)}`, learnTodaySub: (p) => `تقدّم اليوم: ${n(p.a)} من ${n(p.b)}`,
    nearIdlePill: 'لا شيء اليوم', nearIdleSub: 'تظهر هنا الفصول التي بدأت حفظها',
    nearLeft: (p) => 'متبقٍّ ' + n(p.n), nearTodoSub: 'ما حفظته في الفصول الحالية', nearDoneSub: 'راجعت كل ما حفظته اليوم',
    farIdlePill: 'لا فصول بعد', farIdleSub: 'تظهر هنا الفصول بعد التثبيت',
    farDue: (p) => 'مستحق ' + n(p.n), farTodoSub: 'مراجعة متباعدة بخوارزمية FSRS', farNextSub: (p) => 'المراجعة القادمة ' + p.when,
    /* الحفظ الجديد */
    chooseTitle: 'اختر قصيدة لتبدأ', chooseBody: 'اختر القصيدة التي تريد حفظها من المكتب.', toLibrary: 'اذهب إلى المكتب',
    finishedTitle: 'أتممت فصول هذه القصيدة', finishedBody: 'تابع مراجعتها من المراجعة القريبة والبعيدة، أو اختر قصيدة أخرى من المكتب.',
    learnStart: (p) => `ابدأ حفظ ${bt(p.n)}`, learnDoneNotice: (p) => `أتممت حفظ اليوم (${bt(p.n)}). أحسنت.`, learnMore: 'حفظ بيت إضافي',
    learnedOf: (p) => `حُفظ ${n(p.n)} من ${bt(p.total)}`, baytsToday: 'عدد الأبيات اليوم', decrease: 'أنقص', increase: 'زِد',
    nearNotice: 'لديك مراجعة قريبة اليوم. الأفضل أن تبدأ بها.', openNear: 'افتح المراجعة القريبة',
    hideRecite: 'أخفِ النص واستظهر', showTrans: 'أظهر الترجمة', hideTrans: 'أخفِ الترجمة',
    recitePrompt: 'استظهر البيت بصوتك من حفظك، ثم تحقّق.', hint: 'تلميح', hideHint: 'أخفِ التلميح', revealCheck: 'أظهر للتحقق',
    checkPrompt: 'هل استظهرته كاملًا دون خطأ؟', notYet: 'لم أحفظه بعد', memorized: 'حفظته', progressToday: 'تقدّم اليوم',
    wellDone: 'أحسنت', sessionDone: (p) => `حفظتَ ${bt(p.n)} في هذه الجلسة.`,
    chapterFinished: (p) => `أتممت «${p.title}». سيظهر في المراجعة القريبة، وبعد ${dc(p.days)} مراجعة فعلية ينتقل إلى المراجعة البعيدة.`,
    /* المراجعة القريبة */
    nearEmptyT: 'لا مراجعة قريبة اليوم', nearEmptyB: 'تظهر هنا الفصول التي بدأت حفظها، وأيام التثبيت بعد إتمام الفصل.', startNew: 'ابدأ حفظًا جديدًا',
    nearRowConsol: (p) => `${p.poem}، التثبيت: أُنجز ${n(p.n)} من ${dc(p.days)}`, nearRowLearn: (p) => `${p.poem}، حُفظ ${n(p.n)} من ${bt(p.b)}`,
    nearLede: (p) => `متبقٍّ اليوم: ${n(p.n)}`, nearAllDone: 'أتممت مراجعة اليوم كلها.',
    hideLast: 'أخفِ آخر بيت ظاهر', showNext: 'أظهر البيت التالي', visibleOf: (p) => `ظاهر ${n(p.a)} من ${n(p.b)}`,
    prev: 'السابق', next: 'التالي', finishReview: 'أتممت المراجعة', reviewComplete: 'أتممت المراجعة',
    resGrad: (p) => `أتممتَ ${dc(p.days)} من التثبيت، فانتقل «${p.title}» إلى المراجعة البعيدة. مراجعتك الأولى ${p.when}.`,
    resConsol: (p) => `أُنجز ${n(p.n)} من ${dc(p.days)} من التثبيت.`, resLearn: 'تمت مراجعة ما حفظته من هذا الفصل اليوم.',
    nextReview: (p) => `المراجعة التالية: ${p.title}`,
    /* المراجعة البعيدة */
    farEmptyT: 'لا فصول في المراجعة البعيدة بعد', farEmptyB: (p) => `ينتقل الفصل إلى هنا بعد ${dc(p.days)} من التثبيت، أو عند اختيار «تم حفظ الفصل» من المكتب.`, openLib: 'افتح المكتب',
    farLede: (p) => 'راجع اليوم: ' + (p.n === 1 ? 'فصلًا واحدًا' : n(p.n) + (p.n === 2 ? ' فصلين' : ' فصول')), farNone: 'لا شيء مستحق اليوم.', upcoming: 'قادمة',
    farRowSub: (p) => `${p.poem}، ${bt(p.b)}`,
    farPrompt: (p) => `المس البيت الذي يصعب عليك للتأشير عليه${p.marked ? ` (${n(p.marked)})` : ''}.`, finishChapter: 'أتممت الفصل',
    r1: 'نسيتُ', r2: 'بصعوبة', r3: 'تذكّرتُ', r4: 'بسهولة',
    rateTitle: (p) => `أشّرت على ${n(p.n)} من ${bt(p.b)}`, rateNone: 'لم تؤشّر على أي بيت',
    rateLede: 'متى تريد مراجعة هذا الفصل؟ الاقتراح مظلّل، ولك أن تختار غيره.',
    reviewDone: 'تمت المراجعة', farDoneNext: (p) => `المراجعة القادمة لهذا الفصل ${p.when}.`, nextChapter: (p) => `الفصل التالي: ${p.title}`,
    /* المكتب */
    sectionsAria: 'أقسام المكتب', chapCount: (p) => n(p.n) + ' فصول', memorizing: 'قيد الحفظ',
    libEmptyT: (p) => `لا توجد ${p.title} بعد`, libEmptyB: 'ستظهر هنا عند إضافتها إلى التطبيق.',
    stOld: 'المراجعة البعيدة', stNextReview: (p) => 'المراجعة القادمة ' + p.when, stConsol: 'تثبيت', stConsolSub: (p) => `بقي ${dc(p.days)} من التثبيت`,
    stNow: 'قيد الحفظ الآن', stProg: 'قيد الحفظ', stNext: 'التالي', stNew: 'لم يبدأ',
    poemProgress: (p) => `${n(p.n)} من ${bt(p.b)} في الفصول الأساسية`, readPoem: 'قراءة القصيدة', memorizingNow: 'قيد الحفظ الآن', memorizeThis: 'اجعلها قيد الحفظ', chaptersH: 'الفصول',
    readChapter: 'قراءة الفصل', continueHere: 'تابع الحفظ من هنا', startHere: 'ابدأ الحفظ من هذا الفصل', markMemorized: 'تم حفظ الفصل', restartChapter: 'إعادة الحفظ من البداية',
    markTitle: (p) => `كم تُتقن «${p.title}»؟`, markSub: 'يدخل الفصل المراجعة البعيدة، ويُحدَّد موعد أول مراجعة من تقييمك.',
    md1: 'لا أستطيع استظهاره الآن', md2: 'أتذكّره بجهد وتردّد', md3: 'أستظهره بثقة مع أخطاء يسيرة', md4: 'أستظهره بسرعة ودون تردّد',
    /* القراءة */
    jumpTo: 'انتقل إلى فصل', readerBack: 'رجوع', smaller: 'تصغير الخط', larger: 'تكبير الخط', translation: 'الترجمة', smallerLbl: 'أ−', largerLbl: 'أ+',
    /* الإعدادات */
    setTitle: 'الإعدادات', perDayT: 'عدد الأبيات الجديدة يوميًا', perDayD: 'كلما زاد عدد الأبيات الجديدة زاد عدد المراجعات.', perDayLbl: 'الأبيات في اليوم',
    retT: 'نسبة التذكّر المستهدفة', retD: 'الأعلى تعني مراجعات أكثر تقاربًا.', pct: (p) => n(p.v) + '٪',
    alwaysEnT: 'إظهار الترجمة الإنجليزية دائمًا', alwaysEnD: 'مخفية افتراضيًا، ويمكن إظهارها لكل بيت عند الحاجة.',
    themeT: 'المظهر', themeD: 'اختر الوضع الفاتح أو الداكن، أو اتبع إعداد جهازك.', themeLight: 'فاتح', themeDark: 'داكن', themeAuto: 'تلقائي',
    langT: 'لغة الواجهة', langD: 'تبقى القصائد بالعربية. تتغيّر الأزرار والقوائم فقط.',
    backupT: 'النسخ الاحتياطي', backupD: 'يُحفظ تقدّمك على هذا الجهاز فقط. صدّر نسخة لنقله أو حفظه.', exportBtn: 'تصدير التقدّم', importBtn: 'استيراد', eraseBtn: 'مسح كل التقدّم',
    updT: 'تحديث التطبيق', updD: 'يمسح الملفات المخزّنة مؤقتًا ويحمّل أحدث إصدار. تقدّمك لا يتأثر.', updBtn: 'مسح الذاكرة المؤقتة وتحديث', tUpdating: 'جارٍ التحديث…', tUpdFail: 'تعذّر التحديث، تحقّق من الاتصال',
    about: 'أبيات، الإصدار ١. المراجعة المتباعدة بخوارزمية FSRS، بطاقة واحدة لكل فصل.\nالخطوط: الأميري وIBM Plex Sans Arabic (رخصة OFL).',
    /* رسائل */
    tNowMem: 'صارت قيد الحفظ', tStartHere: 'سيبدأ الحفظ من هذا الفصل', tAdded: 'أُضيف الفصل إلى المراجعة البعيدة', tReset: 'أُعيد ضبط الفصل',
    restartQ: 'إعادة الحفظ من البداية؟', restartBody: 'سيُمسح تقدّم هذا الفصل وجدول مراجعته.', restartYes: 'نعم، أعد الحفظ',
    eraseQ: 'مسح كل التقدّم؟', eraseBody: 'سيُحذف تقدّم الحفظ والمراجعة من هذا الجهاز ولا يمكن التراجع. صدّر نسخة احتياطية أولًا إن أردت.', eraseYes: 'نعم، امسح كل شيء', tErased: 'مُسح التقدّم',
    importQ: 'استيراد التقدّم؟', importBody: 'سيحلّ هذا الملف محلّ تقدّمك الحالي على هذا الجهاز.', importYes: 'نعم، استورد', tImported: 'تم استيراد التقدّم', tImportFail: 'تعذّر الاستيراد: الملف غير صالح',
    tBackup: 'حُفظت النسخة الاحتياطية', shareTitle: 'نسخة أبيات الاحتياطية', loadErrT: 'تعذّر تحميل المكتبة', loadErrB: 'تأكّد من الاتصال ثم أعد فتح التطبيق.',
  };

  const en = {
    docTitle: 'Abyaat: Arabic poetry memorizer',
    navLabel: 'Main navigation', navHome: 'Memorize & Review', navLib: 'Library', navSettings: 'Settings',
    modeLearn: 'New memorization', modeNear: 'New review', modeFar: 'Old review',
    cancel: 'Cancel', back: 'Back', backToList: 'Back to the list',
    optional: 'Optional', chapterN: (p) => 'Chapter ' + (p.i + 1),
    baytN: (p) => 'Verse ' + n(p.n),
    homeTitle: 'Memorize & Review',
    homeLedePoem: (p) => `Current poem: ${p.title}.`, homeLedeNone: 'Choose a poem in the Library to begin.', homeChoose: ' Choose where to continue.',
    learnIdlePill: 'Choose a poem', learnIdleSub: 'Pick a poem in the Library to begin', learnAllSub: 'You have finished every chapter of this poem',
    doneM: 'Done!', doneF: 'Done!',
    learnDoneSub: (p) => `Completed: ${bt(p.n)}`, learnTodaySub: (p) => `Today: ${n(p.a)} of ${n(p.b)}`,
    nearIdlePill: 'Nothing today', nearIdleSub: 'Chapters you have started memorizing appear here',
    nearLeft: (p) => n(p.n) + ' left', nearTodoSub: 'What you memorized in current chapters', nearDoneSub: 'You reviewed everything for today',
    farIdlePill: 'No chapters yet', farIdleSub: 'Chapters appear here after consolidation',
    farDue: (p) => n(p.n) + ' due', farTodoSub: 'Spaced repetition (FSRS)', farNextSub: (p) => 'Next review ' + p.when,
    chooseTitle: 'Choose a poem to begin', chooseBody: 'Pick the poem you want to memorize in the Library.', toLibrary: 'Go to the Library',
    finishedTitle: 'You finished this poem', finishedBody: 'Keep reviewing it in new review and old review, or pick another poem in the Library.',
    learnStart: (p) => `Start memorizing ${bt(p.n)}`, learnDoneNotice: (p) => `Today's memorization is complete (${bt(p.n)}). Well done.`, learnMore: 'Memorize one more verse',
    learnedOf: (p) => `${n(p.n)} of ${bt(p.total)} memorized`, baytsToday: 'Verses today', decrease: 'Decrease', increase: 'Increase',
    nearNotice: 'You have a new review today. It is best to start with it.', openNear: 'Open new review',
    hideRecite: 'Hide the text and recite', showTrans: 'Show translation', hideTrans: 'Hide translation',
    recitePrompt: 'Recite the verse aloud from memory, then check.', hint: 'Hint', hideHint: 'Hide hint', revealCheck: 'Reveal to check',
    checkPrompt: 'Did you recite it fully without a mistake?', notYet: 'Not yet', memorized: 'Memorized', progressToday: 'Progress today',
    wellDone: 'Well done', sessionDone: (p) => `You memorized ${bt(p.n)} this session.`,
    chapterFinished: (p) => `You finished “${p.title}”. It will appear in new review, and after ${dc(p.days)} of actual review it moves to old review.`,
    nearEmptyT: 'No new review today', nearEmptyB: 'Chapters you have started, and consolidation days after finishing one, appear here.', startNew: 'Start new memorization',
    nearRowConsol: (p) => `${p.poem}, consolidation: ${n(p.n)} of ${dc(p.days)} done`, nearRowLearn: (p) => `${p.poem}, ${n(p.n)} of ${bt(p.b)} memorized`,
    nearLede: (p) => `Left today: ${n(p.n)}`, nearAllDone: 'You finished all of today’s review.',
    hideLast: 'Hide the last visible verse', showNext: 'Reveal the next verse', visibleOf: (p) => `${n(p.a)} of ${n(p.b)} visible`,
    prev: 'Previous', next: 'Next', finishReview: 'Finish review', reviewComplete: 'Review complete',
    resGrad: (p) => `You completed ${dc(p.days)} of consolidation, so “${p.title}” moved to old review. Its first review is ${p.when}.`,
    resConsol: (p) => `${n(p.n)} of ${dc(p.days)} of consolidation done.`, resLearn: 'You reviewed what you have memorized of this chapter today.',
    nextReview: (p) => `Next review: ${p.title}`,
    farEmptyT: 'No chapters in old review yet', farEmptyB: (p) => `A chapter moves here after ${dc(p.days)} of consolidation, or when you choose “Mark chapter as memorized” in the Library.`, openLib: 'Open the Library',
    farLede: (p) => `Review today: ${n(p.n)} chapter${p.n === 1 ? '' : 's'}`, farNone: 'Nothing due today.', upcoming: 'Upcoming',
    farRowSub: (p) => `${p.poem}, ${bt(p.b)}`,
    farPrompt: (p) => `Tap a verse you find difficult to highlight it${p.marked ? ` (${n(p.marked)})` : ''}.`, finishChapter: 'Finish chapter',
    r1: 'Forgot', r2: 'Hard', r3: 'Good', r4: 'Easy',
    rateTitle: (p) => `You highlighted ${n(p.n)} of ${bt(p.b)}`, rateNone: 'You highlighted no verses',
    rateLede: 'When do you want to review this chapter? The suggestion is shaded; you can choose another.',
    reviewDone: 'Review complete', farDoneNext: (p) => `This chapter’s next review is ${p.when}.`, nextChapter: (p) => `Next chapter: ${p.title}`,
    sectionsAria: 'Library sections', chapCount: (p) => n(p.n) + ' chapters', memorizing: 'Memorizing',
    libEmptyT: (p) => `No ${p.title} yet`, libEmptyB: 'They will appear here when added to the app.',
    stOld: 'Old review', stNextReview: (p) => 'Next review ' + p.when, stConsol: 'Consolidating', stConsolSub: (p) => `${dc(p.days)} of consolidation left`,
    stNow: 'Memorizing now', stProg: 'In progress', stNext: 'Next', stNew: 'Not started',
    poemProgress: (p) => `${n(p.n)} of ${bt(p.b)} in the main chapters`, readPoem: 'Read the poem', memorizingNow: 'Memorizing now', memorizeThis: 'Memorize this poem', chaptersH: 'Chapters',
    readChapter: 'Read chapter', continueHere: 'Continue memorizing from here', startHere: 'Start memorizing from this chapter', markMemorized: 'Mark chapter as memorized', restartChapter: 'Restart this chapter',
    markTitle: (p) => `How well do you know “${p.title}”?`, markSub: 'The chapter enters old review, and your rating sets its first review date.',
    md1: 'I cannot recite it now', md2: 'I recall it with effort and hesitation', md3: 'I recite it with confidence and few slips', md4: 'I recite it quickly without hesitation',
    jumpTo: 'Jump to chapter', readerBack: 'Back', smaller: 'Smaller text', larger: 'Larger text', translation: 'Translation', smallerLbl: 'A−', largerLbl: 'A+',
    setTitle: 'Settings', perDayT: 'New verses per day', perDayD: 'Learning more new verses per day also increases the number of reviews you will have.', perDayLbl: 'Verses per day',
    retT: 'Target retention', retD: 'Higher means more frequent reviews.', pct: (p) => p.v + '%',
    alwaysEnT: 'Always show the English translation', alwaysEnD: 'Shown under each verse while memorizing. Turn off to hide it.',
    themeT: 'Appearance', themeD: 'Choose light or dark, or follow your device.', themeLight: 'Light', themeDark: 'Dark', themeAuto: 'Auto',
    langT: 'Interface language', langD: 'Poems always stay in Arabic. Only the buttons and menus change.',
    backupT: 'Backup', backupD: 'Your progress is saved on this device only. Export a copy to move or keep it.', exportBtn: 'Export progress', importBtn: 'Import', eraseBtn: 'Erase all progress',
    updT: 'Update app', updD: 'Clears cached files and loads the latest version. Your progress is not affected.', updBtn: 'Clear cache & update', tUpdating: 'Updating…', tUpdFail: 'Update failed, check your connection',
    about: 'Abyaat, version 1. Spaced repetition with FSRS, one card per chapter.\nFonts: Amiri and IBM Plex Sans Arabic (OFL license).',
    tNowMem: 'Now memorizing this poem', tStartHere: 'Memorization will start from this chapter', tAdded: 'Chapter added to old review', tReset: 'Chapter reset',
    restartQ: 'Restart this chapter?', restartBody: 'This chapter’s progress and review schedule will be erased.', restartYes: 'Yes, restart',
    eraseQ: 'Erase all progress?', eraseBody: 'Your memorization and review progress will be deleted from this device and cannot be undone. Export a backup first if you like.', eraseYes: 'Yes, erase everything', tErased: 'Progress erased',
    importQ: 'Import progress?', importBody: 'This file will replace your current progress on this device.', importYes: 'Yes, import', tImported: 'Progress imported', tImportFail: 'Import failed: the file is not valid',
    tBackup: 'Backup saved', shareTitle: 'Abyaat backup', loadErrT: 'Could not load the library', loadErrB: 'Check your connection and reopen the app.',
  };

  const STR = { ar, en };
  function t(key, p) {
    const v = (STR[U.getLang()] && STR[U.getLang()][key] !== undefined) ? STR[U.getLang()][key] : STR.ar[key];
    return typeof v === 'function' ? v(p || {}) : v;
  }
  return { t, STR };
});
