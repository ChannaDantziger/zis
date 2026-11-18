> מפרט ותיאור יעד לסכמה לאחר [מיגרציה 014](../../zis-db/migrations/014_single_shipping_method.sql); המיגרציה טרם הוחלה. [מפת ERD](../ERD_SCHEMA.md) · [אינדקס](../PLAN_INDEX.md) · [פערים](../OPEN_ISSUES.md).
> יש לקרוא יחד עם [עדכוני הסכמה](POLICIES_AND_UPDATES.md) ו־[מודל המלאי](../INVENTORY_MODEL.md); שדות 003/004 אינם משוכפלים בכל טבלה.

## טבלאות משלוחים והגדרות חנות

### `shipping_zones`

אזורי משלוח. לפי הוראת בעלת האתר מ־22.09.2026, בתחילה ירושלים, ביתר ובית שמש, עם אפשרות הוספת ערים בניהול. הרשימה, פעילות האזור ושעת היציאה האזורית נשמרות ב־DB; מחירי משלוח מנוהלים ב־`shipping_rules`. ערכים עסקיים בפועל עדיין טעונים הזנה ואימות.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `shipping_zone_id` | `uuid` | כן | Primary Key |
| `name` | `text` | כן | שם האזור |
| `city` | `text` | כן | עיר |
| `neighborhood` | `text` | לא | שכונה, אם רלוונטי |
| `is_active` | `boolean` | כן | האם ניתן לבחור באזור |
| `dispatch_time` | `time` | לא | override אזורי אופציונלי; ברירת המחדל היא `system_defaults.dispatch_time` |
| `created_at` | `timestamptz` | כן | זמן יצירה |
| `updated_at` | `timestamptz` | כן | זמן עדכון |

אינדקסים:

- אינדקס `idx_shipping_zones_lookup` על `(city, neighborhood, is_active)`.
- רצוי `UNIQUE (city, neighborhood)` כאשר אין כפילויות עסקיות.

לאחר 014 לא קיימת טבלת `shipping_methods`: בחנות יש שירות משלוח יחיד ואין לנהל או לבחור מזהה עבורו. מחיר מחושב לפי אזור וטווח כמויות.

### `shipping_rules`

כללי תמחור משלוח לפי אזור, גודל, שעה ודחיפות.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `shipping_rule_id` | `uuid` | כן | Primary Key |
| `shipping_zone_id` | `uuid` | כן | FK ל־`shipping_zones.shipping_zone_id` |
| `base_price` | `numeric(12,2)` | כן | מחיר בסיס |
| `size_from_sets` | `integer` | כן | תחילת טווח הגודל |
| `size_to_sets` | `integer` | לא | סוף טווח; null ללא הגבלה |
| `size_surcharge` | `numeric(12,2)` | כן | תוספת גודל |
| `time_surcharge` | `numeric(12,2)` | כן | תוספת שעה חריגה |
| `urgency_surcharge` | `numeric(12,2)` | כן | תוספת דחיפות |
| `is_active` | `boolean` | כן | האם הכלל פעיל |
| `created_at` | `timestamptz` | כן | זמן יצירה |
| `updated_at` | `timestamptz` | כן | זמן עדכון |

אילוצים ואינדקסים:

- FK ל־`shipping_zones` בלבד לאחר 014.
- `CHECK (base_price >= 0 AND size_surcharge >= 0 AND time_surcharge >= 0 AND urgency_surcharge >= 0)`.
- `CHECK (size_from_sets >= 1)`.
- `CHECK (size_to_sets IS NULL OR size_to_sets >= size_from_sets)`.
- אינדקס `idx_shipping_rules_calculation` על `(shipping_zone_id, is_active, size_from_sets, size_to_sets)` לאחר 014.

### `store_settings`

הגדרות עסקיות כלליות, ברשומה יחידה.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `store_setting_id` | `smallint` | כן | תמיד 1 |
| `store_open` | `boolean` | כן | מצב פתיחה כללי |
| `lock_mode` | `text` | כן | `open`, `closed`, `scheduled` |
| `lock_message` | `text` | לא | הודעה ללקוח |
| `minimum_product_subtotal` | `numeric(12,2)` | כן | מינימום סכום מוצרים להזמנה, ללא דמי משלוח; שם קודם `minimum_order_total` |
| `max_advance_days` | `integer` | לא | עמודת תאימות ישנה; אינה מקור טווח ההזמנה בקוד המקומי. המקור הוא ההגדרה בניהול הנשמרת ב־`system_defaults` |
| `updated_by` | `uuid` | לא | FK ל־`admin_users.admin_user_id` |
| `updated_at` | `timestamptz` | כן | זמן עדכון |

### `store_closures`

חלונות סגירה ידניים או מתוזמנים.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `store_closure_id` | `uuid` | כן | Primary Key |
| `starts_at` | `timestamptz` | כן | תחילת סגירה |
| `ends_at` | `timestamptz` | כן | סוף סגירה |
| `reason` | `text` | לא | סיבת הסגירה |
| `is_active` | `boolean` | כן | האם החלון תקף |
| `created_by` | `uuid` | כן | FK ל־`admin_users.admin_user_id` |
| `created_at` | `timestamptz` | כן | זמן יצירה |

אילוצים ואינדקסים:

- `CHECK (ends_at > starts_at)`.
- אינדקס `idx_store_closures_time` על `(starts_at, ends_at, is_active)`.

## עדכון תפעול ואספקה — 05.10.2026

הסעיפים הבאים ממומשים בקוד ובמיגרציית [008](../../zis-db/migrations/008_admin_commerce_settings.sql), אך דורשים אימות היסטוריית DB לפני הרצה:

- `system_defaults.dispatch_time` הוא שעת היציאה הכללית הניתנת לעריכה. `shipping_zones.dispatch_time time` הוא override אזורי אופציונלי; הוא אינו תנאי להפעלת עיר.
- `shipping_rules` הוא מקור מחירי המשלוח. אזור ללא כלל פעיל תואם נדחה ב־Quote; אין הנחת משלוח חינם implicit.
- `store_settings.store_open` ו־`lock_message` הם מקור אמת לסגירה כללית. `GET /store-status` מחזיר אותם, הלקוח משבית "הוסף לסל", והשרת דוחה quote/Order גם אם נשלחה קריאה ישירה.
- החלטת בעלת האתר מ־08.11: זמינות תאריך מחושבת בשרת לפי `business_timezone`, `max_advance_days`, `same_day_cutoff_time` וסגירות `store_closures`, ללא תלות באזור. מלאי גם הוא כללי. העיר ואזור המשלוח משמשים כתובת ומחיר בלבד. לוח חגים אינו מופעל בשלב זה; יש לאמת שקוד ו־DB תואמים להחלטה.
- אין חלונות אישיים למהדורה זו. תאריך היום מושבת אחרי ה־cutoff; התאריך שנבחר נשמר ב־`orders.delivery_date`. שם אולם אופציונלי נשמר בהזמנה, לא באזור המשלוח.

ראו את [תוכנית התפעול](../planning/OPERATIONS_DELIVERY_PLAN.md) לחוזי API, ניסוח הלקוח ועצי בדיקה.
