/* Botology SU — service worker (تثبيت المنصة كتطبيق)
   - بيخزّن ملفات الموقع الثابتة بس (الصفحة + الأيقونات + صور الأسئلة) عشان التطبيق يفتح بسرعة.
   - مش بيلمس أي طلب لموقع تاني (Firebase / تسجيل الدخول / Gemini / تليجرام…) — بيروح للنت مباشرة ومش بيتخزّن،
     فمفيش بيانات حساب أو رصيد أو توكن بتتحفظ هنا، والخروج أو تغيير الحساب مش بيسيب حاجة وراه.
   - الصفحة نفسها "النت الأول": أول ما يكون فيه نت بيجيب آخر نسخة، والنسخة المخزّنة للطوارئ بس.
   - VERSION بيتغيّر تلقائيًا مع كل نسخة جديدة من الموقع (pack3.js) → المتصفح يعرف إن فيه تحديث ويظهر زرار «حدّث». */
const VERSION = "990fddb2d4";
const CACHE = "botology-" + VERSION;
const STATIC = "botology-static-v1"; /* أيقونات + صور (أساميها ثابتة بالمحتوى) — بتفضل بين النسخ */
const SHELL = ["./", "./install/", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u =>
    fetch(u, { cache: "no-cache" }).then(r => { if (r.ok) return c.put(u, r) }).catch(() => {})
  ))));
  /* أول تثبيت: يشتغل على طول. تحديث: يستنى لحد ما الطالب يدوس «حدّث» (عشان ما يقطعش عليه اللي بيعمله) */
});

self.addEventListener("message", e => { if (e.data === "skip") self.skipWaiting() });

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("botology-") && k !== CACHE && k !== STATIC).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const BASE = new URL("./", self.location).pathname; /* /Website/ */

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return; /* أي موقع تاني: مالناش دعوة بيه */
  const rel = url.pathname.slice(BASE.length);

  /* الصفحات: النت الأول (بيتأكد من آخر نسخة)، ولو مفيش نت → النسخة المخزّنة */
  if (req.mode === "navigate") {
    const key = rel.startsWith("install") ? "./install/" : rel === "" || rel === "index.html" ? "./" : null;
    if (key === null) return;
    e.respondWith(fetch(req, { cache: "no-cache" }).then(r => {
      if (r.ok && !url.search) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(key, cp)) }
      return r;
    }).catch(() => caches.match(key, { cacheName: CACHE }).then(r => r || caches.match(key)).then(r => r || offline())));
    return;
  }

  /* الأيقونات وصور الأسئلة: من المخزن، ولو مش موجودة تتجاب وتتخزن */
  if (/^(icons|m)\//.test(rel)) {
    e.respondWith(caches.open(STATIC).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r }))));
    return;
  }

  if (rel === "manifest.webmanifest") {
    e.respondWith(fetch(req, { cache: "no-cache" }).catch(() => caches.match("./manifest.webmanifest")));
  }
  /* غير كده (ملفات x/ وغيرها): من النت عادي */
});

function offline() {
  return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Botology SU</title><body dir="rtl" style="font:600 18px/1.9 system-ui,sans-serif;text-align:center;padding:60px 20px">📡 مفيش نت دلوقتي.<br>المنصة محتاجة إنترنت — اتأكد من النت وجرّب تاني.<br><br><button onclick="location.reload()" style="font:inherit;padding:10px 22px;border:0;border-radius:12px;background:#ff5a3c;color:#fff">🔄 جرّب تاني</button></body>', { headers: { "content-type": "text/html; charset=utf-8" } });
}
