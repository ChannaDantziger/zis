# אינדקס מרכזי — ZIS

עודכן ב־04.11.2026. זהו שער הכניסה לכל מסמכי העבודה במאגר.
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
| [changes](../changes/changes.md) | 30 בקשות ושאלות בעלת האתר מ־26.10; תכנון בלבד | דרישות חדשות |
| [changes1](../changes/changes1.md) | תשע בקשות שינוי בחנות מ־29.10; דרישות מוצריות | דרישות חדשות |
| [changes2](../changes/changes2.md) | בקשות שינוי נוספות בחנות מ־01.11; תשובות A ותוכנית חלוקת עבודה | דרישות חדשות ותוכנית |
| [changes3](../changes/changes3.md) | מסמך שינויים נוסף; טרם נסקר או הוכנס לתוכנית העבודה |
| [changes4](../changes/changes4.md) | בקשות שינוי 4 ומצב קיים, פערים וחסימות; ללא תוכנית פיתוח |
| [changes5](../changes/changes5.md) | בקשות נוספות לניהול, דוחות ונתוני בדיקה; טרם נסקרו |
| [CHANGES1_EXECUTION_PLAN](CHANGES1_EXECUTION_PLAN.md) | חלוקת תשע בקשות changes1.md לסוכנים, תחומי אחריות ותיעוד סטטוס ביצוע | תוכנית ומסירה 29.10 |
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
| [ADMIN_REDESIGN_PLAN](planning/ADMIN_REDESIGN_PLAN.md) · [תצוגת HTML](planning/ADMIN_REDESIGN_PLAN.html) | סקירת כלל הניהול, מפת מסכים ושערי אישור: תוכנית → מסכים → תכנון שרת → חיבור | תוכנית לאישור 10.11; אין שינוי יישום |
| [ADMIN_OPERATIONS_INTEGRATION_PLAN](planning/ADMIN_OPERATIONS_INTEGRATION_PLAN.md) · [תצוגת HTML](planning/ADMIN_OPERATIONS_INTEGRATION_PLAN.html) | שילוב ששת מסכי “תפעול שוטף” במסלולים הקיימים, סדר עבודה, החלטות חדשות ותלויות | מסך הבית מומש בקוד; יתר המסכים מתוכננים |
| [ADMIN_HOME_IMPLEMENTATION](ADMIN_HOME_IMPLEMENTATION.md) | מימוש מסך הבית `/`, קיצורים לדוחות, API, מיגרציה 018 וגבולות אימות | קוד מקומי; typecheck עבר 17.11; זרימות הזמנה ו־DB ישיר לא אומתו |
| [ADMIN_HOME_PREVIEW](planning/ADMIN_HOME_PREVIEW.html) · [CSS](planning/admin-home-preview.css) · [JS](planning/admin-home-preview.js) · [CSS משימות](planning/admin-home-tasks-preview.css) · [JS משימות](planning/admin-home-tasks-preview.js) | מסך בית B1.1 לאישור: “פרטים” מלאים עם תקציר לפי שלב, תיקון סטטוס סגור בתוך פרטים נוספים, כתובות לפי עיר, ייצור ומשימות; נתוני המחשה | מסך קודם להסבר קצר; 10.11 |
| [ADMIN_ORDERS_PREVIEW](planning/ADMIN_ORDERS_PREVIEW.html) | מסך הזמנות B1.2: סינון, מיון, תמונות, צבעי שלב, קיבוץ משלוחים לפי אזור ופרטי הזמנה מלאים; נתוני המחשה | מסך לאישור 10.11 |
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
| [ORDER_CREATION](ORDER_CREATION.md) | יצירה אטומית ועריכת פריטי pending עם Idempotency נפרד; 016 דורשת החלה ידנית, השינוי טרם אומת מול DB |
| [STOREFRONT_CHECKOUT](STOREFRONT_CHECKOUT.md) | מסך הזמנה, מינימום, עריכת pending וטעינת פריטים מפורשת בהתנגשות גרסאות; 016 מוכנה בלבד, ללא ספק תשלום |
| [ORDER_TEST_BROWSER_REPORT](ORDER_TEST_BROWSER_REPORT.md) | בדיקת הזמנת ניסוי בדפדפן 08.11: גם בבית שמש יצירה הצליחה, אישור תשלום מדומה נכשל, המשך תפעולי חסום |
| [PAYMENTS_CODE_REVIEW](PAYMENTS_CODE_REVIEW.html) | סקירת תשלום ואישור ניסוי מקצה לקצה: Client, Server, Admin, ממצאים ומקרי קצה |
| [PAYMENT_TEST_RESULTS](PAYMENT_TEST_RESULTS.md) | בדיקות 10.11: כשל SQLSTATE 42P08 שוחזר ב־PostgreSQL מבודד; תיקון הוכח בבדיקות בלבד, היישום טרם שונה |
| [ORDER_FLOW_UX_REVIEW](ORDER_FLOW_UX_REVIEW.md) | הצעות שימושיות מרוכזות למסלול ההזמנה והניהול, מנקודת מבט לא טכנולוגית |
| [SITE_SCREENSHOTS](SITE_SCREENSHOTS.md) | שבעה צילומי דפדפן נקיים ומסודרים למצגת שימוש באתר מ־08.11.2026 |
| [STOREFRONT_IMPLEMENTATION](STOREFRONT_IMPLEMENTATION.md) | בית, קטלוג, מוצר, עגלה וגלריות מ־09.10; אימות מקומי וגבולות P3/P4 |
| [Storefront README](../apps/storefront/README.md) | התקנה, הרצה ואימות יישום החנות העצמאי |
| [ADMIN_VERIFICATION](ADMIN_VERIFICATION.md) | סדר עבודה שחולץ, תיקוני Admin, בדיקות מקומיות וגבולות האימות מ־08.10 |
| [ADMIN_NOTIFICATIONS](ADMIN_NOTIFICATIONS.md) | תיבת התראות אישית, העדפות ו־Audit; בדיקות מקומיות, אימות חי פתוח |
| [ADMIN_INVENTORY](ADMIN_INVENTORY.md) | מלאי זמין, קיבולת, היסטוריה וטופס התאמה; מילוי שבועי טרם מומש |
| [ADMIN_CATALOG](ADMIN_CATALOG.md) | ניהול מוצרים פשוטים/מורכבים, קטגוריות, תמונות וגלריה כללית; typecheck ובדיקות ממוקדות, אימות DB/Storage ופריסה פתוחים |
| [ADMIN_UX_SIMPLIFICATION](ADMIN_UX_SIMPLIFICATION.md) | פישוט קטלוג/ניהול והסרת בחירת שיטת משלוח; קוד ובדיקות מקומיות 21.10, DB חי פתוח |
| [ADMIN_OPERATION_REPORTS](ADMIN_OPERATION_REPORTS.md) | תוויות אריזה: מספר הזמנה ומתחתיו טבלת מוצרים/וריאציות/כמויות; אספקה: דף נפרד לכל עיר, כתובות ומספרי הזמנה, סכום אריזות מתועדות; הדפסה ובחירה מדויקת; אימות חי פתוח |
| [ADMIN_QUALITY_AUDIT](ADMIN_QUALITY_AUDIT.md) | הרשאות מנהל, התראות אישיות, בידוד Session ותאריכים; בדיקות ממוקדות מקומיות |
| [ADMIN_PRODUCTION_REPORT](ADMIN_PRODUCTION_REPORT.md) | רשימת ייצור להדפסה/שמירה כ־PDF בדפדפן; תצוגה ריקה ופתיחת הדפסה אומתו, PDF עם נתונים פתוח |
| [ADMIN_ORDERS](ADMIN_ORDERS.md) | עימוד וסינון וריאציה, הרשאות ובדיקות; טעינת הנתיב החדש אומתה במצב ריק; בדיקה עם נתונים פתוחה |
| [ADMIN_TASKS](ADMIN_TASKS.md) | יצירה וסגירת משימות ידניות, עימוד, הרשאות ו־Audit; אימות DB עדיין פתוח |
| [BACKEND_IMPLEMENTATION](BACKEND_IMPLEMENTATION.md) | רכיבי API, מגבלות וחיבור מותנה למסד |
| [LIVE_CONNECTION_RUNBOOK](LIVE_CONNECTION_RUNBOOK.md) | סדר חיבור DB/Supabase/API ודגשי אימות | Runbook |
| [INVENTORY_AND_STATUS](INVENTORY_AND_STATUS.md) | ההתנהגות הנוכחית של מלאי וסטטוסים |
| [מצגת מסלול רכישה, מלאי ותפעול](checkout-inventory-flow.html) | 16 שקפים: Client/Server/DB, בדיקות מלאי, SQL, אישור ניסוי, תפעול ופערים |
| [zis-api README](../zis-api/README.md) | פקודות הרצה וגבולות השרת |
| [zis-db README](../zis-db/README.md) | שמונה עשרה מיגרציות forward-only; 018 למשימות ומארזים הוכנה ודורשת החלה ידנית; מצב DB וה־ledger טרם אומתו |
| [scripts README](../scripts/README.md) | הכנת קבצים ובדיקת התיעוד |
| [פקודות הרצה](../פקודות%20הרצה.md) | פקודות הפעלת ה־API, החנות וממשק הניהול המקומי |
| [.codex README](../.codex/README.md) | תיאור פרופיל הרשאות מקומי |

## Skills מקומיים

| Skill | מה הוא עושה |
|---|---|
| [product-photo-studio](../product-photo-studio/SKILL.md) | עיבוד תמונות מוצר באופן נאמן ועדין |
| [product-photo-studio README](../product-photo-studio/README.md) | סקירה ותפעול של מיומנות עיבוד תמונות מוצר |
| [פרומפט יצירת סט 4 במבנה 2x2](../תמונות מעוצבות/פרומפט יצירת סט 4 במבנה 2x2.md) | פרומפט עיצובי שמור ליצירת סט תמונות |
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
| [ADMIN_DASHBOARD_OPTIONS.html](planning/ADMIN_DASHBOARD_OPTIONS.html) | הצעה אינטראקטיבית ל־14 רכיבי דשבורד ניהולי, עם מקורות ציבוריים וסימון תלות בנתונים |
| [ADMIN_DASHBOARD_CHARTS.html](planning/ADMIN_DASHBOARD_CHARTS.html) | המחשת ארבעת הגרפים שנבחרו; לחיצה על מקטע מציגה מתחתיו פירוט רשומות להמחשה |
| [001](../zis-db/migrations/001_initial_zis_schema.sql), [002](../zis-db/migrations/002_seed_base_data.sql), [003](../zis-db/migrations/003_business_decisions.sql), [004](../zis-db/migrations/004_inventory_history_without_delta.sql), [005](../zis-db/migrations/005_event_gallery_images.sql), [006](../zis-db/migrations/006_operations_delivery_and_admin.sql), [007](../zis-db/migrations/007_p1_storage_and_confirmation.sql), [008](../zis-db/migrations/008_admin_commerce_settings.sql), [009](../zis-db/migrations/009_initialize_store_settings.sql), [010](../zis-db/migrations/010_order_creation_idempotency.sql), [011](../zis-db/migrations/011_simple_products_catalog_media.sql), [012](../zis-db/migrations/012_minimum_product_subtotal.sql), [013](../zis-db/migrations/013_event_gallery_featured_image.sql) | SQL; דורש אימות ledger ב־Production ושינוי מאושר לפני הרצה |
| [010](../zis-db/migrations/010_order_creation_idempotency.sql) | Idempotency ביצירת הזמנה; נוסף למאגר בלבד, טרם הורץ |
| [014](../zis-db/migrations/014_single_shipping_method.sql) | הסרת ישות שיטת משלוח; הוכנה בלבד ודורשת בדיקת preflight ידנית |
| [015](../zis-db/migrations/015_checkout_faq_and_test_orders.sql) | שדות Checkout, FAQ ואישור הזמנת ניסוי; הוכנה בלבד |
| [016](../zis-db/migrations/016_pending_order_edit_requests.sql) | מפתחות עריכה מרובים ל־pending בטבלה נפרדת, FK/RLS והרשאות שרת; הוכנה בלבד ודורשת החלה ידנית לפני הפעלת API העריכה |
| [017](../zis-db/migrations/017_variant_price_per_item.sql) | המרת מחיר וריאציה ממחיר Set למחיר ליחידה, רק ללא שינוי סכום; הוכנה ודורשת בדיקת ledger והחלה ידנית |
| [018](../zis-db/migrations/018_admin_home_tasks_and_packages.sql) | מצב והיסטוריית משימות, מספר מארזים בהזמנה; בעלת האתר דיווחה שהחילה ידנית ב־10.11, ללא ledger מאומת |
| [019](../zis-db/migrations/019_sequential_order_numbers.sql) | רצף מספרי הזמנות מ־1000, תוך שמירת מספרים קיימים; הוכנה בלבד, דורשת בדיקת ledger והחלה ידנית |
| [package.json](../zis-api/package.json) | תלויות וסקריפטים ל־API |
| [prepare-file-for-llm](../scripts/prepare-file-for-llm.ps1) | הכנת עותק בטוח; קוראים רק PreparedPath |
| [check-docs](../scripts/check-docs.ps1) | בדיקת אורכים, קישורים וכיסוי כל MD באינדקס |
| [ORDER_TEST_DIAGNOSTICS](ORDER_TEST_DIAGNOSTICS.sql) | שאילתות קריאה בלבד לאבחון כשל אישור הניסוי וכללי משלוח חסרים; להרצה ידנית בלבד |
| [ORDER_TEST_DIAGNOSTICS_BEIT_SHEMESH](ORDER_TEST_DIAGNOSTICS_BEIT_SHEMESH.sql) | בדיקות קריאה בלבד להזמנת הניסוי החדשה בבית שמש; להרצה ידנית בלבד |

קישורי המקור החיצוניים מקומיים למחשב זה; עותק ההנחיות ועותקי HTML לבדיקה נמצאים במאגר. שני קובצי לוגו זיס נבדקו ושולבו בתצוגה ב־22–23.09. יתר נכסי המקור ו־Word/PDF לא נבדקו כמקורות דרישות מחייבים.
