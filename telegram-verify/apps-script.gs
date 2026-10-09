/* Botology SU — تأكيد رقم الموبايل على تليجرام — نسخة Google Apps Script (ببلاش تمامًا، حساب جوجل بس)
 *
 * الطالب بيفتح البوت ويدوس «📱 شارك رقمي» → تليجرام بيبعت رقم حسابه المتأكد →
 * البوت بيرد بكود 6 أرقام → الطالب بيكتبه في الموقع → الموقع بيسأل:  <رابط الـ Web app>?phone=01xxxxxxxxx&code=123456
 *
 * Project Settings → Script Properties:
 *   TG_TOKEN    توكن البوت من @BotFather
 *   OTP_SECRET  أي كلام عشوائي طويل
 * بعد Deploy كـ Web app: شغّل الدالة setup مرة واحدة من فوق (Run).
 */
var WIN = 15 * 60000; // الكود صالح ربع ساعة (أو لحد ربع الساعة اللي بعدها)

function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ""; }

/* اربط البوت بالسكريبت — شغّلها مرة واحدة بعد النشر */
function setup() {
  var url = ScriptApp.getService().getUrl();
  if (!url) throw new Error("اعمل Deploy → New deployment → Web app الأول");
  var r = tg_("setWebhook", { url: url + "?k=" + whSecret_(), allowed_updates: ["message"], drop_pending_updates: true });
  Logger.log(JSON.stringify(r));
  return r;
}

/* الموقع بيسأل هنا: ?phone=...&code=... */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var ph = normPhone_(p.phone), code = String(p.code || "").replace(/\D/g, "");
  var out = { ok: false };
  if (!ph) out.error = "phone";
  else {
    var c = CacheService.getScriptCache(), k = "att:" + ph, n = +(c.get(k) || 0);
    if (n >= 5) out.error = "attempts";
    else {
      c.put(k, String(n + 1), 900);
      var w = Math.floor(Date.now() / WIN);
      out.ok = code.length === 6 && (codeFor_(ph, w) === code || codeFor_(ph, w - 1) === code);
      if (out.ok) c.remove(k);
    }
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* رسايل تليجرام (webhook) */
function doPost(e) {
  var p = (e && e.parameter) || {};
  if (p.k !== whSecret_()) return HtmlService.createHtmlOutput("no");
  var u = {};
  try { u = JSON.parse(e.postData.contents); } catch (x) {}
  var c = CacheService.getScriptCache();
  if (u.update_id != null) {           // متردّش على نفس الرسالة مرتين
    if (c.get("u:" + u.update_id)) return HtmlService.createHtmlOutput("ok");
    c.put("u:" + u.update_id, "1", 21600);
  }
  var m = u.message;
  if (m && m.chat && m.chat.type === "private") onMessage_(m);
  return HtmlService.createHtmlOutput("ok");
}

function onMessage_(m) {
  var chat = m.chat.id;
  var askKb = { keyboard: [[{ text: "📱 شارك رقمي", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };
  if (m.contact) {
    if (!m.from || m.contact.user_id !== m.from.id)
      return tg_("sendMessage", { chat_id: chat, text: "⚠️ لازم تشارك رقمك إنت من الزرار اللي تحت، مش رقم حد تاني.", reply_markup: askKb });
    var ph = normPhone_(m.contact.phone_number);
    if (!ph)
      return tg_("sendMessage", { chat_id: chat, text: "⚠️ رقم تليجرام بتاعك مش رقم موبايل مصري، فمش هنقدر نأكده من هنا. ارجع للموقع واختار «مش عندي تليجرام» وهنراجع حسابك.", reply_markup: { remove_keyboard: true } });
    var code = codeFor_(ph, Math.floor(Date.now() / WIN));
    return tg_("sendMessage", {
      chat_id: chat, parse_mode: "HTML", reply_markup: { remove_keyboard: true },
      text: "✅ رقمك: <b>0" + ph.slice(2) + "</b>\n\nكود التأكيد بتاعك:\n<code>" + code + "</code>\n\nاكتبه في الموقع (صالح ربع ساعة). لازم تكون كاتب نفس الرقم ده في الموقع."
    });
  }
  return tg_("sendMessage", { chat_id: chat, text: "أهلاً بيك في Botology SU 👋\nعشان نأكد رقمك دوس على الزرار اللي تحت «📱 شارك رقمي»، وهبعتلك كود تكتبه في الموقع.", reply_markup: askKb });
}

/* موبايل مصري بس: أي شكل → 201xxxxxxxxx */
function normPhone_(v) {
  var d = String(v || "").replace(/\D/g, "");
  if (/^0020/.test(d)) d = d.slice(2);
  if (/^01\d{9}$/.test(d)) d = "2" + d;
  else if (/^1\d{9}$/.test(d)) d = "20" + d;
  return /^201\d{9}$/.test(d) ? d : "";
}

function hex_(bytes) { return bytes.map(function (b) { return ((b < 0 ? b + 256 : b).toString(16)).padStart(2, "0"); }).join(""); }
function hmac_(msg) { return hex_(Utilities.computeHmacSha256Signature(msg, prop_("OTP_SECRET"))); }
function codeFor_(ph, w) { return String(parseInt(hmac_("tg|" + ph + "|" + w).slice(0, 12), 16) % 1000000).padStart(6, "0"); }
function whSecret_() { return hmac_("webhook").slice(0, 40); }

function tg_(method, body) {
  try {
    var r = UrlFetchApp.fetch("https://api.telegram.org/bot" + prop_("TG_TOKEN") + "/" + method, { method: "post", contentType: "application/json", payload: JSON.stringify(body), muteHttpExceptions: true });
    return JSON.parse(r.getContentText());
  } catch (x) { return { ok: false, error: String(x) }; }
}
