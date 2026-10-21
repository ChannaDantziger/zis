# ארכיטקטורת Frontend למערכת ZIS

[אינדקס](PLAN_INDEX.md) · [כיסוי חנות ותמונות](planning/STOREFRONT_REQUIREMENTS.md) · [תוכנית עדכנית](IMPLEMENTATION_PLAN.md).
מפרט יעד; מצב מאומת מתועד ב־[התקדמות](IMPLEMENTATION_PROGRESS.md). ב־09.10 נוספה `apps/storefront` עם בית, קטלוג, מוצר, גלריות ועגלה, שעברו טיפוסים/Build ובדיקות מקומיות. [מימוש וגבולות](STOREFRONT_IMPLEMENTATION.md). `apps/admin-mobile` קיים וממשיך להיבנות בנפרד. גלריה ושליפות הן חלק מליבת P3/P4.

## מטרת המסמך

מסמך זה מגדיר כיצד להפוך את האב־טיפוס הקיים של ZIS ל־Frontend מסודר, קריא וניתן לתחזוקה, לפני העברת הקוד למימוש אמיתי.

המסמך מבוסס על `guidelines.md`: React עם TypeScript, שימוש ב־Mantine, ניהול מצב באמצעות MobX, שימוש חוזר ברכיבים, CSS מצומצם עם Design System, והפרדה ברורה בין מסכים, לוגיקה וגישה ל־API.

האב־טיפוס הקיים יישמר כמקור עיצובי ופונקציונלי, אך לא כמבנה הקוד הסופי.

## החלטות Frontend

- React + TypeScript + Vite.
- Mantine כרכיבי UI מרכזיים.
- MobX לניהול מצב גלובלי ולוגיקה של עגלה, משתמש Admin והגדרות חנות.
- TanStack Query לקריאת נתוני Server ולניהול Cache של API.
- React Router לנתיבים ציבוריים ונתיבי Admin.
- React Hook Form + Zod לטפסים ולבדיקות מבנה בצד לקוח.
- RTL בעברית ו־LTR באנגלית באמצעות הגדרת `dir` מרכזית.
- אין גישה ישירה ל־Supabase מטפסי Checkout או ממסכי Admin; כל פעולה עוברת דרך Backend API.
- אזור ה־Admin יהיה אפליקציית Frontend נפרדת ומובייל־פירסט, ללא נתיב או קישור אליו בתוך ה־Storefront הציבורי; הוא יישאר usable גם במחשב ללא חסימת תצוגה.
- אבטחת Admin לא תסתמך על הסתרת URL, על Mobile Detection או על כך שהמשתמש אינו מכיר את הכתובת.
- Mantine Theme ו־CSS Variables ישמשו כ־Design System יחיד.
- אין ליצור משתני CSS חדשים שהם רק שמות חלופיים למשתנים קיימים.
- כל קובץ יישאר עד 320 שורות ככל האפשר, ורכיבים גדולים יפוצלו לפי אחריות.

## מבנה תיקיות יעד

```text
apps/
├── storefront/
│   └── src/
│       ├── app/
│       ├── pages/
│       ├── features/catalog/
│       ├── features/product-gallery/
│       ├── features/cart/
│       ├── features/checkout/
│       ├── features/order-confirmation/
│       └── main.tsx
└── admin-mobile/
    └── src/
        ├── app/
        ├── pages/
        ├── features/admin-auth/
        ├── features/product-management/
        ├── features/inventory-management/
        ├── features/order-management/
        ├── features/shipping-management/
        ├── features/store-availability/
        └── main.tsx

packages/
├── ui/
├── api-client/
├── types/
├── constants/
└── config/
```

ה־Storefront וה־Admin יהיו שני Builds נפרדים; ה־Storefront לא יכלול את מסכי ה־Admin, את ה־Admin Router או את קוד הניהול בחבילת JavaScript שנשלחת ללקוח.

## חלוקת אחריות

### `app`

מאתחל את האפליקציה, ה־Providers, ה־Router, ה־Theme והגדרות השפה בלבד.

### `pages`

מרכיבות מסך מלא ומחברות בין Features; הן לא יכילו שאילתות SQL, חישובי עסק או רכיבי UI כלליים.

### `features`

מכילות פעולה עסקית ממוקדת, למשל הוספת מוצר לעגלה, יצירת הצעת Checkout או עריכת וריאציה ב־Admin.

### `entities`

מכילות מודלים, טיפוסים, תצוגות בסיסיות ו־API Hooks הקשורים לישות אחת.

### `stores`

מכילות מצב גלובלי של ממשק בלבד או מצב לקוח, ולא מחליפות את מקור האמת ב־Backend.

### `shared`

מכילה רכיבים ושירותים כלליים שחוזרים ביותר מפיצ'ר אחד; אין להכניס אליה לוגיקה עסקית ייחודית.

## מיפוי האב־טיפוס למבנה החדש

| רכיב באב־טיפוס | יעד במבנה החדש |
|---|---|
| `Header`, `Footer`, `MobileTabBar` | `shared/components` או `app` לפי שימוש |
| `Hero`, `FAQ` | `pages/HomePage`; אזורי Demo כפולים/לא מאושרים הוסרו מהתצוגה |
| `ProductsGrid` | `features/catalog` |
| `Packages` | בשלב ראשון Feature נפרד לקריאה בלבד; הרכבת חבילות תגיע בעתיד |
| `Gallery` בדף הבית | `features/event-gallery`, בניהול ובטבלה נפרדים מתמונות מוצר |
| `CartProvider`, `CartDrawer` | `stores/cart.store.ts` ו־`features/cart` |
| `CheckoutModal`, `MobileSteps` | `features/checkout` ו־`pages/CheckoutPage` |
| `ConfirmationPane` | `features/order-confirmation` |
| `LIS_DATA.PRODUCTS` | יוסר ויוחלף ב־API דרך `entities/product` |
| `localStorage` של העגלה | יישאר רק לשחזור עגלה מקומית, לא לשמירת הזמנה או מלאי |
| `TweaksPanel` | יוסר מ־Production או יישמר ככלי פיתוח נפרד |

## גלריות תמונות — דרישת ליבה ל־P3/P4

לאחר שהאב־טיפוס יושלם וייוצב לפי כללי ה־Frontend, Mantine וה־Design System, יבוצעו תוספות הגלריה הבאות:

- כרטיסי מוצר ותמונות גלריה יוצגו בתוך מסגרות בעלות יחס וגודל אחידים באמצעות רכיבי Mantine ו־Design System קיים.
- אין למתוח תמונות; יש להשתמש ב־`object-fit` מוסכם לפי סוג התמונה ולשמור על חיתוך עקבי.
- לחיצה על תמונה תפתח `Lightbox` או `Modal` גדול מעל המסך.
- בתוך ה־Lightbox ניתן יהיה לעבור לתמונה הקודמת והבאה, לסגור ולראות את התמונה הנבחרת.
- הדפדוף יתמוך במקלדת: `Escape`, חצים ימינה/שמאלה ו־Focus ברור.
- גלריית הבית תציג תמונות אירועים בלבד מ־`event_gallery_images` לפי `sort_order`: חמש תמונות אחידות בשורה במסך ממוצע, תמונה גדולה ודפדוף עם תמונות ממוזערות מתחת. גלריית דף המוצר תיטען בנפרד מ־`product_images`.
- כאשר אין תמונות נוספות, התמונה הראשית עדיין תיפתח ב־Lightbox ללא חיצי דפדוף.
- מסך ה־Admin יאפשר העלאה, החלפה, שינוי סדר, סימון תמונה ראשית והזנת `alt_text`.

## מסכים ונתיבים

### אזור ציבורי

- `/` — דף הבית.
- `/catalog` — קטלוג עם חיפוש, קטגוריות, סינון ומיון.
- `/products/:productId` — מוצר, וריאציות, Set, מחיר וגלריה.
- `/checkout` — Checkout עם משלוח ופרטי לקוח.
- `/orders/:orderNumber/confirmation` — אישור הזמנה.
- `/404` — דף לא נמצא.

### אזור Admin — אפליקציה נפרדת ומובייל־פירסט

- כתובת נפרדת, למשל `https://admin.zis.example`, ולא מסלול בתוך אתר הלקוחות.
- `/login` — התחברות.
- `/` — Dashboard מובייל: סך הזמנות היום, משימות פתוחות וסיכום ייצור; פירוט ב־[אפיון הניהול הנייד](planning/ADMIN_MOBILE_SPEC.md).
- `/products` — רשימת מוצרים.
- `/products/new` — יצירת מוצר.
- `/products/:productId/edit` — עריכת מוצר, וריאציות ותמונות.
- `/inventory` — מלאי פרטי בלבד.
- במסך עריכת מוצר יוצגו `set_size` ו־`default_min_sets` ברמת המוצר; הווריאציות יוצגו כרשימה או כרטיסיות לפי המוצר, עם דפדוף ביניהן.
- בחירת עיר משלוח תיטען מה־API ומהטבלה `shipping_zones`, ללא רשימת ערים קשיחה בקוד.
- ערכי הפתיחה הם ירושלים, ביתר ובית שמש, עם הוספת ערים בניהול. במהדורה הנוכחית מנהלים זמינות עיר ושעת חיתוך כללית מתוך DB; שעת יציאה נפרדת לעיר נדחתה. סגירת חנות והעדפות התראות נשלטות בניהול.
- `/orders` — רשימת הזמנות.
- `/orders/:orderId` — פרטי הזמנה וביטול.
- `/production` — מה צריך לייצר היום, מאוגד לפי מוצר ווריאציה.
- `/shipping` — אזורים וכללי משלוח.
- `/faq` — ניהול שאלות ותשובות פעילות, סדר, טיוטות וארכוב.
- `/store-settings` — פתיחה, סגירה ונעילה.
- `/audit-log` — לוג פעולות.

מסך ההזמנה יציג את רצף הסטטוסים `ordered`, `in_preparation`, `packed`, `in_transit`, `delivered`, `approved`, `cancelled`. ביטול אפשרי בכל שלב; אחרי `packed` נדרשים בירור החזקה בחבילה, אישור נוסף וטיפול כספי נפרד לפי [מטריצת החריגים](planning/OPERATIONS_EXCEPTIONS.md). שינוי סטטוס מרוכז מותר רק קדימה; ביטול ושינוי לאחור נשארים פרטניים.

האפליקציה תהיה Mobile-first ותתוכנן קודם למסכי טלפון, אך תישאר נגישה ונוחה גם במסך מחשב; אין צורך לחסום תצוגה לפי מכשיר.

כל נתיב Admin יוגן ב־Route Guard שבודק Session תקף ו־`admin_users.status = active`, וה־Backend יבצע את אותה בדיקה מחדש בכל בקשה.

## ניהול מצב עם MobX

### `cart.store.ts`

ינהל פריטי עגלה, מספר Sets, פתיחת העגלה ושחזור מקומי; המחירים והמלאי יוצגו מחדש לפי נתוני ה־API לפני Checkout.

### `ui.store.ts`

ינהל Modal, Drawer, הודעות, מצב טעינה מקומי ו־Responsive UI.

### `language.store.ts`

ינהל עברית/אנגלית, `dir`, `lang` ותוכן מתורגם.

### `admin-session.store.ts`

ינהל Session של Admin, מצב טעינה, משתמש נוכחי והתנתקות; הוא לא יקבע הרשאות עסקיות בעצמו, ולא יהיה קיים כלל ב־Storefront.

### Server State

נתוני מוצרים, מלאי, הזמנות, משלוחים והגדרות ייטענו באמצעות TanStack Query כדי לקבל Cache, Refetch, Retry ו־Invalidation מסודרים.

## API Client

`shared/api/http-client.ts` יהיה הלקוח היחיד ל־Backend ויטפל ב־Base URL, Headers, `request_id`, טיפול בשגיאות ו־`Idempotency-Key`.

ה־Features ישתמשו ב־Hooks ייעודיים כגון:

- `useProductsQuery`.
- `useProductQuery`.
- `useCheckoutQuoteMutation`.
- `useCreateOrderMutation`.
- `useAdminProductsQuery`.
- `useUpdateInventoryMutation`.
- `useCancelOrderMutation`.
- `useAdminDashboardQuery`.
- `useAdminOrdersQuery` ו־`useBulkOrderStatusMutation`.
- `useProductionQuery` ו־`useAdminTasksQuery`.
- `useFaqQuery` ו־`useAdminFaqQuery`.

אין לקרוא ל־`fetch` ישירות מתוך רכיב תצוגה.

## טפסים ולידציה בצד לקוח

- טופס מוצר יבדוק שדות נדרשים, מחיר, גודל Set, SKU ותמונות.
- טופס וריאציה יבדוק מחיר לפי כלל העסק ומלאי שאינו שלילי; גודל Set נבדק ברמת המוצר.
- טופס Checkout יבדוק פרטי קשר, כתובת משלוח, תאריך ונתוני משלוח.
- הוולידציה בצד לקוח מיועדת לחוויית משתמש בלבד; השרת הוא הסמכות הסופית.
- אין להציג הצלחה לפני קבלת תשובת Backend.

## Design System

### Mantine

יש להשתמש ב־`Button`, `TextInput`, `NumberInput`, `Select`, `Modal`, `Drawer`, `Table`, `Card`, `Badge`, `Tabs`, ` notifications` ורכיבי Layout של Mantine ככל האפשר.

### Theme

`app/theme.ts` יגדיר צבעים, רדיוסים, מרווחים, טיפוגרפיה ושבירה ל־RTL; רכיבים ישתמשו ב־Theme ולא בערכי צבע אקראיים.

### CSS

- `tokens.css` יכיל רק משתני Design System אמיתיים.
- `globals.css` יכיל Reset, RTL, טיפוגרפיה וכללי בסיס.
- CSS מקומי יתווסף רק כאשר Mantine אינו מספק פתרון מתאים.
- אין לשכפל משתנים או ליצור שמות חלופיים למשתנים קיימים.

## מצבי מסך שחייבים להיות מתוכננים

- טעינת קטלוג.
- קטלוג ללא תוצאות.
- מוצר ללא מלאי.
- וריאציה לא זמינה.
- עגלה ריקה.
- מחיר או מלאי שהשתנו ב־Checkout.
- חנות נעולה.
- שגיאת יצירת הזמנה.
- התחברות Admin שגויה.
- טבלת Admin ללא נתונים.
- שגיאת הרשאה או Session שפג.

## נגישות ו־RTL

- כל פעולה תהיה אפשרית במקלדת.
- Modal ו־Drawer ינהלו Focus ו־Escape.
- לכל תמונה יהיה `alt` מתאים.
- טבלאות Admin יכללו כותרות סמנטיות.
- הודעות שגיאה יוצגו גם באופן נגיש לקוראי מסך.
- כיווניות, יישור וסדר אייקונים ייבדקו בעברית ובאנגלית.

## בדיקות Frontend

- Unit Tests ל־MobX Stores ולחישובי תצוגה של Set.
- Component Tests לטפסים, גלריה, עגלה ומצבי שגיאה.
- Integration Tests ל־API Hooks עם Mock Server.
- E2E לקטלוג, Checkout, חנות נעולה, התחברות Admin וביטול הזמנה.
- בדיקת RTL ומובייל לאחר שינויים משמעותיים באמצעות Browser Tool.
- לפני סימון משימה כבוצעה יש להריץ Lint ו־TypeScript ללא שגיאות.

## סדר המעבר מהאב־טיפוס

1. יצירת פרויקט React/TypeScript/Vite והתקנת Mantine, MobX, Router, Query וטפסים.
2. העברת Theme, RTL ורכיבי UI בסיסיים.
3. העברת דף הבית והקטלוג ל־Components מסודרים.
4. הוספת ישויות Product, Variant ו־Image במקום `LIS_DATA`.
5. העברת העגלה ל־MobX.
6. פיצול Checkout למסך ול־Features, ללא סליקה אמיתית בשלב הראשון.
7. יצירת אפליקציית `admin-mobile` נפרדת ומסכי ניהול מובייל־פירסט.
8. חיבור הדרגתי ל־Backend לפי חוזי ה־API.
9. הוספת מצבי טעינה, שגיאה, נעילת חנות ומלאי חסר.
10. בדיקות, Lint, TypeScript ובדיקת Browser לפני כל מסירה משמעותית.

## התאמות נדרשות ב־Backend

Frontend זה מניח שה־Backend יספק:

- API REST מבוסס Express במבנה `routes/controllers/services`.
- חוזי API יציבים עבור קטלוג, Checkout, הזמנות, מלאי, משלוחים ו־Admin.
- תגובת שגיאה אחידה עם `code`, `message`, `details` ו־`request_id`.
- `GET /health/live` ו־`GET /health/ready`.
- `Idempotency-Key` ליצירת הזמנה.
- Session של Supabase Auth ואימות `admin_users` פעיל.
- תשובת Catalog שמחזירה Set, וריאציות, תמונה ראשית וגלריה.

## מחוץ לשלב הראשון

הרכבת חבילות, WhatsApp, SMS, Email אוטומטי, סימולטור אירוע, צ׳ט AI ומלאי עסקי לא ייכללו ב־Frontend הראשון. בהמשך יתווספו מסכים נפרדים למשלוחן, מכין ואורז ומסמכי הדפסה מותאמים, ללא שינוי במסכי הליבה.
