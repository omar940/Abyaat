/* أدوات مساعدة: تواريخ، أرقام عربية، نصوص، وملاءمة الخط للشاشة */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AbyaatUtil = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const DIG = '٠١٢٣٤٥٦٧٨٩';
  let lang = 'ar';                                   // لغة الواجهة: ar | en
  const setLang = (l) => { lang = l === 'en' ? 'en' : 'ar'; };
  const getLang = () => lang;
  const ar = (n) => lang === 'ar' ? String(n).replace(/\d/g, (d) => DIG[+d]) : String(n);

  let nowFn = () => new Date();
  const setNow = (fn) => { nowFn = fn; };
  const pad = (n) => String(n).padStart(2, '0');
  const toDay = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => toDay(nowFn());
  const dayNum = (s) => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
  const diffDays = (a, b) => dayNum(b) - dayNum(a);
  const addDays = (s, n) => {
    const t = new Date((dayNum(s) + n) * 86400000);
    return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate());
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  const baytCount = (n) => lang === 'en' ? `${n} verse${n === 1 ? '' : 's'}`
    : n === 1 ? 'بيت واحد' : n === 2 ? 'بيتين' : (n >= 3 && n <= 10) ? ar(n) + ' أبيات' : ar(n) + ' بيتًا';
  const dayCount = (n) => lang === 'en' ? `${n} day${n === 1 ? '' : 's'}`
    : n === 1 ? 'يوم واحد' : n === 2 ? 'يومان' : (n >= 3 && n <= 10) ? ar(n) + ' أيام' : ar(n) + ' يومًا';
  const inDays = (n, cp) => {
    if (lang === 'en') { const x = n <= 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days'; return cp ? cap(x) : x; }
    return n <= 0 ? 'اليوم' : n === 1 ? 'غدًا' : n === 2 ? 'بعد يومين' : n <= 10 ? 'بعد ' + ar(n) + ' أيام' : 'بعد ' + ar(n) + ' يومًا';
  };

  /* اختيار أبيات الاختبار موزّعة على الفصل كله */
  function sampleIndices(len, k, rnd) {
    rnd = rnd || Math.random;
    if (!k || k >= len) return Array.from({ length: len }, (_, i) => i);
    const out = [];
    for (let j = 0; j < k; j++) {
      const a = Math.floor(j * len / k), b = Math.max(a, Math.floor((j + 1) * len / k) - 1);
      out.push(a + Math.floor(rnd() * (b - a + 1)));
    }
    return out;
  }

  /* ملاءمة الخط: أكبر حجم يتّسع له المحتوى داخل الصندوق */
  function fitText(box, opts) {
    opts = opts || {};
    const content = box.querySelector('.fit-content');
    if (!content) return;
    const cs = getComputedStyle(box);
    const availW = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const availH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (availW <= 0 || availH <= 0) return;
    let lo = opts.min || 12, hi = opts.max || 48, best = lo;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      box.style.setProperty('--fs', mid + 'px');
      const ok = content.scrollWidth <= availW + 1 && content.offsetHeight <= availH + 1;
      if (ok) { best = mid; lo = mid; } else hi = mid;
    }
    box.style.setProperty('--fs', best + 'px');
  }

  return { ar, setLang, getLang, setNow, today, toDay, dayNum, diffDays, addDays, esc, baytCount, dayCount, inDays, sampleIndices, fitText };
});
