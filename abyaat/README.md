# أبيات — Abyaat

A progressive web app for memorizing Arabic poems (qasaid) and texts (mutoon), with spaced repetition.
The whole interface is in Arabic (right-to-left). First poem included: **Qasidat al-Burdah** (160 bayts, 10 chapters, plus optional opening and closing bayts).

- **الحفظ الجديد (New memorization):** one bayt at a time, in large text that fits the screen. Flow: read → hide → recite from memory → reveal and check → "حفظته" or "لم أحفظه بعد". Choose how many bayts per day (1–10).
- **المراجعة القريبة (New review):** every day, everything you have memorized so far in the current chapter, 5 bayts per page (all shown at first; the **−** and **+** buttons hide the last bayt or reveal the next one, so you can recite before checking). Continues for **5 days of actual use** after the chapter is completed (a day counts only when you finish that day's review), then the chapter graduates to old review.
- **المراجعة البعيدة (Old review):** one **FSRS-5** card per chapter (default parameters, 90% target retention). The tab lists the chapters due today. Open one and go through the whole chapter, 5 bayts per page. Each page starts hidden: recite, then press **+** to reveal the next bayt (**−** hides the last one again), and tap any bayt that gives you trouble to highlight it. At the end you choose when to review the chapter next from four options, each showing its date (they map to نسيتُ · بصعوبة · تذكّرتُ · بسهولة, and the app shades a suggestion based on how many bayts you highlighted).
- **المكتب (Library):** sections قصائد and متون. Open a poem to read it in full (font size, chapter jump, optional English translation), start memorizing from any chapter, or mark a chapter as memorized (**تم حفظ الفصل**): you rate how well you know it and it goes straight into old review.
- **Offline:** installable; works without a connection. Progress is stored on the device (localStorage). Use الإعدادات ← تصدير التقدّم to back up or move it.

The English translation is hidden by default (toggle per bayt while memorizing, in the reader, or always via settings).

## Deploy on GitHub Pages

1. Create a repository (for example `abyaat`) and upload the **contents** of this folder to the repository root (so `index.html` is at the top level). Keep the `.nojekyll` file.
2. In the repository: **Settings ← Pages ← Build and deployment**: Source **Deploy from a branch**, branch `main`, folder `/ (root)`. Save.
3. After a minute the site is live at `https://<your-user>.github.io/abyaat/`.
4. On the phone: open the link in Safari (iPhone) or Chrome (Android) and choose **Add to Home Screen**.

All paths are relative, so it works under a repository sub-path. Netlify, Cloudflare Pages or any static host also work (no build step).

**Releasing an update:** edit files, then change `VERSION` in `sw.js` (for example `abyaat-v2`) so installed copies refresh. Progress data is not affected.

## Run locally

```
cd abyaat
python3 -m http.server 8000
# open http://localhost:8000
```
(Opening `index.html` directly from disk will not load the poem files or the service worker; use a local server.)

## Add a poem

1. Create `data/poems/<id>.json`:

```json
{
  "id": "example",
  "title": "اسم قصير",
  "fullTitle": "الاسم الكامل",
  "author": "المؤلف",
  "section": "qasaid",
  "source": "المصدر (اختياري)",
  "chapters": [
    { "id": "c1", "title": "عنوان الفصل",
      "bayts": [
        { "id": "1", "n": 1, "s": "الشطر الأول", "e": "الشطر الثاني", "t": ["English, first half", "English, second half"] }
      ] }
  ]
}
```

- `section` is `qasaid` or `mutoon`. Add `"optional": true` to a chapter that should be skipped by default (like the Burdah's opening and closing).
- `id` values must be unique within the poem and must **never change** after users start memorizing (progress is keyed by them). `n` is the displayed bayt number (omit it for unnumbered bayts). `t` is optional.
- For متون (prose or verse texts), use one "bayt" per unit and put the whole unit in `s` (leave `e` as an empty string if there is no second half).

2. Register it in `data/library.json` (add an entry to `poems`, with `file`, `section`, `title`, `fullTitle`, `author`, `baytCount`, `chapterCount`).
3. Bump `VERSION` in `sw.js` and push.

## Notes on the Burdah text

- Arabic text is in standard spelling with full tashkeel, transcribed from the supplied edition's page images and cross-checked against the PDF's text layer.
- Two vowelling typos in the source PDF were corrected: bayt 60 **الْفُرْسُ** (the PDF has الْفَرْسُ) and bayt 147 **الْقَدَمِ** (the PDF has الْقِدَمِ).
- The English translation comes from the same edition. Confirm you have the right to redistribute it before making the repository public, or remove the `"t"` fields.

## Credits and licenses

- Fonts: **Amiri** and **IBM Plex Sans Arabic**, both SIL Open Font License 1.1 (copies in `fonts/`).
- Scheduling: FSRS-5 (open-spaced-repetition), implemented in `js/fsrs.js`.
- No analytics, no tracking, no network calls other than loading the app's own files.
