/* خوارزمية FSRS-5 بالمعاملات الافتراضية — بطاقة واحدة لكل فصل.
   الأحداث تُحسب بالأيام الكاملة (لا خطوات تعلّم داخل اليوم). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./util.js'));
  else root.AbyaatFSRS = factory(root.AbyaatUtil);
})(typeof self !== 'undefined' ? self : this, function (U) {
  const W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
    0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
  const DECAY = -0.5, FACTOR = 19 / 81, MAX_INTERVAL = 365;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  const retrievability = (t, s) => Math.pow(1 + FACTOR * t / s, DECAY);
  const rawInterval = (s, r) => s / FACTOR * (Math.pow(r, 1 / DECAY) - 1);
  const d0 = (g) => clamp(W[4] - Math.exp(W[5] * (g - 1)) + 1, 1, 10);
  const s0 = (g) => Math.max(W[g - 1], 0.1);
  const nextD = (d, g) => {
    const dp = d + (-W[6] * (g - 3)) * (10 - d) / 9;
    return clamp(W[7] * d0(4) + (1 - W[7]) * dp, 1, 10);
  };
  const sRecall = (d, s, r, g) => s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) *
    (Math.exp(W[10] * (1 - r)) - 1) * (g === 2 ? W[15] : 1) * (g === 4 ? W[16] : 1));
  const sForget = (d, s, r) => Math.min(W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)), s);
  const sShort = (s, g) => s * Math.exp(W[17] * (g - 3 + W[18]));

  /* بطاقة جديدة = null. تُرجع الحالة الجديدة دون الاستحقاق */
  function step(card, g, day) {
    if (!card || !card.reps) return { s: s0(g), d: d0(g), reps: 1, lapses: 0, last: day };
    const t = Math.max(0, U.diffDays(card.last, day));
    let s = card.s, d = card.d, lapses = card.lapses || 0;
    const r = retrievability(t, s);
    if (t < 1) s = sShort(s, g);
    else if (g === 1) { s = sForget(d, s, r); lapses += 1; }
    else s = sRecall(d, s, r, g);
    d = nextD(d, g);
    return { s: Math.max(s, 0.01), d, reps: card.reps + 1, lapses, last: day };
  }

  /* الخيارات الأربعة (1 نسيتُ، 2 بصعوبة، 3 تذكّرتُ، 4 بسهولة) مع فترات متدرّجة */
  function options(card, day, retention, maxInterval) {
    retention = retention || 0.9; maxInterval = maxInterval || MAX_INTERVAL;
    const st = [null, 1, 2, 3, 4].map((g) => g ? step(card, g, day) : null);
    const iv = [null, 1, 2, 3, 4].map((g) => g ? clamp(Math.round(rawInterval(st[g].s, retention)), 1, maxInterval) : null);
    iv[2] = Math.min(iv[2], iv[3]);
    iv[1] = Math.min(iv[1], iv[2]);
    iv[3] = Math.max(iv[3], Math.min(iv[2] + 1, maxInterval));
    iv[4] = Math.max(iv[4], Math.min(iv[3] + 1, maxInterval));
    const out = {};
    for (let g = 1; g <= 4; g++) out[g] = { interval: iv[g], card: Object.assign({}, st[g], { due: U.addDays(day, iv[g]), interval: iv[g] }) };
    return out;
  }

  const review = (card, g, day, retention, maxInterval) => options(card, day, retention, maxInterval)[g].card;

  return { W, retrievability, rawInterval, options, review, MAX_INTERVAL };
});
