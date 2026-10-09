/* Botology SU — تأكيد رقم الموبايل ببلاش عن طريق بوت تليجرام (Cloudflare Worker)
 *
 * الطالب بيفتح البوت ويدوس «📱 شارك رقمي» → تليجرام بيبعت رقم حسابه المتأكد →
 * البوت بيرد بكود 6 أرقام → الطالب بيكتبه في الموقع → الموقع بيسأل /verify.
 * الكود محسوب من الرقم نفسه (HMAC)، فلو الطالب كتب في الموقع رقم غير رقم تليجرام بتاعه الكود مش هيظبط.
 *
 * POST /tg               ← Telegram webhook (محمي بـ secret_token)
 * POST /verify {phone, code} → {ok:true} لو الكود صح
 * GET  /setup?key=OTP_SECRET → بيربط البوت بالـ worker (مرة واحدة بعد النشر)
 *
 * المتغيرات (Settings → Variables and Secrets):
 *   TG_TOKEN     (Secret)  توكن البوت الجديد من @BotFather
 *   OTP_SECRET   (Secret)  أي نص عشوائي طويل
 *   ALLOW_ORIGIN           المواقع المسموحة، مفصولة بفاصلة — الافتراضي https://botologysu.github.io
 *   OTP_KV       (KV binding) مستحسن: بيحدد عدد المحاولات (5 محاولات كل ربع ساعة لكل رقم)
 */
const json = (o, status, h) => new Response(JSON.stringify(o), { status: status || 200, headers: Object.assign({ "Content-Type": "application/json" }, h) });
const WIN = 15 * 60000; // الكود صالح ربع ساعة (أو لحد ربع الساعة اللي بعدها)

export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname;

    if (path.endsWith("/setup") && req.method === "GET") {
      if (!env.OTP_SECRET || url.searchParams.get("key") !== env.OTP_SECRET) return json({ ok: false, error: "key" }, 403);
      const r = await tg(env, "setWebhook", { url: url.origin + "/tg", secret_token: await whSecret(env), allowed_updates: ["message"] });
      return json(r);
    }

    if (path.endsWith("/tg") && req.method === "POST") {
      if (req.headers.get("X-Telegram-Bot-Api-Secret-Token") !== await whSecret(env)) return new Response("no", { status: 403 });
      let u = {};
      try { u = await req.json(); } catch (e) {}
      const m = u.message;
      if (m && m.chat && m.chat.type === "private") await onMessage(env, m);
      return new Response("ok");
    }

    const origin = req.headers.get("Origin") || "";
    const allow = (env.ALLOW_ORIGIN || "https://botologysu.github.io").split(",").map(s => s.trim()).filter(Boolean);
    const cors = { "Access-Control-Allow-Origin": allow.includes(origin) ? origin : allow[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    if (path.endsWith("/verify") && req.method === "POST") {
      if (!allow.includes(origin)) return json({ ok: false, error: "origin" }, 403, cors);
      let b = {};
      try { b = await req.json(); } catch (e) {}
      const ph = normPhone(b.phone), code = String(b.code || "").replace(/\D/g, "");
      if (!ph) return json({ ok: false, error: "phone" }, 400, cors);
      if (env.OTP_KV) {
        const k = "att:" + ph, n = +(await env.OTP_KV.get(k) || 0);
        if (n >= 5) return json({ ok: false, error: "attempts" }, 429, cors);
        await env.OTP_KV.put(k, String(n + 1), { expirationTtl: 900 });
      }
      const w = Math.floor(Date.now() / WIN);
      const ok = code.length === 6 && (safeEqual(await codeFor(env, ph, w), code) || safeEqual(await codeFor(env, ph, w - 1), code));
      if (ok && env.OTP_KV) await env.OTP_KV.delete("att:" + ph);
      return json({ ok }, 200, cors);
    }

    return json({ ok: false, error: "path" }, 404, cors);
  }
};

async function onMessage(env, m) {
  const chat = m.chat.id;
  const askKb = { keyboard: [[{ text: "📱 شارك رقمي", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };
  if (m.contact) {
    // لازم يكون رقم صاحب الحساب نفسه، مش جهة اتصال متبعتة
    if (!m.from || m.contact.user_id !== m.from.id)
      return tg(env, "sendMessage", { chat_id: chat, text: "⚠️ لازم تشارك رقمك إنت من الزرار اللي تحت، مش رقم حد تاني.", reply_markup: askKb });
    const ph = normPhone(m.contact.phone_number);
    if (!ph)
      return tg(env, "sendMessage", { chat_id: chat, text: "⚠️ رقم تليجرام بتاعك مش رقم موبايل مصري، فمش هنقدر نأكده من هنا. ارجع للموقع واختار «مش عندي تليجرام» وهنراجع حسابك.", reply_markup: { remove_keyboard: true } });
    const code = await codeFor(env, ph, Math.floor(Date.now() / WIN));
    return tg(env, "sendMessage", {
      chat_id: chat, parse_mode: "HTML", reply_markup: { remove_keyboard: true },
      text: "✅ رقمك: <b>0" + ph.slice(2) + "</b>\n\nكود التأكيد بتاعك:\n<code>" + code + "</code>\n\nاكتبه في الموقع (صالح ربع ساعة). لازم تكون كاتب نفس الرقم ده في الموقع."
    });
  }
  return tg(env, "sendMessage", { chat_id: chat, text: "أهلاً بيك في Botology SU 👋\nعشان نأكد رقمك دوس على الزرار اللي تحت «📱 شارك رقمي»، وهبعتلك كود تكتبه في الموقع.", reply_markup: askKb });
}

/* موبايل مصري بس: أي شكل → 201xxxxxxxxx */
function normPhone(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (/^0020/.test(d)) d = d.slice(2);
  if (/^01\d{9}$/.test(d)) d = "2" + d;
  else if (/^1\d{9}$/.test(d)) d = "20" + d;
  return /^201\d{9}$/.test(d) ? d : "";
}

async function codeFor(env, ph, w) {
  const h = await hmac(env.OTP_SECRET, "tg|" + ph + "|" + w);
  return String(parseInt(h.slice(0, 12), 16) % 1000000).padStart(6, "0");
}
async function whSecret(env) { return (await hmac(env.OTP_SECRET, "webhook")).slice(0, 48); }

async function tg(env, method, body) {
  try {
    const r = await fetch("https://api.telegram.org/bot" + env.TG_TOKEN + "/" + method, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return await r.json();
  } catch (e) { return { ok: false, error: "network" }; }
}

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret || ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(x => x.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
