> מפרט תכנון, לא אישור לסכמה חיה. [מפת ERD](../../ERD_SCHEMA.md) · [אינדקס](../../PLAN_INDEX.md) · [פערים](../../OPEN_ISSUES.md).
> יש לקרוא יחד עם [עדכוני הסכמה](POLICIES_AND_UPDATES.md) ו־[מודל המלאי](../../INVENTORY_MODEL.md); שדות 003/004 אינם משוכפלים בכל טבלה.

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

ישות המוצר העסקית; גודל ה־Set ומינימום ההזמנה נשמרים כאן. המחיר והמלאי נשמרים בווריאציה.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `product_id` | `uuid` | כן | Primary Key |
| `category_id` | `uuid` | כן | FK ל־`categories.category_id` |
| `name` | `text` | כן | שם מוצר |
| `description` | `text` | לא | תיאור המוצר |
| `status` | `text` | כן | `draft`, `active`, `hidden`, `sold_out`, `archived` |
| `set_size` | `integer` | כן | מספר היחידות הפיזיות בכל Set של מוצר זה |
| `default_min_sets` | `integer` | כן | מינימום Sets ברמת מוצר |
| `created_at` | `timestamptz` | כן | זמן יצירה |
| `updated_at` | `timestamptz` | כן | זמן עדכון |
| `archived_at` | `timestamptz` | לא | זמן ארכוב |

אילוצים ואינדקסים:

- `FOREIGN KEY (category_id) REFERENCES categories(category_id)`.
- `CHECK (set_size >= 1)`.
- `CHECK (default_min_sets >= 1)`.
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
| `price_per_set` | `numeric(12,2)` | כן | מחיר Set בשקלים |
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
- `CHECK (price_per_set >= 0)`.
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
