# תיעוד מימוש Backend — מצב חלקי

[אינדקס](../PLAN_INDEX.md) · [תיעוד מימוש](../DOCS_INDEX.md) · [פערים](../OPEN_ISSUES.md).
אומת בקריאת קוד ב־18.09.2026; אין כאן אישור לחיבור DB חי.

## רכיבים קיימים

| קובץ | אחריות |
|---|---|
| [server](../zis-api/src/server.ts) | bootstrap מותנה ב־PostgreSQL/Supabase |
| [app](../zis-api/src/app.ts) | Express, JSON, Health והזרקת נתיב Admin |
| [server-config](../zis-api/src/config/server-config.ts) | הפרדת כתובת פיתוח/ייצור |
| [health](../zis-api/src/routes/health.routes.ts) | GET /health בלבד |
| [Supabase client](../zis-api/src/auth/supabase.client.ts) | client שרת ללא Session דפדפן |
| [Auth resolver](../zis-api/src/auth/supabase-auth.resolver.ts) | Bearer token ומשתמש Admin פעיל |
| [Admin route](../zis-api/src/routes/admin-inventory.routes.ts) | POST /admin/inventory/:productVariantId/adjust |
| [Controller](../zis-api/src/controllers/admin-inventory.controller.ts) | קלט, הרשאה וקריאה לשירות |
| [Inventory service](../zis-api/src/inventory/inventory.service.ts) | עדכון, מכירה, חוסר והחזר |
| [Repository](../zis-api/src/inventory/postgres-inventory.repository.ts) | שאילתות SQL פרמטריות וטרנזקציה |
| [Pool](../zis-api/src/infrastructure/postgres.ts) | Pool/SqlClientFactory אמיתיים בקוד |
| [Domain status](../zis-api/src/domain/order-status.ts) | eligibility להכנה ומדיניות ביטול חלקית |

## גבולות המימוש

- ללא תלויות מוזרקות ב־createApp נתיב המלאי אינו נחשף. ב־server נוצרות התלויות רק כשיש הגדרות מתאימות.
- בפיתוח נבחר DATABASE_URL_TRN; בייצור DATABASE_URL. אין טעינה אוטומטית של קובץ סביבה בקוד שנבדק.
- בריאות השרת אינה readiness למסד; חסרים /health/live ו־/health/ready.
- Repository נועל Variant עם FOR UPDATE ומשתמש BEGIN/COMMIT/ROLLBACK.
- עדכון available_sets והיסטוריית before/after נעשים באותה טרנזקציה.
- Auth משתמש ב־getUser ומוודא admin_users פעיל; בדיקות HTTP משתמשות בספק מדומה.
- אין עדיין Catalog, Images, Shipping, Orders, Payments, Refund, PDF או Admin UI.
- applyPaidSale אינו בודק בעצמו תשלום שמור; נדרש תזמור מהימן ומניעת כפילויות.
- שגיאות וולידציה, Audit, הרשאות/קשרי DB וביטולים דורשים השלמה ב־O05–O13.

## בדיקות והפעלה

[פקודות ההרצה](../zis-api/README.md) ו־[תוצאות עדכניות](../IMPLEMENTATION_PROGRESS.md).
Typecheck עבר בסקירה; npm test נעצר בשגיאת מערכת לפני טעינת tests. קובץ Integration קיים אך לא הורץ מול DB בסקירה ויש לתקן את ה־fixture לפני הפעלה.

אין לסמן שה־Backend “מוכן לייצור” על בסיס שלד זה. סדר ההשלמה ב־[תוכנית](../IMPLEMENTATION_PLAN.md).
