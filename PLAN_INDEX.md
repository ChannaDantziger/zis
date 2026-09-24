# אינדקס מרכזי — ZIS

עודכן ב־24.09.2026. זהו שער הכניסה לכל מסמכי העבודה במאגר.
כל קישור מציין מה קוראים ולשם מה; תיקיות שטרם קיימות מסומנות כתכנון בלבד.

## מתחילים כאן

1. [README](README.md) — מטרת החנות והמצב הנוכחי.
2. [כללי המאגר](AGENTS.md) ו־[guidelines](docs/GUIDELINES.md) — בטיחות, מבנה קוד ועד 320 שורות.
3. [תוכנית העבודה](IMPLEMENTATION_PLAN.md) — סדר הבנייה המלא ותנאי סיום.
4. [דוח הסקירה](docs/SYSTEM_AUDIT.md) — ממצאי קוד/HTML, בדיקות והתאמה להנחיות.
5. [נושאים פתוחים](OPEN_ISSUES.md) — תקלות והחלטות עם אחראי ושלב חסום.
6. [משימות בעלת האתר](OWNER_ACTIONS.md) — מה נדרש ממך ומתי, כולל Docker ואירוח.

## איך בוחרים מסמך למשימה

| המשימה | נקודת התחלה |
|---|---|
| בניית החנות ושליפת מוצרים ותמונות | [דרישות חנות](docs/planning/STOREFRONT_REQUIREMENTS.md), P1–P4 |
| שיפור HTML ופיצול לקומפוננטות | [תוכנית Frontend](FRONTEND_BUILD_PLAN.md), [מפת רכיבים](FRONTEND_ARCHITECTURE.md) |
| עגלה, הזמנה, תשלום ומשלוח | [Commerce](BACKEND_COMMERCE.md), P5–P7 והפערים הרלוונטיים |
| ניהול, הכנה, אריזה ומשלוח | [דרישות חנות](docs/planning/STOREFRONT_REQUIREMENTS.md), P7 |
| Docker, פריסה וגיבויים | [תוכנית מסירה](docs/planning/DELIVERY_AND_DOCUMENTATION.md), P8–P9 |
| פתיחת שיחת עבודה | [START_NEW_CHAT](START_NEW_CHAT.md) |

## כללי מקור אמת

- הוראות המשתמש וכללי הבטיחות קודמים למסמכי התכנון.
- [החלטות קיימות](docs/planning/DECISIONS.md) מרכזות כללי עסק מתועדים. סתירה ב־[OPEN_ISSUES](OPEN_ISSUES.md) נשארת פתוחה; תאריך מסמך אינו הכרעה עסקית.
- [IMPLEMENTATION_PLAN](IMPLEMENTATION_PLAN.md) קובע סדר עבודה; מסמכים תחומיים מספקים פרטים.
- קוד ובדיקות מוכיחים מימוש; מסמך תכנון אינו מוכיח שהמערכת עובדת.
- `docs/archive/` הוא הקשר היסטורי בלבד. אין לבצע הוראות ישנות במקום התוכנית הנוכחית.
- מעדכנים התקדמות במהלך העבודה; תיעוד מימוש ותפעול סופי נכתב לאחר אימות ובמסירת המערכת.

## תכנון וניהול עבודה

| מסמך | מה הוא מכיל | סוג |
|---|---|---|
| [README](README.md) | תקציר מצב וקישור לאינדקס | כניסה |
| [PLAN_INDEX](PLAN_INDEX.md) | מסמכי המאגר ומפת ניווט | אינדקס ראשי |
| [AGENTS](AGENTS.md) | בטיחות, ניווט ותחזוקת תיעוד | מחייב |
| [GUIDELINES](docs/GUIDELINES.md) | עותק מקומי להנחיות Frontend/Backend/general | מחייב |
| [IMPLEMENTATION_PLAN](IMPLEMENTATION_PLAN.md) | P0–P9, אחריות ותנאי קבלה | תוכנית ראשית |
| [NEXT_PHASE_PLAN](NEXT_PHASE_PLAN.md) | הפעולות הקרובות | ניווט |
| [DECISIONS](docs/planning/DECISIONS.md) | כללים קיימים והרחבות עתידיות | החלטות |
| [DECISION_EXPLANATIONS](docs/planning/DECISION_EXPLANATIONS.md) | הסבר פשוט לסעיפים 1–13, הוראות מ־22.09 והבחירות שנותרו | החלטות והצעות נפרדות |
| [OPERATIONS_EXCEPTIONS](docs/planning/OPERATIONS_EXCEPTIONS.md) | כל תרחישי חוסר, חלופה, ביטול לאחר אריזה וטיפול בכסף | מפרט והכרעות שנותרו |
| [ADMIN_MOBILE_SPEC](docs/planning/ADMIN_MOBILE_SPEC.md) | שלושת מסכי הליבה בניהול נייד: מסלול היום, הזמנות וייצור | מפרט יעד והחלטות 24.09 |
| [OPERATIONS_DELIVERY_PLAN](docs/planning/OPERATIONS_DELIVERY_PLAN.md) | תאריכי אספקה, סגירת חנות, סטטוסים, מסמכי PDF, התראות, הרשאות ועצי בדיקה | מפרט ותור עבודה 24.09 |
| [VISUAL_REVIEW](docs/planning/VISUAL_REVIEW.md) | תצוגת זיס, צילומי דפדפן, תיקונים והמלצות לפני פיצול לרכיבים | סקירה חזותית |
| [STORE_CONTENT_AND_GALLERY](docs/planning/STORE_CONTENT_AND_GALLERY.md) | מקור הנתונים, תצוגת חמש תמונות אירועים, כרטיסים וכתובת משלוח | החלטות ומבחני קבלה 24.09 |
| [Preview README](prototypes/zis-review/README.md) | הפעלת עותק הבדיקה, מקורות, יצירה מחדש ומגבלות | אב־טיפוס |
| [OPEN_ISSUES](OPEN_ISSUES.md) | פערים, סתירות ותנאי סגירה | פתוח |
| [OWNER_ACTIONS](OWNER_ACTIONS.md) | תוכן, החלטות, חשבונות והשקה | משימות שלך |
| [STOREFRONT_REQUIREMENTS](docs/planning/STOREFRONT_REQUIREMENTS.md) | כיסוי קטלוג, תמונות, רכישה ותפעול | מפרט |
| [DELIVERY_AND_DOCUMENTATION](docs/planning/DELIVERY_AND_DOCUMENTATION.md) | Docker, סביבות, CI, גיבוי ותיעוד בסוף | תוכנית מסירה |
| [START_NEW_CHAT](START_NEW_CHAT.md) | סדר קריאה והוראת המשך | עזר עבודה |

## ארכיטקטורה ונתונים

| מסמך | מה הוא מכיל |
|---|---|
| [FRONTEND_ARCHITECTURE](FRONTEND_ARCHITECTURE.md) | React, Mantine, MobX, API client, מסכים ומפת רכיבים |
| [FRONTEND_BUILD_PLAN](FRONTEND_BUILD_PLAN.md) | מעבר מ־HTML ליישומים נפרדים |
| [FRONTEND_ACCEPTANCE](docs/planning/FRONTEND_ACCEPTANCE.md) | המשך תוכנית Frontend: גבולות, QA ותנאי קבלה |
| [BACKEND_ARCHITECTURE](BACKEND_ARCHITECTURE.md) | עקרונות Backend וקישורים לתחומים |
| [BACKEND_COMMERCE](BACKEND_COMMERCE.md) | מוצרים, Cart, הזמנות, תשלום, מלאי ומשלוח |
| [BACKEND_OPERATIONS](BACKEND_OPERATIONS.md) | אבטחה, הרשאות, ניטור ואמינות |
| [API_CONTRACTS](docs/API_CONTRACTS.md) | חוזי API P1: קטלוג, מדיה, משלוח, Quote, הזמנה ושגיאות |
| [ERD_SCHEMA](ERD_SCHEMA.md) | עקרונות, תרשים ראשוני וקישורים לפירוט שפוצל |
| [CATALOG schema](docs/schema/CATALOG.md) | קטגוריות, מוצרים, וריאציות ותמונות |
| [EVENT_GALLERY schema](docs/schema/EVENT_GALLERY.md) | טבלת ניהול נפרדת לתמונות אירועים ו־Storage |
| [STORAGE schema](docs/schema/STORAGE.md) | Buckets, העלאה, URL חתום, מגבלות והרשאות |
| [SHIPPING schema](docs/schema/SHIPPING.md) | משלוחים, כללים, הגדרות וסגירות |
| [ORDERS schema](docs/schema/ORDERS.md) | הזמנות, פריטים, סטטוסים, תשלומים וחשבוניות |
| [INVENTORY_ADMIN schema](docs/schema/INVENTORY_ADMIN.md) | תנועות מלאי, מנהלים ו־Audit |
| [POLICIES_AND_UPDATES](docs/schema/POLICIES_AND_UPDATES.md) | קשרים, RLS ועדכוני החלטות לסכמה |
| [INVENTORY_MODEL](INVENTORY_MODEL.md) | מלאי, קיבולת, הקצאות, התראות ו־Defaults |
| [ERD_COMPARISON](ERD_COMPARISON.md) | השוואה היסטורית; יש לקרוא עם הפערים העדכניים |

## מימוש, סקירה והפעלה

| מסמך | מה הוא מכיל |
|---|---|
| [DOCS_INDEX](DOCS_INDEX.md) | מימוש קיים ותיעוד סופי עתידי |
| [SYSTEM_AUDIT](docs/SYSTEM_AUDIT.md) | ראיות מהסקירה, HTML, guidelines ובדיקות |
| [IMPLEMENTATION_PROGRESS](IMPLEMENTATION_PROGRESS.md) | מצב עבודה מאומת ותוצאות אחרונות |
| [BACKEND_IMPLEMENTATION](docs/BACKEND_IMPLEMENTATION.md) | רכיבי API, מגבלות וחיבור מותנה למסד |
| [INVENTORY_AND_STATUS](docs/INVENTORY_AND_STATUS.md) | ההתנהגות הנוכחית של מלאי וסטטוסים |
| [zis-api README](zis-api/README.md) | פקודות הרצה וגבולות השרת |
| [zis-db README](zis-db/README.md) | שבע מיגרציות forward-only וסדר אימות; מצב ההרצה החי לא אומת |
| [scripts README](scripts/README.md) | הכנת קבצים ובדיקת התיעוד |
| [.codex README](.codex/README.md) | תיאור פרופיל הרשאות מקומי |

## ארכיון — נשמר למניעת אובדן דרישות

| מסמך | תוכן שנשמר | מעמד |
|---|---|---|
| [INITIAL_REQUIREMENTS](docs/archive/INITIAL_REQUIREMENTS.md) | האפיון מ־README הישן | היסטורי; כולל החלטות שהוחלפו |
| [INITIAL_ROADMAP](docs/archive/INITIAL_ROADMAP.md) | Roadmap ועדכונים מ־README הישן | היסטורי |
| [INITIAL_DATA_PLAN](docs/archive/INITIAL_DATA_PLAN.md) | NEXT_PHASE_PLAN הישן: נתונים | היסטורי |
| [INITIAL_DELIVERY_PLAN](docs/archive/INITIAL_DELIVERY_PLAN.md) | המשכו: API, Admin, תפעול והרחבות | היסטורי |

## מקורות שאינם Markdown

| מקור | מה נמצא בו / איך משתמשים |
|---|---|
| [source-standalone.html](prototypes/zis-review/source-standalone.html) | עותק במאגר של מקור התצוגה היחיד שנבחר ב־24.09; קובץ המקור החיצוני לא נערך |
| [001](zis-db/migrations/001_initial_zis_schema.sql), [002](zis-db/migrations/002_seed_base_data.sql), [003](zis-db/migrations/003_business_decisions.sql), [004](zis-db/migrations/004_inventory_history_without_delta.sql), [005](zis-db/migrations/005_event_gallery_images.sql), [006](zis-db/migrations/006_operations_delivery_and_admin.sql), [007](zis-db/migrations/007_p1_storage_and_confirmation.sql) | SQL; כל המיגרציות דורשות אימות ledger ו־DB פיתוח לפני הרצה |
| [package.json](zis-api/package.json) | תלויות וסקריפטים ל־API |
| [prepare-file-for-llm](scripts/prepare-file-for-llm.ps1) | הכנת עותק בטוח; קוראים רק PreparedPath |
| [check-docs](scripts/check-docs.ps1) | בדיקת אורכים, קישורים וכיסוי כל MD באינדקס |

קישורי המקור החיצוניים מקומיים למחשב זה; עותק ההנחיות ועותקי HTML לבדיקה נמצאים במאגר. שני קובצי לוגו זיס נבדקו ושולבו בתצוגה ב־22–23.09. יתר נכסי המקור ו־Word/PDF לא נבדקו כמקורות דרישות מחייבים.
