# תיעוד מימוש Backend — מצב חלקי

[אינדקס](../PLAN_INDEX.md) · [תיעוד מימוש](../DOCS_INDEX.md) · [פערים](../OPEN_ISSUES.md).
אומת בקריאת קוד ובדיקות TypeScript ב־24.09.2026; אין כאן אישור לחיבור DB או Supabase חי.

## רכיבים קיימים

| קובץ | אחריות |
|---|---|
| [server](../zis-api/src/server.ts) | bootstrap מותנה ב־PostgreSQL/Supabase |
| [app](../zis-api/src/app.ts) | Express, JSON, Health והזרקת נתיב Admin |
| [server-config](../zis-api/src/config/server-config.ts) | הפרדת כתובת פיתוח/ייצור |
| [health](../zis-api/src/routes/health.routes.ts) | /health, /health/live ו־/health/ready |
| [Supabase client](../zis-api/src/auth/supabase.client.ts) | client שרת ללא Session דפדפן |
| [Auth resolver](../zis-api/src/auth/supabase-auth.resolver.ts) | Bearer token ומשתמש Admin פעיל |
| [Admin route](../zis-api/src/routes/admin-inventory.routes.ts) | POST /admin/inventory/:productVariantId/adjust |
| [Controller](../zis-api/src/controllers/admin-inventory.controller.ts) | קלט, הרשאה וקריאה לשירות |
| [Inventory service](../zis-api/src/inventory/inventory.service.ts) | עדכון, מכירה, חוסר והחזר |
| [Repository](../zis-api/src/inventory/postgres-inventory.repository.ts) | שאילתות SQL פרמטריות וטרנזקציה |
| [Pool](../zis-api/src/infrastructure/postgres.ts) | Pool/SqlClientFactory אמיתיים בקוד |
| [Contracts](../zis-api/src/contracts/index.ts) | טיפוסים, עימוד, שגיאות, מדיה, קטלוג, משלוח, Quote, זמינות והזמנה |
| [Storage service](../zis-api/src/storage/storage.service.ts) | העלאה, Signed URL והסרה עם מגבלות MIME וגודל |
| [Catalog](../zis-api/src/catalog) | שליפת קטגוריות, קטלוג ומוצר עם חיפוש/עימוד ותמונות |
| [HTTP middleware](../zis-api/src/middleware) | request ID, CORS, rate limit ושגיאות אחידות |
| [Quote foundation](../zis-api/src/commerce/quote.service.ts) | חוקי תאריך ותמחור Quote טהורים ללא Reservation |
| [Commerce routes](../zis-api/src/routes/commerce.routes.ts) | Store status, אזורי משלוח, זמינות ו־Quote; ממתין להזרקת DB/לוח חגים |
| [Domain status](../zis-api/src/domain/order-status.ts) | eligibility להכנה ומדיניות ביטול חלקית |

## גבולות המימוש

- ללא תלויות מוזרקות ב־createApp נתיב המלאי אינו נחשף. ב־server נוצרות התלויות רק כשיש הגדרות מתאימות.
- בפיתוח נבחר DATABASE_URL_TRN; בייצור DATABASE_URL. אין טעינה אוטומטית של קובץ סביבה בקוד שנבדק.
- `/health` ו־`/health/live` הם liveness; `/health/ready` בודק את התלויות שהוזרקו, כולל PostgreSQL בשרת מלא.
- Repository נועל Variant עם FOR UPDATE ומשתמש BEGIN/COMMIT/ROLLBACK.
- עדכון available_sets והיסטוריית before/after נעשים באותה טרנזקציה.
- Auth משתמש ב־getUser ומוודא admin_users פעיל; בדיקות HTTP משתמשות בספק מדומה.
- קיימים Routes/Controllers/Services לקטלוג ציבורי, העלאת מדיה וניהול metadata בסיסי עם Audit; עדיין חסרים Shipping, Orders, Payments, Refund, PDF ו־Admin UI.
- מנועי תאריך ו־Quote קיימים כקוד טהור אך טרם מחוברים ל־DB/Routes, כדי לא לקבע מחירי משלוח או לוח חגים ללא נתוני עסק מאומתים.
- applyPaidSale אינו בודק בעצמו תשלום שמור; נדרש תזמור מהימן ומניעת כפילויות.
- שגיאות וולידציה, Audit, הרשאות/קשרי DB וביטולים דורשים השלמה ב־O05–O13.

## בדיקות והפעלה

[פקודות ההרצה](../zis-api/README.md) ו־[תוצאות עדכניות](../IMPLEMENTATION_PROGRESS.md).
Typecheck עבר ב־24.09.2026. `npm test` נעצר לפני טעינת tests בשגיאת מערכת `uv_os_get_passwd / ENOMEM`; אין להסיק מכך pass. אין `psql` בסביבת העבודה, ולכן SQL ו־RLS טרם אומתו מול DB. קובץ Integration קיים אך לא הורץ מול DB ויש לתקן את ה־fixture לפני הפעלה.

אין לסמן שה־Backend “מוכן לייצור” על בסיס שלד זה. סדר ההשלמה ב־[תוכנית](../IMPLEMENTATION_PLAN.md).
