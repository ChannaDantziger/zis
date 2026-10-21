> ארכיון תכנון שנשמר ב־18.09.2026 כדי לא לאבד דרישות. אינו הוראת ביצוע נוכחית; סתירות והחלטות פתוחות מפורטות ב־[נושאים פתוחים](../OPEN_ISSUES.md). סדר העבודה המחייב ב־[תוכנית העבודה](../IMPLEMENTATION_PLAN.md). [אינדקס](../PLAN_INDEX.md).

# תכנון שלב הבא למערכת ZIS

אינדקס מסמכי התכנון וסדר המימוש נמצא ב־[PLAN_INDEX.md](../PLAN_INDEX.md).

## מטרת המסמך

מסמך זה מגדיר את סדר העבודה ואת התכנון הראשוני הנדרש לפני מעבר למימוש קוד. הוא מתייחס למערכת העסקית המלאה ולא רק לאב־טיפוס החזותי הקיים. בשלב זה אין לבצע מימוש; יש לסגור החלטות, סכמת נתונים, חוזי API, מסכי ניהול וחוקי עסק.

## מצב נוכחי

קיים אב־טיפוס של חנות הכולל קטלוג סטטי, קטגוריות, חבילות, עגלה ו־Checkout ברמת ממשק. הוא אינו מחובר ל־Backend או ל־Supabase, אינו שומר הזמנות ואינו מבצע סליקה או עדכון מלאי.

## החלטות שכבר התקבלו

1. המוצר הבסיסי נמכר לפי Set בלבד, ולא לפי יחידה בודדת.
2. הכמות בעגלה היא מספר ה־Sets.
3. מחיר, Product Code, מלאי ותמונות ינוהלו לפי וריאציה כאשר למוצר יש וריאציות. מוצר ללא וריאציות יקבל וריאציית ברירת מחדל.
4. כל הזמנה מחייבת משלוח; אין איסוף עצמי.
5. כתובת שמוזנת בהזמנה היא כתובת יעד למשלוח בלבד. אין להציג את כתובת הסטודיו הישנה כאפשרות איסוף או ככתובת עסקית מאומתת.
6. WhatsApp, סימולטור אירוע, צ׳ט AI והרכבת חבילות לא ייכללו בשלב הראשון, אך יישמרו כשלבי הרחבה.
7. התכנון קודם לכתיבת הקוד.

## סדר העבודה הקרוב

### שלב 1 — סגירת מודל המכירה והמוצר

- להגדיר את מבנה ה־Set: מספר יחידות, שם תצוגה, מחיר, תמונה ותיאור.
- להגדיר האם גודל ה־Set קבוע לכל מוצר או משתנה בין וריאציות.
- להגדיר סוגי וריאציות בפועל: צבע, טעם, סוג, גודל או מאפיין אחר.
- להחליט האם ניתן להוסיף כמה Sets מאותו מוצר ומהי מגבלת הכמות.
- להגדיר את חוקי המינימום: מינימום Sets למוצר ומינימום סכום להזמנה.
- להפריד בין מוצרי Set בסיסיים לבין חבילות שיווקיות עתידיות.

תוצר השלב: מילון נתונים עסקי מאושר למוצר, Set, וריאציה וכמות.

### שלב 2 — תכנון בסיס הנתונים

המלצה: PostgreSQL ב־Supabase, עם Storage לתמונות ו־RLS להרשאות.

החלטות לשלב הנוכחי: בסיס הנתונים ינהל רק את מלאי הלקוחות הפרטיים, וכתובת המשלוח תישמר בתוך `orders.delivery_address` כ־JSONB.

החלטות נוספות: אין החזרות בשלב זה; רק Admin פעיל רשאי לבטל הזמנה, והביטול יתועד ב־`order_status_history` וב־`admin_audit_log`. סוגי המסמכים מול חשבונית ירוקה וטווחי המשלוחים יושלמו בהמשך.

הפירוט המלא של ה־ERD, הטבלאות, הקשרים, האילוצים והאינדקסים נמצא ב־[ERD_SCHEMA.md](../ERD_SCHEMA.md). זהו מסמך המקור לתכנון הסכמה לפני כתיבת מיגרציות וקוד.

תכנון ארכיטקטורת ה־Backend נמצא ב־[BACKEND_ARCHITECTURE.md](../BACKEND_ARCHITECTURE.md), והוא מגדיר את שכבות השירות, זרימות ההזמנה, ה־API, האבטחה והטרנזקציות לפני מימוש.

החלטה מעודכנת: ה־Admin יהיה אפליקציה נפרדת ומובייל־פירסט בכתובת נפרדת; ההגנה האמיתית תתבצע ב־Backend באמצעות Token תקף ומשתמש פעיל ב־`admin_users`.

לאחר השלמת האב־טיפוס לפי כללי ה־Frontend וה־Design System, יבוצעו תוספות הגלריה: תמונות אחידות, פתיחת תמונה מוגדלת ודפדוף בין התמונות.

כל Primary Key בסכמה ייקרא בשם הישות עם הסיומת `_id`, למשל `product_id` ו־`order_id`, ולא בשם כללי `id`.

#### טבלאות ליבה

`products`

- `product_id`
- `name`
- `description`
- `category_id` — קטגוריה אחת למוצר בשלב הנוכחי
- `set_size` — מספר היחידות ב־Set, שונה לפי מוצר
- `status`: `draft`, `active`, `hidden`, `sold_out`, `archived`
- `default_min_sets`
- `created_at`, `updated_at`, `archived_at`

`product_variants`

- `product_variant_id`
- `product_id`
- `name`
- `product_code`
- `price`
- `available_sets`
- `low_stock_threshold_sets`
- `default_production_quantity_sets` — ברירת מחדל לכמות פעולת `+` ב־Admin
- `status`
- `attributes` — JSON של מאפייני הווריאציה
- `created_at`, `updated_at`

הערה: `set_size` ו־`default_min_sets` שייכים ל־`products`, ולא לווריאציה. הווריאציות עצמן יכולות להיות מסוגים שונים לכל מוצר, וה־Admin יוכל לעבור ביניהן.

`product_images`

- `product_image_id`
- `product_id`
- `product_variant_id` — אופציונלי כאשר התמונה משותפת
- `storage_path`
- `public_url` או URL חתום לפי הצורך
- `alt_text`
- `image_type`: `primary`, `gallery`
- `sort_order`
- `created_at`

`categories`

- `category_id`
- `name`
- `slug`
- `sort_order`
- `status`

`orders`

- `order_id`
- `order_number`
- `status`: `ordered`, `in_preparation`, `packed`, `in_transit`, `delivered`, `approved`, `cancelled`
- פרטי מזמין: שם, טלפון, אימייל
- כתובת יעד למשלוח
- `shipping_method_id`
- `delivery_date`
- `delivery_time_window`
- `subtotal`
- `shipping_total`
- `discount_total`
- `total`
- `payment_status`
- `customer_notes`
- `internal_notes`
- `created_at`, `updated_at`

`order_items`

- `order_item_id`
- `order_id`
- `product_id`
- `product_variant_id`
- `quantity_sets`
- `set_size_snapshot`
- `product_name_snapshot`
- `variant_name_snapshot`
- `product_code_snapshot`
- `unit_set_price_snapshot`
- `line_total`

`shipping_methods`

- `shipping_method_id`
- `name`
- `status`
- `base_price`
- `free_shipping_threshold` — אם יוחלט על משלוח חינם

`shipping_zones`

- `shipping_zone_id`
- `name`
- `city`
- `neighborhood` — אופציונלי
- `base_price`
- `is_active`

בשלב הראשון יוזנו כאן ערים גדולות בישראל כ־Seed, ותיבת הבחירה ב־Storefront תיטען מה־DB; ניהול ועדכון הרשימה יתבצע ב־Admin.

`shipping_rules`

- `shipping_rule_id`
- `shipping_zone_id`
- `size_from`
- `size_to`
- `size_surcharge`
- `time_surcharge`
- `urgency_surcharge`
- `active`

`store_settings`

- `store_open`
- `lock_mode`: `open`, `closed`, `scheduled`
- `lock_message`
- `locked_from`, `locked_until`
- `minimum_order_total`
- `max_advance_days` — יישמר ב־`system_defaults`, ברירת מחדל 7 ימים וניתן לשינוי
- `working_days` — ברירת מחדל ראשון עד חמישי
- `same_day_cutoff_time` — ברירת מחדל 09:00 וניתן לשינוי
- `updated_by`

`admin_users`, `admin_audit_log`

- משתמשים ניהוליים, הרשאת־על מלאה ולוג פעולות.

#### עקרונות נתונים

- המחיר והמלאי נשמרים לפי וריאציה.
- מלאי מחושב ב־Sets, לא ביחידות בודדות.
- הזמנה שומרת Snapshot מלא של נתוני המוצר בזמן הרכישה.
- אין מחיקה פיזית של מוצר או הזמנה; משתמשים ב־Archive/Soft Delete.
- תמונות נשמרות ב־Storage, לא בתוך טבלאות PostgreSQL.
