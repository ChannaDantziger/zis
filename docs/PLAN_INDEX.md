# אינדקס מרכזי — ZIS

עודכן ב־18.10.2026. זהו שער הכניסה לכל מסמכי העבודה במאגר.
כל קישור מציין מה קוראים ולשם מה; תיקיות שטרם קיימות מסומנות כתכנון בלבד.

## מתחילים כאן

1. [README](../README.md) — מטרת החנות והמצב הנוכחי.
2. [כללי המאגר](../AGENTS.md) ו־[guidelines](GUIDELINES.md) — בטיחות, מבנה קוד ועד 320 שורות.
3. [תוכנית העבודה](IMPLEMENTATION_PLAN.md) — סדר הבנייה המלא ותנאי סיום.
4. [דוח הסקירה](SYSTEM_AUDIT.md) — ממצאי קוד/HTML, בדיקות והתאמה להנחיות.
5. [נושאים פתוחים](OPEN_ISSUES.md) — תקלות והחלטות עם אחראי ושלב חסום.
6. [משימות בעלת האתר](OWNER_ACTIONS.md) — מה נדרש ממך ומתי, כולל Docker ואירוח.

## איך בוחרים מסמך למשימה

| המשימה | נקודת התחלה |
|---|---|
| בניית החנות ושליפת מוצרים ותמונות | [דרישות חנות](planning/STOREFRONT_REQUIREMENTS.md), P1–P4 |
| הנגשת אתר הלקוחות | [תוכנית נגישות](ACCESSIBILITY_PLAN.md), P3/P8 |
| שיפור HTML ופיצול לקומפוננטות | [תוכנית Frontend](FRONTEND_BUILD_PLAN.md), [מפת רכיבים](FRONTEND_ARCHITECTURE.md) |
| עגלה, הזמנה, תשלום ומשלוח | [Commerce](BACKEND_COMMERCE.md), P5–P7 והפערים הרלוונטיים |
| ניהול, הכנה, אריזה ומשלוח | [דרישות חנות](planning/STOREFRONT_REQUIREMENTS.md), P7 |
| Docker, פריסה וגיבויים | [תוכנית מסירה](planning/DELIVERY_AND_DOCUMENTATION.md), P8–P9 |
| פתיחת שיחת עבודה | [START_NEW_CHAT](START_NEW_CHAT.md) |

## כללי מקור אמת

- הוראות המשתמש וכללי הבטיחות קודמים למסמכי התכנון.
- [החלטות קיימות](planning/DECISIONS.md) מרכזות כללי עסק מתועדים. סתירה ב־[OPEN_ISSUES](OPEN_ISSUES.md) נשארת פתוחה; תאריך מסמך אינו הכרעה עסקית.
- [IMPLEMENTATION_PLAN](IMPLEMENTATION_PLAN.md) קובע סדר עבודה; מסמכים תחומיים מספקים פרטים.
- קוד ובדיקות מוכיחים מימוש; מסמך תכנון אינו מוכיח שהמערכת עובדת.
- `docs/archive/` הוא הקשר היסטורי בלבד. אין לבצע הוראות ישנות במקום התוכנית הנוכחית.
- מעדכנים התקדמות במהלך העבודה; תיעוד מימוש ותפעול סופי נכתב לאחר אימות ובמסירת המערכת.

## תכנון וניהול עבודה

| מסמך | מה הוא מכיל | סוג |
|---|---|---|
| [README](../README.md) | תקציר מצב וקישור לאינדקס | כניסה |
| [PLAN_INDEX](PLAN_INDEX.md) | מסמכי המאגר ומפת ניווט | אינדקס ראשי |
| [AGENTS](../AGENTS.md) | בטיחות, ניווט ותחזוקת תיעוד | מחייב |
| [GUIDELINES](GUIDELINES.md) | עותק מקומי להנחיות Frontend/Backend/general | מחייב |
| [IMPLEMENTATION_PLAN](IMPLEMENTATION_PLAN.md) | P0–P9, אחריות ותנאי קבלה | תוכנית ראשית |
| [NEXT_PHASE_PLAN](NEXT_PHASE_PLAN.md) | תור עבודה עדכני לפי מצב Production והשלב הבא | ניווט |
| [ACCESSIBILITY_PLAN](ACCESSIBILITY_PLAN.md) | תקן ישראלי, סקירת קוד ראשונית, שלבי הנגשה ובדיקות קבלה לאתר הלקוחות | תוכנית 18.10; טרם בוצעה בדיקת נגישות מלאה |
| [DECISIONS](planning/DECISIONS.md) | כללים קיימים והרחבות עתידיות | החלטות |
| [DECISION_EXPLANATIONS](planning/DECISION_EXPLANATIONS.md) | הסבר פשוט לסעיפים 1–13, הוראות מ־22.09 והבחירות שנותרו | החלטות והצעות נפרדות |
| [OPERATIONS_EXCEPTIONS](planning/OPERATIONS_EXCEPTIONS.md) | כל תרחישי חוסר, חלופה, ביטול לאחר אריזה וטיפול בכסף | מפרט והכרעות שנותרו |
| [ADMIN_MOBILE_SPEC](planning/ADMIN_MOBILE_SPEC.md) | שלושת מסכי הליבה בניהול נייד: מסלול היום, הזמנות וייצור | מפרט יעד והחלטות 24.09 |
| [OPERATIONS_DELIVERY_PLAN](planning/OPERATIONS_DELIVERY_PLAN.md) | תאריכי אספקה, סגירת חנות, סטטוסים, מסמכי PDF, התראות, הרשאות ועצי בדיקה | מפרט ותור עבודה 24.09 |
| [ADMIN_COMMERCE_SETTINGS](ADMIN_COMMERCE_SETTINGS.md) | מסך ניהול וממשקי Backend למחירי משלוח, שעת יציאה, cutoff, מינימום וסגירות | מימוש 08.10; מיגרציות דווחו כהחלה ידנית ב־Production ללא ledger |
| [LIVE_CONNECTION_RUNBOOK](LIVE_CONNECTION_RUNBOOK.md) | נקודת החיבור החי, משתני סביבה, schema, בדיקות API וגבולות המימוש | Runbook 08.10; Production משתמש ב־DATABASE_URL |
| [VISUAL_REVIEW](planning/VISUAL_REVIEW.md) | תצוגת זיס, צילומי דפדפן, תיקונים והמלצות לפני פיצול לרכיבים | סקירה חזותית |
| [STORE_CONTENT_AND_GALLERY](planning/STORE_CONTENT_AND_GALLERY.md) | מקור הנתונים, תצוגת חמש תמונות אירועים, כרטיסים וכתובת משלוח | החלטות ומבחני קבלה 24.09 |
| [Preview README](../prototypes/zis-review/README.md) | הפעלת עותק הבדיקה, מקורות, יצירה מחדש ומגבלות | אב־טיפוס |
| [OPEN_ISSUES](OPEN_ISSUES.md) | פערים, סתירות ותנאי סגירה | פתוח |
| [OWNER_ACTIONS](OWNER_ACTIONS.md) | תוכן, החלטות, חשבונות והשקה | משימות שלך |
| [STOREFRONT_REQUIREMENTS](planning/STOREFRONT_REQUIREMENTS.md) | כיסוי קטלוג, תמונות, רכישה ותפעול | מפרט |
| [DELIVERY_AND_DOCUMENTATION](planning/DELIVERY_AND_DOCUMENTATION.md) | Docker, סביבות, CI, גיבוי ותיעוד בסוף | תוכנית מסירה |
| [START_NEW_CHAT](START_NEW_CHAT.md) | מודל מומלץ, סדר קריאה והוראת המשך מסונכרנת | עזר עבודה |

## ארכיטקטורה ונתונים

| מסמך | מה הוא מכיל |
|---|---|
| [FRONTEND_ARCHITECTURE](FRONTEND_ARCHITECTURE.md) | React, Mantine, MobX, API client, מסכים ומפת רכיבים |
| [FRONTEND_BUILD_PLAN](FRONTEND_BUILD_PLAN.md) | מעבר מ־HTML ליישומים נפרדים |
| [FRONTEND_ACCEPTANCE](planning/FRONTEND_ACCEPTANCE.md) | המשך תוכנית Frontend: גבולות, QA ותנאי קבלה |
| [BACKEND_ARCHITECTURE](BACKEND_ARCHITECTURE.md) | עקרונות Backend וקישורים לתחומים |
| [BACKEND_COMMERCE](BACKEND_COMMERCE.md) | מוצרים, Cart, הזמנות, תשלום, מלאי ומשלוח |
| [BACKEND_OPERATIONS](BACKEND_OPERATIONS.md) | אבטחה, הרשאות, ניטור ואמינות |
| [API_CONTRACTS](API_CONTRACTS.md) | חוזי API P1: קטלוג, מדיה, משלוח, Quote, הזמנה ושגיאות |
| [ERD_SCHEMA](ERD_SCHEMA.md) | עקרונות, תרשים ראשוני וקישורים לפירוט שפוצל |
| [CATALOG schema](schema/CATALOG.md) | קטגוריות, מוצרים, וריאציות ותמונות |
| [EVENT_GALLERY schema](schema/EVENT_GALLERY.md) | טבלת ניהול נפרדת לתמונות אירועים ו־Storage |
| [STORAGE schema](schema/STORAGE.md) | Buckets, העלאה, URL חתום, מגבלות והרשאות |
| [SHIPPING schema](schema/SHIPPING.md) | משלוחים, כללים, הגדרות וסגירות |
| [ORDERS schema](schema/ORDERS.md) | הזמנות, פריטים, סטטוסים, תשלומים וחשבוניות |
| [INVENTORY_ADMIN schema](schema/INVENTORY_ADMIN.md) | תנועות מלאי, מנהלים ו־Audit |
| [POLICIES_AND_UPDATES](schema/POLICIES_AND_UPDATES.md) | קשרים, RLS ועדכוני החלטות לסכמה |
| [INVENTORY_MODEL](INVENTORY_MODEL.md) | מלאי, קיבולת, הקצאות, התראות ו־Defaults |
| [ERD_COMPARISON](ERD_COMPARISON.md) | השוואה היסטורית; יש לקרוא עם הפערים העדכניים |

## מימוש, סקירה והפעלה

| מסמך | מה הוא מכיל |
|---|---|
| [DEVELOPMENT](DEVELOPMENT.md) | התקנה והרצה ב־DEV, שני טרמינלים, תצורה, בדיקות ובנייה; סקריפטים אומתו ב־08.10 |
| [DOCS_INDEX](DOCS_INDEX.md) | מימוש קיים ותיעוד סופי עתידי |
| [SYSTEM_AUDIT](SYSTEM_AUDIT.md) | ראיות מהסקירה, HTML, guidelines ובדיקות |
| [IMPLEMENTATION_PROGRESS](IMPLEMENTATION_PROGRESS.md) | מצב עבודה מאומת ותוצאות אחרונות |
| [ORDER_CREATION](ORDER_CREATION.md) | יצירת הזמנה אטומית, Idempotency ואישור אורח; מיגרציה 010 ותצורה טרם הופעלו |
| [STOREFRONT_CHECKOUT](STOREFRONT_CHECKOUT.md) | מסך הזמנה, חישוב שרת וניסיון חוזר; ללא ספק תשלום |
| [STOREFRONT_IMPLEMENTATION](STOREFRONT_IMPLEMENTATION.md) | בית, קטלוג, מוצר, עגלה וגלריות מ־09.10; אימות מקומי וגבולות P3/P4 |
| [Storefront README](../apps/storefront/README.md) | התקנה, הרצה ואימות יישום החנות העצמאי |
| [ADMIN_VERIFICATION](ADMIN_VERIFICATION.md) | סדר עבודה שחולץ, תיקוני Admin, בדיקות מקומיות וגבולות האימות מ־08.10 |
| [ADMIN_NOTIFICATIONS](ADMIN_NOTIFICATIONS.md) | תיבת התראות אישית, העדפות ו־Audit; בדיקות מקומיות, אימות חי פתוח |
| [ADMIN_INVENTORY](ADMIN_INVENTORY.md) | מלאי זמין, קיבולת, היסטוריה וטופס התאמה; מילוי שבועי טרם מומש |
| [ADMIN_CATALOG](ADMIN_CATALOG.md) | ניהול מוצרים פשוטים/מורכבים, קטגוריות, תמונות וגלריה כללית; typecheck ובדיקות ממוקדות, אימות DB/Storage ופריסה פתוחים |
| [ADMIN_UX_SIMPLIFICATION](ADMIN_UX_SIMPLIFICATION.md) | פישוט קטלוג עם פירורי לחם, עריכה רגילה/מתקדמת, הגדרות ומסכים יומיומיים; אימות מקומי 21.10, דפדפן חי פתוח |
| [ADMIN_OPERATION_REPORTS](ADMIN_OPERATION_REPORTS.md) | תוויות אריזה ורשימת אספקה, בחירה מדויקת והדפסה; בדיקות מקומיות, אימות חי פתוח |
| [ADMIN_QUALITY_AUDIT](ADMIN_QUALITY_AUDIT.md) | הרשאות מנהל, התראות אישיות, בידוד Session ותאריכים; בדיקות ממוקדות מקומיות |
| [ADMIN_PRODUCTION_REPORT](ADMIN_PRODUCTION_REPORT.md) | רשימת ייצור להדפסה/שמירה כ־PDF בדפדפן; תצוגה ריקה ופתיחת הדפסה אומתו, PDF עם נתונים פתוח |
| [ADMIN_ORDERS](ADMIN_ORDERS.md) | עימוד וסינון וריאציה, הרשאות ובדיקות; טעינת הנתיב החדש אומתה במצב ריק; בדיקה עם נתונים פתוחה |
| [ADMIN_TASKS](ADMIN_TASKS.md) | יצירה וסגירת משימות ידניות, עימוד, הרשאות ו־Audit; אימות DB עדיין פתוח |
| [BACKEND_IMPLEMENTATION](BACKEND_IMPLEMENTATION.md) | רכיבי API, מגבלות וחיבור מותנה למסד |
| [LIVE_CONNECTION_RUNBOOK](LIVE_CONNECTION_RUNBOOK.md) | סדר חיבור DB/Supabase/API ודגשי אימות | Runbook |
| [INVENTORY_AND_STATUS](INVENTORY_AND_STATUS.md) | ההתנהגות הנוכחית של מלאי וסטטוסים |
| [zis-api README](../zis-api/README.md) | פקודות הרצה וגבולות השרת |
| [zis-db README](../zis-db/README.md) | שלוש עשרה מיגרציות forward-only; 012–013 הוחלו לפי דיווח בעלת האתר, 010–011 טרם אומתו |
| [scripts README](../scripts/README.md) | הכנת קבצים ובדיקת התיעוד |
| [.codex README](../.codex/README.md) | תיאור פרופיל הרשאות מקומי |

## Skills מקומיים

| Skill | מה הוא עושה |
|---|---|
| [product-photo-studio](../product-photo-studio/SKILL.md) | עיבוד תמונות מוצר באופן נאמן ועדין |
| [product-photo-studio README](../product-photo-studio/README.md) | סקירה ותפעול של מיומנות עיבוד תמונות מוצר |
| [product-description-from-photo](../product-description-from-photo/SKILL.md) | כתיבת תיאור מוצר בשפה פשוטה מתוך תמונה ופרטים מאומתים |
| [product-description-from-photo README](../product-description-from-photo/README.md) | סקירה ותפעול של מיומנות כתיבת תיאור מוצר |

## ארכיון — נשמר למניעת אובדן דרישות

| מסמך | תוכן שנשמר | מעמד |
|---|---|---|
| [INITIAL_REQUIREMENTS](archive/INITIAL_REQUIREMENTS.md) | האפיון מ־README הישן | היסטורי; כולל החלטות שהוחלפו |
| [INITIAL_ROADMAP](archive/INITIAL_ROADMAP.md) | Roadmap ועדכונים מ־README הישן | היסטורי |
| [INITIAL_DATA_PLAN](archive/INITIAL_DATA_PLAN.md) | NEXT_PHASE_PLAN הישן: נתונים | היסטורי |
| [INITIAL_DELIVERY_PLAN](archive/INITIAL_DELIVERY_PLAN.md) | המשכו: API, Admin, תפעול והרחבות | היסטורי |

## מקורות שאינם Markdown

| מקור | מה נמצא בו / איך משתמשים |
|---|---|
| [source-standalone.html](../prototypes/zis-review/source-standalone.html) | עותק במאגר של מקור התצוגה היחיד שנבחר ב־24.09; קובץ המקור החיצוני לא נערך |
| [001](../zis-db/migrations/001_initial_zis_schema.sql), [002](../zis-db/migrations/002_seed_base_data.sql), [003](../zis-db/migrations/003_business_decisions.sql), [004](../zis-db/migrations/004_inventory_history_without_delta.sql), [005](../zis-db/migrations/005_event_gallery_images.sql), [006](../zis-db/migrations/006_operations_delivery_and_admin.sql), [007](../zis-db/migrations/007_p1_storage_and_confirmation.sql), [008](../zis-db/migrations/008_admin_commerce_settings.sql), [009](../zis-db/migrations/009_initialize_store_settings.sql), [010](../zis-db/migrations/010_order_creation_idempotency.sql), [011](../zis-db/migrations/011_simple_products_catalog_media.sql), [012](../zis-db/migrations/012_minimum_product_subtotal.sql), [013](../zis-db/migrations/013_event_gallery_featured_image.sql) | SQL; דורש אימות ledger ב־Production ושינוי מאושר לפני הרצה |
| [010](../zis-db/migrations/010_order_creation_idempotency.sql) | Idempotency ביצירת הזמנה; נוסף למאגר בלבד, טרם הורץ |
| [package.json](../zis-api/package.json) | תלויות וסקריפטים ל־API |
| [prepare-file-for-llm](../scripts/prepare-file-for-llm.ps1) | הכנת עותק בטוח; קוראים רק PreparedPath |
| [check-docs](../scripts/check-docs.ps1) | בדיקת אורכים, קישורים וכיסוי כל MD באינדקס |

קישורי המקור החיצוניים מקומיים למחשב זה; עותק ההנחיות ועותקי HTML לבדיקה נמצאים במאגר. שני קובצי לוגו זיס נבדקו ושולבו בתצוגה ב־22–23.09. יתר נכסי המקור ו־Word/PDF לא נבדקו כמקורות דרישות מחייבים.
