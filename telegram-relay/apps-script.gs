/* وسيط تليجرام لـ Botology SU (Google Apps Script — ببلاش)
   ليه؟ api.telegram.org محجوب أو بطيء جدًا على شبكات كتير في مصر، فطلبات الشحن والبلاغات والتقرير اليومي
   ما كانتش بتوصل من المتصفح. الموقع بيبعت الرسالة هنا، وسيرفرات جوجل بتبعتها لتليجرام.
   الرسايل بتروح لـ chat واحد بس (بتاعك) — محدش يقدر يستخدمه يبعت لحد تاني.
   Script properties المطلوبة: TG_TOKEN (توكن بوت التقارير) · TG_CHAT (الـ chat id بتاعك) */

function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ""; }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function send_(text) {
  var tok = prop_("TG_TOKEN"), chat = prop_("TG_CHAT");
  if (!tok || !chat) return { ok: false, why: "TG_TOKEN أو TG_CHAT مش متحطين في Script properties" };
  var r = UrlFetchApp.fetch("https://api.telegram.org/bot" + tok + "/sendMessage", {
    method: "post", contentType: "application/json", muteHttpExceptions: true,
    payload: JSON.stringify({ chat_id: chat, text: text })
  });
  var j = {}; try { j = JSON.parse(r.getContentText()); } catch (e) {}
  return j.ok ? { ok: true } : { ok: false, why: String(j.description || ("HTTP " + r.getResponseCode())) };
}

function doPost(e) {
  var b = {}; try { b = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (x) {}
  var text = String(b.text || "").slice(0, 4000);
  if (!text) return out_({ ok: false, why: "رسالة فاضية" });
  /* حد أقصى 150 رسالة كل 10 دقايق عشان محدش يغرّقك رسايل */
  var c = CacheService.getScriptCache(), n = +(c.get("n") || 0);
  if (n >= 150) return out_({ ok: false, why: "رسايل كتير — استنى شوية" });
  c.put("n", String(n + 1), 600);
  try { return out_(send_(text)); } catch (x) { return out_({ ok: false, why: String(x) }); }
}

function doGet() { return out_({ ok: true, relay: "botology" }); }

/* اختار test من فوق ودوس ▶ Run: لازم توصلك رسالة على تليجرام */
function test() { Logger.log(JSON.stringify(send_("✅ اختبار: وسيط تليجرام شغال مع Botology SU"))); }
