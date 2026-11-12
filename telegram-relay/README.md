# وسيط تليجرام (ببلاش — Google Apps Script)

**ليه؟** `api.telegram.org` محجوب أو بيعلّق على شبكات كتير في مصر، فطلبات الشحن والبلاغات والتقرير اليومي ما كانتش بتوصلك على تليجرام.
الوسيط ده بيستلم الرسالة من الموقع ويبعتها لتليجرام من سيرفرات جوجل. ببلاش ومن غير كارت.

## الخطوات (مرة واحدة بس)
1. افتح [script.google.com](https://script.google.com) ← **New project**.
2. امسح اللي في `Code.gs` والصق محتوى `apps-script.gs` اللي جنب الملف ده ← 💾 Save.
3. ⚙️ **Project Settings** ← تحت خالص **Script Properties** ← **Add script property** مرتين:
   - `TG_TOKEN` = توكن بوت التقارير (نفس البوت اللي بيبعتلك البلاغات — من @BotFather)
   - `TG_CHAT` = الـ chat id بتاعك (من @userinfobot)
4. ارجع للكود ← من القايمة اللي فوق اختار **test** ← ▶ **Run** ← هيطلب صلاحيات: Review permissions ← حسابك ← Advanced ← Go to project ← Allow.
   لازم توصلك رسالة «✅ اختبار» على تليجرام.
5. **Deploy ← New deployment** ← ⚙️ جنب Select type اختار **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   ← Deploy ← انسخ **Web app URL** (بيبدأ بـ `https://script.google.com/macros/s/` وبيخلص بـ `/exec`).
6. افتح صفحة الأدمن (`?reports`) ← تبويب **🚩 البلاغات** ← **📊 التقرير اليومي** ← افتح **🔗 وسيط تليجرام** ← الصق الرابط ← **حفظ**.
   الصفحة هتبعت رسالة اختبار — لو وصلتك يبقى كله تمام.

> لو عدّلت الكود بعد كده: Deploy ← Manage deployments ← ✏️ ← Version: New version ← Deploy (عشان الرابط يفضل زي ما هو).
