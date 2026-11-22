# راهنمای انتشار ذهن تریدر 2.4 روی GitHub Pages

مخزن هدف: `behnam67rr/journalnew1`

1. در نسخه فعلی برنامه از بخش تنظیمات، پشتیبان رمزگذاری‌شده بگیر.
2. فایل ZIP را استخراج کن.
3. فقط هفت فایل ریشه زیر را در ریشه مخزن GitHub آپلود و جایگزین کن:
   `index.html`, `manifest.webmanifest`, `sw.js`, `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
4. پوشه `google-apps-script` را به GitHub عمومی آپلود نکن. `Code.gs` فقط در Apps Script قرار می‌گیرد.
5. Commit changes را بزن و منتظر انتشار Pages بمان.
6. این مسیرها را بررسی کن:
   - `https://behnam67rr.github.io/journalnew1/manifest.webmanifest`
   - `https://behnam67rr.github.io/journalnew1/icon-192.png`
   - `https://behnam67rr.github.io/journalnew1/icon-512.png`
   - `https://behnam67rr.github.io/journalnew1/sw.js`
7. سایت را در Chrome باز کن. اگر نسخه قدیمی دیده شد، ابتدا فقط صفحه را Refresh کن و چند لحظه برای فعال شدن Service Worker جدید صبر کن.
8. برای نصب، منوی Chrome را باز کن و گزینه Install app را انتخاب کن.

## نکات مهم

- اطلاعات محلی را پاک نکن؛ ممکن است ژورنال و تنظیمات ذخیره‌شده حذف شوند.
- قبل از انتشار حتماً پشتیبان بگیر.
- آدرس Apps Script و API Token را عمومی نکن.
- حد زیان روزانه از تنظیمات برنامه تعیین می‌شود؛ مقدار صفر آن را غیرفعال می‌کند.
- هشدارهای ریسک برنامه مانع اجرای سفارش در MT5 نیستند.
- برای PDF به گزارش‌ها برو و «چاپ / ذخیره PDF» را انتخاب کن.
