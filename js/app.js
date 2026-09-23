/* أبيات — واجهة التطبيق (عربي / English). القصائد بالعربية دائمًا. */
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
    tab: 'home', mode: null,   // الحفظ والمراجعة: mode = learn | near | far
    learn: { stage: 'home', target: 0, done: 0, hint: false, hidden: false, en: false, completed: [], completedParts: [] },
    near: { stage: 'list', pid: null, cid: null, segIdx: null, page: 0, shown: null, result: null },
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
    POEMS.set(id, poem); S.registerPoem(poem);
    return poem;
  }
  const chapterOf = (pid, cid) => { const p = POEMS.get(pid); return p && p.chapters.find((c) => c.id === cid); };
  const cMeta = (pid, cid) => S.meta(pid).chapters.find((c) => c.id === cid);
  const cTitle = (pid, cid) => ctitle(cMeta(pid, cid));
  const pTitle = (pid) => pick(S.meta(pid), 'title');
  const kicker = (pid, cid) => {
    const m = S.meta(pid), c = m.chapters.find((x) => x.id === cid);
    if (c.optional) return ctitle(c);
    return t('chapterN', { i: m.chapters.filter((x) => !x.optional).findIndex((x) => x.id === cid) });
  };
  /* تسمية الجزء: تظهر فقط حين يُقسَّم الفصل إلى أكثر من جزء واحد في المراجعة */
  const partLabel = (segIdx, segCount) => segCount > 1 ? t('partN', { i: segIdx + 1, total: segCount }) : '';
  const withPart = (label, segIdx, segCount) => segCount > 1 ? `${label} · ${partLabel(segIdx, segCount)}` : label;

  /* ---------- أدوات الواجهة ---------- */
  function toast(msg) {
    const box = $('#toast'); box.innerHTML = '<div>' + esc(msg) + '</div>';
    clearTimeout(toast.h); toast.h = setTimeout(() => { box.innerHTML = ''; }, 2600);
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
  const emptyState = (h, p, btn, to) => `<div class="empty"><div class="glyph" aria-hidden="true">أ</div><h2>${esc(h)}</h2><p>${esc(p)}</p>${btn ? `<button class="btn" data-act="goto" data-to="${to}">${esc(btn)}</button>` : ''}</div>`;

  /* ---------- عرض الأبيات (يبقى بالعربية ومن اليمين دائمًا) ---------- */
  function hem(text, mode, nopeek) {
    if (mode === 'hide') return `<div class="hem is-hidden"${nopeek ? '' : ' data-peek'}>${esc(text)}</div>`;
    if (mode === 'hint') {
      const i = text.indexOf(' '), first = i < 0 ? text : text.slice(0, i), rest = i < 0 ? '' : text.slice(i);
      return `<div class="hem"><span class="hint-first">${esc(first)}</span><span class="is-hidden" data-peek>${esc(rest)}</span></div>`;
    }
    return `<div class="hem">${esc(text)}</div>`;
  }
  function baytHTML(b, idx, opts) {
    opts = opts || {};
    const no = opts.no ? `<span class="bno">${ar(b.n || idx + 1)}</span>` : '';
    /* في وضعَي المراجعة: اضغط مطوّلًا على البيت لإظهار ترجمته مؤقتًا */
    const peek = (opts.trans && b.t) ? `<div class="trans-peek" dir="ltr" lang="en"><p>${esc(b.t[0])}</p><p>${esc(b.t[1])}</p></div>` : '';
    return `<div class="bayt">${no}${hem(b.s, opts.s, opts.nopeek)}${b.e ? `<div class="orn"></div>${hem(b.e, opts.e, opts.nopeek)}` : ''}${peek}</div>`;
  }
  const transHTML = (b) => !b.t ? '' : `<div class="trans en" lang="en" dir="ltr"><p>${esc(b.t[0])}</p><p>${esc(b.t[1])}</p></div>`;

  /* ---------- الحفظ والمراجعة: لوحة المستويات الثلاثة ---------- */
  function modeCard(to, titleKey, st, pill, sub) {
    return `<button class="mode ${st}" data-act="goto" data-to="${to}"><span class="mode-mark">${st === 'done' ? IC.check : IC.chevL}</span>
      <span class="mode-body"><span class="mode-top"><span class="mode-title">${e(titleKey)}</span><span class="mode-pill"${da}>${esc(pill)}</span></span><span class="mode-sub">${esc(sub)}</span></span></button>`;
  }
  function vHome() {
    const pid = S.state.activePoem, poem = pid && POEMS.get(pid), perDay = S.settings().perDay, done = S.todayNewDone();
    let learn;
    if (!poem) learn = ['idle', t('learnIdlePill'), t('learnIdleSub')];
    else {
      const cm = S.currentChapter(pid);
      if (!cm) learn = ['done', t('doneM'), t('learnAllSub')];
      else if (done >= perDay) learn = ['done', t('doneM'), t('learnDoneSub', { n: done })];
      else learn = ['todo', kicker(pid, cm.id), t('learnTodaySub', { a: done, b: perDay })];
    }
    const items = S.newReviewList(), pending = items.filter((x) => !x.done).length;
    const near = !items.length ? ['idle', t('nearIdlePill'), t('nearIdleSub')]
      : pending ? ['todo', t('nearLeft', { n: pending }), t('nearTodoSub')]
      : ['done', t('doneF'), t('nearDoneSub')];
    const all = S.oldReviewList(), due = all.filter((x) => x.isDue).length;
    const far = !all.length ? ['idle', t('farIdlePill'), t('farIdleSub')]
      : due ? ['todo', t('farDue', { n: due }), t('farTodoSub')]
      : ['done', t('doneF'), t('farNextSub', { when: U.inDays(all[0].dueIn) })];
    return `<h2 class="page-title">${e('homeTitle')}</h2>
      <p class="lede">${poem ? e('homeLedePoem', { title: pTitle(pid) }) : e('homeLedeNone')}${e('homeChoose')}</p>
      <div class="modes">${modeCard('learn', 'modeLearn', ...learn)}${modeCard('near', 'modeNear', ...near)}${modeCard('far', 'modeFar', ...far)}</div>`;
  }

  /* ---------- الحفظ الجديد ---------- */
  function learnCursor() {
    const pid = S.state.activePoem; if (!pid || !POEMS.get(pid)) return null;
    const cm = S.currentChapter(pid); if (!cm) return null;
    const chap = chapterOf(pid, cm.id), idx = S.chapter(pid, cm.id).learned;
    return chap && chap.bayts[idx] ? { pid, chap, idx, bayt: chap.bayts[idx] } : null;
  }
  function vLearn() {
    const pid = S.state.activePoem, L = ui.learn;
    if (!pid || !POEMS.get(pid)) return emptyState(t('chooseTitle'), t('chooseBody'), t('toLibrary'), 'lib');
    if (L.stage === 'done') return learnDone();
    if (L.stage !== 'home' && learnCursor()) return learnCard();
    L.stage = 'home';
    return learnHome(pid);
  }
  const stepper = (label, val, min, max) => `<div class="stepper"><span class="label">${esc(label)}</span>
    <span class="ctl"><button data-act="perday" data-d="-1" aria-label="${e('decrease')}" ${val <= min ? 'disabled' : ''}>−</button><output>${ar(val)}</output><button data-act="perday" data-d="1" aria-label="${e('increase')}" ${val >= max ? 'disabled' : ''}>+</button></span></div>`;
  function learnHome(pid) {
    const cm = S.currentChapter(pid);
    if (!cm) return emptyState(t('finishedTitle'), t('finishedBody'), t('toLibrary'), 'lib');
    const st = S.chapter(pid, cm.id), perDay = S.settings().perDay, done = S.todayNewDone();
    const rem = Math.max(0, perDay - done), left = cm.len - st.learned, pending = S.pendingNear();
    const pct = Math.round(st.learned * 100 / cm.len);
    const status = rem > 0
      ? `<button class="btn block" data-act="learn-start">${e('learnStart', { n: Math.min(rem, Math.max(left, 1)) })}</button>`
      : `<div class="notice">${e('learnDoneNotice', { n: done })}</div><button class="btn block quiet" data-act="learn-more">${e('learnMore')}</button>`;
    return `<div class="stack">
      <div class="hero"><div class="kicker">${esc(kicker(pid, cm.id))}</div><h2 class="title"${da}>${esc(ctitle(cm))}</h2><div class="sub"${da}>${esc(pTitle(pid))}</div></div>
      <div><div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
        <p class="small muted" style="margin-top:6px">${e('learnedOf', { n: st.learned, total: cm.len })}</p></div>
      ${stepper(t('baytsToday'), perDay, 1, 10)}
      ${pending ? `<div class="notice warn">${e('nearNotice')} <button class="btn ghost small" data-act="goto" data-to="near">${e('openNear')}</button></div>` : ''}
      ${status}
    </div>`;
  }
  function learnCard() {
    const L = ui.learn, cursor = learnCursor(), b = cursor.bayt;
    const dots = L.target > 8 ? `<span>${ar(L.done + 1)} / ${ar(L.target)}</span>` : Array.from({ length: L.target }, (_, i) => `<i class="${i < L.done ? 'on' : i === L.done ? 'cur' : ''}"></i>`).join('');
    const hidden = !!L.hidden;
    const mode = hidden ? (L.hint ? 'hint' : 'hide') : 'show';
    const showEn = S.settings().showEn;   // الترجمة تُضبط من الإعدادات فقط
    const trans = (b.t && showEn) ? `<div class="trans-row">${transHTML(b)}</div>` : '';
    const actions = `<div class="row"><button class="btn quiet" data-act="learn-hide">${hidden ? (isEn() ? 'Show verse' : 'إظهار البيت') : (isEn() ? 'Hide verse' : 'إخفاء البيت')}</button>
        <button class="btn quiet" data-act="learn-hint" ${hidden ? '' : 'disabled'}>${L.hint ? e('hideHint') : e('hint')}</button></div>
      <button class="btn block" data-act="learn-known">${e('memorized')}</button>`;
    return `<div class="learn-top"><span><b>${e('baytN', { n: cursor.bayt.n || cursor.idx + 1 })}</b> <span class="muted small"${da}>${esc(ctitle(cMeta(cursor.pid, cursor.chap.id)))}</span></span><span class="dots" aria-label="${e('progressToday')}">${dots}</span></div>
      <div class="fit-box folio wrap" dir="rtl" data-min="16" data-max="48"><div class="fit-content">${baytHTML(b, cursor.idx, { s: mode, e: mode })}</div></div>
      ${trans}
      <div class="actions">${actions}</div>`;
  }
  function learnDone() {
    const L = ui.learn, pid = S.state.activePoem;
    const finished = L.completed.map((cid) => `<div class="notice">${e('chapterFinished', { title: cTitle(pid, cid), days: DAYS })}</div>`).join('');
    const finishedParts = L.completedParts.map((p) => `<div class="notice">${e('partFinished', { title: withPart(cTitle(pid, p.cid), p.segIdx, p.segCount), days: DAYS })}</div>`).join('');
    return `<div class="stack" style="padding-top:16px">
      <div class="center hero"><div class="empty" style="padding:8px 0"><div class="glyph" aria-hidden="true">أ</div></div>
        <h2 class="title" style="font-size:30px">${e('wellDone')}</h2><p class="sub">${e('sessionDone', { n: L.done })}</p></div>
      ${finished}${finishedParts}
      <button class="btn block" data-act="goto" data-to="near">${e('openNear')}</button>
      <button class="btn block quiet" data-act="learn-more">${e('learnMore')}</button>
      <button class="btn block ghost" data-act="learn-home">${e('back')}</button></div>`;
  }

  /* ---------- المراجعة القريبة ---------- */
  function vNear() {
    const N = ui.near;
    if (N.stage === 'pager') return nearPager();
    if (N.stage === 'result') return nearResult();
    const items = S.newReviewList();
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
  /* زرّا + و − : يُظهر البيت التالي أو يُخفي آخر بيت ظاهر */
  const revealCtl = (shown, n) => `<div class="rc"><button data-act="reveal-minus" aria-label="${e('hideLast')}" ${shown <= 0 ? 'disabled' : ''}>−</button><span>${e('visibleOf', { a: shown, b: n })}</span><button data-act="reveal-plus" aria-label="${e('showNext')}" ${shown >= n ? 'disabled' : ''}>+</button></div>`;
  const pagerTop = (pid, cid, segIdx, segCount, page, pages) => `<div class="learn-top"><span><b>${esc(withPart(kicker(pid, cid), segIdx, segCount))}</b> <span class="muted small"${da}>${esc(cTitle(pid, cid))}</span></span><span>${ar(page + 1)} / ${ar(pages)}</span></div>`;
  /* شريحة أبيات الجزء الحالي من الفصل، ضمن حدوده فقط */
  const segSlice = (pid, cid, segIdx) => {
    const chap = chapterOf(pid, cid), sg = cMeta(pid, cid).segs[segIdx];
    return { bayts: chap.bayts.slice(sg.start, sg.start + sg.len), sg, segCount: cMeta(pid, cid).segs.length };
  };
  function nearPager() {
    const N = ui.near, { bayts, sg, segCount } = segSlice(N.pid, N.cid, N.segIdx);
    const rec = S.chapter(N.pid, N.cid).segs && S.chapter(N.pid, N.cid).segs[N.segIdx];
    const total = (rec && rec.status === 'learning') ? Math.max(0, S.chapter(N.pid, N.cid).learned - sg.start) : sg.len;
    const pages = Math.max(1, Math.ceil(total / 5)), page = Math.min(Math.max(N.page, 0), pages - 1);
    const slice = bayts.slice(page * 5, Math.min(page * 5 + 5, total));
    const shown = N.shown == null ? 0 : Math.min(N.shown, slice.length);
    const last = page >= pages - 1;
    const body = slice.map((b, i) => baytHTML(b, page * 5 + i, { no: true, s: i < shown ? 'show' : 'hide', e: i < shown ? 'show' : 'hide', nopeek: true, trans: true })).join('');
    return `${pagerTop(N.pid, N.cid, N.segIdx, segCount, page, pages)}
      <div class="fit-box folio nowrap" dir="rtl" data-min="11" data-max="34" style="padding-inline:34px 20px"><div class="fit-content">${body}</div></div>
      <div class="actions" style="padding-top:10px">${revealCtl(shown, slice.length)}
        <div class="row"><button class="btn quiet" data-act="near-prev" ${page === 0 ? 'disabled' : ''}>${e('prev')}</button>
        ${last ? `<button class="btn" data-act="near-finish">${e('finishReview')}</button>` : `<button class="btn" data-act="near-next">${e('next')}</button>`}</div></div>`;
  }
  function nearResult() {
    const N = ui.near, r = N.result, title = withPart(cTitle(N.pid, N.cid), N.segIdx, cMeta(N.pid, N.cid).segs.length);
    let msg;
    if (r.graduated) msg = t('resGrad', { title, days: DAYS, when: U.inDays(U.diffDays(U.today(), r.card.due)) });
    else if (r.status === 'consolidating') msg = t('resConsol', { n: r.daysDone, days: DAYS });
    else msg = t('resLearn');
    const next = S.newReviewList().find((x) => !x.done);
    return `<div class="stack" style="padding-top:16px"><div class="center hero"><div class="empty" style="padding:8px 0"><div class="glyph" aria-hidden="true">أ</div></div>
      <h2 class="title" style="font-size:30px">${e('reviewComplete')}</h2></div>
      <div class="notice">${esc(msg)}</div>
      ${next ? `<button class="btn block" data-act="near-open" data-pid="${esc(next.pid)}" data-cid="${esc(next.cid)}" data-seg="${next.segIdx}">${e('nextReview', { title: withPart(cTitle(next.pid, next.cid), next.segIdx, next.segCount) })}</button>` : ''}
      <button class="btn block ${next ? 'quiet' : ''}" data-act="near-list">${next ? e('backToList') : e('back')}</button>
      ${!next ? `<button class="btn block quiet" data-act="goto" data-to="learn">${e('modeLearn')}</button>` : ''}</div>`;
  }

  /* ---------- المراجعة البعيدة ---------- */
  function vFar() {
    const Q = ui.far;
    if (Q.stage === 'review') return farReview();
    if (Q.stage === 'rate') return farRate();
    if (Q.stage === 'done') return farDone();
    const all = S.oldReviewList(), due = all.filter((x) => x.isDue), up = all.filter((x) => !x.isDue);
    if (!all.length) return emptyState(t('farEmptyT'), t('farEmptyB', { days: DAYS }), t('openLib'), 'lib');
    const row = (x, isDue) => `<li><button class="li" data-act="far-open" data-pid="${esc(x.pid)}" data-cid="${esc(x.cid)}" data-seg="${x.segIdx}">
      <span class="main"><span class="ch-no">${esc(withPart(kicker(x.pid, x.cid), x.segIdx, x.segCount))}</span><div class="t"${da}>${esc(cTitle(x.pid, x.cid))}</div><div class="s">${e('farRowSub', { poem: pTitle(x.pid), b: x.len })}</div></span>
      <span class="end">${isDue ? IC.chevL : esc(U.inDays(x.dueIn, true))}</span></button></li>`;
    return `<h2 class="page-title">${e('modeFar')}</h2>
      <p class="lede">${due.length ? e('farLede', { n: due.length }) : e('farNone')}</p>
      ${due.length ? `<ul class="list" style="margin-top:8px">${due.map((x) => row(x, true)).join('')}</ul>` : ''}
      ${up.length ? `<h3 class="section-h">${e('upcoming')}</h3><ul class="list">${up.map((x) => row(x, false)).join('')}</ul>` : ''}`;
  }
  const startFar = (pid, cid, segIdx) => Object.assign(ui.far, { stage: 'review', pid, cid, segIdx, page: 0, shown: 0, missed: {}, rated: null });
  /* خمسة أبيات في الصفحة: استظهر، ثم المس البيت الذي يصعب عليك ليُؤشَّر عليه */
  function farReview() {
    const Q = ui.far, { bayts, sg, segCount } = segSlice(Q.pid, Q.cid, Q.segIdx), total = sg.len;
    const pages = Math.max(1, Math.ceil(total / 5)), page = Math.min(Math.max(Q.page, 0), pages - 1), last = page >= pages - 1;
    const slice = bayts.slice(page * 5, page * 5 + 5), shown = Math.min(Q.shown, slice.length);
    const marked = Object.keys(Q.missed).length;
    const body = slice.map((b, k) => {
      const i = page * 5 + k, m = k < shown ? 'show' : 'hide';
      return `<div class="tapwrap${Q.missed[i] ? ' missed' : ''}" role="button" tabindex="0" aria-pressed="${!!Q.missed[i]}" data-act="q-toggle" data-i="${i}">${baytHTML(b, i, { no: true, s: m, e: m, nopeek: true, trans: true })}</div>`;
    }).join('');
    return `${pagerTop(Q.pid, Q.cid, Q.segIdx, segCount, page, pages)}
      <div class="fit-box folio nowrap" dir="rtl" data-min="11" data-max="34" style="padding-inline:34px 20px"><div class="fit-content">${body}</div></div>
      <div class="actions" style="padding-top:10px"><p class="prompt">${e('farPrompt', { marked })}</p>
        ${revealCtl(shown, slice.length)}
        <div class="row"><button class="btn quiet" data-act="q-prev" ${page === 0 ? 'disabled' : ''}>${e('prev')}</button>
        ${last ? `<button class="btn" data-act="q-finish">${e('finishChapter')}</button>` : `<button class="btn" data-act="q-next">${e('next')}</button>`}</div></div>`;
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
  function farDone() {
    const Q = ui.far, next = S.dueOld()[0];
    return `<div class="stack" style="padding-top:16px"><div class="center hero"><div class="empty" style="padding:8px 0"><div class="glyph" aria-hidden="true">أ</div></div>
      <h2 class="title" style="font-size:30px">${e('reviewDone')}</h2><p class="sub">${e('farDoneNext', { when: U.inDays(Q.rated) })}</p></div>
      ${next ? `<button class="btn block" data-act="far-open" data-pid="${esc(next.pid)}" data-cid="${esc(next.cid)}" data-seg="${next.segIdx}">${e('nextChapter', { title: withPart(cTitle(next.pid, next.cid), next.segIdx, next.segCount) })}</button>` : ''}
      <button class="btn block ${next ? 'quiet' : ''}" data-act="far-list">${e('backToList')}</button></div>`;
  }

  /* ---------- المكتب ---------- */
  function vLib() {
    const L = ui.lib;
    if (L.reader) return vReader();
    if (L.poem) return vPoem();
    const sections = LIB.sections.map((s) => `<button data-act="lib-section" data-id="${esc(s.id)}" aria-pressed="${L.section === s.id}">${esc(pick(s, 'title'))}</button>`).join('');
    const poems = LIB.poems.filter((p) => p.section === L.section);
    const cards = poems.map((p) => {
      const pr = S.poemProgress(p.id), active = S.state.activePoem === p.id;
      return `<li style="margin-bottom:12px"><button class="book" data-act="lib-open" data-pid="${esc(p.id)}"><span class="spine"></span><span class="body">
        <div class="name"${da}>${esc(pick(p, 'title'))}</div><div class="full"${da}>${esc(pick(p, 'author'))}</div>
        <div class="meta"><span>${esc(U.baytCount(p.baytCount))}</span><span>${e('chapCount', { n: p.chapterCount })}</span>${active ? `<span class="pill green">${e('memorizing')}</span>` : ''}</div>
        <div class="bar" style="margin-top:10px"><i style="width:${pr.pct}%"></i></div></span></button></li>`;
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
    if (s.status === 'learning') return { pill: `<span class="pill gold">${curCh ? e('stNow') : e('stProg')}</span>`, sub: t('learnedOf', { n: s.learned, total: c.len }) };
    return { pill: curCh ? `<span class="pill gold">${e('stNext')}</span>` : `<span class="pill">${e('stNew')}</span>`, sub: U.baytCount(c.len) };
  }
  function vPoem() {
    const pid = ui.lib.poem, poem = POEMS.get(pid), m = S.meta(pid), pr = S.poemProgress(pid), active = S.state.activePoem === pid;
    const rows = m.chapters.map((c) => {
      const st = chapterStatus(pid, c);
      return `<li><button class="li" data-act="lib-ch" data-cid="${esc(c.id)}"><span class="main"><span class="ch-no">${esc(kicker(pid, c.id))}</span><div class="t"${da}>${esc(ctitle(c))}</div><div class="s">${esc(st.sub)}</div></span><span class="end">${st.pill}</span></button></li>`;
    }).join('');
    return `<button class="back" data-act="lib-back">${IC.chev}<span>${e('navLib')}</span></button>
      <div class="hero"><div class="kicker"${da}>${esc(pick(poem, 'author'))}</div><h2 class="title"${da}>${esc(pick(poem, 'fullTitle'))}</h2></div>
      <div style="margin:10px 0 14px"><div class="bar"><i style="width:${pr.pct}%"></i></div><p class="small muted" style="margin-top:6px">${e('poemProgress', { n: pr.done, b: pr.total })}</p></div>
      <div class="row"><button class="btn" data-act="lib-read" data-cid="">${e('readPoem')}</button>
        <button class="btn quiet" data-act="lib-active" ${active ? 'disabled' : ''}>${active ? e('memorizingNow') : e('memorizeThis')}</button></div>
      <h3 class="section-h">${e('chaptersH')}</h3><ul class="list">${rows}</ul>`;
  }
  function openChapterSheet(cid) {
    const pid = ui.lib.poem, c = cMeta(pid, cid), s = S.chapter(pid, cid), st = chapterStatus(pid, c);
    const acts = [`<button class="btn block quiet" data-act="ch-read" data-cid="${esc(cid)}">${e('readChapter')}</button>`];
    if (s.status === 'new' || s.status === 'learning') acts.push(`<button class="btn block" data-act="ch-current" data-cid="${esc(cid)}">${s.status === 'learning' ? e('continueHere') : e('startHere')}</button>`);
    if (s.status !== 'done') acts.push(`<button class="btn block quiet" data-act="ch-mark" data-cid="${esc(cid)}">${e('markMemorized')}</button>`);
    if (s.status !== 'new') acts.push(`<button class="btn block danger" data-act="ch-reset" data-cid="${esc(cid)}">${e('restartChapter')}</button>`);
    openSheet(`<h2${da}>${esc(kicker(pid, cid))}: ${esc(ctitle(c))}</h2><p class="sub">${esc(st.sub)}</p><div class="opts">${acts.join('')}</div>`);
  }
  function openMarkSheet(cid) {
    const pid = ui.lib.poem, opts = S.previewMark();
    const btns = [1, 2, 3, 4].map((g) => `<button class="rate" data-act="ch-mark-rate" data-cid="${esc(cid)}" data-g="${g}"><span><b>${e('r' + g)}</b><small>${e('md' + g)}</small></span><span class="when">${esc(U.inDays(opts[g].interval, true))}</span></button>`).join('');
    openSheet(`<h2${da}>${e('markTitle', { title: cTitle(pid, cid) })}</h2><p class="sub">${e('markSub')}</p><div class="opts">${btns}</div>`);
  }

  /* ---------- القراءة (نص القصيدة عربي ومن اليمين دائمًا) ---------- */
  function vReader() {
    const R = ui.lib.reader, poem = POEMS.get(R.pid), size = S.settings().readerSize, en = R.en;
    const enTitle = (c) => (en && c.titleEn) ? `<p class="rch-en en" lang="en" dir="ltr">${esc(c.titleEn)}</p>` : '';
    const jump = `<select id="jump" aria-label="${e('jumpTo')}"><option value="">${e('jumpTo')}</option>${poem.chapters.map((c) => `<option value="${esc(c.id)}"${da}>${esc(kicker(R.pid, c.id))}: ${esc(ctitle(c))}</option>`).join('')}</select>`;
    const chapters = poem.chapters.map((c) => {
      const bs = c.bayts.map((b, i) => `<article class="rbayt" dir="rtl" data-k="${esc(c.id)}:${i}"><span class="rno">${ar(b.n || i + 1)}</span><div class="rlines"><div class="rs">${esc(b.s)}</div>${b.e ? `<div class="re">${esc(b.e)}</div>` : ''}</div>${en && b.t ? `<div class="rtrans en" lang="en" dir="ltr"><p>${esc(b.t[0])}</p><p>${esc(b.t[1])}</p></div>` : ''}</article>`).join('');
      return `<section id="rch-${esc(c.id)}"><div class="rch"><span class="ch-no">${esc(kicker(R.pid, c.id))}</span><h3 dir="rtl">${esc(c.title)}</h3>${enTitle(c)}</div>${bs}</section>`;
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
  const FLUSH = () => (cur() === 'learn' && ui.learn.stage !== 'home' && ui.learn.stage !== 'done' && S.state.activePoem && POEMS.get(S.state.activePoem) && !!learnCursor())
    || (cur() === 'near' && ui.near.stage === 'pager') || (cur() === 'far' && ui.far.stage === 'review');

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
    const html = { home: vHome, learn: vLearn, near: vNear, far: vFar, lib: vLib, settings: vSettings }[cur()]();
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
    const pid = S.state.activePoem, chip = $('#poem-chip'), p = pid && POEMS.get(pid), inMode = ui.tab === 'home' && !!ui.mode;
    chip.hidden = !p || inMode; if (p) chip.textContent = pTitle(pid);
    $('#mode-back').hidden = !inMode; $('.brand').hidden = inMode;
    const n = S.pendingNear() + S.dueOld().length, b = $('#tabs [data-tab="home"] .badge');
    b.hidden = !n; b.textContent = ar(n);
  }
  const fitAll = () => $$('.fit-box', view).forEach((b) => U.fitText(b, { min: +b.dataset.min || 12, max: +b.dataset.max || 48 }));
  function afterRender() {
    requestAnimationFrame(fitAll);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(fitAll));
  }

  /* ---------- الأحداث ---------- */
  function go(tab) {
    if (ui.tab === 'lib' && ui.lib.reader) ui.lib.reader.pos = rAnchor();
    if (tab === 'learn' || tab === 'near' || tab === 'far') { ui.tab = 'home'; ui.mode = tab; }
    else { ui.tab = tab; if (tab === 'home') ui.mode = null; }
    closeSheet(); render();
  }
  async function openPoem(pid) { await loadPoem(pid); ui.lib.poem = pid; render(); }

  function act(name, el) {
    const d = el.dataset, L = ui.learn, N = ui.near, Q = ui.far;
    switch (name) {
      case 'goto': return go(d.to);
      case 'mode-back': ui.mode = null; return render();
      case 'sheet-close': return closeSheet();
      case 'perday': { const v = Math.min(10, Math.max(1, S.settings().perDay + Number(d.d))); S.setSetting('perDay', v); return render({ keep: true }); }
      /* الحفظ الجديد */
      case 'learn-start': case 'learn-more': {
        const rem = Math.max(0, S.settings().perDay - S.todayNewDone());
        Object.assign(L, { stage: 'learn', target: name === 'learn-more' ? 1 : Math.max(1, rem), done: 0, hint: false, hidden: false, en: false, completed: [], completedParts: [] });
        return render();
      }
      case 'learn-home': L.stage = 'home'; return render();
      case 'learn-hide': L.hidden = !L.hidden; L.hint = false; return render({ keep: true });
      case 'learn-hint': L.hint = !L.hint; return render({ keep: true });
      case 'learn-reveal': L.stage = 'check'; return render();
      case 'learn-unknown': L.stage = 'learn'; return render();
      case 'toggle-en': L.en = !L.en; return render({ keep: true });
      case 'learn-known': {
        const cursor = learnCursor(); if (!cursor) { L.stage = 'done'; return render(); }
        const r = S.markLearned(cursor.pid, cursor.chap.id);
        L.done += 1; L.hint = false; L.hidden = false;
        if (r.completed) L.completed.push(cursor.chap.id);
        else if (r.segCompleted) L.completedParts.push({ cid: cursor.chap.id, segIdx: r.segIdx, segCount: r.segCount });
        L.stage = (L.done >= L.target || !learnCursor()) ? 'done' : 'learn';
        return render();
      }
      /* المراجعة القريبة */
      case 'near-open': Object.assign(N, { stage: 'pager', pid: d.pid, cid: d.cid, segIdx: Number(d.seg), page: 0, shown: null, result: null }); return render();
      case 'near-prev': N.page -= 1; N.shown = null; return render();
      case 'near-next': N.page += 1; N.shown = null; return render();
      case 'near-finish': N.result = S.finishNewReview(N.pid, N.cid, N.segIdx); N.stage = 'result'; return render();
      case 'near-list': N.stage = 'list'; return render();
      /* المراجعة البعيدة */
      case 'far-open': startFar(d.pid, d.cid, Number(d.seg)); return render();
      case 'q-toggle': { const k = Number(d.i); if (Q.missed[k]) delete Q.missed[k]; else Q.missed[k] = true; return render({ keep: true }); }
      case 'q-prev': Q.page = Math.max(0, Q.page - 1); Q.shown = 0; return render();
      case 'q-next': Q.page += 1; Q.shown = 0; return render();
      case 'reveal-plus': case 'reveal-minus': {
        const c = ui.mode === 'near' ? N : Q, sg = cMeta(c.pid, c.cid).segs[c.segIdx];
        let total = sg.len;
        if (ui.mode === 'near') {
          const st = S.chapter(c.pid, c.cid), rec = st.segs && st.segs[c.segIdx];
          if (rec && rec.status === 'learning') total = Math.max(0, st.learned - sg.start);
        }
        const n = Math.min(5, total - c.page * 5), now = c.shown == null ? 0 : c.shown;
        c.shown = Math.min(n, Math.max(0, now + (name === 'reveal-plus' ? 1 : -1)));
        return render({ keep: true });
      }
      case 'q-finish': Q.stage = 'rate'; return render();
      case 'far-rate': { const card = S.applyOldReview(Q.pid, Q.cid, Q.segIdx, Number(d.g)); Q.rated = U.diffDays(U.today(), card.due); Q.stage = 'done'; return render(); }
      case 'far-list': Q.stage = 'list'; return render();
      /* المكتب */
      case 'lib-section': ui.lib.section = d.id; return render();
      case 'lib-open': return openPoem(d.pid);
      case 'lib-back': ui.lib.poem = null; return render();
      case 'lib-active': S.setActive(ui.lib.poem); L.stage = 'home'; toast(t('tNowMem')); return render();
      case 'lib-read': ui.lib.reader = { pid: ui.lib.poem, cid: d.cid || null, en: S.settings().showEn }; return render();
      case 'lib-ch': return openChapterSheet(d.cid);
      case 'ch-read': closeSheet(); ui.lib.reader = { pid: ui.lib.poem, cid: d.cid, en: S.settings().showEn }; return render();
      case 'ch-current': S.setCurrent(ui.lib.poem, d.cid); L.stage = 'home'; closeSheet(); toast(t('tStartHere')); return render();
      case 'ch-mark': return openMarkSheet(d.cid);
      case 'ch-mark-rate': S.markMemorized(ui.lib.poem, d.cid, Number(d.g)); closeSheet(); L.stage = 'home'; toast(t('tAdded')); return render();
      case 'ch-reset': return confirmSheet(t('restartQ'), t('restartBody'), t('restartYes'), 'ch-reset-yes', { cid: d.cid }, true);
      case 'ch-reset-yes': S.resetChapter(ui.lib.poem, d.cid); closeSheet(); L.stage = 'home'; toast(t('tReset')); return render();
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
      case 'reset-yes': S.resetAll(); closeSheet(); Object.assign(ui.learn, { stage: 'home' }); Object.assign(ui.near, { stage: 'list' }); Object.assign(ui.far, { stage: 'list' }); ui.lib.poem = null; applyLang(); applyTheme(); toast(t('tErased')); return render();
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
    const text = S.exportJSON(), name = 'abyaat-backup-' + U.today() + '.json';
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

  document.addEventListener('click', (ev) => {
    if (lpFired) { lpFired = false; return; }
    const tab = ev.target.closest('[data-tab]');
    if (tab) return go(tab.dataset.tab);
    const peek = ev.target.closest('[data-peek]');
    if (peek) { peek.classList.toggle('peek'); return; }
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
