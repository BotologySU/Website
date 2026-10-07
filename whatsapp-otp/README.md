# تفعيل الرقم بكود على واتساب

الموقع بيبعت كود من 6 أرقام على واتساب وقت إنشاء حساب جديد، ومش بيكمّل التسجيل غير لما الكود يتكتب صح.
الإرسال لازم يعدّي على سيرفر صغير (Cloudflare Worker مجاني)، عشان توكن واتساب ما ينفعش يتحط جوه الموقع نفسه.

طول ما `OTP_URL` في الموقع فاضي، التفعيل مقفول والتسجيل شغال عادي من غير كود.

## الخطوات

### 1) WhatsApp Cloud API (من Meta)
1. ادخل [developers.facebook.com](https://developers.facebook.com) واعمل App من نوع **Business** وضيف له **WhatsApp**.
2. ضيف رقم المنصة (رقم مش متسجل على واتساب العادي أو واتساب بيزنس على موبايل) وأكّده.
3. من **WhatsApp → API Setup** خد الـ **Phone number ID**.
4. اعمل **System User** في Business Settings وطلّعله **توكن دايم** بصلاحية `whatsapp_business_messaging`.
5. من **WhatsApp Manager → Message templates** اعمل قالب من نوع **Authentication**:
   - الاسم مثلاً `botology_otp`، واللغة Arabic.
   - سيب زرار **Copy code** (ولو شلته خلّي `WA_NO_BUTTON=1`).
   - استنى لحد ما يتوافق عليه (Approved).
6. لازم تضيف وسيلة دفع في الحساب. Meta بتحاسب على كل رسالة Authentication بمبلغ صغير، والسعر بيختلف حسب الدولة، فراجع صفحة الأسعار عندهم.

### 2) Cloudflare Worker
1. ادخل [dash.cloudflare.com](https://dash.cloudflare.com) ← **Workers & Pages** ← **Create** ← **Worker**.
2. امسح الكود اللي فيه والصق محتوى `worker.js` اللي في الفولدر ده، ودوس **Deploy**.
3. من **Storage & Databases → KV** اعمل namespace اسمه `OTP_KV`. بعدها من **Settings → Bindings** في الـ Worker اربطه بنفس الاسم `OTP_KV`.
4. من **Settings → Variables and Secrets** ضيف:

| الاسم | النوع | القيمة |
|---|---|---|
| `WA_TOKEN` | Secret | التوكن الدايم |
| `WA_PHONE_ID` | Text | الـ Phone number ID |
| `WA_TEMPLATE` | Text | `botology_otp` |
| `WA_LANG` | Text | `ar` |
| `OTP_SECRET` | Secret | أي كلام عشوائي طويل (30 حرف مثلاً) |
| `ALLOW_ORIGIN` | Text | `https://botologysu.github.io` |

5. انسخ رابط الـ Worker (شكله `https://xxxx.workers.dev`).

### 3) فعّله في الموقع
ابعت رابط الـ Worker لـ Claude يحطه في `OTP_URL`. ماتعدلش `index.html` بإيدك، لأنه مشفّر.

## الحماية اللي فيه
- الرقم لازم يكون موبايل مصري عليه واتساب.
- كود واحد كل دقيقة، و5 أكواد بالكتير في اليوم لكل رقم، و5 محاولات بالكتير لكل كود. ده محتاج `OTP_KV`.
- الكود بيخلص بعد 10 دقايق.
