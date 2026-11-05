> מפרט תכנון, לא אישור לסכמה חיה. דרישות עדכניות: [תוכנית תיקון קטלוג](../OPEN_ISSUES.md#תוכנית-תיקון-קטלוג-ומדיה-14.10.2026). [מפת ERD](../ERD_SCHEMA.md) · [אינדקס](../PLAN_INDEX.md) · [פערים](../OPEN_ISSUES.md).
> יש לקרוא יחד עם [עדכוני הסכמה](POLICIES_AND_UPDATES.md) ו־[מודל המלאי](../INVENTORY_MODEL.md); שדות 003/004 אינם משוכפלים בכל טבלה.

## טבלאות ליבה

### `categories`

קטגוריות הקטלוג.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `category_id` | `uuid` | כן | Primary Key |
| `name` | `text` | כן | שם הקטגוריה |
| `slug` | `text` | כן | מזהה URL ייחודי |
| `sort_order` | `integer` | כן | סדר תצוגה, ברירת מחדל 0 |
| `status` | `text` | כן | `active` או `hidden` |
| `created_at` | `timestamptz` | כן | זמן יצירה |
| `updated_at` | `timestamptz` | כן | זמן עדכון |

אילוצים ואינדקסים:

- `PRIMARY KEY (category_id)`.
- `UNIQUE (slug)`.
- `CHECK (status IN ('active', 'hidden'))`.
- אינדקס `idx_categories_status_sort` על `(status, sort_order)`.

### `products`

ישות המוצר העסקית. מיגרציה 011 מוסיפה תמיכה במוצר פשוט ללא וריאציות, מחיר ומלאי ברמת מוצר, וסדר תצוגה. ניסיון החלה ב־Production נכשל עקב שם עמודה ישן; קובץ המקור תוקן, ויש לבדוק מצב DB חלקי לפני ניסיון חוזר. לפי החלטת 11.10 אין מינימום כמות למוצר; המינימום היחיד הוא סכום המוצרים.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `product_id` | `uuid` | כן | Primary Key |
| `category_id` | `uuid` | כן | FK ל־`categories.category_id` |
| `name` | `text` | כן | שם מוצר |
| `description` | `text` | לא | תיאור המוצר |
| `status` | `text` | כן | `draft`, `active`, `hidden`, `sold_out`, `archived` |
| `set_size` | `integer` | כן | מספר היחידות הפיזיות בכל Set של מוצר זה |
| `price_per_item` | `numeric(12,2)` | לא | מחיר ליחידה פיזית; עבור מוצר פשוט יש להכפיל ב־`set_size` לקבלת מחיר ה־Set |
| `available_items` | `integer` | כן | מלאי ביחידות פיזיות למוצר פשוט; מספר ה־Sets למכירה הוא `floor(available_items / set_size)` |
| `product_code` | `text` | לא | קוד פנימי למוצר פשוט |
| `display_order` | `integer` | כן | סדר תצוגה; UI מציע קפיצות 10 אך מאפשר הזנה ידנית |
| `created_at` | `timestamptz` | כן | זמן יצירה |
| `updated_at` | `timestamptz` | כן | זמן עדכון |
| `archived_at` | `timestamptz` | לא | זמן ארכוב |

אילוצים ואינדקסים:

- `FOREIGN KEY (category_id) REFERENCES categories(category_id)`.
- `CHECK (set_size >= 1)`.
- `CHECK (price_per_item >= 0)` כאשר הוגדר מחיר מוצר פשוט.
- `CHECK (available_items >= 0)` ו־`CHECK (display_order >= 0)`.
- טריגר פרסום דורש קטגוריה פעילה ותמונת מוצר ראשית; מוצר פשוט דורש מחיר ומלאי, ומוצר מורכב דורש וריאציה פעילה ותמונה לכל וריאציה פעילה.
- `CHECK (status IN ('draft', 'active', 'hidden', 'sold_out', 'archived'))`.
- אינדקס `idx_products_category_status` על `(category_id, status)`.
- אינדקס `idx_products_active` על `(status, category_id)` עם Partial Index ל־`status = 'active'`.

### `product_variants`

וריאציות המוצר, כולל סוגים, מחיר, Product Code ומלאי זמין. סוגי הווריאציות יכולים להשתנות ממוצר למוצר.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `product_variant_id` | `uuid` | כן | Primary Key |
| `product_id` | `uuid` | כן | FK ל־`products.product_id` |
| `name` | `text` | כן | שם תצוגה, למשל טעם או צבע |
| `product_code` | `text` | כן | מזהה פנימי יציב של סוג Product/Variant |
| `price_per_item` | `numeric(12,2)` | כן | מחיר ליחידה פיזית; יש להכפיל ב־`products.set_size` לקבלת מחיר ה־Set |
| `available_sets` | `integer` | כן | מלאי זמין ב־Sets |
| `low_stock_threshold_sets` | `integer` | כן | סף התראת מלאי נמוך |
| `attributes` | `jsonb` | לא | מאפיינים גמישים של הווריאציה |
| `is_default` | `boolean` | כן | האם זו וריאציית ברירת המחדל |
| `status` | `text` | כן | `active`, `hidden`, `sold_out`, `archived` |
| `created_at` | `timestamptz` | כן | זמן יצירה |
| `updated_at` | `timestamptz` | כן | זמן עדכון |

אילוצים ואינדקסים:

- `FOREIGN KEY (product_id) REFERENCES products(product_id)`.
- `UNIQUE (product_code)`.
- `CHECK (price_per_item >= 0)` לאחר מיגרציה 017; עד להחלתה הסכמה הקיימת משתמשת בשם `price_per_set` ובמשמעות הישנה של מחיר Set.
- `CHECK (available_sets >= 0)`.
- `CHECK (status IN ('active', 'hidden', 'sold_out', 'archived'))`.
- Partial Unique Index `ux_product_one_default_variant` על `(product_id)` כאשר `is_default = true`.
- אינדקס `idx_variants_product_status` על `(product_id, status)`.
- אינדקס `idx_variants_low_stock` על `(available_sets)` עבור Dashboard של מלאי נמוך.

### `product_images`

תמונות מוצר או וריאציה.

הטבלה היא מקור הנתונים לגלריה האחידה ב־Frontend: התמונה הראשית ותמונות הגלריה יוחזרו לפי `sort_order`, ויוצגו ב־Lightbox עם דפדוף בין התמונות.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `product_image_id` | `uuid` | כן | Primary Key |
| `product_id` | `uuid` | כן | FK ל־`products.product_id` |
| `product_variant_id` | `uuid` | לא | FK ל־`product_variants.product_variant_id`; null כאשר משותף למוצר |
| `storage_path` | `text` | כן | נתיב הקובץ ב־Storage |
| `alt_text` | `text` | כן | תיאור נגישות |
| `image_type` | `text` | כן | `primary` או `gallery` |
| `sort_order` | `integer` | כן | סדר תצוגה |
| `created_at` | `timestamptz` | כן | זמן העלאה |
| `updated_at` | `timestamptz` | כן | זמן עדכון |

אילוצים ואינדקסים:

- FK ל־`products` ול־`product_variants`.
- `CHECK (image_type IN ('primary', 'gallery'))`.
- `CHECK (sort_order >= 0)`.
- Partial Unique Index לתמונה ראשית אחת לכל מוצר או וריאציה.
- אינדקס `idx_product_images_display` על `(product_id, product_variant_id, sort_order)`.

## `faq_entries` — שאלות ותשובות המוצגות במסך

תוכן FAQ נשמר במסד כדי שמנהלת תוכל לעדכן את השאלות והתשובות בלי שינוי Frontend. הרשומות הפעילות בלבד יוחזרו למסך הציבורי לפי סדר.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `faq_entry_id` | `uuid` | כן | Primary Key |
| `question` | `text` | כן | השאלה המוצגת |
| `answer` | `text` | כן | התשובה המוצגת |
| `sort_order` | `integer` | כן | סדר תצוגה |
| `status` | `text` | כן | `draft`, `active` או `archived` |
| `created_at` | `timestamptz` | כן | זמן יצירה |
| `updated_at` | `timestamptz` | כן | זמן עדכון |

אילוצים ואינדקסים:

- `CHECK (sort_order >= 0)` ו־`CHECK` על ערכי `status`.
- אינדקס על `(status, sort_order)` לשליפה ציבורית.
- שינוי, פרסום וארכוב נרשמים ב־`admin_audit_log`; אין מחיקה פיזית של FAQ שהוצג בעבר.
- שדות שפה/תרגום אינם חלק מהמהדורה הראשונה; אם יידרשו, יתווסף אפיון נפרד ולא יישמר טקסט מתורגם בשדה יחיד.

## מסך קטלוג ומדיה — 24.09.2026

מסך הניהול המתוכנן מאפשר לבחור מוצר קיים או ליצור מוצר חדש, להזין שם, תיאור ווריאציה, ולעלות/לסדר תמונות בלי SQL ידני. מתחת להעלאה מציגים מידות קובץ ו־preview חיתוך, ללא יחס פיקסלים מחייב במהדורה הנוכחית.

מלאי, מחיר וזמינות נשמרים לווריאציה בלבד. תמונת מוצר יכולה להיות משותפת או מחוברת לווריאציה; אין לתרגם זאת למלאי משותף.
