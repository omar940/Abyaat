# تعاهد — Ta'āhud

A progressive web app for memorizing Arabic poems (qaṣā’id), texts (mutūn), daily adhkār and awrād, with spaced repetition. The name تعاهد (*ta‘āhud*) means tending something regularly so it is not lost; the logo is the word عهد with the ه (the knot) highlighted.
The interface is in Arabic (right-to-left) by default, with an English interface and a dark mode available in الإعدادات (Settings). The poems themselves always stay in Arabic. First poem included: **Qaṣīdat al-Burdah** (160 bayts, 10 chapters, plus optional opening and closing bayts).

The app has three tabs: **الحفظ والمراجعة** (your memorizing list: the poems and adhkār you are working on, with those still being memorized at the top and those in review at the bottom; open one to see its progress, the chapters button and its three cards: new memorization, near review, old review), **المكتب** (library, reading only) and **الإعدادات** (settings). You can memorize several poems at once; add one with **إضافة إلى قائمتي** (progress is kept if you remove it and add it again later).

- **الحفظ الجديد (New memorization):** one bayt at a time, in large text that fits the screen. Flow: read → hide → recite from memory → "حفظته" → a short test on the new bayt and the two before it (poems, mutūn and awrād, not adhkār). The new bayt only counts as memorized once you finish that test (the first bayt of a chapter and adhkār count straight away). When the session's number is reached you return straight to the poem screen. Press and hold a bayt to see its translation. There is no setup screen: the session starts at once, and the **− / +** buttons at the top change how many bayts you memorize in the session (remembered for next time).
- **المراجعة القريبة (New review):** every day, everything you have memorized so far in the current chapter, 5 bayts per page (each page starts hidden so you can recite before checking: the right arrow reveals one line, the left arrow hides one line, the double right arrow first reveals the whole page and, pressed again, moves to the next set, and the double left arrow goes back to the previous set; the ⓘ button in the top corner explains the controls). Continues for **10 days of actual use** after the chapter is completed (a day counts only when you finish that day's review), then the chapter graduates to old review.
- **المراجعة البعيدة (Old review):** one **FSRS-5** card per chapter (default parameters, 90% target retention). The tab lists the chapters due today. Open one and go through the whole chapter, 5 bayts per page. Each page starts hidden: recite, then press the right arrow to reveal one line (the left arrow hides it again; the double arrows change page), and double-tap any bayt that gives you trouble to highlight it. At the end you choose when to review the chapter next from four options, each showing its date (they map to نسيتُ · بصعوبة · تذكّرتُ · بسهولة, and the app shades a suggestion based on how many bayts you highlighted).
- **المكتب (Library):** reading only. Sections قصائد, متون, أذكار and أوراد; open an item to read it in full or jump to a chapter (font size, chapter jump, optional English translation).
- **الأذكار (Adhkār):** daily adhkār from the Qur’an and Sunnah, grouped by occasion (the chapter title is the circumstance, e.g. morning & evening, before sleeping, after the prayers). Each dhikr is memorized like a bayt, but as a single text split into short phrases that you reveal one at a time in review; a dhikr shows its repetition count and source, and **press and hold the text to see its translation**. Content lives in `data/poems/adhkar.json` (`type: "dhikr"`; fields `s` Arabic, `t` translation, `c` count, `w` when, `r` source). **Credit:** the choice and order of adhkār follow *Daily Adhkār* (Ummah Welfare Trust, uwt.org); the Arabic is the text of the Qur’an and hadith, and the English translations are our own. Currently included: morning & evening, sleep, after the fardh prayers, and the general daily adhkār (clothes, wuḍū’, home, masjid, adhān, istikhārah, gatherings, food, travel, weather, greetings and hardship). Each long dhikr is broken into short lines at natural pauses (a few were adjusted by hand via the `l` field).
- **المتون:** includes **المرشد المعين** of Ibn ‘Āshir (317 couplets, 42 chapters grouped by book), with a literal English translation per hemistich (press and hold in New memorization). The Arabic was transcribed from a scanned edition and then compared line by line against, and corrected to match, *al-Murshid al-Mu‘īn: Arabic Text with English Footnote Translation* © The Guiding Helper Foundation 2005 (“general and unrestricted permission is granted for the unaltered duplication, distribution, and transmission of this text”); the translation is theirs. A few unclear marks in that edition (some tanwīn and shadda) were resolved by grammar. Content lives in `data/poems/ibn-ashir.json`.
- **الأوراد (Awrād):** *Al-Wird al-Laṭīf* and *Al-Rātib al-Shahīr* of Imām al-Ḥaddād, and *Ḥizb al-Baḥr* of Imām al-Shādhilī (`data/poems/wird-latif.json`, `ratib.json`, `hizb-bahr.json`; `type: "wird"`). They follow the same memorization pattern as poems (new memorization, test, near and old review), but each unit is a short **line** rather than a bayt; a line can carry a repetition count `c` (shown as ×N) and a translation `t`. Arabic and English come from the PDF editions supplied by the owner; the vowelling of the Wird al-Laṭīf was added and the Ḥizb al-Baḥr has no English translation.
- **Chapters (inside New memorization):** the **الفصول وتحديد المحفوظ** button lists every chapter with its status. Tap a chapter to start memorizing from it, or mark it as memorized (**تم حفظ الفصل**): you rate how well you know it and it goes straight into old review. Chapters you do not want to memorize can be **suspended** (**تعليق الفصل**, or the whole group/book at once): they are skipped by new memorization and left out of the progress count until you resume them (only for chapters not yet memorized).
- **Offline:** installable; works without a connection. Progress is stored on the device (localStorage). Use الإعدادات ← تصدير التقدّم to back up or move it.

**Appearance** (Light / Dark / Auto, following the device) and **Interface language** (العربية / English) are in الإعدادات. UI strings live in `js/i18n.js`; to add a language, add another object there with the same keys and an option in the settings screen.

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

- Fonts: **Scheherazade New**, **Amiri** (fallback) and **IBM Plex Sans Arabic** (Arabic and Latin subsets), both SIL Open Font License 1.1 (copies in `fonts/`).
- Scheduling: FSRS-5 (open-spaced-repetition), implemented in `js/fsrs.js`.
- No analytics, no tracking, no network calls other than loading the app's own files.
