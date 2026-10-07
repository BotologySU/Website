/* Botology SU — كود تفعيل الرقم على واتساب (Cloudflare Worker)
 *
 * POST /send   {phone}               → بيبعت كود 6 أرقام على واتساب، وبيرجع {ok, token}
 * POST /verify {phone, code, token}  → {ok:true} لو الكود صح
 *
 * المتغيرات (Settings → Variables and Secrets):
 *   WA_TOKEN      (Secret)  توكن WhatsApp Cloud API الدايم
 *   WA_PHONE_ID             Phone number ID من Meta
 *   WA_TEMPLATE             اسم قالب الـ Authentication (مثلاً botology_otp)
 *   WA_LANG                 لغة القالب (ar أو en_US) — الافتراضي ar
 *   WA_NO_BUTTON            خليه 1 لو القالب مفيهوش زرار «نسخ الكود»
 *   OTP_SECRET    (Secret)  أي نص عشوائي طويل
 *   ALLOW_ORIGIN            المواقع المسموحة، مفصولة بفاصلة — الافتراضي https://botologysu.github.io
 *   OTP_KV        (KV binding) مستحسن: بيمنع الإزعاج (كود كل دقيقة، 5 في اليوم لكل رقم، 5 محاولات لكل كود)
 */
const json = (o, status, h) => new Response(JSON.stringify(o), { status: status || 200, headers: Object.assign({ "Content-Type": "application/json" }, h) });

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allow = (env.ALLOW_ORIGIN || "https://botologysu.github.io").split(",").map(s => s.trim()).filter(Boolean);
    const cors = { "Access-Control-Allow-Origin": allow.includes(origin) ? origin : allow[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return json({ ok: false, error: "method" }, 405, cors);
    if (!allow.includes(origin)) return json({ ok: false, error: "origin" }, 403, cors);

    let b = {};
    try { b = await req.json(); } catch (e) {}
    const ph = normPhone(b.phone);
    if (!ph) return json({ ok: false, error: "phone" }, 400, cors);
    const path = new URL(req.url).pathname;

    if (path.endsWith("/send")) {
      if (env.OTP_KV) {
        if (await env.OTP_KV.get("cd:" + ph)) return json({ ok: false, error: "wait" }, 429, cors);
        const dk = "day:" + ph + ":" + new Date().toISOString().slice(0, 10);
        const n = +(await env.OTP_KV.get(dk) || 0);
        if (n >= 5) return json({ ok: false, error: "limit" }, 429, cors);
        await env.OTP_KV.put("cd:" + ph, "1", { expirationTtl: 60 });
        await env.OTP_KV.put(dk, String(n + 1), { expirationTtl: 90000 });
      }
      const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
      const exp = Date.now() + 10 * 60000;
      const sig = await hmac(env.OTP_SECRET, ph + "|" + code + "|" + exp);
      const r = await sendWhatsApp(env, ph, code);
      if (!r.ok) return json({ ok: false, error: "wa", detail: r.err }, 502, cors);
      return json({ ok: true, token: exp + "." + sig }, 200, cors);
    }

    if (path.endsWith("/verify")) {
      const [exp, sig] = String(b.token || "").split(".");
      if (!exp || !sig || Date.now() > +exp) return json({ ok: false, error: "expired" }, 400, cors);
      if (env.OTP_KV) {
        const k = "att:" + sig, n = +(await env.OTP_KV.get(k) || 0);
        if (n >= 5) return json({ ok: false, error: "attempts" }, 429, cors);
        await env.OTP_KV.put(k, String(n + 1), { expirationTtl: 900 });
      }
      const good = await hmac(env.OTP_SECRET, ph + "|" + String(b.code || "").trim() + "|" + exp);
      return json({ ok: safeEqual(good, sig) }, 200, cors);
    }

    return json({ ok: false, error: "path" }, 404, cors);
  }
};

/* موبايل مصري بس: 01xxxxxxxxx → 201xxxxxxxxx */
function normPhone(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (/^01\d{9}$/.test(d)) d = "2" + d;
  else if (/^1\d{9}$/.test(d)) d = "20" + d;
  return /^201\d{9}$/.test(d) ? d : "";
}

async function sendWhatsApp(env, to, code) {
  const components = [{ type: "body", parameters: [{ type: "text", text: code }] }];
  if (env.WA_NO_BUTTON !== "1") components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] });
  try {
    const r = await fetch("https://graph.facebook.com/v21.0/" + env.WA_PHONE_ID + "/messages", {
      method: "POST",
      headers: { "Authorization": "Bearer " + env.WA_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template: { name: env.WA_TEMPLATE, language: { code: env.WA_LANG || "ar" }, components } })
    });
    if (r.ok) return { ok: true };
    const j = await r.json().catch(() => ({}));
    return { ok: false, err: (j.error && j.error.message) || ("HTTP " + r.status) };
  } catch (e) {
    return { ok: false, err: "network" };
  }
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
