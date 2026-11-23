# השלמת סקירת ארכיטקטורה פנימית — ZIS — 18.11.2026

[סקירת המערכת](ARCHITECTURE_REVIEW_2026-11-18.md) · [אינדקס](PLAN_INDEX.md) · [הנחיות](GUIDELINES.md) · [פערים](OPEN_ISSUES.md).

## למה נדרשה השלמה

הסקירה הראשונה מיפתה רכיבים ומסלולי הזמנה ותפעול, אך לא ערכה מעבר שיטתי על כפילות חוקים, ולידציית טוקנים, כיוון תלויות ומבנה התיקיות. המסמך הזה משלים את הבדיקה על עץ העבודה המקומי ב־commit `e6f8bd6` עם שינויים לא מחויבים. זו סקירה סטטית של משפחות הקוד המפורטות להלן, לא הוכחה שאין כפילות נוספת בכל פונקציה במאגר. לא שונו קובצי יישום, לא הופעלה מיגרציה ולא נבדקה סביבת Production.

## מפת תיקיות ואחריות בפועל

| שכבה | מצב ומיקום | הערכה |
|---|---|---|
| נקודות קצה | [`zis-api/src/routes`](../zis-api/src/routes/order.routes.ts) — 21 קובצי קוד; [`controllers`](../zis-api/src/controllers/order.controller.ts) — 17 | ההפרדה קיימת; בדיקות הרשאה וקלט מופיעות שוב בכמה controllers |
| Middleware | [`zis-api/src/middleware`](../zis-api/src/middleware/rate-limit.ts) — CORS, rate limit, request context, טיפול שגיאות | תיקייה נפרדת קיימת; הרשאת מנהלת אינה middleware משותף |
| לוגיקה עסקית | תיקיות תחום כגון [`commerce`](../zis-api/src/commerce/order.service.ts), [`operations`](../zis-api/src/operations/order-status.service.ts), [`catalog`](../zis-api/src/catalog/catalog.service.ts) | חלוקה לפי תחום טובה; סטטוסים והגדרות משוכפלים בין תחומים |
| נתונים | [`infrastructure/postgres.ts`](../zis-api/src/infrastructure/postgres.ts) לחיבור; לפחות 18 קובצי `*repository.ts` בתיקיות התחום | אין תיקיית DB אחת, אך repository ליד התחום הוא סידור תקין. ממשק SQL כללי ממוקם בטעות תחת מלאי |
| אבטחה וחוזים | [`auth`](../zis-api/src/auth/supabase-auth.resolver.ts), [`security`](../zis-api/src/security/confirmation-token.ts), [`contracts`](../zis-api/src/contracts/validation.ts) | תפקידים, טוקן אישור וולידציית קלט אינם מרוכזים מספיק |
| בדיקות | 51 קובצי `*.test.ts` לצד קוד API, [`src/integration`](../zis-api/src/integration/inventory.integration.test.ts); תיקיות [`storefront/tests`](../apps/storefront/tests/checkout.test.ts), [`admin-mobile/tests`](../apps/admin-mobile/tests/admin-ui.test.mjs), [`scripts/payment-review`](../scripts/payment-review/acceptance.test.mjs) | בדיקות API צמודות לקוד ובדיקות Frontend בתיקייה נפרדת — שתי שיטות תקינות. אין פקודת אימות אחת לכל החבילות |

לכן התשובה לשאלת התיקיות היא: **Middleware ונקודות קצה מופרדים; שכבת הנתונים מופרדת לפי תחום ולא בתיקיית DB אחת; בדיקות API צמודות לקוד, ואילו בדיקות Frontend ו־DB מבודד בתיקיות נפרדות.** אין צורך להעביר את כל ה־repositories או את כל הבדיקות לתיקייה אחת רק כדי להשיג אחידות חזותית. כן צריך לתקן בעלות על ממשקים משותפים ולתעד מפת ניווט קצרה.

## ממצאים של כפילות, גבולות והרשאות

עדכון 18.11.2026: תנאי כתיבת הגדרות מסחר דורש תפקיד מנהלת מפורש (I1). בהתאם להחלטת בעלת האתר, טווח המשלוח נקרא רק מההגדרה בניהול וללא ערך גיבוי (I3); המסד הפעיל טרם אומת. יתר הממצאים להלן נשארים פתוחים; הסקירה משמרת את תמונת המצב המקורית.

### I1 — גבוה: בדיקת תפקיד מנהלת משוכפלת ומאפשרת תפקיד לא צפוי

`withManager` ב־[`admin-commerce-settings.controller.ts:81`](../zis-api/src/controllers/admin-commerce-settings.controller.ts#L81) חוסם רק `delivery_driver` ב[שורה 86](../zis-api/src/controllers/admin-commerce-settings.controller.ts#L86), בעוד controllers אחרים דורשים במפורש `role === 'operations_manager'`, למשל [`admin-catalog.controller.ts:148`](../zis-api/src/controllers/admin-catalog.controller.ts#L148). טיפוס ה־resolver מאפשר `role` חסר ב־[`admin-inventory.controller.ts:11`](../zis-api/src/controllers/admin-inventory.controller.ts#L11). לפיכך זהו תנאי הרשאה שאינו fail closed: אם resolver מחזיר תפקיד חסר/לא מוכר, פעולות שינוי הגדרות, אזורים, כללים וסגירות עוברות את הבדיקה. [מיגרציה 006](../zis-db/migrations/006_operations_delivery_and_admin.sql) מגדירה CHECK לשני תפקידים, אם הוחלה בפועל; מצב הסכמה החיה לא אומת.

**תיקון ממוקד:** ליצור guard משותף ל־`operations_manager` ולדרוש שוויון מפורש בכל פעולת כתיבה. לבדוק `undefined`, תפקיד לא מוכר, נהג ומנהלת בכל נתיב רגיש; לא להסתמך על CHECK של DB כגבול ההרשאה היחיד. זו דוגמה שבה הכפילות כבר גרמה להבדל התנהגות.

### I2 — בינוני: לוגיקת טוקן אישור אינה מקור אמת אחד

[`security/confirmation-token.ts:9`](../zis-api/src/security/confirmation-token.ts#L9) מייצר טוקן אקראי ומחשב hash ב[שורה 22](../zis-api/src/security/confirmation-token.ts#L22), אך אין לו import מקוד ייצור. מסלול ההזמנה בפועל מייצר HMAC דטרמיניסטי ב־[`order.service.ts:9`](../zis-api/src/commerce/order.service.ts#L9) ומחזיק `sha256` משלו ב[שורה 63](../zis-api/src/commerce/order.service.ts#L63). פורמט הטוקן נבדק פעמיים בשירות, ב[שורות 31 ו־57](../zis-api/src/commerce/order.service.ts#L31); חילוץ Bearer משוכפל ב־[`order.controller.ts:6`](../zis-api/src/controllers/order.controller.ts#L6) וב[שורה 11](../zis-api/src/controllers/order.controller.ts#L11). זה לא מוכיח פרצת אבטחה נוכחית, אך מקשה לשנות מדיניות token בלי לייצר אי־התאמה.

**תיקון ממוקד:** להחליט תחילה אם דרוש טוקן דטרמיניסטי לשחזור Idempotency או טוקן אקראי עם מנגנון שחזור אחר; לא להחליף שיטה בשקט. אחר כך לאחד ולידציה, hash וחילוץ Bearer של **טוקן אישור אורח** במודול אחד ולמחוק/לעדכן helper לא בשימוש. טוקן Supabase של מנהלת הוא credential מסוג אחר ויישאר במסלול אימות נפרד. להוסיף בדיקות פורמט, תפוגה, ביטול ו־replay.

### I3 — בינוני: שתי קריאות להגדרות עסקיות יכולות להחזיר כלל שונה

מסך הניהול קורא `maxAdvanceDays` מתוך `system_defaults`, ובחסר מתוך `store_settings.max_advance_days` ב־[`postgres-commerce-settings.repository.ts:63`](../zis-api/src/operations/postgres-commerce-settings.repository.ts#L63). חישוב המסחר קורא את אותו key, אך בחסר משתמש ב־`7` ב־[`postgres-commerce.repository.ts:145`](../zis-api/src/commerce/postgres-commerce.repository.ts#L145), בלי לקרוא את עמודת החנות. אם key חסר ורשומת החנות מכילה ערך אחר, מנהלת רואה טווח אחד וה־Quote/תאריכים משתמשים באחר. עדכון רגיל מנסה לכתוב את שני המקומות, לכן התרחיש מותנה בנתונים חסרים/חלקיים; מצב DB לא אומת. שתי הפונקציות גם משכפלות `readDefault` ו־`readNullableDefault`.

**תיקון ממוקד:** להגדיר מקור אמת ו־fallback אחד למדיניות משלוח/תאריך, ולהשתמש באותה פונקציית קריאה לניהול ולמסחר. לבדוק system default חסר, ערך שונה ב־store settings ועדכון מנהלת מול Quote.

### I4 — בינוני: כללי מעבר סטטוס כתובים בשלושה מקומות

[`dashboard/order-transitions.ts:3`](../zis-api/src/dashboard/order-transitions.ts#L3), [`postgres-order-status.repository.ts:43`](../zis-api/src/operations/postgres-order-status.repository.ts#L43) ו־[`HomeStageChart.tsx:12`](../apps/admin-mobile/src/features/home/HomeStageChart.tsx#L12) מכילים את רצף השלבים. כרגע הרצף תואם, והשרת אוכף תשלום לפני הכנה ב־[`postgres-order-status.repository.ts:42`](../zis-api/src/operations/postgres-order-status.repository.ts#L42). שינוי עתידי בשלב מחייב עדכון שלוש גרסאות, אחרת UI עשוי להציע פעולה שהשרת דוחה או להסתיר פעולה מותרת.

**תיקון ממוקד:** להגדיר פונקציית transition אחת בצד השרת לשינוי ולרשימת `allowedNextStatuses`; במסך הבית להשתמש ביכולת שה־API מחזיר או בחוזה משותף נבדק. להשאיר תוויות וצבעים ב־UI. להוסיף בדיקת חוזה בין היכולת המוצגת לבין פעולת ה־POST.

### I5 — בינוני: ממשק DB כללי תלוי במודול המלאי

[`infrastructure/postgres.ts:2`](../zis-api/src/infrastructure/postgres.ts#L2) הוא אחד מ־27 קובצי ייצור שמייבאים `SqlClient` או `SqlClientFactory` מתוך [`inventory/postgres-inventory.repository.ts:14`](../zis-api/src/inventory/postgres-inventory.repository.ts#L14). תשתית הנתונים ו־repositories של תחומים אחרים תלויים לכן בשם ובמיקום של repository מלאי. זו תלות בכיוון הפוך שמקשה לאתר את חוזה DB הכללי ולשנותו.

**תיקון ממוקד:** להעביר רק את ממשקי `SqlClient`/`SqlClientFactory` למודול תשתית כגון `infrastructure/db/sql-client.ts` ולעדכן imports. להשאיר repositories בתיקיות התחום; אין צורך בתיקיית DB אחת לכל השאילתות.

### I6 — בינוני: חוזי API בין השרת ללקוחות מועתקים ידנית

השרת מגדיר `OrderConfirmationResponse.isTest?` כאופציונלי ב־[`commerce.contracts.ts:70`](../zis-api/src/contracts/commerce.contracts.ts#L70), בעוד החנות מגדירה אותו כחובה ב־[`checkout.types.ts:19`](../apps/storefront/src/features/checkout/checkout.types.ts#L19). השרת מחזיר ערך בפועל כששאילתת DB תקינה, אך TypeScript של שני Builds לא מזהה אי־התאמה כזאת. מוק חסר `isTest` כבר גרם לכשל בדיקת החנות בסקירה הקודמת עד שתוקן.

**תיקון ממוקד:** לקבוע חוזה תשובה משותף או בדיקות חוזה מול payload אמיתי ליצירה, אישור, סטטוס ותשלום. להפריד שדות שתמיד קיימים משדות של נתיבי ניסוי, ולהוסיף בדיקה של לקוח מול תגובת השרת. אין צורך בחבילת types גדולה לפני שמזהים חוזים שחוצים Builds.

### I7 — נמוך/בינוני: מסלול בדיקות אחד אינו מכסה את כל המערכת

[`zis-api/package.json:11`](../zis-api/package.json#L11) מריץ בדיקות API ב־`src`; בדיקות PGlite נמצאות ב־[`scripts/payment-review/package.json:6`](../scripts/payment-review/package.json#L6), ובדיקות שני הממשקים בסקריפטים נפרדים. אין `package.json` בשורש המאגר ואין פקודת `verify` אחת. לכן `npm test` מתוך רכיב בודד אינו אומר שכל השכבות עברו; זהו פער שער בדיקות, לא טענה שהבדיקות עצמן נכשלות.

**תיקון ממוקד:** לתעד או להוסיף פקודת verify אחת שמריצה typecheck, בדיקות יחידה, בדיקות DB מבודד ובדיקות חוזה לפי שערי ההשקה. אפשר להשאיר בדיקות יחידה ליד הקוד ובדיקות אינטגרציה בתיקייה ייעודית; מיקום פיזי אחיד אינו המדד לאיכות.

### I8 — בינוני: Store של Checkout מרכז יותר מדי אחריות

[`checkout.store.ts`](../apps/storefront/src/features/checkout/checkout.store.ts) הוא 355 שורות ומחזיק בחירת משלוח ו־Quote, יצירה, עריכת pending, כניסת מנהלת, אישור תשלום ניסוי ושחזור. אלה גבולות שינוי שונים בתוך מחלקה אחת; ממצא [A4](ARCHITECTURE_REVIEW_2026-11-18.md) של ניקוי סל בכל `refreshConfirmation` מדגים איך שינוי בהתאוששות משפיע על עריכת pending. זה אינו כשל רק בגלל אורך הקובץ.

**תיקון ממוקד:** להשאיר Store מתאם דק ולחלץ פעולות תשלום ניסוי, התאוששות ועריכת pending לפונקציות/שירותים ממוקדים עם קלט ופלט ברורים; לשמור בדיקות התנהגות לפני הפיצול ולוודא שלא נוצר מצב כפול.

### I9 — בינוני: שני מחזורי imports בזמן ריצה

סריקת 212 קובצי ייצור של שלושת היישומים ו־594 קשרי import יחסיים מצאה שני מחזורים, שאומתו בקריאת imports: [`postgres-admin-catalog.repository.ts:2`](../zis-api/src/catalog/postgres-admin-catalog.repository.ts#L2) מייבא את `postgres-catalog-management.repository.ts`, שמייבא ממנו `withTransaction` ו־`insertAudit` ב[שורה 4](../zis-api/src/catalog/postgres-catalog-management.repository.ts#L4); [`postgres-commerce.repository.ts:8`](../zis-api/src/commerce/postgres-commerce.repository.ts#L8) מייבא `delivery-dates.ts`, שמייבא ממנו `readSettings` ב[שורה 2](../zis-api/src/commerce/delivery-dates.ts#L2). אלו imports של ערכים בזמן ריצה, לא טיפוסים בלבד. לא נמצאה בסקירה זו תקלה באתחול, אך המחזורים מקשים לזהות בעלות ועלולים להישבר אם יתווסף קוד אתחול בראש מודול.

**תיקון ממוקד:** להעביר transaction/audit משותפים למודול תשתית עצמאי ואת קריאת הגדרות התאריך למודול נתונים חד־כיווני. לבדוק בנייה ובדיקות קטלוג/מסחר, ולהריץ שוב בדיקת מחזורי imports. אין צורך לפצל שירותים בגלל עצם מספר הקבצים.

## זיהוי מהיר ותוכנית שיפור פנימית

1. **מיד:** לתקן I1 ולבדוק הרשאה לכל פעולה רגישה, משום שזה פער התנהגות בין guards. לתקן I3 או לפחות לאמת ב־DB ששני מקורות הגדרות התאריך עקביים.
2. **לפני שינוי טוקנים/סטטוסים:** להחליט על מדיניות שחזור, לאחד I2 ו־I4 ולכתוב בדיקות חוזה. אין לשנות יצירת token קיימת בלי תוכנית לתוקף ואישור הזמנות שכבר נוצרו.
3. **שיפור ניווט ללא רה־ארגון גורף:** להעביר את חוזה SQL הכללי (I5), ליצור מפת תיקיות קצרה ב־README/מסמך ארכיטקטורה, ולהגדיר naming: `routes` לנתיבים, `controllers` ל־HTTP/הרשאות, `*.service.ts` לחוקים, `postgres-*.repository.ts` לגישה לנתונים, `middleware` לרכיבי HTTP רוחביים. בדיקות API יכולות להישאר צמודות לקוד.
4. **שער איכות:** לקשור את ארבעת runners (API, Storefront, Admin, PGlite) לפקודת verify/CI, לטפל ב־I6 ובמחזורי I9, ואז לפצל את I8 עם בדיקות רגרסיה. כל שינוי במבנה חייב לשמור על כיוון התלות והיכולת לאתר במהירות את בעל החוק.

## גבולות האימות

נסקרו משפחות הכפילות: אישור אורח ומנהל, guard תפקידים, defaults של הגדרות מסחר, מעבר סטטוסים, pagination וחוזי הזמנה. בוצעו חיפוש imports ומיפוי קבצים; סריקת imports יחסיים מצאה שני מחזורי runtime, אך אינה כוללת imports דינמיים או חבילות חיצוניות. לא הופעל כלי לזיהוי כפילות סמנטית בכל פונקציה, ולכן אין טענה שהרשימה ממצה. שלוש בדיקות TypeScript ו־19/19 בדיקות API ממוקדות עברו בסקירה הראשית; לא הורצו בדיקות ייעודיות לממצאים I1–I9 או בדיקת DB/דפדפן חיה. [הבדיקות והגבולות המלאים](ARCHITECTURE_REVIEW_2026-11-18.md).
