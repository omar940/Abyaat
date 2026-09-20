/* أبيات — واجهة التطبيق. كل النصوص بالعربية. */
(function () {
  'use strict';
  const U = window.AbyaatUtil, F = window.AbyaatFSRS, S = window.AbyaatStore;
  const { ar, esc } = U;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const view = $('#view');
  const DAYS = S.CONSOLIDATION_DAYS;

  const IC = {
    chev: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    chevL: '<svg class="ic mirror" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    check: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  };

  const ui = {
    tab: 'learn',
    learn: { stage: 'home', target: 0, done: 0, hint: false, en: false, completed: [] },
    near: { stage: 'list', pid: null, cid: null, page: 0, shown: null, result: null },
    far: { stage: 'list', pid: null, cid: null, page: 0, shown: 0, missed: {}, rated: null },
    lib: { section: 'qasaid', poem: null, reader: null },
  };
  let LIB = null;
  const POEMS = new Map();

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
  const kicker = (pid, cid) => {
    const m = S.meta(pid), c = m.chapters.find((x) => x.id === cid);
    if (c.optional) return 'اختياري';
    return 'الفصل ' + U.ordinal(m.chapters.filter((x) => !x.optional).findIndex((x) => x.id === cid));
  };

  /* ---------- أدوات الواجهة ---------- */
  function toast(msg) {
    const t = $('#toast'); t.innerHTML = '<div>' + esc(msg) + '</div>';
    clearTimeout(toast.h); toast.h = setTimeout(() => { t.innerHTML = ''; }, 2600);
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
      <button class="btn block ghost" data-act="sheet-close">إلغاء</button></div>`);
  }
  const emptyState = (h, p, btn, to) => `<div class="empty"><div class="glyph" aria-hidden="true">أ</div><h2>${esc(h)}</h2><p>${esc(p)}</p>${btn ? `<button class="btn" data-act="goto" data-to="${to}">${esc(btn)}</button>` : ''}</div>`;

  /* ---------- عرض الأبيات ---------- */
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
    return `<div class="bayt">${no}${hem(b.s, opts.s, opts.nopeek)}${b.e ? `<div class="orn"></div>${hem(b.e, opts.e, opts.nopeek)}` : ''}</div>`;
  }
  const transHTML = (b) => !b.t ? '' : `<div class="trans en" lang="en" dir="ltr"><p>${esc(b.t[0])}</p><p>${esc(b.t[1])}</p></div>`;

  /* ---------- الحفظ الجديد ---------- */
  function learnCursor() {
    const pid = S.state.activePoem; if (!pid || !POEMS.get(pid)) return null;
    const cm = S.currentChapter(pid); if (!cm) return null;
    const chap = chapterOf(pid, cm.id), idx = S.chapter(pid, cm.id).learned;
    return chap && chap.bayts[idx] ? { pid, chap, idx, bayt: chap.bayts[idx] } : null;
  }
  function vLearn() {
    const pid = S.state.activePoem, L = ui.learn;
    if (!pid || !POEMS.get(pid)) return emptyState('اختر قصيدة لتبدأ', 'اختر القصيدة التي تريد حفظها من المكتب.', 'اذهب إلى المكتب', 'lib');
    if (L.stage === 'done') return learnDone();
    if (L.stage !== 'home' && learnCursor()) return learnCard();
    L.stage = 'home';
    return learnHome(pid);
  }
  function learnHome(pid) {
    const poem = POEMS.get(pid), cm = S.currentChapter(pid);
    if (!cm) return emptyState('أتممت فصول هذه القصيدة', 'تابع مراجعتها من المراجعة القريبة والبعيدة، أو اختر قصيدة أخرى من المكتب.', 'اذهب إلى المكتب', 'lib');
    const st = S.chapter(pid, cm.id), perDay = S.settings().perDay, done = S.todayNewDone();
    const rem = Math.max(0, perDay - done), left = cm.len - st.learned, pending = S.pendingNear();
    const pct = Math.round(st.learned * 100 / cm.len);
    const status = rem > 0
      ? `<button class="btn block" data-act="learn-start">ابدأ حفظ ${U.baytCount(Math.min(rem, Math.max(left, 1)))}</button>`
      : `<div class="notice">أتممت حفظ اليوم (${U.baytCount(done)}). أحسنت.</div><button class="btn block quiet" data-act="learn-more">حفظ بيت إضافي</button>`;
    return `<div class="stack">
      <div class="hero"><div class="kicker">${esc(kicker(pid, cm.id))}</div><h2 class="title">${esc(cm.title)}</h2><div class="sub">${esc(poem.title)}</div></div>
      <div><div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
        <p class="small muted" style="margin-top:6px">حُفظ ${ar(st.learned)} من ${U.baytCount(cm.len)}</p></div>
      <div class="stepper"><span class="label">عدد الأبيات اليوم</span>
        <span class="ctl"><button data-act="perday" data-d="-1" aria-label="أنقص" ${perDay <= 1 ? 'disabled' : ''}>−</button><output>${ar(perDay)}</output><button data-act="perday" data-d="1" aria-label="زِد" ${perDay >= 10 ? 'disabled' : ''}>+</button></span></div>
      ${pending ? `<div class="notice warn">لديك مراجعة قريبة اليوم. الأفضل أن تبدأ بها. <button class="btn ghost small" data-act="goto" data-to="near">افتح المراجعة القريبة</button></div>` : ''}
      ${status}
    </div>`;
  }
  function learnCard() {
    const L = ui.learn, cur = learnCursor(), b = cur.bayt;
    const dots = L.target > 8 ? `<span>${ar(L.done + 1)} / ${ar(L.target)}</span>` : Array.from({ length: L.target }, (_, i) => `<i class="${i < L.done ? 'on' : i === L.done ? 'cur' : ''}"></i>`).join('');
    const hidden = L.stage === 'recite';
    const mode = hidden ? (L.hint ? 'hint' : 'hide') : 'show';
    const showEn = L.en || S.settings().showEn;
    let actions = '';
    if (L.stage === 'learn') {
      actions = `<button class="btn block" data-act="learn-hide">أخفِ النص واستظهر</button>
        ${b.t ? `<button class="btn block ghost small" data-act="toggle-en">${showEn ? 'أخفِ الترجمة' : 'أظهر الترجمة'}</button>` : ''}`;
    } else if (L.stage === 'recite') {
      actions = `<p class="prompt">استظهر البيت بصوتك من حفظك، ثم تحقّق.</p>
        <div class="row"><button class="btn quiet" data-act="learn-hint">${L.hint ? 'أخفِ التلميح' : 'تلميح'}</button><button class="btn" data-act="learn-reveal">أظهر للتحقق</button></div>`;
    } else {
      actions = `<p class="prompt">هل استظهرته كاملًا دون خطأ؟</p>
        <div class="row"><button class="btn quiet" data-act="learn-unknown">لم أحفظه بعد</button><button class="btn" data-act="learn-known">حفظته</button></div>`;
    }
    return `<div class="learn-top"><span><b>البيت ${ar(cur.bayt.n || cur.idx + 1)}</b> <span class="muted small">${esc(cur.chap.title)}</span></span><span class="dots" aria-label="تقدّم اليوم">${dots}</span></div>
      <div class="fit-box folio wrap" data-min="16" data-max="48"><div class="fit-content">${baytHTML(b, cur.idx, { s: mode, e: mode })}</div></div>
      ${showEn && !hidden ? transHTML(b) : ''}
      <div class="actions">${actions}</div>`;
  }
  function learnDone() {
    const L = ui.learn, pid = S.state.activePoem;
    const finished = L.completed.map((cid) => `<div class="notice">أتممت «${esc(chapterOf(pid, cid).title)}». سيظهر في المراجعة القريبة، وبعد ${U.dayCount(DAYS)} مراجعة فعلية ينتقل إلى المراجعة البعيدة.</div>`).join('');
    return `<div class="stack" style="padding-top:16px">
      <div class="center hero"><div class="empty" style="padding:8px 0"><div class="glyph" aria-hidden="true">أ</div></div>
        <h2 class="title" style="font-size:30px">أحسنت</h2><p class="sub">حفظتَ ${U.baytCount(L.done)} في هذه الجلسة.</p></div>
      ${finished}
      <button class="btn block" data-act="goto" data-to="near">افتح المراجعة القريبة</button>
      <button class="btn block quiet" data-act="learn-more">حفظ بيت إضافي</button>
      <button class="btn block ghost" data-act="learn-home">العودة</button></div>`;
  }

  /* ---------- المراجعة القريبة ---------- */
  function vNear() {
    const N = ui.near;
    if (N.stage === 'pager') return nearPager();
    if (N.stage === 'result') return nearResult();
    const items = S.newReviewList();
    if (!items.length) return emptyState('لا مراجعة قريبة اليوم', 'تظهر هنا الفصول التي بدأت حفظها، وأيام التثبيت بعد إتمام الفصل.', 'ابدأ حفظًا جديدًا', 'learn');
    const pending = items.filter((x) => !x.done).length;
    const rows = items.map((x) => {
      const sub = x.status === 'consolidating'
        ? `${esc(x.poemTitle)}، التثبيت: أُنجز ${ar(x.daysDone)} من ${U.dayCount(DAYS)}`
        : `${esc(x.poemTitle)}، حُفظ ${ar(x.learned)} من ${U.baytCount(x.len)}`;
      return `<li><button class="li ${x.done ? 'dim' : ''}" data-act="near-open" data-pid="${esc(x.pid)}" data-cid="${esc(x.cid)}">
        <span class="main"><span class="ch-no">${esc(kicker(x.pid, x.cid))}</span><div class="t">${esc(x.title)}</div><div class="s">${sub}</div></span>
        <span class="end">${x.done ? `<span class="check">${IC.check}</span>` : IC.chevL}</span></button></li>`;
    }).join('');
    return `<h2 class="page-title">المراجعة القريبة</h2>
      <p class="lede">${pending ? `متبقٍّ اليوم: ${ar(pending)}` : 'أتممت مراجعة اليوم كلها.'}</p>
      <ul class="list" style="margin-top:8px">${rows}</ul>`;
  }
  /* زرّا + و − : يُظهر البيت التالي أو يُخفي آخر بيت ظاهر */
  const revealCtl = (shown, n) => `<div class="rc"><button data-act="reveal-minus" aria-label="أخفِ آخر بيت ظاهر" ${shown <= 0 ? 'disabled' : ''}>−</button><span>ظاهر ${ar(shown)} من ${ar(n)}</span><button data-act="reveal-plus" aria-label="أظهر البيت التالي" ${shown >= n ? 'disabled' : ''}>+</button></div>`;
  function nearPager() {
    const N = ui.near, chap = chapterOf(N.pid, N.cid), st = S.chapter(N.pid, N.cid);
    const total = st.status === 'learning' ? st.learned : chap.bayts.length;
    const pages = Math.max(1, Math.ceil(total / 5)), page = Math.min(Math.max(N.page, 0), pages - 1);
    const slice = chap.bayts.slice(page * 5, Math.min(page * 5 + 5, total));
    const shown = N.shown == null ? slice.length : Math.min(N.shown, slice.length);
    const last = page >= pages - 1;
    const body = slice.map((b, i) => baytHTML(b, page * 5 + i, { no: true, s: i < shown ? 'show' : 'hide', e: i < shown ? 'show' : 'hide', nopeek: true })).join('');
    return `<div class="learn-top"><span><b>${esc(kicker(N.pid, N.cid))}</b> <span class="muted small">${esc(chap.title)}</span></span><span>${ar(page + 1)} / ${ar(pages)}</span></div>
      <div class="fit-box folio nowrap" data-min="11" data-max="34" style="padding-inline:34px 20px"><div class="fit-content">${body}</div></div>
      <div class="actions" style="padding-top:10px">${revealCtl(shown, slice.length)}
        <div class="row"><button class="btn quiet" data-act="near-prev" ${page === 0 ? 'disabled' : ''}>السابق</button>
        ${last ? '<button class="btn" data-act="near-finish">أتممت المراجعة</button>' : '<button class="btn" data-act="near-next">التالي</button>'}</div></div>`;
  }
  function nearResult() {
    const N = ui.near, r = N.result, title = chapterOf(N.pid, N.cid).title;
    let msg;
    if (r.graduated) msg = `أتممتَ ${U.dayCount(DAYS)} من التثبيت، فانتقل «${title}» إلى المراجعة البعيدة. اختبارك الأول ${U.inDays(U.diffDays(U.today(), r.card.due))}.`;
    else if (r.status === 'consolidating') msg = `أُنجز ${ar(r.daysDone)} من ${U.dayCount(DAYS)} من التثبيت.`;
    else msg = 'تمت مراجعة ما حفظته من هذا الفصل اليوم.';
    const next = S.newReviewList().find((x) => !x.done);
    return `<div class="stack" style="padding-top:16px"><div class="center hero"><div class="empty" style="padding:8px 0"><div class="glyph" aria-hidden="true">أ</div></div>
      <h2 class="title" style="font-size:30px">أتممت المراجعة</h2></div>
      <div class="notice">${esc(msg)}</div>
      ${next ? `<button class="btn block" data-act="near-open" data-pid="${esc(next.pid)}" data-cid="${esc(next.cid)}">المراجعة التالية: ${esc(next.title)}</button>` : ''}
      <button class="btn block ${next ? 'quiet' : ''}" data-act="near-list">${next ? 'العودة إلى القائمة' : 'العودة'}</button>
      ${!next ? '<button class="btn block quiet" data-act="goto" data-to="learn">الحفظ الجديد</button>' : ''}</div>`;
  }

  /* ---------- المراجعة البعيدة ---------- */
  function vFar() {
    const Q = ui.far;
    if (Q.stage === 'review') return farReview();
    if (Q.stage === 'rate') return farRate();
    if (Q.stage === 'done') return farDone();
    const all = S.oldReviewList(), due = all.filter((x) => x.isDue), up = all.filter((x) => !x.isDue);
    if (!all.length) return emptyState('لا فصول في المراجعة البعيدة بعد', `ينتقل الفصل إلى هنا بعد ${U.dayCount(DAYS)} من التثبيت، أو عند اختيار «تم حفظ الفصل» من المكتب.`, 'افتح المكتب', 'lib');
    const row = (x, isDue) => `<li><button class="li" data-act="far-open" data-pid="${esc(x.pid)}" data-cid="${esc(x.cid)}">
      <span class="main"><span class="ch-no">${esc(kicker(x.pid, x.cid))}</span><div class="t">${esc(x.title)}</div><div class="s">${esc(x.poemTitle)}، ${U.baytCount(x.len)}</div></span>
      <span class="end">${isDue ? IC.chevL : esc(U.inDays(x.dueIn))}</span></button></li>`;
    return `<h2 class="page-title">المراجعة البعيدة</h2>
      <p class="lede">${due.length ? `راجع اليوم: ${due.length === 1 ? 'فصلًا واحدًا' : ar(due.length) + (due.length === 2 ? ' فصلين' : ' فصول')}` : 'لا شيء مستحق اليوم.'}</p>
      ${due.length ? `<ul class="list" style="margin-top:8px">${due.map((x) => row(x, true)).join('')}</ul>` : ''}
      ${up.length ? `<h3 class="section-h">قادمة</h3><ul class="list">${up.map((x) => row(x, false)).join('')}</ul>` : ''}`;
  }
  const startFar = (pid, cid) => Object.assign(ui.far, { stage: 'review', pid, cid, page: 0, shown: 0, missed: {}, rated: null });
  /* خمسة أبيات في الصفحة: اقرأ أو استظهر، والمس البيت الذي يصعب عليك ليُؤشَّر عليه */
  function farReview() {
    const Q = ui.far, chap = chapterOf(Q.pid, Q.cid), total = chap.bayts.length;
    const pages = Math.max(1, Math.ceil(total / 5)), page = Math.min(Math.max(Q.page, 0), pages - 1), last = page >= pages - 1;
    const slice = chap.bayts.slice(page * 5, page * 5 + 5), shown = Math.min(Q.shown, slice.length);
    const marked = Object.keys(Q.missed).length;
    const body = slice.map((b, k) => {
      const i = page * 5 + k, m = k < shown ? 'show' : 'hide';
      return `<div class="tapwrap${Q.missed[i] ? ' missed' : ''}" role="button" tabindex="0" aria-pressed="${!!Q.missed[i]}" data-act="q-toggle" data-i="${i}">${baytHTML(b, i, { no: true, s: m, e: m, nopeek: true })}</div>`;
    }).join('');
    return `<div class="learn-top"><span><b>${esc(kicker(Q.pid, Q.cid))}</b> <span class="muted small">${esc(chap.title)}</span></span><span>${ar(page + 1)} / ${ar(pages)}</span></div>
      <div class="fit-box folio nowrap" data-min="11" data-max="34" style="padding-inline:34px 20px"><div class="fit-content">${body}</div></div>
      <div class="actions" style="padding-top:10px"><p class="prompt">المس البيت الذي يصعب عليك للتأشير عليه${marked ? ` (${ar(marked)})` : ''}.</p>
        ${revealCtl(shown, slice.length)}
        <div class="row"><button class="btn quiet" data-act="q-prev" ${page === 0 ? 'disabled' : ''}>السابق</button>
        ${last ? '<button class="btn" data-act="q-finish">أتممت الفصل</button>' : '<button class="btn" data-act="q-next">التالي</button>'}</div></div>`;
  }
  /* اختيار الفترة: الخيارات الأربعة من FSRS، وكل زر يبيّن موعد المراجعة القادمة */
  function farRate() {
    const Q = ui.far, chap = chapterOf(Q.pid, Q.cid), tot = chap.bayts.length, miss = Object.keys(Q.missed).length;
    const suggest = miss === 0 ? 3 : miss / tot <= 0.25 ? 2 : 1;
    const opts = S.previewOld(Q.pid, Q.cid);
    const info = { 1: 'نسيتُ', 2: 'بصعوبة', 3: 'تذكّرتُ', 4: 'بسهولة' };
    const btns = [1, 2, 3, 4].map((g) => `<button class="rate ${g === suggest ? 'suggest' : ''}" data-act="far-rate" data-g="${g}"><span><b>${esc(U.inDays(opts[g].interval))}</b><small>${info[g]}</small></span></button>`).join('');
    return `<div class="stack"><div class="hero"><div class="kicker">${esc(chap.title)}</div>
      <h2 class="title" style="font-size:30px">${miss ? `أشّرت على ${ar(miss)} من ${U.baytCount(tot)}` : 'لم تؤشّر على أي بيت'}</h2></div>
      <p class="lede">متى تريد مراجعة هذا الفصل؟ الاقتراح مظلّل، ولك أن تختار غيره.</p>
      <div class="opts" style="display:flex;flex-direction:column;gap:9px">${btns}</div></div>`;
  }
  function farDone() {
    const Q = ui.far, next = S.dueOld()[0];
    return `<div class="stack" style="padding-top:16px"><div class="center hero"><div class="empty" style="padding:8px 0"><div class="glyph" aria-hidden="true">أ</div></div>
      <h2 class="title" style="font-size:30px">تمت المراجعة</h2><p class="sub">المراجعة القادمة لهذا الفصل ${esc(U.inDays(Q.rated))}.</p></div>
      ${next ? `<button class="btn block" data-act="far-open" data-pid="${esc(next.pid)}" data-cid="${esc(next.cid)}">الفصل التالي: ${esc(next.title)}</button>` : ''}
      <button class="btn block ${next ? 'quiet' : ''}" data-act="far-list">العودة إلى القائمة</button></div>`;
  }

  /* ---------- المكتب ---------- */
  function vLib() {
    const L = ui.lib;
    if (L.reader) return vReader();
    if (L.poem) return vPoem();
    const sections = LIB.sections.map((s) => `<button data-act="lib-section" data-id="${esc(s.id)}" aria-pressed="${L.section === s.id}">${esc(s.title)}</button>`).join('');
    const poems = LIB.poems.filter((p) => p.section === L.section);
    const cards = poems.map((p) => {
      const pr = S.poemProgress(p.id), active = S.state.activePoem === p.id;
      return `<li style="margin-bottom:12px"><button class="book" data-act="lib-open" data-pid="${esc(p.id)}"><span class="spine"></span><span class="body">
        <div class="name">${esc(p.title)}</div><div class="full">${esc(p.author)}</div>
        <div class="meta"><span>${U.baytCount(p.baytCount)}</span><span>${ar(p.chapterCount)} فصول</span>${active ? '<span class="pill green">قيد الحفظ</span>' : ''}</div>
        <div class="bar" style="margin-top:10px"><i style="width:${pr.pct}%"></i></div></span></button></li>`;
    }).join('');
    const body = poems.length ? `<ul class="list" style="margin-top:14px">${cards}</ul>`
      : emptyState('لا توجد ' + LIB.sections.find((s) => s.id === L.section).title + ' بعد', 'ستظهر هنا عند إضافتها إلى التطبيق.');
    return `<h2 class="page-title">المكتب</h2><div class="seg" style="margin-top:10px" role="group" aria-label="أقسام المكتب">${sections}</div>${body}`;
  }
  function chapterStatus(pid, c) {
    const s = S.chapter(pid, c.id), cur = S.state.activePoem === pid && S.currentChapter(pid) && S.currentChapter(pid).id === c.id;
    if (s.status === 'review') {
      const dueIn = U.diffDays(U.today(), s.card.due);
      return { pill: '<span class="pill green">المراجعة البعيدة</span>', sub: 'الاختبار القادم ' + U.inDays(dueIn) };
    }
    if (s.status === 'consolidating') return { pill: '<span class="pill gold">تثبيت</span>', sub: `بقي ${U.dayCount(DAYS - (s.daysDone || 0))} من التثبيت` };
    if (s.status === 'learning') return { pill: `<span class="pill gold">${cur ? 'قيد الحفظ الآن' : 'قيد الحفظ'}</span>`, sub: `حُفظ ${ar(s.learned)} من ${U.baytCount(c.len)}` };
    return { pill: cur ? '<span class="pill gold">التالي</span>' : '<span class="pill">لم يبدأ</span>', sub: U.baytCount(c.len) };
  }
  function vPoem() {
    const pid = ui.lib.poem, poem = POEMS.get(pid), m = S.meta(pid), pr = S.poemProgress(pid), active = S.state.activePoem === pid;
    const rows = m.chapters.map((c) => {
      const st = chapterStatus(pid, c);
      return `<li><button class="li" data-act="lib-ch" data-cid="${esc(c.id)}"><span class="main"><span class="ch-no">${esc(kicker(pid, c.id))}</span><div class="t">${esc(c.title)}</div><div class="s">${esc(st.sub)}</div></span><span class="end">${st.pill}</span></button></li>`;
    }).join('');
    return `<button class="back" data-act="lib-back">${IC.chev}<span>المكتب</span></button>
      <div class="hero"><div class="kicker">${esc(poem.author)}</div><h2 class="title">${esc(poem.fullTitle)}</h2></div>
      <div style="margin:10px 0 14px"><div class="bar"><i style="width:${pr.pct}%"></i></div><p class="small muted" style="margin-top:6px">${ar(pr.done)} من ${U.baytCount(pr.total)} في الفصول الأساسية</p></div>
      <div class="row"><button class="btn" data-act="lib-read" data-cid="">قراءة القصيدة</button>
        <button class="btn quiet" data-act="lib-active" ${active ? 'disabled' : ''}>${active ? 'قيد الحفظ الآن' : 'اجعلها قيد الحفظ'}</button></div>
      <h3 class="section-h">الفصول</h3><ul class="list">${rows}</ul>`;
  }
  function openChapterSheet(cid) {
    const pid = ui.lib.poem, c = S.meta(pid).chapters.find((x) => x.id === cid), s = S.chapter(pid, cid), st = chapterStatus(pid, c);
    const acts = [`<button class="btn block quiet" data-act="ch-read" data-cid="${esc(cid)}">قراءة الفصل</button>`];
    if (s.status === 'new' || s.status === 'learning') acts.push(`<button class="btn block" data-act="ch-current" data-cid="${esc(cid)}">${s.status === 'learning' ? 'تابع الحفظ من هنا' : 'ابدأ الحفظ من هذا الفصل'}</button>`);
    if (s.status !== 'review') acts.push(`<button class="btn block quiet" data-act="ch-mark" data-cid="${esc(cid)}">تم حفظ الفصل</button>`);
    if (s.status !== 'new') acts.push(`<button class="btn block danger" data-act="ch-reset" data-cid="${esc(cid)}">إعادة الحفظ من البداية</button>`);
    openSheet(`<h2>${esc(kicker(pid, cid))}: ${esc(c.title)}</h2><p class="sub">${esc(st.sub)}</p><div class="opts">${acts.join('')}</div>`);
  }
  function openMarkSheet(cid) {
    const pid = ui.lib.poem, c = S.meta(pid).chapters.find((x) => x.id === cid), opts = S.previewMark();
    const info = { 1: ['نسيتُ', 'لا أستطيع استظهاره الآن'], 2: ['بصعوبة', 'أتذكّره بجهد وتردّد'], 3: ['تذكّرتُ', 'أستظهره بثقة مع أخطاء يسيرة'], 4: ['بسهولة', 'أستظهره بسرعة ودون تردّد'] };
    const btns = [1, 2, 3, 4].map((g) => `<button class="rate" data-act="ch-mark-rate" data-cid="${esc(cid)}" data-g="${g}"><span><b>${info[g][0]}</b><small>${info[g][1]}</small></span><span class="when">${esc(U.inDays(opts[g].interval))}</span></button>`).join('');
    openSheet(`<h2>كم تُتقن «${esc(c.title)}»؟</h2><p class="sub">يدخل الفصل المراجعة البعيدة، ويُحدَّد موعد أول اختبار من تقييمك.</p><div class="opts">${btns}</div>`);
  }

  /* ---------- القراءة ---------- */
  function vReader() {
    const R = ui.lib.reader, poem = POEMS.get(R.pid), size = S.settings().readerSize, en = R.en;
    const m = S.meta(R.pid);
    const jump = `<select id="jump" aria-label="انتقل إلى فصل"><option value="">انتقل إلى فصل</option>${poem.chapters.map((c) => `<option value="${esc(c.id)}">${esc(kicker(R.pid, c.id))}: ${esc(c.title)}</option>`).join('')}</select>`;
    const chapters = poem.chapters.map((c) => {
      const bs = c.bayts.map((b, i) => `<article class="rbayt"><span class="rno">${ar(b.n || i + 1)}</span><div class="rlines"><div class="rs">${esc(b.s)}</div>${b.e ? `<div class="re">${esc(b.e)}</div>` : ''}</div>${en && b.t ? `<div class="rtrans en" lang="en" dir="ltr"><p>${esc(b.t[0])}</p><p>${esc(b.t[1])}</p></div>` : ''}</article>`).join('');
      return `<section id="rch-${esc(c.id)}"><div class="rch"><span class="ch-no">${esc(kicker(R.pid, c.id))}</span><h3>${esc(c.title)}</h3></div>${bs}</section>`;
    }).join('');
    return `<div style="--rs:${size}px"><div class="reader-bar"><button class="icon-btn" data-act="reader-close" aria-label="رجوع">${IC.chev}</button>${jump}
      <button class="icon-btn" data-act="reader-font" data-d="-2" aria-label="تصغير الخط">أ−</button><button class="icon-btn" data-act="reader-font" data-d="2" aria-label="تكبير الخط">أ+</button>
      <button class="icon-btn" data-act="reader-en" aria-pressed="${en}" aria-label="الترجمة">EN</button></div>
      <div class="reader-title"><h2>${esc(poem.fullTitle)}</h2><p>${esc(poem.author)}</p></div>${chapters}
      <p class="about center" style="padding-top:22px">${esc(poem.source || '')}</p></div>`;
  }

  /* ---------- الإعدادات ---------- */
  function vSettings() {
    const st = S.settings();
    const seg = (key, opts, cur) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button data-act="set" data-key="${key}" data-val="${v}" aria-pressed="${String(cur) === String(v)}">${l}</button>`).join('')}</div>`;
    return `<h2 class="page-title">الإعدادات</h2>
      <div class="set"><div class="lbl">عدد الأبيات الجديدة يوميًا</div><div class="desc">يمكنك تغييره أيضًا من شاشة الحفظ الجديد.</div>
        <div class="stepper"><span class="label">الأبيات في اليوم</span><span class="ctl"><button data-act="perday" data-d="-1" aria-label="أنقص" ${st.perDay <= 1 ? 'disabled' : ''}>−</button><output>${ar(st.perDay)}</output><button data-act="perday" data-d="1" aria-label="زِد" ${st.perDay >= 10 ? 'disabled' : ''}>+</button></span></div></div>
      <div class="set"><div class="lbl">نسبة التذكّر المستهدفة</div><div class="desc">الأعلى تعني مراجعات أكثر تقاربًا.</div>${seg('retention', [[0.85, ar('٨٥') + '٪'], [0.9, ar('٩٠') + '٪'], [0.95, ar('٩٥') + '٪']], st.retention)}</div>
      <div class="set"><button class="switch" role="switch" aria-checked="${st.showEn}" data-act="set-en"><span><div class="lbl">إظهار الترجمة الإنجليزية دائمًا</div><div class="desc" style="margin:0">مخفية افتراضيًا، ويمكن إظهارها لكل بيت عند الحاجة.</div></span><i></i></button></div>
      <div class="set"><div class="lbl">النسخ الاحتياطي</div><div class="desc">يُحفظ تقدّمك على هذا الجهاز فقط. صدّر نسخة لنقله أو حفظه.</div>
        <div class="row"><button class="btn quiet small" data-act="export">تصدير التقدّم</button><button class="btn quiet small" data-act="import">استيراد</button></div>
        <input id="imp" type="file" accept="application/json,.json" hidden></div>
      <div class="set"><button class="btn danger small" data-act="reset-ask">مسح كل التقدّم</button></div>
      <p class="about">أبيات، الإصدار ١. المراجعة المتباعدة بخوارزمية FSRS، بطاقة واحدة لكل فصل.<br>الخطوط: الأميري وIBM Plex Sans Arabic (رخصة OFL).</p>`;
  }

  /* ---------- الرسم ---------- */
  const FLUSH = () => (ui.tab === 'learn' && ui.learn.stage !== 'home' && ui.learn.stage !== 'done' && S.state.activePoem && POEMS.get(S.state.activePoem) && !!learnCursor())
    || (ui.tab === 'near' && ui.near.stage === 'pager') || (ui.tab === 'far' && ui.far.stage === 'review');

  function render(opts) {
    opts = opts || {};
    const prev = view.scrollTop;
    $$('#tabs button').forEach((b) => { if (b.dataset.tab === ui.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    const html = { learn: vLearn, near: vNear, far: vFar, lib: vLib, settings: vSettings }[ui.tab]();
    view.classList.toggle('flush', FLUSH());
    view.innerHTML = html;
    view.scrollTop = opts.keep ? prev : 0;
    updateChrome();
    afterRender();
    if (ui.tab === 'lib' && ui.lib.reader && ui.lib.reader.cid && !opts.keep) {
      const el = $('#rch-' + ui.lib.reader.cid); if (el) view.scrollTop = el.offsetTop - 56;
      ui.lib.reader.cid = null;
    }
  }
  function updateChrome() {
    const pid = S.state.activePoem, chip = $('#poem-chip'), p = pid && POEMS.get(pid);
    chip.hidden = !p; if (p) chip.textContent = p.title;
    const near = S.pendingNear(), far = S.dueOld().length;
    [['near', near], ['far', far]].forEach(([tab, n]) => { const b = $(`#tabs [data-tab="${tab}"] .badge`); b.hidden = !n; b.textContent = ar(n); });
  }
  const fitAll = () => $$('.fit-box', view).forEach((b) => U.fitText(b, { min: +b.dataset.min || 12, max: +b.dataset.max || 48 }));
  function afterRender() {
    requestAnimationFrame(fitAll);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(fitAll));
  }

  /* ---------- الأحداث ---------- */
  function go(tab) { ui.tab = tab; closeSheet(); render(); }
  async function openPoem(pid) { await loadPoem(pid); ui.lib.poem = pid; render(); }

  function act(name, el) {
    const d = el.dataset, L = ui.learn, N = ui.near, Q = ui.far;
    switch (name) {
      case 'goto': return go(d.to);
      case 'sheet-close': return closeSheet();
      case 'perday': { const v = Math.min(10, Math.max(1, S.settings().perDay + Number(d.d))); S.setSetting('perDay', v); return render({ keep: true }); }
      /* الحفظ الجديد */
      case 'learn-start': case 'learn-more': {
        const rem = Math.max(0, S.settings().perDay - S.todayNewDone());
        Object.assign(L, { stage: 'learn', target: name === 'learn-more' ? 1 : Math.max(1, rem), done: 0, hint: false, en: false, completed: [] });
        return render();
      }
      case 'learn-home': L.stage = 'home'; return render();
      case 'learn-hide': L.stage = 'recite'; L.hint = false; return render();
      case 'learn-hint': L.hint = !L.hint; return render({ keep: true });
      case 'learn-reveal': L.stage = 'check'; return render();
      case 'learn-unknown': L.stage = 'learn'; return render();
      case 'toggle-en': L.en = !L.en; return render({ keep: true });
      case 'learn-known': {
        const cur = learnCursor(); if (!cur) { L.stage = 'done'; return render(); }
        const r = S.markLearned(cur.pid, cur.chap.id);
        L.done += 1; L.hint = false; if (r.completed) L.completed.push(cur.chap.id);
        L.stage = (L.done >= L.target || !learnCursor()) ? 'done' : 'learn';
        return render();
      }
      /* المراجعة القريبة */
      case 'near-open': Object.assign(N, { stage: 'pager', pid: d.pid, cid: d.cid, page: 0, shown: null, result: null }); return render();
      case 'near-prev': N.page -= 1; N.shown = null; return render();
      case 'near-next': N.page += 1; N.shown = null; return render();
      case 'near-finish': N.result = S.finishNewReview(N.pid, N.cid); N.stage = 'result'; return render();
      case 'near-list': N.stage = 'list'; return render();
      /* المراجعة البعيدة */
      case 'far-open': startFar(d.pid, d.cid); return render();
      case 'q-toggle': { const k = Number(d.i); if (Q.missed[k]) delete Q.missed[k]; else Q.missed[k] = true; return render({ keep: true }); }
      case 'q-prev': Q.page = Math.max(0, Q.page - 1); Q.shown = 0; return render();
      case 'q-next': Q.page += 1; Q.shown = 0; return render();
      case 'reveal-plus': case 'reveal-minus': {
        const cur = ui.tab === 'near' ? N : Q, chap = chapterOf(cur.pid, cur.cid);
        let total = chap.bayts.length;
        if (ui.tab === 'near') { const st = S.chapter(cur.pid, cur.cid); if (st.status === 'learning') total = st.learned; }
        const n = Math.min(5, total - cur.page * 5), now = cur.shown == null ? n : cur.shown;
        cur.shown = Math.min(n, Math.max(0, now + (name === 'reveal-plus' ? 1 : -1)));
        return render({ keep: true });
      }
      case 'q-finish': Q.stage = 'rate'; return render();
      case 'far-rate': { const card = S.applyOldReview(Q.pid, Q.cid, Number(d.g)); Q.rated = U.diffDays(U.today(), card.due); Q.stage = 'done'; return render(); }
      case 'far-list': Q.stage = 'list'; return render();
      /* المكتب */
      case 'lib-section': ui.lib.section = d.id; return render();
      case 'lib-open': return openPoem(d.pid);
      case 'lib-back': ui.lib.poem = null; return render();
      case 'lib-active': S.setActive(ui.lib.poem); L.stage = 'home'; toast('صارت قيد الحفظ'); return render();
      case 'lib-read': ui.lib.reader = { pid: ui.lib.poem, cid: d.cid || null, en: S.settings().showEn }; return render();
      case 'lib-ch': return openChapterSheet(d.cid);
      case 'ch-read': closeSheet(); ui.lib.reader = { pid: ui.lib.poem, cid: d.cid, en: S.settings().showEn }; return render();
      case 'ch-current': S.setCurrent(ui.lib.poem, d.cid); L.stage = 'home'; closeSheet(); toast('سيبدأ الحفظ من هذا الفصل'); return render();
      case 'ch-mark': return openMarkSheet(d.cid);
      case 'ch-mark-rate': S.markMemorized(ui.lib.poem, d.cid, Number(d.g)); closeSheet(); L.stage = 'home'; toast('أُضيف الفصل إلى المراجعة البعيدة'); return render();
      case 'ch-reset': return confirmSheet('إعادة الحفظ من البداية؟', 'سيُمسح تقدّم هذا الفصل وجدول مراجعته.', 'نعم، أعد الحفظ', 'ch-reset-yes', { cid: d.cid }, true);
      case 'ch-reset-yes': S.resetChapter(ui.lib.poem, d.cid); closeSheet(); L.stage = 'home'; toast('أُعيد ضبط الفصل'); return render();
      case 'reader-close': ui.lib.reader = null; return render();
      case 'reader-font': S.setSetting('readerSize', Math.min(44, Math.max(18, S.settings().readerSize + Number(d.d)))); return render({ keep: true });
      case 'reader-en': ui.lib.reader.en = !ui.lib.reader.en; return render({ keep: true });
      /* الإعدادات */
      case 'set': S.setSetting(d.key, isNaN(Number(d.val)) ? d.val : Number(d.val)); return render({ keep: true });
      case 'set-en': S.setSetting('showEn', !S.settings().showEn); return render({ keep: true });
      case 'export': return exportData();
      case 'import': return $('#imp').click();
      case 'reset-ask': return confirmSheet('مسح كل التقدّم؟', 'سيُحذف تقدّم الحفظ والمراجعة من هذا الجهاز ولا يمكن التراجع. صدّر نسخة احتياطية أولًا إن أردت.', 'نعم، امسح كل شيء', 'reset-yes', {}, true);
      case 'reset-yes': S.resetAll(); closeSheet(); Object.assign(ui.learn, { stage: 'home' }); Object.assign(ui.near, { stage: 'list' }); Object.assign(ui.far, { stage: 'list' }); ui.lib.poem = null; toast('مُسح التقدّم'); return render();
      case 'import-yes': try { S.importJSON(ui.pendingImport); ui.pendingImport = null; closeSheet(); toast('تم استيراد التقدّم'); return bootPoems().then(() => render()); } catch (e) { closeSheet(); return toast('تعذّر الاستيراد: الملف غير صالح'); }
      default: return undefined;
    }
  }

  async function exportData() {
    const text = S.exportJSON(), name = 'abyaat-backup-' + U.today() + '.json';
    const file = new File([text], name, { type: 'application/json' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'نسخة أبيات الاحتياطية' }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('حُفظت النسخة الاحتياطية');
  }

  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) return go(tab.dataset.tab);
    const peek = e.target.closest('[data-peek]');
    if (peek) { peek.classList.toggle('peek'); return; }
    const a = e.target.closest('[data-act]');
    if (a) act(a.dataset.act, a);
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'jump' && e.target.value) {
      const el = $('#rch-' + e.target.value); if (el) view.scrollTop = el.offsetTop - 56; e.target.value = '';
    }
    if (e.target.id === 'imp' && e.target.files[0]) {
      const f = e.target.files[0], rd = new FileReader();
      rd.onload = () => { ui.pendingImport = String(rd.result); confirmSheet('استيراد التقدّم؟', 'سيحلّ هذا الملف محلّ تقدّمك الحالي على هذا الجهاز.', 'نعم، استورد', 'import-yes', {}, true); };
      rd.readAsText(f); e.target.value = '';
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return closeSheet();
    const el = e.target.closest && e.target.closest('[role="button"][data-act]');
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); act(el.dataset.act, el); }
  });
  window.addEventListener('resize', fitAll);
  if (window.ResizeObserver) new ResizeObserver(fitAll).observe(view);

  /* ---------- الإقلاع ---------- */
  async function bootPoems() {
    const need = new Set(Object.keys(S.state.poems).concat(S.state.activePoem || []));
    await Promise.all(Array.from(need).map((id) => loadPoem(id).catch(() => null)));
  }
  async function boot() {
    try {
      LIB = await (await fetch('data/library.json')).json();
      await bootPoems();
      render();
    } catch (err) {
      view.innerHTML = emptyState('تعذّر تحميل المكتبة', 'تأكّد من الاتصال ثم أعد فتح التطبيق.');
    }
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  window.Abyaat = { ui, S, U, F, render, POEMS, loadPoem, go };
  boot();
})();
