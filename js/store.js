/* الحالة والتخزين المحلي: تقدّم الحفظ، المراجعة القريبة، والمراجعة البعيدة (FSRS) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./util.js'), require('./fsrs.js'));
  else root.AbyaatStore = factory(root.AbyaatUtil, root.AbyaatFSRS);
})(typeof self !== 'undefined' ? self : this, function (U, F) {
  const KEY = 'abyaat:v1';
  const CONSOLIDATION_DAYS = 5;   // أيام التثبيت الفعلية بعد إتمام الفصل
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

  function registerPoem(p) {
    metas[p.id] = {
      id: p.id, title: p.title, titleEn: p.titleEn, fullTitle: p.fullTitle, fullTitleEn: p.fullTitleEn,
      chapters: p.chapters.map((c) => ({ id: c.id, title: c.title, titleEn: c.titleEn, optional: !!c.optional, len: c.bayts.length })),
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
    let completed = false;
    if (s.learned >= c.len) {
      s.status = 'consolidating'; s.completedOn = U.today(); s.daysDone = 0; completed = true;
      if (ps(pid).current === cid) ps(pid).current = null;
    }
    save();
    return { completed };
  }

  function setActive(pid) { state.activePoem = pid; ps(pid); save(); }
  function setCurrent(pid, cid) {
    const s = chapter(pid, cid);
    if (s.status !== 'new' && s.status !== 'learning') return false;
    ps(pid).current = cid; state.activePoem = pid; save(); return true;
  }

  /* ---- المراجعة القريبة ---- */
  function newReviewList() {
    const out = [], t = U.today();
    const pids = Object.keys(state.poems).sort((a, b) => (a === state.activePoem ? -1 : b === state.activePoem ? 1 : 0));
    pids.forEach((pid) => {
      const m = metas[pid]; if (!m) return;
      m.chapters.forEach((c) => {
        const s = state.poems[pid].chapters[c.id];
        if (!s) return;
        if ((s.status === 'learning' && s.learned > 0) || s.status === 'consolidating') {
          out.push({ pid, cid: c.id, title: c.title, optional: c.optional, poemTitle: m.title, learned: s.learned, len: c.len,
            status: s.status, daysDone: s.daysDone || 0, done: s.lastReviewOn === t });
        }
      });
    });
    return out;
  }
  const pendingNear = () => newReviewList().filter((x) => !x.done).length;

  function finishNewReview(pid, cid) {
    const s = chapter(pid, cid), t = U.today();
    let graduated = false;
    if (s.lastReviewOn !== t) {
      s.lastReviewOn = t;
      if (s.status === 'consolidating' && s.completedOn && s.completedOn < t) {
        s.daysDone = (s.daysDone || 0) + 1;
        if (s.daysDone >= CONSOLIDATION_DAYS) {
          s.status = 'review'; s.card = F.review(null, 3, t, retention()); graduated = true;
        }
      }
    }
    save();
    return { graduated, daysDone: s.daysDone || 0, status: s.status, card: s.card || null };
  }

  /* ---- المراجعة البعيدة ---- */
  function oldReviewList() {
    const out = [], t = U.today();
    Object.keys(state.poems).forEach((pid) => {
      const m = metas[pid]; if (!m) return;
      m.chapters.forEach((c) => {
        const s = state.poems[pid].chapters[c.id];
        if (s && s.status === 'review' && s.card) {
          out.push({ pid, cid: c.id, title: c.title, poemTitle: m.title, len: c.len, due: s.card.due,
            dueIn: U.diffDays(t, s.card.due), interval: s.card.interval || 0, isDue: s.card.due <= t });
        }
      });
    });
    out.sort((a, b) => a.due.localeCompare(b.due));
    return out;
  }
  const dueOld = () => oldReviewList().filter((x) => x.isDue);
  const previewOld = (pid, cid) => F.options(chapter(pid, cid).card, U.today(), retention());
  function applyOldReview(pid, cid, g) {
    const s = chapter(pid, cid);
    s.card = F.review(s.card, g, U.today(), retention()); s.lastReviewOn = U.today(); save();
    return s.card;
  }

  /* ---- تم حفظ الفصل ---- */
  const previewMark = () => F.options(null, U.today(), retention());
  function markMemorized(pid, cid, g) {
    const c = chapterMeta(pid, cid), s = chapter(pid, cid);
    s.learned = c.len; s.status = 'review'; s.completedOn = s.completedOn || U.today(); s.daysDone = CONSOLIDATION_DAYS;
    s.card = F.review(null, g, U.today(), retention());
    if (ps(pid).current === cid) ps(pid).current = null;
    save(); return s.card;
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
      if (s) done += (s.status === 'review' || s.status === 'consolidating') ? c.len : (s.learned || 0);
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
    get state() { return state; }, KEY, CONSOLIDATION_DAYS, registerPoem, meta, chapterMeta, chapter,
    todayNewDone, currentChapter, markLearned, setActive, setCurrent,
    newReviewList, pendingNear, finishNewReview, oldReviewList, dueOld, previewOld, applyOldReview,
    previewMark, markMemorized, resetChapter, poemProgress, settings, setSetting, exportJSON, importJSON, resetAll,
  };
});
