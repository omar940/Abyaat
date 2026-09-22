/* الحالة والتخزين المحلي: تقدّم الحفظ، المراجعة القريبة، والمراجعة البعيدة (FSRS) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./util.js'), require('./fsrs.js'));
  else root.AbyaatStore = factory(root.AbyaatUtil, root.AbyaatFSRS);
})(typeof self !== 'undefined' ? self : this, function (U, F) {
  const KEY = 'abyaat:v1';
  const CONSOLIDATION_DAYS = 5;   // أيام التثبيت الفعلية بعد إتمام كل جزء
  const SEG_MAX = 12;             // أقصى عدد أبيات في الجزء الواحد قبل أن تنتقل بطاقته إلى المراجعة البعيدة
  const memory = {};              // احتياط إن تعذّر localStorage
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return memory[k] || null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { memory[k] = v; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { delete memory[k]; } },
  };

  const fresh = () => ({
    v: 1,
    settings: { perDay: 1, reviewMode: 'all', retention: 0.9, showEn: false, readerSize: 26, migrated: 2, theme: 'light', lang: 'ar' },
    activePoem: null,
    poems: {},
    day: { date: '', newDone: 0 },
  });

  function normalize(s) {
    const f = fresh();
    if (!s || typeof s !== 'object' || typeof s.poems !== 'object') return f;
    const st = Object.assign(f.settings, s.settings || {});
    delete st.quizCount;
    return {
      v: 1,
      settings: st,
      activePoem: s.activePoem || null,
      poems: s.poems || {},
      day: s.day && s.day.date ? s.day : f.day,
    };
  }

  let state = (function () {
    try { const raw = ls.get(KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { /* ignore */ }
    return fresh();
  })();
  const save = () => ls.set(KEY, JSON.stringify(state));
  const metas = {};

  /* تقسيم الفصل إلى أجزاء بحجم متقارب، كل جزء ≤ SEG_MAX بيتًا، لتبقى المراجعة القريبة خفيفة.
     الفصول القصيرة (≤ SEG_MAX) تبقى جزءًا واحدًا كما كانت. */
  function evenSizes(len, k) {
    const base = Math.floor(len / k), rem = len % k;
    return Array.from({ length: k }, (_, i) => base + (i < rem ? 1 : 0));
  }
  function splitSegments(len) {
    if (len <= SEG_MAX) return [{ start: 0, len }];
    const k = Math.ceil(len / SEG_MAX);
    const segs = []; let start = 0;
    evenSizes(len, k).forEach((n) => { segs.push({ start, len: n }); start += n; });
    return segs;
  }

  /* تحويل فصل محفوظ بالنسخة القديمة (بطاقة واحدة لكل فصل بأكمله) إلى الصيغة الجديدة القائمة على الأجزاء،
     دون فقدان جدول مراجعته: يُعامَل الفصل كجزء واحد يغطّيه كاملًا، ولا يُقسَّم كما تُقسَّم الفصول الجديدة. */
  function migrateLegacyChapter(s) {
    if (s.status === 'consolidating' || s.status === 'review') {
      const rec = { status: s.status === 'review' ? 'review' : 'consolidating', daysDone: s.daysDone || 0 };
      if (s.card) rec.card = s.card;
      if (s.completedOn) rec.completedOn = s.completedOn;
      if (s.lastReviewOn) rec.lastReviewOn = s.lastReviewOn;
      s.segs = { 0: rec }; s.status = 'done';
    } else if (s.status === 'learning' && s.learned > 0) {
      s.segs = { 0: { status: 'learning' } };
    }
    delete s.card; delete s.daysDone; delete s.completedOn; delete s.lastReviewOn;
  }
  function registerPoem(p) {
    metas[p.id] = {
      id: p.id, title: p.title, titleEn: p.titleEn, fullTitle: p.fullTitle, fullTitleEn: p.fullTitleEn,
      chapters: p.chapters.map((c) => {
        const len = c.bayts.length, existing = state.poems[p.id] && state.poems[p.id].chapters[c.id];
        const legacy = existing && !existing.segs && (existing.learned > 0 || existing.card || existing.daysDone || existing.completedOn);
        if (legacy) { migrateLegacyChapter(existing); save(); }
        return { id: c.id, title: c.title, titleEn: c.titleEn, optional: !!c.optional, len, segs: legacy ? [{ start: 0, len }] : splitSegments(len) };
      }),
    };
  }
  const meta = (pid) => metas[pid];
  const chapterMeta = (pid, cid) => metas[pid] && metas[pid].chapters.find((c) => c.id === cid);

  function rollDay() {
    const t = U.today();
    if (state.day.date !== t) { state.day = { date: t, newDone: 0 }; save(); }
  }
  const todayNewDone = () => { rollDay(); return state.day.newDone; };

  const ps = (pid) => state.poems[pid] || (state.poems[pid] = { current: null, chapters: {} });
  const chapter = (pid, cid) => { const p = ps(pid); return p.chapters[cid] || (p.chapters[cid] = { learned: 0, status: 'new' }); };
  const segRec = (pid, cid, segIdx) => { const s = chapter(pid, cid); return s.segs && s.segs[segIdx]; };
  const retention = () => state.settings.retention || 0.9;

  /* ---- الحفظ الجديد ---- */
  function currentChapter(pid) {
    const m = metas[pid]; if (!m) return null;
    const p = ps(pid);
    const open = (c) => { const s = chapter(pid, c.id).status; return s === 'new' || s === 'learning'; };
    if (p.current) { const c = m.chapters.find((x) => x.id === p.current); if (c && open(c)) return c; }
    return m.chapters.find((c) => !c.optional && open(c)) || null;
  }

  function markLearned(pid, cid) {
    rollDay();
    const c = chapterMeta(pid, cid), s = chapter(pid, cid);
    if (!c || (s.status !== 'new' && s.status !== 'learning') || s.learned >= c.len) return { completed: false };
    s.learned += 1; s.status = 'learning'; state.day.newDone += 1;
    const segIdx = c.segs.findIndex((sg) => s.learned > sg.start && s.learned <= sg.start + sg.len);
    let segCompleted = false;
    if (segIdx >= 0) {
      const sg = c.segs[segIdx];
      if (!s.segs) s.segs = {};
      const rec = s.segs[segIdx] || (s.segs[segIdx] = { status: 'learning' });
      if (s.learned >= sg.start + sg.len) { rec.status = 'consolidating'; rec.completedOn = U.today(); rec.daysDone = 0; segCompleted = true; }
    }
    let completed = false;
    if (s.learned >= c.len) {
      s.status = 'done'; completed = true;
      if (ps(pid).current === cid) ps(pid).current = null;
    }
    save();
    return { completed, segCompleted: segCompleted && !completed, segIdx, segCount: c.segs.length };
  }

  function setActive(pid) { state.activePoem = pid; ps(pid); save(); }
  function setCurrent(pid, cid) {
    const s = chapter(pid, cid);
    if (s.status !== 'new' && s.status !== 'learning') return false;
    ps(pid).current = cid; state.activePoem = pid; save(); return true;
  }

  /* ---- المراجعة القريبة: صفّ لكل جزء لا يزال يُحفَظ أو قيد التثبيت ---- */
  function newReviewList() {
    const out = [], t = U.today();
    const pids = Object.keys(state.poems).sort((a, b) => (a === state.activePoem ? -1 : b === state.activePoem ? 1 : 0));
    pids.forEach((pid) => {
      const m = metas[pid]; if (!m) return;
      m.chapters.forEach((c) => {
        const s = state.poems[pid].chapters[c.id];
        if (!s || !s.segs) return;
        c.segs.forEach((sg, i) => {
          const rec = s.segs[i];
          if (!rec || (rec.status !== 'learning' && rec.status !== 'consolidating')) return;
          const learned = rec.status === 'consolidating' ? sg.len : Math.max(0, Math.min(sg.len, s.learned - sg.start));
          out.push({
            pid, cid: c.id, segIdx: i, segCount: c.segs.length, title: c.title, optional: c.optional, poemTitle: m.title,
            learned, len: sg.len, segStart: sg.start,
            status: rec.status, daysDone: rec.daysDone || 0, done: rec.lastReviewOn === t,
          });
        });
      });
    });
    return out;
  }
  const pendingNear = () => newReviewList().filter((x) => !x.done).length;

  function finishNewReview(pid, cid, segIdx) {
    const rec = segRec(pid, cid, segIdx), t = U.today();
    if (!rec) return { graduated: false, daysDone: 0, status: 'learning', card: null };
    let graduated = false;
    if (rec.lastReviewOn !== t) {
      rec.lastReviewOn = t;
      if (rec.status === 'consolidating' && rec.completedOn && rec.completedOn < t) {
        rec.daysDone = (rec.daysDone || 0) + 1;
        if (rec.daysDone >= CONSOLIDATION_DAYS) {
          rec.status = 'review'; rec.card = F.review(null, 3, t, retention()); graduated = true;
        }
      }
    }
    save();
    return { graduated, daysDone: rec.daysDone || 0, status: rec.status, card: rec.card || null };
  }

  /* ---- المراجعة البعيدة: بطاقة FSRS لكل جزء ---- */
  function oldReviewList() {
    const out = [], t = U.today();
    Object.keys(state.poems).forEach((pid) => {
      const m = metas[pid]; if (!m) return;
      m.chapters.forEach((c) => {
        const s = state.poems[pid].chapters[c.id];
        if (!s || !s.segs) return;
        c.segs.forEach((sg, i) => {
          const rec = s.segs[i];
          if (rec && rec.status === 'review' && rec.card) {
            out.push({
              pid, cid: c.id, segIdx: i, segCount: c.segs.length, title: c.title, poemTitle: m.title,
              len: sg.len, segStart: sg.start, due: rec.card.due,
              dueIn: U.diffDays(t, rec.card.due), interval: rec.card.interval || 0, isDue: rec.card.due <= t,
            });
          }
        });
      });
    });
    out.sort((a, b) => a.due.localeCompare(b.due));
    return out;
  }
  const dueOld = () => oldReviewList().filter((x) => x.isDue);
  const previewOld = (pid, cid, segIdx) => F.options((segRec(pid, cid, segIdx) || {}).card, U.today(), retention());
  function applyOldReview(pid, cid, segIdx, g) {
    const rec = segRec(pid, cid, segIdx);
    rec.card = F.review(rec.card, g, U.today(), retention()); rec.lastReviewOn = U.today(); save();
    return rec.card;
  }

  /* ---- تم حفظ الفصل: كل أجزائه تدخل المراجعة البعيدة دفعة واحدة ---- */
  const previewMark = () => F.options(null, U.today(), retention());
  function markMemorized(pid, cid, g) {
    const c = chapterMeta(pid, cid), s = chapter(pid, cid), t = U.today();
    s.learned = c.len; s.status = 'done'; s.segs = {};
    c.segs.forEach((sg, i) => { s.segs[i] = { status: 'review', completedOn: t, daysDone: CONSOLIDATION_DAYS, card: F.review(null, g, t, retention()) }; });
    if (ps(pid).current === cid) ps(pid).current = null;
    save(); return s.segs;
  }
  function resetChapter(pid, cid) { delete ps(pid).chapters[cid]; save(); }

  /* ---- تقدّم القصيدة (الفصول الأساسية فقط) ---- */
  function poemProgress(pid) {
    const m = metas[pid]; if (!m) return { done: 0, total: 0, pct: 0 };
    let done = 0, total = 0;
    m.chapters.forEach((c) => {
      if (c.optional) return;
      total += c.len;
      const s = state.poems[pid] && state.poems[pid].chapters[c.id];
      if (s) done += (s.status === 'done') ? c.len : (s.learned || 0);
    });
    return { done, total, pct: total ? Math.round(done * 100 / total) : 0 };
  }

  /* ---- الإعدادات والنسخ الاحتياطي ---- */
  const settings = () => state.settings;
  function setSetting(k, v) { state.settings[k] = v; save(); }
  const exportJSON = () => JSON.stringify(Object.assign({ app: 'abyaat', exportedAt: new Date().toISOString() }, state), null, 1);
  function importJSON(text) {
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== 'object' || typeof obj.poems !== 'object' || !obj.settings) throw new Error('bad');
    state = normalize(obj); save();
  }
  function resetAll() { state = fresh(); ls.del(KEY); }

  return {
    get state() { return state; }, KEY, CONSOLIDATION_DAYS, SEG_MAX, registerPoem, meta, chapterMeta, chapter,
    todayNewDone, currentChapter, markLearned, setActive, setCurrent,
    newReviewList, pendingNear, finishNewReview, oldReviewList, dueOld, previewOld, applyOldReview,
    previewMark, markMemorized, resetChapter, poemProgress, settings, setSetting, exportJSON, importJSON, resetAll,
  };
});
