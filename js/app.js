/* تعاهد — واجهة التطبيق (عربي / English). النصوص العربية تبقى بالعربية ومن اليمين دائمًا. */
(function () {
  'use strict';
  const U = window.AbyaatUtil, F = window.AbyaatFSRS, S = window.AbyaatStore, I = window.AbyaatI18n;
  const { ar, esc } = U;
  const t = (k, p) => I.t(k, p);              // نص خام
  const e = (k, p) => esc(I.t(k, p));         // نص مُهرَّب للإدراج في HTML
  const nl = (s) => esc(s).replace(/\n/g, '<br>');
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const view = $('#view');
  const DAYS = S.CONSOLIDATION_DAYS;

  const IC = {
    chev: '<svg class="ic chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    chevL: '<svg class="ic chev mirror" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    check: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
    eye: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/></svg>',
  };

  const ui = {
    tab: 'home', mode: null, poemOpen: false,   // الحفظ والمراجعة: القائمة، ثم شاشة القصيدة (poemOpen)، ثم mode = learn | near | far | add
    test: null,   // اختبار آخر الأبيات بعد الحفظ: { pid, cid, start, end, shown }
    learn: { stage: 'home', target: 0, done: 0, hint: false, hidden: false, en: false, completed: [], completedParts: [] },
    near: { stage: 'list', pid: null, cid: null, segIdx: null, page: 0, shown: null },
    far: { stage: 'list', pid: null, cid: null, segIdx: null, page: 0, shown: 0, missed: {}, rated: null },
    lib: { section: 'qasaid', poem: null, reader: null },
  };
  let LIB = null;
  const POEMS = new Map();

  /* ---------- اللغة والمظهر ---------- */
  const isEn = () => U.getLang() === 'en';
  const pick = (o, k) => (isEn() && o[k + 'En']) ? o[k + 'En'] : o[k];
  const ctitle = (o) => (isEn() && S.settings().showEn && o.titleEn) ? o.titleEn : o.title;   // ترجمة عناوين الفصول تتبع إعداد الترجمة
  const da = ' dir="auto"';
  function applyLang() {
    U.setLang(S.settings().lang);
    const r = document.documentElement;
    r.lang = isEn() ? 'en' : 'ar'; r.dir = isEn() ? 'ltr' : 'rtl';
    document.title = t('docTitle');
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  }
  const dark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function applyTheme() {
    const s = S.settings().theme, isDark = s === 'dark' || (s === 'auto' && dark && dark.matches);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    const m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', isDark ? '#14110c' : '#eadfc6');
  }
  if (dark && dark.addEventListener) dark.addEventListener('change', applyTheme);

  /* ---------- البيانات ---------- */
  async function loadPoem(id) {
    if (POEMS.has(id)) return POEMS.get(id);
    const entry = LIB && LIB.poems.find((p) => p.id === id);
    if (!entry) return null;
    const res = await fetch(entry.file);
    const poem = await res.json();
    if (poem.type === 'dhikr') poem.chapters.forEach((c) => c.bayts.forEach((b) => { b.ls = b.l || splitPhrases(b.s); }));
    POEMS.set(id, poem); S.registerPoem(poem);
    return poem;
  }
  /* الذكر نصّ متصل لا شطران: يُقسَّم إلى عبارات قصيرة (بعلامات الوقف، ثم بالطول) تُظهَر وتُخفى سطرًا سطرًا */
  function splitPhrases(text) {
    const base = (w) => w.replace(/[\u064b-\u065f\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/[،؛.:؟!]/g, '');
    /* لا يُقطَع السطر بعد حرف جرّ أو أداة تتعلّق بما بعدها */
    const glue = new Set(['من', 'في', 'علي', 'الي', 'عن', 'لا', 'ما', 'ان', 'انه', 'ان', 'لو', 'قل', 'يا', 'كما', 'الذي', 'حتي', 'بين', 'ذا', 'ثم', 'او', 'ولا', 'وما', 'ومن', 'وفي', 'وعلي', 'وبين', 'وان', 'فان', 'فما', 'اذا', 'رب', 'مع', 'الا', 'اللهم', 'ب', 'ل', 'و', 'ف', 'بما', 'لما', 'مما', 'عما', 'كل', 'بكل', 'اني', 'انك', 'انت', 'وانا', 'انا', 'اله', 'اعوذ', 'واعوذ', 'اسالك', 'واسالك', 'اشهد', 'واشهد']);
    const breakable = (w, k) => !glue.has(base(w[k - 1]));
    const startsConj = (w) => /^(و|او|ثم|الا|كما|فان|ف)/.test(base(w)) && base(w).length > 2;
    const splitLong = (c) => {
      if (c.length <= 8) return [c];
      const mid = c.length / 2; let best = -1, bd = 1e9;
      for (let k = 2; k <= c.length - 2; k++) { if (!breakable(c, k)) continue; const d = Math.abs(k - mid) + (startsConj(c[k]) ? 0 : 1.6); if (d < bd) { bd = d; best = k; } }
      if (best < 0) best = Math.round(mid);
      return splitLong(c.slice(0, best)).concat(splitLong(c.slice(best)));
    };
    const words = text.split(/\s+/).filter(Boolean), chunks = []; let cur = [];
    words.forEach((w) => { cur.push(w); if (/[،؛.:؟!]$/.test(w)) { chunks.push(cur); cur = []; } });
    if (cur.length) chunks.push(cur);
    const merged = [];
    chunks.forEach((c) => { const last = merged[merged.length - 1]; if (last && last.length < 3) last.push(...c); else merged.push(c.slice()); });
    const out = [];
    merged.forEach((c) => splitLong(c).forEach((x) => out.push(x)));
    return out.map((c) => c.join(' '));
  }
  const linesOf = (b) => b.ls || (b.ls = b.e ? [b.s, b.e] : [b.s]);
  const isDhikr = (pid) => !!(S.meta(pid) && S.meta(pid).type === 'dhikr');
  const isWird = (pid) => !!(S.meta(pid) && S.meta(pid).type === 'wird');
  const unitOf = (pid) => (isDhikr(pid) ? 'dhikr' : (S.meta(pid) && S.meta(pid).type === 'wird' ? 'line' : 'bayt'));
  const chapterOf = (pid, cid) => { const p = POEMS.get(pid); return p && p.chapters.find((c) => c.id === cid); };
  const cMeta = (pid, cid) => S.meta(pid).chapters.find((c) => c.id === cid);
  const cTitle = (pid, cid) => ctitle(cMeta(pid, cid));
  const pTitle = (pid) => pick(S.meta(pid), 'title');
  const kicker = (pid, cid) => {
    const m = S.meta(pid), c = m.chapters.find((x) => x.id === cid);
    if (m.type === 'dhikr') return pick(c, 'group') || '';
    if (c.optional) return ctitle(c);
    return t('chapterN', { i: m.chapters.filter((x) => !x.optional).findIndex((x) => x.id === cid) });
  };
  /* تسمية الجزء: تظهر فقط حين يُقسَّم الفصل إلى أكثر من جزء واحد في المراجعة */
  const partLabel = (segIdx, segCount) => segCount > 1 ? t('partN', { i: segIdx + 1, total: segCount }) : '';
  const withPart = (label, segIdx, segCount) => segCount > 1 ? `${label} · ${partLabel(segIdx, segCount)}` : label;

  /* ---------- أدوات الواجهة ---------- */
  function toast(msg, ms) {
    const box = $('#toast'); box.innerHTML = '<div>' + esc(msg) + '</div>';
    clearTimeout(toast.h); toast.h = setTimeout(() => { box.innerHTML = ''; }, ms || 2600);
  }
  function openSheet(html) {
    $('#sheet-root').innerHTML = '<div class="scrim" data-act="sheet-close"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + '</div>';
    const f = $('#sheet-root button'); if (f) f.focus();
  }
  const closeSheet = () => { $('#sheet-root').innerHTML = ''; };
  function confirmSheet(title, sub, okLabel, act, data, danger) {
    const attrs = Object.keys(data || {}).map((k) => ` data-${k}="${esc(data[k])}"`).join('');
    openSheet(`<h2>${esc(title)}</h2><p class="sub">${esc(sub)}</p><div class="opts">
      <button class="btn block ${danger ? 'danger' : ''}" data-act="${act}"${attrs}>${esc(okLabel)}</button>
      <button class="btn block ghost" data-act="sheet-close">${e('cancel')}</button></div>`);
  }
  /* علامة التطبيق (الهاء الوسطى) في الصفحات الفارغة ونهاية الجلسة */
  const MARK = '<svg class="mark" viewBox="0 0 39.9 37.3" role="img" aria-hidden="true"><path fill="currentColor" d="M39.9 24.1H27.9Q29.4 26.2 29.4 28.8Q29.4 31.6 27.6 34.1Q25.4 37.3 21.8 37.3Q19.5 37.3 17.3 36.1Q15.1 34.9 13.4 32.8Q10.8 29.4 10.2 25Q8.8 25.6 6.9 26.8L7.4 24.1H5Q2.9 24.1 1.5 22.6Q0 21.1 0 19.1Q0 16.9 1.5 15.5Q3.1 14.1 5 14.1H11.4Q12.8 9 16.1 5.3Q18 3.2 19.9 2.1Q21.7 0.9 24.4 0Q26.1 2.4 27 4.3Q27.8 6.2 27.8 8.1Q27.8 11.6 25.4 14.9Q26.9 14.1 28.9 14.1H39.9ZM21.5 6.9Q19.4 8.6 18.3 10.4Q16.9 12.2 16.2 14.2L18.1 13.5Q20.2 12.7 21.5 12Q23.1 11 23.1 10Q23.1 9.2 21.5 6.9ZM15.4 24Q16.2 27 18.9 28.7Q21.6 30.4 25.8 30.6Q25.2 27.5 22.1 25.9Q19.3 24.4 15.4 24Z"/></svg>';
  const emptyState = (h, p, btn, to) => `<div class="empty"><div class="glyph" aria-hidden="true">${MARK}</div><h2>${esc(h)}</h2><p>${esc(p)}</p>${btn ? `<button class="btn" data-act="goto" data-to="${to}">${esc(btn)}</button>` : ''}</div>`;

  /* ---------- عرض الأبيات (يبقى بالعربية ومن اليمين دائمًا) ---------- */
  function hem(text, mode, nopeek) {
    if (mode === 'hide') return `<div class="hem is-hidden"${nopeek ? '' : ' data-peek'}>${esc(text)}</div>`;
    if (mode === 'hint') {
      const i = text.indexOf(' '), first = i < 0 ? text : text.slice(0, i), rest = i < 0 ? '' : text.slice(i);
      return `<div class="hem"><span class="hint-first">${esc(first)}</span><span class="is-hidden" data-peek>${esc(rest)}</span></div>`;
    }
    return `<div class="hem">${esc(text)}</div>`;
  }
  const transParas = (b) => b.t.map((x) => `<p>${esc(x)}</p>`).join('');
  function baytHTML(b, idx, opts) {
    opts = opts || {};
    const L = linesOf(b), mode = (i) => (opts.m ? opts.m[i] : (i === 0 ? opts.s : opts.e));
    const no = opts.no ? `<span class="bno">${ar(b.n || idx + 1)}</span>` : '';
    /* اضغط مطوّلًا على البيت أو الذكر لإظهار ترجمته مؤقتًا */
    const peek = (opts.trans && b.t && b.t.length) ? `<div class="trans-peek" dir="ltr" lang="en">${transParas(b)}</div>` : '';
    /* opts.orn = false: لا فاصل زخرفي بين شطري البيت الواحد (يُستخدم بدل ذلك بين الأبيات، انظر nearPager وfarReview) */
    const mid = b.e && L.length === 2 ? (opts.orn === false ? '' : '<div class="orn"></div>') : '';
    /* رقم البيت عنصر عادي في تخطيط مرن، لا فوق النص، حتى لا يتداخل مع نص طويل يتّسع للعرض كله */
    const lines = `<div class="lines">${L.map((text, i) => (i === 1 ? mid : '') + hem(text, mode(i), opts.nopeek)).join('')}</div>`;
    return `<div class="bayt${opts.orn === false ? ' no-orn' : ''}${opts.no ? ' has-no' : ''}">${no}${lines}${peek}</div>`;
  }
  const transHTML = (b) => !b.t ? '' : `<div class="trans en" lang="en" dir="ltr">${transParas(b)}</div>`;

  /* ---------- الحفظ والمراجعة: لوحة المستويات الثلاثة ---------- */
  function modeCard(to, titleKey, st, pill, sub) {
    return `<button class="mode ${st}" data-act="goto" data-to="${to}"><span class="mode-mark">${st === 'done' ? IC.check : IC.chevL}</span>
      <span class="mode-body"><span class="mode-top"><span class="mode-title">${e(titleKey)}</span><span class="mode-pill"${da}>${esc(pill)}</span></span><span class="mode-sub">${esc(sub)}</span></span></button>`;
  }
  const poemItems = (pid) => ({ near: S.newReviewList().filter((x) => x.pid === pid), far: S.oldReviewList().filter((x) => x.pid === pid) });
  /* حال اليوم: اكتمل إذا لم يبقَ حفظ جديد (بلغتَ عدد الأبيات المحدد أو انتهت الفصول) ولا مراجعة قريبة ولا بعيدة */
  function dayStatus(pid) {
    const it = poemItems(pid), nearN = it.near.filter((x) => !x.done).length, farN = it.far.filter((x) => x.isDue).length;
    const hasNew = !!S.currentChapter(pid), newOk = !hasNew || S.newDoneToday(pid) >= S.perDayOf(pid);
    const previewN = S.previewPending(pid) ? 1 : 0;
    return { nearN, farN, hasNew, newOk, previewN, done: newOk && !nearN && !farN && !previewN };
  }
  const statusChips = (st) => st.done
    ? `<span class="pill green">${IC.check}${e('allDoneToday')}</span>`
    : (st.previewN ? `<span class="pill gold">${e('chipPreview')}</span>` : '') + (!st.newOk ? `<span class="pill gold">${e('chipNew')}</span>` : '') + (st.nearN ? `<span class="pill rust">${e('chipNear', { n: st.nearN })}</span>` : '') + (st.farN ? `<span class="pill rust">${e('chipFar', { n: st.farN })}</span>` : '');
  function poemCard(pid, act) {
    const poem = POEMS.get(pid), pr = S.poemProgress(pid), st = act === 'poem-open' ? dayStatus(pid) : null;
    return `<li style="margin-bottom:12px"><button class="book${st && st.done ? ' is-done' : ''}" data-act="${act}" data-pid="${esc(pid)}"><span class="spine"></span><span class="body">
      <div class="name"${da}>${esc(pick(poem, 'title'))}</div><div class="full"${da}>${esc(pick(poem, 'author'))}</div>
      <div class="meta"><span>${e('memStat', { n: pr.done, b: pr.total, u: unitOf(pid) })}</span></div>
      ${st ? `<div class="chips">${statusChips(st)}</div>` : ''}
      <div class="bar" style="margin-top:10px"><i style="width:${pr.pct}%"></i></div></span></button></li>`;
  }
  function vHome() {
    const act = S.state.activePoem;
    if (ui.poemOpen && act && POEMS.get(act) && S.isEnrolled(act)) return vPoemHome(act);
    ui.poemOpen = false;
    const ids = S.enrolledIds().filter((id) => POEMS.get(id));
    const sec = (title, list) => list.length ? `<h3 class="section-h">${esc(title)}</h3><ul class="list">${list.map((id) => poemCard(id, 'poem-open')).join('')}</ul>` : '';
    const doneN = ids.filter((id) => dayStatus(id).done).length;
    const banner = !ids.length ? '' : doneN === ids.length
      ? `<div class="allclear"><span class="allclear-ic">${IC.check}</span><div><b>${e('homeAllDone')}</b><p>${e('homeAllDoneSub')}</p></div></div>`
      : `<p class="lede">${e('homeProgress', { a: doneN, b: ids.length })}</p>`;
    const body = ids.length
      ? sec(t('secMem'), ids.filter((id) => S.poemStatus(id) === 'memorizing')) + sec(t('secRev'), ids.filter((id) => S.poemStatus(id) === 'review'))
      : emptyState(t('homeEmptyT'), t('homeEmptyB'));
    return `<h2 class="page-title">${e('homeTitle')}</h2>${banner}${body}<button class="btn block quiet" style="margin-top:16px" data-act="add-poem">+ ${e('addPoem')}</button>`;
  }
  function vAdd() {
    const rest = LIB.poems.filter((p) => !S.isEnrolled(p.id));
    const cards = rest.map((p) => `<li style="margin-bottom:12px"><button class="book" data-act="enroll" data-pid="${esc(p.id)}"><span class="spine"></span><span class="body">
      <div class="name"${da}>${esc(pick(p, 'title'))}</div><div class="full"${da}>${esc(pick(p, 'author'))}</div>
      <div class="meta"><span>${esc(U.baytCount(p.baytCount, p.type === 'dhikr' ? 'dhikr' : (p.type === 'wird' ? 'line' : 'bayt')))}</span><span>${e('chapCount', { n: p.chapterCount })}</span></div></span></button></li>`).join('');
    return `<h2 class="page-title">${e('chooseTitle')}</h2><p class="lede">${e('chooseBody')}</p>${rest.length ? `<ul class="list" style="margin-top:14px">${cards}</ul>` : `<p class="muted" style="margin-top:14px">${e('addNone')}</p>`}`;
  }
  /* شاشة القصيدة: عدد الأبيات وما حُفظ منها، الفصول والتأشير، ثم الحفظ الجديد والمراجعتان لهذه القصيدة وحدها */
  function vPoemHome(pid) {
    const poem = POEMS.get(pid), pr = S.poemProgress(pid), it = poemItems(pid), cm = S.currentChapter(pid), st = dayStatus(pid);
    const learn = !cm ? ['done', t('doneM'), t('learnAllSub')]
      : st.newOk ? ['done', t('doneM'), t('learnDoneSub', { n: S.newDoneToday(pid) })]
      : ['todo', kicker(pid, cm.id), ctitle(cm)];
    const pvN = S.previewItems(pid).length;
    const preview = !pvN ? ['idle', t('nearIdlePill'), t('previewIdleSub')]
      : S.previewDone(pid) ? ['done', t('doneF'), t('previewDoneSub')]
      : ['todo', t('previewPill', { n: S.previewReads(pid), m: S.PREVIEW_READS }), t('previewTodoSub')];
    const pending = it.near.filter((x) => !x.done).length;
    const near = !it.near.length ? ['idle', t('nearIdlePill'), t('nearIdleSub')]
      : pending ? ['todo', t('nearLeft', { n: pending }), t('nearTodoSub')]
      : ['done', t('doneF'), t('nearDoneSub')];
    const due = it.far.filter((x) => x.isDue).length;
    const far = !it.far.length ? ['idle', t('farIdlePill'), t('farIdleSub')]
      : due ? ['todo', t('farDue', { n: due }), t('farTodoSub')]
      : ['done', t('doneF'), t('farNextSub', { when: U.inDays(it.far[0].dueIn) })];
    return `<div class="hero"><div class="kicker"${da}>${esc(pick(poem, 'author'))}</div><h2 class="title"${da}>${esc(pick(poem, 'fullTitle'))}</h2></div>
      ${st.done ? `<div class="allclear" style="margin:10px 0 0"><span class="allclear-ic">${IC.check}</span><div><b>${e('poemAllDone')}</b></div></div>` : ''}
      <div style="margin:10px 0 12px"><div class="bar" role="progressbar" aria-valuenow="${pr.pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pr.pct}%"></i></div>
        <p class="small muted" style="margin-top:6px">${e('memStat', { n: pr.done, b: pr.total })}</p></div>
      <button class="btn block quiet" data-act="learn-chapters">${e('chaptersBtn')}</button>
      <div class="modes">${modeCard('preview', 'modePreview', ...preview)}${modeCard('learn', 'modeLearn', ...learn)}${modeCard('near', 'modeNear', ...near)}${modeCard('far', 'modeFar', ...far)}</div>
      <button class="btn block ghost" style="margin-top:22px" data-act="unenroll-ask">${e('removePoem')}</button>`;
  }

  /* ---------- التمهيد: قراءة الأبيات الثلاثة القادمة ثلاث مرات قبل حفظها ---------- */
  function vPreview() {
    const pid = S.state.activePoem, items = pid && POEMS.get(pid) ? S.previewItems(pid) : [];
    if (!items.length) { ui.mode = null; return vHome(); }
    const slice = items.map((it) => chapterOf(pid, it.cid).bayts[it.idx]), modes = revealModes(slice, lineCount(slice));
    const body = slice.map((b, i) => whenLabel(slice, i) + baytHTML(b, items[i].idx, { no: true, m: modes[i], trans: true, orn: false })).join('<div class="orn"></div>');
    const reads = S.previewReads(pid), total = S.PREVIEW_READS, done = reads >= total, last = reads + 1 >= total;
    return `<div class="fit-box folio rev nowrap" dir="rtl" data-min="11" data-max="44"><div class="fit-content">${body}</div></div>
      <div class="actions"><p class="pv-count">${done ? e('previewDoneSub') : e('previewReadN', { n: reads + 1, m: total })}</p>
        ${done ? `<button class="btn block quiet" data-act="mode-back">${e('previewBack')}</button>` : `<button class="btn block" data-act="preview-read">${e(last ? 'previewFinish' : 'previewRead')}</button>`}</div>`;
  }

  /* ---------- الحفظ الجديد ---------- */
  function learnCursor() {
    const pid = S.state.activePoem; if (!pid || !POEMS.get(pid)) return null;
    const cm = S.currentChapter(pid); if (!cm) return null;
    const chap = chapterOf(pid, cm.id), idx = S.chapter(pid, cm.id).learned;
    return chap && chap.bayts[idx] ? { pid, chap, idx, bayt: chap.bayts[idx] } : null;
  }
  /* الحفظ الجديد بلا شاشة تمهيدية: تبدأ الجلسة مباشرةً بعدد الأبيات المحفوظ في الإعدادات، ويُعدَّل من الأعلى بزرّي + و − */
  /* بعد كل بيت (وبعد اختباره): بيت تالٍ، أو نهاية الجلسة فيرجع إلى شاشة القصيدة دون شاشة وسيطة */
  /* احتساب البيت الحالي محفوظًا (بعد الاختبار إن وُجد) */
  function commitLearned(pid, cid) {
    const L = ui.learn, r = S.markLearned(pid, cid);
    L.done += 1; L.hint = false; L.hidden = false;
    if (r.completed) L.completed.push(cid);
    else if (r.segCompleted) L.completedParts.push({ cid, segIdx: r.segIdx, segCount: r.segCount });
  }
  function afterLearnStep() {
    const L = ui.learn;
    if (L.done >= L.target || !learnCursor()) return finishLearn();
    L.stage = 'learn'; return render();
  }
  function finishLearn() {
    const L = ui.learn, pid = S.state.activePoem, msgs = [];
    L.completed.forEach((cid) => msgs.push(t('chapterFinished', { title: cTitle(pid, cid), days: DAYS })));
    L.completedParts.forEach((p) => msgs.push(t('partFinished', { title: withPart(cTitle(pid, p.cid), p.segIdx, p.segCount), days: DAYS })));
    toast(msgs.length ? msgs.join(' ') : t('sessionDoneT', { n: L.done }), msgs.length ? 6500 : 3200);
    ui.test = null; ui.mode = null; L.stage = 'home'; return render();
  }
  function startLearn() {
    Object.assign(ui.learn, { stage: 'learn', target: S.perDayOf(S.state.activePoem), done: 0, hint: false, hidden: false, en: false, completed: [], completedParts: [] });
  }
  function vLearn() {
    const pid = S.state.activePoem, L = ui.learn;
    if (!pid || !POEMS.get(pid)) { ui.mode = null; return vHome(); }
    if (L.stage === 'chapters') return learnChapters(pid, !S.currentChapter(pid) && !S.meta(pid).chapters.some((c) => S.isSuspended(pid, c.id)));
    if (L.stage === 'test' && ui.test) return testPage();
    if (learnCursor()) { if (L.stage !== 'learn') startLearn(); return learnCard(); }
    return learnChapters(pid, true);
  }
  const stepper = (label, val, min, max) => `<div class="stepper"><span class="label">${esc(label)}</span>
    <span class="ctl"><button data-act="perday" data-d="-1" aria-label="${e('decrease')}" ${val <= min ? 'disabled' : ''}>−</button><output>${ar(val)}</output><button data-act="perday" data-d="1" aria-label="${e('increase')}" ${val >= max ? 'disabled' : ''}>+</button></span></div>`;
  /* عنوان المجموعة (الأذكار فقط): يُكتب مرة واحدة قبل أول فصل فيها */
  const groupHead = (m, ci) => { const c = m.chapters[ci], prev = ci && m.chapters[ci - 1]; return (c.group && (!prev || prev.group !== c.group)) ? `<li class="grp-h"${da}>${esc(pick(c, 'group'))}</li>` : ''; };
  function learnChapters(pid, finished) {
    const poem = POEMS.get(pid), m = S.meta(pid), pr = S.poemProgress(pid);
    const rows = m.chapters.map((c, ci) => {
      const st = chapterStatus(pid, c);
      return groupHead(m, ci) + `<li><button class="li${st.susp ? ' susp' : ''}" data-act="ch-open" data-cid="${esc(c.id)}"><span class="main">${m.type === 'dhikr' ? '' : `<span class="ch-no">${esc(kicker(pid, c.id))}</span>`}<div class="t"${da}>${esc(ctitle(c))}</div><div class="s">${esc(st.sub)}</div></span><span class="end">${st.pill}</span></button></li>`;
    }).join('');
    return `<div class="hero"><div class="kicker"${da}>${esc(pick(poem, 'author'))}</div><h2 class="title"${da}>${esc(pick(poem, 'fullTitle'))}</h2></div>
      ${finished ? `<div class="notice" style="margin-top:10px">${e('finishedBody')}</div>` : ''}
      <div style="margin:10px 0 14px"><div class="bar"><i style="width:${pr.pct}%"></i></div><p class="small muted" style="margin-top:6px">${e('memStat', { n: pr.done, b: pr.total })}</p></div>
      <p class="small muted" style="margin:0 0 4px">${e('chaptersHint')}</p>
      <ul class="list">${rows}</ul>`;
  }
  function learnCard() {
    const L = ui.learn, cursor = learnCursor(), b = cursor.bayt;
    const step = `<span class="lt-step" dir="ltr" aria-label="${e('baytsToday')}"><button data-act="learn-target" data-d="-1" aria-label="${e('decrease')}" ${L.target <= L.done + 1 ? 'disabled' : ''}>−</button><output>${ar(L.done + 1)} / ${ar(L.target)}</output><button data-act="learn-target" data-d="1" aria-label="${e('increase')}" ${L.target >= 30 ? 'disabled' : ''}>+</button></span>`;
    const hidden = !!L.hidden;
    const mode = hidden ? (L.hint ? 'hint' : 'hide') : 'show';
    const showEn = S.settings().showEn;   // الترجمة تُضبط من الإعدادات فقط
    const trans = (b.t && showEn) ? `<div class="trans-row">${transHTML(b)}</div>` : '';
    const dh = isDhikr(cursor.pid);
    /* الذكر: الظرف والعدد والمصدر تحت النص، والترجمة بالضغط المطوّل على النص */
    const meta = (dh || isWird(cursor.pid)) ? `<div class="dh-meta">${b.w ? `<span class="pill gold"${da}>${esc(pick(b, 'w'))}</span>` : ''}${b.c > 1 ? `<span class="pill green">${e('timesN', { n: b.c })}</span>` : ''}${b.r ? `<span${da}>${esc(b.r)}</span>` : ''}${b.t ? `<span class="muted">${e('holdTrans')}</span>` : ''}</div>` : '';
    const actions = `<div class="row"><button class="btn quiet" data-act="learn-hide">${hidden ? e('showVerse') : e('hideVerse')}</button>
        <button class="btn quiet" data-act="learn-hint" ${hidden ? '' : 'disabled'}>${L.hint ? e('hideHint') : e('hint')}</button></div>
      <button class="btn block" data-act="learn-known">${e('memorized')}</button>`;
    return `<div class="learn-top"><span><b>${e('baytN', { n: cursor.bayt.n || cursor.idx + 1 })}</b> <span class="muted small"${da}>${esc(ctitle(cMeta(cursor.pid, cursor.chap.id)))}</span></span>${step}</div>
      <div class="fit-box folio wrap" dir="rtl" data-min="${dh ? 14 : 16}" data-max="${dh ? 36 : 48}"><div class="fit-content">${baytHTML(b, cursor.idx, { s: mode, e: mode, trans: true })}</div></div>
      ${meta || (b.t ? `<div class="dh-meta"><span class="muted">${e('holdTrans')}</span></div>` : '')}${trans}
      <div class="actions">${actions}</div>`;
  }
  /* ---------- المراجعة القريبة ---------- */
  function vNear() {
    const N = ui.near;
    if (N.stage === 'pager') return nearPager();
    const items = S.newReviewList().filter((x) => x.pid === S.state.activePoem);
    if (!items.length) return emptyState(t('nearEmptyT'), t('nearEmptyB'), t('startNew'), 'learn');
    const pending = items.filter((x) => !x.done).length;
    const rows = items.map((x) => {
      const sub = x.status === 'consolidating'
        ? t('nearRowConsol', { poem: pTitle(x.pid), n: x.daysDone, days: DAYS })
        : t('nearRowLearn', { poem: pTitle(x.pid), n: x.learned, b: x.len });
      return `<li><button class="li ${x.done ? 'dim' : ''}" data-act="near-open" data-pid="${esc(x.pid)}" data-cid="${esc(x.cid)}" data-seg="${x.segIdx}">
        <span class="main"><span class="ch-no">${esc(withPart(kicker(x.pid, x.cid), x.segIdx, x.segCount))}</span><div class="t"${da}>${esc(cTitle(x.pid, x.cid))}</div><div class="s">${esc(sub)}</div></span>
        <span class="end">${x.done ? `<span class="check">${IC.check}</span>` : IC.chevL}</span></button></li>`;
    }).join('');
    return `<h2 class="page-title">${e('modeNear')}</h2>
      <p class="lede">${pending ? e('nearLede', { n: pending }) : e('nearAllDone')}</p>
      <ul class="list" style="margin-top:8px">${rows}</ul>`;
  }
  /* أسهم المراجعة (مواضعها ثابتة بالعربية والإنجليزية): اليمين للتقدّم واليسار للرجوع.
     سهم واحد = سطر (شطر) واحد، سهمان = المجموعة التالية أو السابقة من الأبيات */
  const ARR = (n, flip) => `<svg class="arr${flip ? ' flip' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${n === 2 ? 'M5 6l6 6-6 6M12 6l6 6-6 6' : 'M9 6l6 6-6 6'}"/></svg>`;
  const lineCount = (slice) => slice.reduce((n, b) => n + linesOf(b).length, 0);
  /* يوزّع عدد الأسطر الظاهرة على أبيات الصفحة: لكل بيت مصفوفة حالات 'show' أو 'hide' */
  const revealModes = (slice, shown) => { let rem = shown; return slice.map((b) => { const L = linesOf(b), r = Math.min(L.length, Math.max(0, rem)); rem -= L.length; return L.map((_, i) => (i < r ? 'show' : 'hide')); }); };
  /* ظرف الذكر (عند خلع الثياب مثلًا) فوق نصّه في صفحات المراجعة، ويُكتب مرة واحدة لما تتابع من أذكار بظرف واحد */
  const whenLabel = (slice, i) => { const b = slice[i]; if (!b.w || (i > 0 && slice[i - 1].w === b.w && slice[i - 1].wEn === b.wEn)) return ''; return `<div class="dh-when"${da}>${esc(pick(b, 'w'))}</div>`; };
  function pagerBar(o) {
    const mid = `<div class="rc-mid"><span class="rc-cnt">${o.label ? esc(o.label) : `${ar(o.page + 1)} / ${ar(o.pages)}`}${o.marked ? `<i class="rc-mark" aria-hidden="true">${ar(o.marked)}</i>` : ''}</span></div>`;
    /* في آخر مجموعة يبقى السهم المزدوج يُظهر الصفحة كلها، فإذا ظهرت صار زرّ الإتمام */
    const fwd = o.last && o.shown >= o.lines
      ? `<button class="rc-finish" data-act="${o.finishAct}">${IC.check}<span>${esc(o.finishLabel)}</span></button>`
      : `<button data-act="${o.nextAct}" aria-label="${e('nextSet')}">${ARR(2)}</button>`;
    return `<div class="rc" dir="ltr"><button data-act="${o.prevAct}" aria-label="${e('prevSet')}" ${o.page === 0 && o.shown <= 0 ? 'disabled' : ''}>${ARR(2, true)}</button>
      <button data-act="reveal-minus" aria-label="${e('hideLine')}" ${o.shown <= 0 ? 'disabled' : ''}>${ARR(1, true)}</button>${mid}
      <button data-act="reveal-plus" aria-label="${e('showLine')}" ${o.shown >= o.lines ? 'disabled' : ''}>${ARR(1)}</button>${fwd}</div>`;
  }
  /* حدود الصفحات: خمسة أبيات في كل مجموعة للقصائد والأوراد؛ والأذكار بطاقة واحدة لكل ذكر */
  function pageBounds(bayts, total, dh) {
    const out = []; let i = 0;
    while (i < total) {
      let j = i;
      if (!dh) j = Math.min(i + 5, total);
      else j = i + 1;   // الأذكار: بطاقة لكل ذكر
      out.push([i, j]); i = j;
    }
    return out.length ? out : [[0, 0]];
  }
  /* أي صفحة استظهار مفتوحة الآن: القريبة، البعيدة، أو اختبار آخر الأبيات بعد الحفظ */
  const pagerKind = () => (ui.mode === 'near' && ui.near.stage === 'pager' ? 'near' : ui.mode === 'far' && ui.far.stage === 'review' ? 'far' : ui.mode === 'learn' && ui.learn.stage === 'test' && ui.test ? 'test' : null);
  function pagerPage(kind) {
    if (kind === 'test') {
      const c = ui.test, slice = chapterOf(c.pid, c.cid).bayts.slice(c.start, c.end), lines = lineCount(slice);
      return { c, slice, start: c.start, segCount: 1, pages: 1, page: 0, last: true, lines, shown: Math.min(c.shown == null ? 0 : c.shown, lines), dh: false };
    }
    const c = kind === 'near' ? ui.near : ui.far, { bayts, sg, segCount } = segSlice(c.pid, c.cid, c.segIdx);
    let total = sg.len;
    if (kind === 'near') {
      const st = S.chapter(c.pid, c.cid), rec = st.segs && st.segs[c.segIdx];
      if (rec && rec.status === 'learning') total = Math.max(0, st.learned - sg.start);
    }
    const bounds = pageBounds(bayts, total, isDhikr(c.pid)), pages = bounds.length, page = Math.min(Math.max(c.page, 0), pages - 1);
    const start = bounds[page][0], slice = bayts.slice(start, bounds[page][1]), lines = lineCount(slice);
    return { c, slice, start, segCount, pages, page, last: page >= pages - 1, lines, shown: Math.min(c.shown == null ? 0 : c.shown, lines), dh: isDhikr(c.pid) };
  }
  /* شريحة أبيات الجزء الحالي من الفصل، ضمن حدوده فقط */
  const segSlice = (pid, cid, segIdx) => {
    const chap = chapterOf(pid, cid), sg = cMeta(pid, cid).segs[segIdx];
    return { bayts: chap.bayts.slice(sg.start, sg.start + sg.len), sg, segCount: cMeta(pid, cid).segs.length };
  };
  /* اختبار ختامي بعد حفظ كل بيت: البيت الحالي والبيتان السابقان (للقصائد والمتون والأوراد) */
  function testPage() {
    const { c: T, slice, start, pages, page, lines, shown } = pagerPage('test'), modes = revealModes(slice, shown);
    const body = slice.map((b, i) => baytHTML(b, start + i, { no: true, m: modes[i], nopeek: true, trans: true, orn: false })).join('<div class="orn"></div>');
    return `<div class="fit-box folio rev nowrap" dir="rtl" data-min="11" data-max="44"><div class="fit-content">${body}</div></div>
      <div class="actions">${pagerBar({ page, pages, shown, lines, last: true, label: t('testShort'), prevAct: 'prev-set', nextAct: 'next-set', finishAct: 'test-done', finishLabel: t('testDone') })}</div>`;
  }
  function nearPager() {
    const { c: N, slice, start, dh, pages, page, last, lines, shown } = pagerPage('near'), modes = revealModes(slice, shown);
    const body = slice.map((b, i) => whenLabel(slice, i) + baytHTML(b, start + i, { no: true, m: modes[i], nopeek: true, trans: true, orn: false })).join('<div class="orn"></div>');
    return `<div class="fit-box folio rev ${dh ? 'wrap' : 'nowrap'}" dir="rtl" data-min="${dh ? 14 : 11}" data-max="${dh ? 34 : 44}"><div class="fit-content">${body}</div></div>
      <div class="actions">${pagerBar({ page, pages, shown, lines, last, prevAct: 'prev-set', nextAct: 'next-set', finishAct: 'near-finish', finishLabel: t('finishShort') })}</div>`;
  }
  function openPagerInfo() {
    const row = (ic, txt) => `<li><span class="info-ic">${ic}</span><span>${esc(txt)}</span></li>`;
    const far = ui.mode === 'far';
    openSheet(`<h2>${e('infoTitle')}</h2><ul class="info-list">${row(ARR(1), t('infoTap'))}${row(ARR(1), t('infoShow'))}${row(ARR(1, true), t('infoHide'))}${row(ARR(2), t('infoNext'))}${row(ARR(2, true), t('infoPrev'))}
      ${far ? row(IC.check, t('farPrompt')) : ''}${row('•', t('infoTrans'))}${row('•', t('infoKeys'))}${row(IC.check, t('infoDone'))}</ul>
      <div class="opts"><button class="btn block quiet" data-act="sheet-close">${e('close')}</button></div>`);
  }
  function nearMsg(pid, cid, segIdx, r) {
    if (r.graduated) return t('resGrad', { title: withPart(cTitle(pid, cid), segIdx, cMeta(pid, cid).segs.length), days: DAYS, when: U.inDays(U.diffDays(U.today(), r.card.due)) });
    if (r.status === 'consolidating') return t('resConsol', { n: r.daysDone, days: DAYS });
    return t('resLearn');
  }

  /* ---------- المراجعة البعيدة ---------- */
  function vFar() {
    const Q = ui.far;
    if (Q.stage === 'review') return farReview();
    if (Q.stage === 'rate') return farRate();
    const all = S.oldReviewList().filter((x) => x.pid === S.state.activePoem), due = all.filter((x) => x.isDue), up = all.filter((x) => !x.isDue);
    if (!all.length) return emptyState(t('farEmptyT'), t('farEmptyB', { days: DAYS }), t('openLib'), 'learn');
    const row = (x, isDue) => `<li><button class="li" data-act="far-open" data-pid="${esc(x.pid)}" data-cid="${esc(x.cid)}" data-seg="${x.segIdx}">
      <span class="main"><span class="ch-no">${esc(withPart(kicker(x.pid, x.cid), x.segIdx, x.segCount))}</span><div class="t"${da}>${esc(cTitle(x.pid, x.cid))}</div><div class="s">${e('farRowSub', { poem: pTitle(x.pid), b: x.len })}</div></span>
      <span class="end">${isDue ? IC.chevL : esc(U.inDays(x.dueIn, true))}</span></button></li>`;
    return `<h2 class="page-title">${e('modeFar')}</h2>
      <p class="lede">${due.length ? e('farLede', { n: due.length }) : e('farNone')}</p>
      ${due.length ? `<ul class="list" style="margin-top:8px">${due.map((x) => row(x, true)).join('')}</ul>` : ''}
      ${up.length ? `<h3 class="section-h">${e('upcoming')}</h3><ul class="list">${up.map((x) => row(x, false)).join('')}</ul>` : ''}`;
  }
  const startFar = (pid, cid, segIdx) => Object.assign(ui.far, { stage: 'review', pid, cid, segIdx, page: 0, shown: 0, missed: {}, rated: null });
  /* خمسة أبيات في الصفحة: استظهر، ثم المس البيت مرّتين ليُؤشَّر عليه كصعب */
  /* لمسة/سهم لوحة المفاتيح: يُظهر سطرًا أو يُخفيه؛ وإن كانت الصفحة ظاهرة كلها فالتقدّم يقلب إلى المجموعة التالية،
     وإن كانت مخفية كلها فالرجوع يعود إلى المجموعة السابقة (ظاهرةً كلها، فيُخفى منها سطرٌ سطر) */
  /* السهم المزدوج الأمامي: يُظهر الصفحة كلها أولًا، فإن كانت ظاهرة انتقل إلى المجموعة التالية */
  function nextSet() {
    const kind = pagerKind(), near = kind === 'near', pg = pagerPage(kind), c = pg.c;
    if (pg.shown < pg.lines) { c.shown = pg.lines; return render({ keep: true }); }
    if (pg.last) return;
    c.page = pg.page + 1; c.shown = near ? null : 0; return render();
  }
  /* السهم المزدوج الخلفي: يُخفي الصفحة كلها إن كان فيها شيء ظاهر، وإلا رجع إلى المجموعة السابقة */
  function prevSet() {
    const kind = pagerKind(), near = kind === 'near', pg = pagerPage(kind), c = pg.c;
    if (pg.shown > 0) { c.shown = 0; return render({ keep: true }); }
    if (pg.page <= 0) return;
    c.page = pg.page - 1; c.shown = near ? null : 0; return render();
  }
  function stepPager(fwd) {
    const kind = pagerKind(), near = kind === 'near', pg = pagerPage(kind), c = pg.c;
    if (fwd && pg.shown >= pg.lines) {
      if (pg.last) return;
      c.page = pg.page + 1; c.shown = near ? null : 0; return render();
    }
    if (!fwd && pg.shown <= 0) {
      if (pg.page <= 0) return;
      c.page = pg.page - 1; c.shown = 999; return render();
    }
    c.shown = pg.shown + (fwd ? 1 : -1);
    return render({ keep: true });
  }
  function farReview() {
    const { c: Q, slice, start, dh, pages, page, last, lines, shown } = pagerPage('far'), modes = revealModes(slice, shown);
    const marked = Object.keys(Q.missed).length;
    const body = slice.map((b, k) => {
      const i = start + k;
      return `<div class="tapwrap${Q.missed[i] ? ' missed' : ''}" role="button" tabindex="0" aria-pressed="${!!Q.missed[i]}" data-act="q-toggle" data-i="${i}">${whenLabel(slice, k)}${baytHTML(b, i, { no: true, m: modes[k], nopeek: true, trans: true, orn: false })}</div>`;
    }).join('<div class="orn"></div>');
    return `<div class="fit-box folio rev ${dh ? 'wrap' : 'nowrap'}" dir="rtl" data-min="${dh ? 14 : 11}" data-max="${dh ? 34 : 44}"><div class="fit-content">${body}</div></div>
      <div class="actions">${pagerBar({ page, pages, shown, lines, last, marked, prevAct: 'prev-set', nextAct: 'next-set', finishAct: 'q-finish', finishLabel: t('finishShort') })}</div>`;
  }
  /* اختيار الفترة: الخيارات الأربعة من FSRS، وكل زر يبيّن موعد المراجعة القادمة */
  function farRate() {
    const Q = ui.far, tot = cMeta(Q.pid, Q.cid).segs[Q.segIdx].len, miss = Object.keys(Q.missed).length;
    const suggest = miss === 0 ? 3 : miss / tot <= 0.25 ? 2 : 1;
    const opts = S.previewOld(Q.pid, Q.cid, Q.segIdx);
    const btns = [1, 2, 3, 4].map((g) => `<button class="rate ${g === suggest ? 'suggest' : ''}" data-act="far-rate" data-g="${g}"><span><b>${esc(U.inDays(opts[g].interval, true))}</b><small>${e('r' + g)}</small></span></button>`).join('');
    return `<div class="stack"><div class="hero"><div class="kicker"${da}>${esc(withPart(cTitle(Q.pid, Q.cid), Q.segIdx, cMeta(Q.pid, Q.cid).segs.length))}</div>
      <h2 class="title" style="font-size:30px">${miss ? e('rateTitle', { n: miss, b: tot }) : e('rateNone')}</h2></div>
      <p class="lede">${e('rateLede')}</p>
      <div class="opts" style="display:flex;flex-direction:column;gap:9px">${btns}</div></div>`;
  }

  /* ---------- المكتب ---------- */
  function vLib() {
    const L = ui.lib;
    if (L.reader) return vReader();
    if (L.poem) return vPoem();
    const sections = LIB.sections.map((s) => `<button data-act="lib-section" data-id="${esc(s.id)}" aria-pressed="${L.section === s.id}">${esc(pick(s, 'title'))}</button>`).join('');
    const poems = LIB.poems.filter((p) => p.section === L.section);
    const cards = poems.map((p) => {
      return `<li style="margin-bottom:12px"><button class="book" data-act="lib-open" data-pid="${esc(p.id)}"><span class="spine"></span><span class="body">
        <div class="name"${da}>${esc(pick(p, 'title'))}</div><div class="full"${da}>${esc(pick(p, 'author'))}</div>
        <div class="meta"><span>${esc(U.baytCount(p.baytCount, p.type === 'dhikr' ? 'dhikr' : (p.type === 'wird' ? 'line' : 'bayt')))}</span><span>${e('chapCount', { n: p.chapterCount })}</span></div></span></button></li>`;
    }).join('');
    const sec = LIB.sections.find((s) => s.id === L.section);
    const body = poems.length ? `<ul class="list" style="margin-top:14px">${cards}</ul>` : emptyState(t('libEmptyT', { title: pick(sec, 'title') }), t('libEmptyB'));
    return `<h2 class="page-title">${e('navLib')}</h2><div class="seg" style="margin-top:10px" role="group" aria-label="${e('sectionsAria')}">${sections}</div>${body}`;
  }
  function chapterStatus(pid, c) {
    const s = S.chapter(pid, c.id), curCh = S.state.activePoem === pid && S.currentChapter(pid) && S.currentChapter(pid).id === c.id;
    if (s.status === 'done') {
      /* كل فصل مقسَّم إلى أجزاء (٨-١٢ بيتًا)، وكل جزء يتقدّم في التثبيت والمراجعة البعيدة باستقلال */
      const recs = c.segs.map((sg, i) => (s.segs && s.segs[i]) || { status: 'consolidating', daysDone: 0 });
      const reviewCount = recs.filter((r) => r.status === 'review').length;
      if (reviewCount === recs.length) {
        const nextDue = recs.reduce((min, r) => (!min || r.card.due < min) ? r.card.due : min, null);
        return { pill: `<span class="pill green">${e('stOld')}</span>`, sub: t('stNextReview', { when: U.inDays(U.diffDays(U.today(), nextDue)) }) };
      }
      const remaining = Math.max(...recs.filter((r) => r.status !== 'review').map((r) => DAYS - (r.daysDone || 0)));
      const label = c.segs.length > 1 ? `${e('stConsol')} ${ar(reviewCount)}/${ar(recs.length)}` : e('stConsol');
      return { pill: `<span class="pill gold">${label}</span>`, sub: t('stConsolSub', { days: remaining }) };
    }
    if (s.suspended) return { pill: `<span class="pill">${e('stSusp')}</span>`, sub: s.status === 'learning' ? t('learnedOf', { n: s.learned, total: c.len }) : U.baytCount(c.len), susp: true };
    if (s.status === 'learning') return { pill: `<span class="pill gold">${curCh ? e('stNow') : e('stProg')}</span>`, sub: t('learnedOf', { n: s.learned, total: c.len }) };
    return { pill: curCh ? `<span class="pill gold">${e('stNext')}</span>` : `<span class="pill">${e('stNew')}</span>`, sub: U.baytCount(c.len) };
  }
  function vPoem() {
    const pid = ui.lib.poem, poem = POEMS.get(pid), m = S.meta(pid);
    const rows = m.chapters.map((c, ci) => groupHead(m, ci) + `<li><button class="li" data-act="lib-read" data-cid="${esc(c.id)}"><span class="main">${m.type === 'dhikr' ? '' : `<span class="ch-no">${esc(kicker(pid, c.id))}</span>`}<div class="t"${da}>${esc(ctitle(c))}</div><div class="s">${esc(U.baytCount(c.len))}</div></span><span class="end">${IC.chevL}</span></button></li>`).join('');
    return `<button class="back" data-act="lib-back">${IC.chev}<span>${e('navLib')}</span></button>
      <div class="hero"><div class="kicker"${da}>${esc(pick(poem, 'author'))}</div><h2 class="title"${da}>${esc(pick(poem, 'fullTitle'))}</h2></div>
      <button class="btn block" style="margin-top:14px" data-act="lib-read" data-cid="">${e('readPoem')}</button>
      <h3 class="section-h">${e('chaptersH')}</h3><ul class="list">${rows}</ul>`;
  }
  function openChapterSheet(cid) {
    const pid = S.state.activePoem, c = cMeta(pid, cid), s = S.chapter(pid, cid), st = chapterStatus(pid, c);
    const acts = [];
    const open = s.status === 'new' || s.status === 'learning';
    if (open && !s.suspended) acts.push(`<button class="btn block" data-act="ch-current" data-cid="${esc(cid)}">${s.status === 'learning' ? e('continueHere') : e('startHere')}</button>`);
    if (open) {
      acts.push(`<button class="btn block quiet" data-act="ch-susp" data-cid="${esc(cid)}" data-v="${s.suspended ? 0 : 1}">${e(s.suspended ? 'resumeCh' : 'suspendCh')}</button>`);
      const m = S.meta(pid), mates = c.group ? m.chapters.filter((x) => x.group === c.group && x.id !== cid && ['new', 'learning'].includes(S.chapter(pid, x.id).status)) : [];
      if (mates.length) {
        const allSusp = mates.every((x) => S.isSuspended(pid, x.id)) && !!s.suspended;
        acts.push(`<button class="btn block quiet" data-act="grp-susp" data-cid="${esc(cid)}" data-v="${allSusp ? 0 : 1}"${da}>${esc(t(allSusp ? 'resumeGrp' : 'suspendGrp', { g: pick(c, 'group') }))}</button>`);
      }
    }
    if (s.status !== 'done') acts.push(`<button class="btn block quiet" data-act="ch-mark" data-cid="${esc(cid)}">${e('markMemorized')}</button>`);
    if (s.status !== 'new') acts.push(`<button class="btn block danger" data-act="ch-reset" data-cid="${esc(cid)}">${e('restartChapter')}</button>`);
    openSheet(`<h2${da}>${esc([kicker(pid, cid), ctitle(c)].filter(Boolean).join(': '))}</h2><p class="sub">${esc(st.sub)}</p>${s.suspended ? `<p class="small muted">${e('suspHint')}</p>` : ''}<div class="opts">${acts.join('')}</div>`);
  }
  function openMarkSheet(cid) {
    const pid = S.state.activePoem, opts = S.previewMark();
    const btns = [1, 2, 3, 4].map((g) => `<button class="rate" data-act="ch-mark-rate" data-cid="${esc(cid)}" data-g="${g}"><span><b>${e('r' + g)}</b><small>${e('md' + g)}</small></span><span class="when">${esc(U.inDays(opts[g].interval, true))}</span></button>`).join('');
    openSheet(`<h2${da}>${e('markTitle', { title: cTitle(pid, cid) })}</h2><p class="sub">${e('markSub')}</p><div class="opts">${btns}</div>`);
  }

  /* ---------- القراءة (نص القصيدة عربي ومن اليمين دائمًا) ---------- */
  function vReader() {
    const R = ui.lib.reader, poem = POEMS.get(R.pid), size = S.settings().readerSize, en = R.en;
    const enTitle = (c) => (en && c.titleEn) ? `<p class="rch-en en" lang="en" dir="ltr">${esc(c.titleEn)}</p>` : '';
    const jump = `<select id="jump" aria-label="${e('jumpTo')}"><option value="">${e('jumpTo')}</option>${poem.chapters.map((c) => `<option value="${esc(c.id)}"${da}>${esc([kicker(R.pid, c.id), ctitle(c)].filter(Boolean).join(': '))}</option>`).join('')}</select>`;
    const chapters = poem.chapters.map((c) => {
      const dh = poem.type === 'dhikr';
      const bs = c.bayts.map((b, i) => {
        const meta = (dh || poem.type === 'wird') ? [b.w ? pick(b, 'w') : '', b.c > 1 ? t('timesN', { n: b.c }) : '', b.r || ''].filter(Boolean).join(' · ') : '';
        return `<article class="rbayt" dir="rtl" data-k="${esc(c.id)}:${i}"><span class="rno">${ar(b.n || i + 1)}</span><div class="rlines"><div class="rs${dh ? ' dh' : ''}">${esc(b.s)}</div>${b.e ? `<div class="re">${esc(b.e)}</div>` : ''}</div>${meta ? `<p class="rmeta"${da}>${esc(meta)}</p>` : ''}${en && b.t ? `<div class="rtrans en" lang="en" dir="ltr">${transParas(b)}</div>` : ''}</article>`;
      }).join('');
      return `<section id="rch-${esc(c.id)}"><div class="rch">${kicker(R.pid, c.id) ? `<span class="ch-no"${da}>${esc(kicker(R.pid, c.id))}</span>` : ''}<h3 dir="rtl">${esc(c.title)}</h3>${enTitle(c)}</div>${bs}</section>`;
    }).join('');
    const enHead = isEn() && poem.fullTitleEn ? `<p class="en" lang="en" dir="ltr">${esc(poem.fullTitleEn)}, ${esc(poem.authorEn || '')}</p>` : '';
    return `<div style="--rs:${size}px"><div class="reader-bar"><button class="icon-btn" data-act="reader-close" aria-label="${e('readerBack')}">${IC.chev}</button>${jump}
      <button class="icon-btn" data-act="reader-font" data-d="-2" aria-label="${e('smaller')}">${e('smallerLbl')}</button><button class="icon-btn" data-act="reader-font" data-d="2" aria-label="${e('larger')}">${e('largerLbl')}</button>
      <button class="icon-btn" data-act="reader-en" aria-pressed="${en}" aria-label="${e('translation')}">EN</button></div>
      <div class="reader-title"><h2 dir="rtl">${esc(poem.fullTitle)}</h2><p dir="rtl">${esc(poem.author)}</p>${enHead}</div>${chapters}
      <p class="about center" style="padding-top:22px">${esc(isEn() && poem.sourceEn ? poem.sourceEn : (poem.source || ''))}</p></div>`;
  }

  /* ---------- الإعدادات ---------- */
  function vSettings() {
    const st = S.settings();
    const seg = (key, opts, curVal) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button data-act="set" data-key="${key}" data-val="${v}" aria-pressed="${String(curVal) === String(v)}">${esc(l)}</button>`).join('')}</div>`;
    return `<h2 class="page-title">${e('setTitle')}</h2>
      <div class="set"><div class="lbl">${e('perDayT')}</div><div class="desc">${e('perDayD')}</div>${stepper(t('perDayLbl'), st.perDay, 1, 10)}</div>
      <div class="set"><div class="lbl">${e('themeT')}</div><div class="desc">${e('themeD')}</div>${seg('theme', [['light', t('themeLight')], ['dark', t('themeDark')], ['auto', t('themeAuto')]], st.theme)}</div>
      <div class="set"><div class="lbl">${e('langT')}</div><div class="desc">${e('langD')}</div>${seg('lang', [['ar', 'العربية'], ['en', 'English']], st.lang)}</div>
      <div class="set"><div class="lbl">${e('retT')}</div><div class="desc">${e('retD')}</div>${seg('retention', [[0.85, t('pct', { v: 85 })], [0.9, t('pct', { v: 90 })], [0.95, t('pct', { v: 95 })]], st.retention)}</div>
      <div class="set"><button class="switch" role="switch" aria-checked="${st.showEn}" data-act="set-en"><span><div class="lbl">${e('alwaysEnT')}</div><div class="desc" style="margin:0">${e('alwaysEnD')}</div></span><i></i></button></div>
      <div class="set"><div class="lbl">${e('backupT')}</div><div class="desc">${e('backupD')}</div>
        <div class="row"><button class="btn quiet small" data-act="export">${e('exportBtn')}</button><button class="btn quiet small" data-act="import">${e('importBtn')}</button></div>
        <input id="imp" type="file" accept="application/json,.json" hidden></div>
      <div class="set"><div class="lbl">${e('updT')}</div><div class="desc">${e('updD')}</div><button class="btn quiet small" data-act="update-app">${e('updBtn')}</button></div>
      <div class="set"><button class="btn danger small" data-act="reset-ask">${e('eraseBtn')}</button></div>
      <p class="about">${nl(t('about'))}</p>`;
  }

  /* ---------- الرسم ---------- */
  const cur = () => (ui.tab === 'home' ? (ui.mode || 'home') : ui.tab);
  const FLUSH = () => cur() === 'preview' || (cur() === 'learn' && ui.learn.stage === 'learn' && S.state.activePoem && POEMS.get(S.state.activePoem) && !!learnCursor())
    || (cur() === 'learn' && ui.learn.stage === 'test' && !!ui.test) || (cur() === 'near' && ui.near.stage === 'pager') || (cur() === 'far' && ui.far.stage === 'review');

  let lastY = 0;
  const barH = () => { const b = $('.reader-bar'); return b ? b.offsetHeight : 0; };
  function rAnchor() {
    if (!(ui.tab === 'lib' && ui.lib.reader)) return null;
    const t = view.getBoundingClientRect().top + barH();
    for (const el of $$('.rbayt', view)) { const r = el.getBoundingClientRect(); if (r.bottom > t + 2) return { k: el.dataset.k, off: r.top - t }; }
    return null;
  }
  function rRestore(an) {
    if (!an) return;
    const el = view.querySelector('.rbayt[data-k="' + an.k + '"]'); if (!el) return;
    view.scrollTop += el.getBoundingClientRect().top - (view.getBoundingClientRect().top + barH()) - an.off;
  }
  function render(opts) {
    opts = opts || {};
    const prev = view.scrollTop;
    $$('#tabs button').forEach((b) => { if (b.dataset.tab === ui.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    const upid = ui.tab === 'lib' ? ((ui.lib.reader && ui.lib.reader.pid) || ui.lib.poem) : S.state.activePoem;
    U.setUnit(upid && S.meta(upid) ? unitOf(upid) : 'bayt');
    const html = { home: vHome, add: vAdd, learn: vLearn, preview: vPreview, near: vNear, far: vFar, lib: vLib, settings: vSettings }[cur()]();
    view.classList.toggle('flush', FLUSH());
    view.innerHTML = html;
    view.scrollTop = opts.keep ? prev : 0;
    updateChrome();
    afterRender();
    const inR = ui.tab === 'lib' && !!ui.lib.reader;
    document.body.classList.toggle('reader-on', inR);
    if (!opts.keep) document.body.classList.remove('nav-hide');
    if (inR && ui.lib.reader.pos) { rRestore(ui.lib.reader.pos); ui.lib.reader.pos = null; }
    else if (inR && ui.lib.reader.cid && !opts.keep) {
      const el = $('#rch-' + ui.lib.reader.cid); if (el) view.scrollTop = el.offsetTop - 56;
      ui.lib.reader.cid = null;
    }
    lastY = view.scrollTop;
  }
  function updateChrome() {
    const chip = $('#poem-chip'), inMode = ui.tab === 'home' && (!!ui.mode || ui.poemOpen);
    chip.hidden = true;
    $('#mode-back').hidden = !inMode; $('.brand').hidden = inMode;
    const pk = inMode ? pagerKind() : null, pg = pk === 'near' ? ui.near : pk === 'far' ? ui.far : pk === 'test' ? Object.assign(ui.test, { segIdx: 0 }) : null;
    document.body.classList.toggle('pager-on', !!pg);
    $('#top').classList.toggle('pager', !!pg); $('#info-btn').hidden = !pg; $('#top-title').hidden = !pg;
    if (pg) {
      const tt = $('#top-title'), sc = cMeta(pg.pid, pg.cid).segs.length;
      tt.firstElementChild.textContent = pk === 'test' ? t('testKicker') : withPart(kicker(pg.pid, pg.cid), pg.segIdx, sc); tt.lastElementChild.textContent = cTitle(pg.pid, pg.cid);
      tt.lastElementChild.dir = 'auto';
    }
    const n = S.pendingNear() + S.dueOld().length + S.previewPendingCount(), b = $('#tabs [data-tab="home"] .badge');
    b.hidden = !n; b.textContent = ar(n);
  }
  /* هاتف أفقيًا: لا يُصغَّر النص ليتّسع كل البيوت في الارتفاع القصير، بل يبقى مقروءًا ويُمرَّر الصندوق رأسيًا */
  const shortLand = () => window.matchMedia('(orientation:landscape) and (max-height:520px)').matches;
  const fitAll = () => $$('.fit-box', view).forEach((b) => {
    const min = +b.dataset.min || 12;
    U.fitText(b, { min: b.classList.contains('rev') && shortLand() ? Math.max(min, 22) : min, max: +b.dataset.max || 48 });
  });
  function afterRender() {
    requestAnimationFrame(fitAll);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(fitAll));
  }

  /* ---------- الأحداث ---------- */
  function go(tab) {
    if (ui.tab === 'lib' && ui.lib.reader) ui.lib.reader.pos = rAnchor();
    if (tab === 'learn' || tab === 'near' || tab === 'far' || tab === 'preview') {
      ui.tab = 'home'; ui.mode = tab; ui.poemOpen = true;
      const apid = S.state.activePoem;
      if (tab === 'learn') { if (learnCursor()) startLearn(); else ui.learn.stage = 'chapters'; }
      /* إن كان هناك جزء واحد فقط بانتظار المراجعة: ادخل إليه مباشرة، دون قائمة لا تُظهر إلا خيارًا واحدًا */
      if (tab === 'near') {
        const items = S.newReviewList().filter((x) => !x.done && x.pid === apid);
        if (items.length === 1) Object.assign(ui.near, { stage: 'pager', pid: items[0].pid, cid: items[0].cid, segIdx: items[0].segIdx, page: 0, shown: null });
        else ui.near.stage = 'list';
      } else if (tab === 'far') {
        const due = S.dueOld().filter((x) => x.pid === apid);
        if (due.length === 1) startFar(due[0].pid, due[0].cid, due[0].segIdx);
        else ui.far.stage = 'list';
      }
    } else {
      if (tab === 'home' && ui.tab === 'home') ui.poemOpen = false;   // لمس تبويب الحفظ وأنت فيه يعيدك إلى القائمة
      ui.tab = tab; if (tab === 'home') ui.mode = null;
    }
    closeSheet(); render();
  }
  async function openPoem(pid) { await loadPoem(pid); ui.lib.poem = pid; render(); }

  function act(name, el) {
    const d = el.dataset, L = ui.learn, N = ui.near, Q = ui.far;
    switch (name) {
      case 'goto': return go(d.to);
      case 'preview-read': {
        const pid = S.state.activePoem, r = S.previewRead(pid);
        if (r >= S.PREVIEW_READS) { toast(t('tPreviewDone')); ui.mode = null; }
        return render();
      }
      case 'mode-back': if (ui.mode) ui.mode = null; else ui.poemOpen = false; return render();
      case 'sheet-close': return closeSheet();
      case 'perday': { const v = Math.min(10, Math.max(1, S.settings().perDay + Number(d.d))); S.setSetting('perDay', v); return render({ keep: true }); }
      /* قائمة الحفظ */
      case 'poem-open': return loadPoem(d.pid).then(() => { S.setActive(d.pid); ui.poemOpen = true; ui.mode = null; render(); });
      case 'add-poem': ui.tab = 'home'; ui.mode = 'add'; return render();
      case 'enroll': return loadPoem(d.pid).then(() => { S.setEnrolled(d.pid, true); S.setActive(d.pid); ui.mode = null; ui.poemOpen = true; toast(t('tPoemAdded')); render(); });
      case 'unenroll-ask': return confirmSheet(t('removeQ'), t('removeBody'), t('removeYes'), 'unenroll-yes', {}, true);
      case 'unenroll-yes': S.setEnrolled(S.state.activePoem, false); ui.poemOpen = false; ui.mode = null; closeSheet(); toast(t('tPoemRemoved')); return render();
      /* الحفظ الجديد */
      case 'test-done': { const T = ui.test; ui.test = null; if (T && T.pending) commitLearned(T.pid, T.cid); return afterLearnStep(); }
      case 'noop': return;
      case 'learn-target': { const v = Math.min(30, Math.max(L.done + 1, L.target + Number(d.d))); L.target = v; S.setPerDay(S.state.activePoem, v); return render({ keep: true }); }
      case 'learn-home': ui.mode = null; return render();
      case 'learn-chapters': ui.tab = 'home'; ui.mode = 'learn'; L.stage = 'chapters'; return render();
      case 'ch-open': return openChapterSheet(d.cid);
      case 'learn-hide': L.hidden = !L.hidden; L.hint = false; return render({ keep: true });
      case 'learn-hint': L.hint = !L.hint; return render({ keep: true });
      case 'learn-reveal': L.stage = 'check'; return render();
      case 'learn-unknown': L.stage = 'learn'; return render();
      case 'toggle-en': L.en = !L.en; return render({ keep: true });
      case 'learn-known': {
        const cursor = learnCursor(); if (!cursor) return finishLearn();
        /* لا يُحتسب البيت محفوظًا إلا بعد اجتياز الاختبار على البيت الحالي والبيتين السابقين (القصائد والمتون والأوراد، لا الأذكار) */
        if (!isDhikr(cursor.pid) && cursor.idx >= 1) {
          ui.test = { pid: cursor.pid, cid: cursor.chap.id, start: Math.max(0, cursor.idx - 2), end: cursor.idx + 1, shown: 0, page: 0, segIdx: 0, pending: true };
          L.stage = 'test'; return render();
        }
        commitLearned(cursor.pid, cursor.chap.id);
        return afterLearnStep();
      }
      /* المراجعة القريبة */
      case 'near-open': Object.assign(N, { stage: 'pager', pid: d.pid, cid: d.cid, segIdx: Number(d.seg), page: 0, shown: null }); return render();
      case 'prev-set': return prevSet();
      case 'next-set': return nextSet();
      case 'near-finish': {
        const r = S.finishNewReview(N.pid, N.cid, N.segIdx), next = S.newReviewList().find((x) => !x.done && x.pid === N.pid);
        toast(nearMsg(N.pid, N.cid, N.segIdx, r));
        /* إن بقي جزء آخر: انتقل إليه مباشرة؛ وإلا فارجع إلى الصفحة الرئيسية دون شاشة "تمت المراجعة" */
        if (next) Object.assign(N, { stage: 'pager', pid: next.pid, cid: next.cid, segIdx: next.segIdx, page: 0, shown: null });
        else { ui.tab = 'home'; ui.mode = null; }
        return render();
      }
      /* المراجعة البعيدة */
      case 'far-open': startFar(d.pid, d.cid, Number(d.seg)); return render();
      case 'q-toggle': { const k = Number(d.i); if (Q.missed[k]) delete Q.missed[k]; else Q.missed[k] = true; return render({ keep: true }); }
      case 'reveal-plus': case 'reveal-minus': {
        const pg = pagerPage(pagerKind());
        pg.c.shown = Math.min(pg.lines, Math.max(0, pg.shown + (name === 'reveal-plus' ? 1 : -1)));
        return render({ keep: true });
      }
      case 'pager-info': return openPagerInfo();
      case 'q-finish': Q.stage = 'rate'; return render();
      case 'far-rate': {
        const card = S.applyOldReview(Q.pid, Q.cid, Q.segIdx, Number(d.g)), rated = U.diffDays(U.today(), card.due), next = S.dueOld().find((x) => x.pid === Q.pid);
        toast(t('farDoneNext', { when: U.inDays(rated) }));
        /* إن بقي جزء آخر مستحق: انتقل إليه مباشرة؛ وإلا فارجع إلى الصفحة الرئيسية دون شاشة "تمت المراجعة" */
        if (next) startFar(next.pid, next.cid, next.segIdx);
        else { ui.tab = 'home'; ui.mode = null; }
        return render();
      }
      /* المكتب */
      case 'lib-section': ui.lib.section = d.id; return render();
      case 'lib-open': return openPoem(d.pid);
      case 'lib-back': ui.lib.poem = null; return render();
      case 'lib-read': ui.lib.reader = { pid: ui.lib.poem, cid: d.cid || null, en: S.settings().showEn }; return render();
      case 'ch-current': S.setCurrent(S.state.activePoem, d.cid); startLearn(); closeSheet(); toast(t('tStartHere')); return render();
      case 'ch-susp': S.setSuspended(S.state.activePoem, d.cid, d.v === '1'); closeSheet(); toast(t(d.v === '1' ? 'tSuspended' : 'tResumed')); return render();
      case 'grp-susp': {
        const pid = S.state.activePoem, m = S.meta(pid), g = cMeta(pid, d.cid).group;
        S.setSuspended(pid, m.chapters.filter((x) => x.group === g).map((x) => x.id), d.v === '1'); closeSheet(); toast(t(d.v === '1' ? 'tSuspended' : 'tResumed')); return render();
      }
      case 'ch-mark': return openMarkSheet(d.cid);
      case 'ch-mark-rate': S.markMemorized(S.state.activePoem, d.cid, Number(d.g)); closeSheet(); L.stage = 'chapters'; toast(t('tAdded')); return render();
      case 'ch-reset': return confirmSheet(t('restartQ'), t('restartBody'), t('restartYes'), 'ch-reset-yes', { cid: d.cid }, true);
      case 'ch-reset-yes': S.resetChapter(S.state.activePoem, d.cid); closeSheet(); L.stage = 'chapters'; toast(t('tReset')); return render();
      case 'reader-close': ui.lib.reader = null; return render();
      case 'reader-font': { const an = rAnchor(); S.setSetting('readerSize', Math.min(44, Math.max(18, S.settings().readerSize + Number(d.d)))); render({ keep: true }); rRestore(an); lastY = view.scrollTop; return; }
      case 'reader-en': { const v = !S.settings().showEn; S.setSetting('showEn', v); ui.lib.reader.en = v; const an = rAnchor(); render({ keep: true }); rRestore(an); lastY = view.scrollTop; return; }
      /* الإعدادات */
      case 'set':
        S.setSetting(d.key, isNaN(Number(d.val)) ? d.val : Number(d.val));
        if (d.key === 'lang') applyLang();
        if (d.key === 'theme') applyTheme();
        return render({ keep: true });
      case 'set-en': S.setSetting('showEn', !S.settings().showEn); return render({ keep: true });
      case 'update-app': return updateApp();
      case 'export': return exportData();
      case 'import': return $('#imp').click();
      case 'reset-ask': return confirmSheet(t('eraseQ'), t('eraseBody'), t('eraseYes'), 'reset-yes', {}, true);
      case 'reset-yes': S.resetAll(); closeSheet(); Object.assign(ui.learn, { stage: 'home' }); Object.assign(ui.near, { stage: 'list' }); Object.assign(ui.far, { stage: 'list' }); ui.lib.poem = null; ui.poemOpen = false; ui.mode = null; applyLang(); applyTheme(); toast(t('tErased')); return render();
      case 'import-yes':
        try { S.importJSON(ui.pendingImport); ui.pendingImport = null; closeSheet(); applyLang(); applyTheme(); toast(t('tImported')); return bootPoems().then(() => render()); }
        catch (err) { closeSheet(); return toast(t('tImportFail')); }
      default: return undefined;
    }
  }

  async function updateApp() {
    if (!navigator.onLine) return toast(t('tUpdFail'));
    toast(t('tUpdating'));
    try {   // يمسح ذاكرة الملفات فقط؛ تقدّمك في localStorage لا يُمَس
      if ('serviceWorker' in navigator) await Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister()));
      if (window.caches) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
      location.reload();
    } catch (err) { toast(t('tUpdFail')); }
  }

  async function exportData() {
    const text = S.exportJSON(), name = 'taahud-backup-' + U.today() + '.json';
    const file = new File([text], name, { type: 'application/json' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: t('shareTitle') }); return; } } catch (err) { if (err && err.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast(t('tBackup'));
  }

  /* اضغط مطوّلًا على بيت في وضعَي المراجعة لإظهار ترجمته مؤقتًا، دون أن يُحتسب ذلك نقرة
     (فلا يُؤشَّر البيت كصعب في المراجعة البعيدة عند رفع الإصبع) */
  const LP_MS = 450;
  let lpTimer = null, lpEl = null, lpFired = false;
  const lpClear = () => {
    clearTimeout(lpTimer); lpTimer = null;
    if (lpEl) { lpEl.classList.remove('show-trans'); lpEl = null; }
  };
  view.addEventListener('pointerdown', (ev) => {
    const b = ev.target.closest('.bayt');
    if (!b || !b.querySelector('.trans-peek')) return;
    lpClear(); lpFired = false; lpEl = b;
    lpTimer = setTimeout(() => { lpFired = true; b.classList.add('show-trans'); }, LP_MS);
  });
  ['pointerup', 'pointercancel', 'pointerleave', 'scroll'].forEach((evt) => view.addEventListener(evt, lpClear, { passive: true }));
  document.addEventListener('pointerup', lpClear);
  view.addEventListener('contextmenu', (ev) => { if (ev.target.closest('.bayt')?.querySelector('.trans-peek')) ev.preventDefault(); });

  /* المس البيت مرّتين متتاليتين (خلال نصف ثانية) ليُؤشَّر كصعب في المراجعة البعيدة؛
     لمسة واحدة لا تفعل شيئًا، حتى لا يُؤشَّر بيت عن طريق الخطأ أثناء التمرير أو القراءة */
  const DTAP_MS = 400;
  let dt = null;

  /* الضغط المطوّل لإظهار الترجمة يحدّد كلمة عادةً: يُمنع التحديد داخل صفحة المراجعة */
  document.addEventListener('selectstart', (ev) => {
    const n = ev.target && (ev.target.nodeType === 3 ? ev.target.parentElement : ev.target);
    if (n && n.closest && n.closest('.fit-box')) ev.preventDefault();
  });
  document.addEventListener('click', (ev) => {
    if (lpFired) { lpFired = false; dt = null; return; }
    const tab = ev.target.closest('[data-tab]');
    if (tab) return go(tab.dataset.tab);
    const peek = ev.target.closest('[data-peek]');
    if (peek) { peek.classList.toggle('peek'); return; }
    /* صفحة المراجعة مقسومة أثلاثًا (بالاتجاه الفعلي لا اتجاه اللغة): الثلث الأيمن يُظهر سطرًا (أو يقلب إلى المجموعة التالية
       إن ظهرت الصفحة كلها)، والأيسر يُخفي سطرًا (أو يعود إلى السابقة)، والأوسط لا يتقدّم ولا يرجع،
       ففيه تُلمس مرّتين (خلال 0.4 ث) أبيات المراجعة البعيدة للتأشير على الصعب منها */
    const zone = ev.target.closest('.fit-box.rev');
    if (zone && view.contains(zone) && pagerKind()) {
      const r = zone.getBoundingClientRect(), f = (ev.clientX - r.left) / r.width;
      if (f > 2 / 3) { dt = null; return stepPager(true); }
      if (f < 1 / 3) { dt = null; return stepPager(false); }
      const q = ui.mode === 'far' && ev.target.closest('[data-act="q-toggle"]'), now = Date.now();
      if (!q) { dt = null; return; }
      if (dt && dt.key === q.dataset.i && now - dt.time < DTAP_MS) { dt = null; return act('q-toggle', q); }
      dt = { key: q.dataset.i, time: now };
      return;
    }
    const a = ev.target.closest('[data-act]');
    if (a) act(a.dataset.act, a);
  });
  view.addEventListener('scroll', () => {
    const y = view.scrollTop, d = y - lastY;
    if (!document.body.classList.contains('reader-on')) { lastY = y; return; }
    if (d > 8 && y > 80) { document.body.classList.add('nav-hide'); lastY = y; }
    else if (d < -8 || y <= 80) { document.body.classList.remove('nav-hide'); lastY = y; }
  }, { passive: true });
  document.addEventListener('change', (ev) => {
    if (ev.target.id === 'jump' && ev.target.value) {
      const el = $('#rch-' + ev.target.value); if (el) view.scrollTop = el.offsetTop - 56; ev.target.value = '';
    }
    if (ev.target.id === 'imp' && ev.target.files[0]) {
      const f = ev.target.files[0], rd = new FileReader();
      rd.onload = () => { ui.pendingImport = String(rd.result); confirmSheet(t('importQ'), t('importBody'), t('importYes'), 'import-yes', {}, true); };
      rd.readAsText(f); ev.target.value = '';
    }
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') return closeSheet();
    /* المراجعة على الحاسوب: السهم الأيمن يُظهر سطرًا والأيسر يُخفي سطرًا (مع Shift: المجموعة التالية أو السابقة) */
    if ((ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') && !ev.ctrlKey && !ev.metaKey && !ev.altKey && ui.tab === 'home' && !$('#sheet-root .sheet')
        && pagerKind() && !/^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName || '')) {
      ev.preventDefault();
      const fwd = ev.key === 'ArrowRight', kind = pagerKind(), near = kind === 'near';
      if (!ev.shiftKey) return stepPager(fwd);
      const pg = pagerPage(kind);
      if (fwd) return nextSet();
      if (!fwd) return prevSet();
      return;
    }
    const el = ev.target.closest && ev.target.closest('[role="button"][data-act]');
    if (el && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); act(el.dataset.act, el); }
  });
  window.addEventListener('resize', fitAll);
  if (window.ResizeObserver) new ResizeObserver(fitAll).observe(view);

  /* ---------- الإقلاع ---------- */
  async function bootPoems() {
    const need = new Set(Object.keys(S.state.poems).concat(S.state.activePoem || []));
    await Promise.all(Array.from(need).map((id) => loadPoem(id).catch(() => null)));
  }
  async function boot() {
    applyLang(); applyTheme();
    try {
      LIB = await (await fetch('data/library.json')).json();
      await bootPoems();
      render();
    } catch (err) {
      view.innerHTML = emptyState(t('loadErrT'), t('loadErrB'));
    }
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  window.Abyaat = { ui, S, U, F, render, POEMS, loadPoem, go, applyLang, applyTheme };
  boot();
})();
