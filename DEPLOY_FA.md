# راهنمای انتشار ذهن تریدر 2.5.0 روی GitHub Pages

مخزن هدف: `behnam67rr/journalnew1`

1. پیش از انتشار، از برنامه پشتیبان رمزگذاری‌شده تهیه کن.
2. ZIP را استخراج کن.
3. این هفت فایل را در ریشه مخزن GitHub جایگزین کن: `index.html`, `manifest.webmanifest`, `sw.js`, `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`.
4. پوشه `google-apps-script` را به مخزن عمومی آپلود نکن. کد آن فقط در Google Apps Script استفاده می‌شود.
5. Commit changes را بزن و در تب Actions منتظر تیک سبز اجرای `pages-build-deployment` بمان.
6. پس از موفقیت، این مسیرها را بازبینی کن:
   - `https://behnam67rr.github.io/journalnew1/`
   - `https://behnam67rr.github.io/journalnew1/manifest.webmanifest`
   - `https://behnam67rr.github.io/journalnew1/icon-192.png`
   - `https://behnam67rr.github.io/journalnew1/icon-512.png`
   - `https://behnam67rr.github.io/journalnew1/sw.js`
7. در Chrome گوشی سایت را Refresh کن. کش جدید با نام `zehn-trader-2.5.0` جایگزین کش نسخه قبل می‌شود.
8. اگر Passkey قبلاً ثبت نشده، ابتدا با رمز عبور وارد شو و از «اتصال و تنظیمات» آن را فعال کن. در ورود بعدی Passkey گزینه اصلی خواهد بود.
9. در گزارش‌ها دکمه «پیش‌نمایش / PDF» را بزن؛ پس از بازبینی، «چاپ / ذخیره PDF» را انتخاب کن.

## نکات امنیتی

- اطلاعات محلی را پاک نکن؛ ممکن است ژورنال و تنظیمات حذف شوند.
- قبل از انتشار پشتیبان بگیر.
- آدرس Apps Script و API Token را در مخزن عمومی قرار نده.
- Passkey به احرازگر دستگاه و پشتیبانی WebAuthn/PRF وابسته است؛ در صورت عدم پشتیبانی، رمز عبور همچنان روش جایگزین است.
- هشدارهای ریسک برنامه مانع اجرای سفارش در MT5 نیستند.
