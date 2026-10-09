# تأكيد رقم الموبايل على تليجرام (ببلاش)

الطالب وهو بيعمل حساب بيفتح بوت تليجرام، يدوس **«📱 شارك رقمي»**، والبوت يرد بكود من 6 أرقام يكتبه في الموقع.
تليجرام بيبعت رقم الحساب المتأكد نفسه، فمحدش يقدر يأكد رقم مش بتاعه.
اللي يدوس «مش عندي تليجرام» بيكمّل عادي، بس حسابه بيتراجع الأول قبل الهدية.

كله ببلاش: بوت تليجرام + Cloudflare Workers (الخطة المجانية: 100,000 طلب في اليوم).

## الخطوات (مرة واحدة)

1. **اعمل بوت جديد:** افتح [@BotFather](https://t.me/BotFather) ← `/newbot` ← اختار اسم ويوزرنيم (مثلاً `BotologySUVerifyBot`).
   هياخدك على **توكن** — احتفظ بيه ومتبعتهوش لحد.
2. **اعمل الـ Worker:** [dash.cloudflare.com](https://dash.cloudflare.com) ← Workers & Pages ← Create ← Worker ← سمّيه مثلاً `botology-tg` ← Deploy
   ← Edit code ← امسح اللي فيه والصق محتوى `worker.js` ← Deploy.
3. **المتغيرات:** Settings ← Variables and Secrets ← Add:
   - `TG_TOKEN` (Secret) = توكن البوت
   - `OTP_SECRET` (Secret) = أي كلام عشوائي طويل (مثلاً 40 حرف)
4. **(مستحسن) حد للمحاولات:** Storage & Databases ← KV ← Create namespace، وبعدين في الـ Worker ← Settings ← Bindings ← Add ← KV namespace باسم `OTP_KV`.
5. **اربط البوت:** افتح في المتصفح
   `https://botology-tg.<اسمك>.workers.dev/setup?key=<OTP_SECRET>`
   لازم يظهر `"ok":true`.
6. **في الموقع** (فوق في الكود جنب `OTP_URL`):
   ```js
   var TG_VERIFY_URL="https://botology-tg.<اسمك>.workers.dev";
   var TG_VERIFY_BOT="BotologySUVerifyBot";
   ```
   أو ابعتهم لـ Claude يحطهم.

## الحسابات المشكوك فيها
- اللي ما أكدش رقمه ← حسابه بيبقى «قيد المراجعة» وبيوصلك تنبيه على تليجرام، وتوافق عليه من تبويب الحسابات.
- اللي أكد رقمه ← بيتمسك بس لو نفس بصمة الجهاز خدت الهدية على حسابين أو أكتر في آخر 14 يوم.
