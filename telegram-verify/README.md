# تأكيد رقم الموبايل على تليجرام (ببلاش)

الطالب وهو بيعمل حساب بيفتح بوت تليجرام، يدوس **«📱 شارك رقمي»**، والبوت يرد بكود من 6 أرقام يكتبه في الموقع.
تليجرام بيبعت رقم الحساب المتأكد نفسه، فمحدش يقدر يأكد رقم مش بتاعه.
اللي يدوس «مش عندي تليجرام» بيكمّل عادي، بس حسابه بيتراجع الأول قبل الهدية.

## الطريقة المجانية تمامًا: Google Apps Script (حساب جوجل بس — من غير كارت)

1. **اعمل بوت جديد:** افتح [@BotFather](https://t.me/BotFather) ← `/newbot` ← اختار اسم ويوزرنيم (مثلاً `BotologySUVerifyBot`).
   هيديك **توكن** — متبعتهوش لحد.
2. افتح [script.google.com](https://script.google.com) ← **New project** ← امسح اللي في `Code.gs` والصق محتوى `apps-script.gs` ← 💾 Save.
3. ⚙️ **Project Settings** (العجلة على الشمال) ← تحت خالص **Script Properties** ← Add script property:
   - `TG_TOKEN` = توكن البوت
   - `OTP_SECRET` = أي كلام عشوائي طويل (مثلاً 40 حرف وأرقام)
4. فوق على اليمين **Deploy ← New deployment** ← ⚙️ جنب Select type اختار **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   ← Deploy ← هيطلب صلاحيات: Authorize access ← اختار حسابك ← Advanced ← Go to project (unsafe) ← Allow
   (ده طبيعي لأي سكريبت انت عامله بنفسك).
   انسخ الـ **Web app URL** (بيبدأ بـ `https://script.google.com/macros/s/…/exec`).
5. ارجع للكود ← من القايمة اللي فوق اختار الدالة **setup** ← ▶ **Run**. في الـ Execution log لازم يظهر `"ok":true`.
6. ابعت لـ Claude **الـ Web app URL** و**يوزرنيم البوت** وهو يحطهم في الموقع، أو حطهم بنفسك:
   ```js
   var TG_VERIFY_URL="https://script.google.com/macros/s/…/exec";
   var TG_VERIFY_BOT="BotologySUVerifyBot";
   ```

> لو عدّلت الكود بعد كده: Deploy ← Manage deployments ← ✏️ ← Version: New version ← Deploy (عشان الرابط يفضل زي ما هو).

## طريقة تانية: Cloudflare Worker
`worker.js` — نفس الفكرة على Cloudflare Workers (الخطة المجانية). الأسهل والأضمن إنه ببلاش هو Google Apps Script اللي فوق.

## الحسابات المشكوك فيها
- اللي ما أكدش رقمه ← حسابه بيبقى «قيد المراجعة» وبيوصلك تنبيه على تليجرام، وتوافق عليه من تبويب الحسابات.
- اللي أكد رقمه ← بيتمسك بس لو نفس بصمة الجهاز خدت الهدية على حسابين أو أكتر في آخر 14 يوم.
