> מפרט תכנון, לא אישור לסכמה חיה. [מפת ERD](../../ERD_SCHEMA.md) · [אינדקס](../../PLAN_INDEX.md) · [פערים](../../OPEN_ISSUES.md).
> יש לקרוא יחד עם [עדכוני הסכמה](POLICIES_AND_UPDATES.md) ו־[מודל המלאי](../../INVENTORY_MODEL.md); שדות 003/004 אינם משוכפלים בכל טבלה.

## טבלאות משלוחים והגדרות חנות

### `shipping_zones`

אזורי משלוח. לפי הוראת בעלת האתר מ־22.09.2026, בתחילה ירושלים, ביתר ובית שמש, עם אפשרות הוספת ערים בניהול. הרשימה נשמרת ב־DB ומשמשת לבחירה; מחיר וחלונות משלוח טעונים השלמה. תיקוני Seed/ייחודיות טרם מומשו.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `shipping_zone_id` | `uuid` | כן | Primary Key |
| `name` | `text` | כן | שם האזור |
| `city` | `text` | כן | עיר |
| `neighborhood` | `text` | לא | שכונה, אם רלוונטי |
| `is_active` | `boolean` | כן | האם ניתן לבחור באזור |
| `created_at` | `timestamptz` | כן | זמן יצירה |
| `updated_at` | `timestamptz` | כן | זמן עדכון |

אינדקסים:

- אינדקס `idx_shipping_zones_lookup` על `(city, neighborhood, is_active)`.
- רצוי `UNIQUE (city, neighborhood)` כאשר אין כפילויות עסקיות.

### `shipping_methods`

סוגי משלוח, ללא אפשרות איסוף עצמי.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `shipping_method_id` | `uuid` | כן | Primary Key |
| `name` | `text` | כן | שם שיטת המשלוח |
| `code` | `text` | כן | מזהה פנימי |
| `is_active` | `boolean` | כן | זמינות השיטה |
| `created_at` | `timestamptz` | כן | זמן יצירה |
| `updated_at` | `timestamptz` | כן | זמן עדכון |

אילוצים:

- `UNIQUE (code)`.
- אין להכניס רשומה מסוג `pickup`.

### `shipping_rules`

כללי תמחור משלוח לפי אזור, גודל, שעה ודחיפות.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `shipping_rule_id` | `uuid` | כן | Primary Key |
| `shipping_zone_id` | `uuid` | כן | FK ל־`shipping_zones.shipping_zone_id` |
| `shipping_method_id` | `uuid` | כן | FK ל־`shipping_methods.shipping_method_id` |
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

- FK ל־`shipping_zones` ול־`shipping_methods`.
- `CHECK (base_price >= 0 AND size_surcharge >= 0 AND time_surcharge >= 0 AND urgency_surcharge >= 0)`.
- `CHECK (size_from_sets >= 1)`.
- `CHECK (size_to_sets IS NULL OR size_to_sets >= size_from_sets)`.
- אינדקס `idx_shipping_rules_calculation` על `(shipping_zone_id, shipping_method_id, is_active, size_from_sets, size_to_sets)`.

### `store_settings`

הגדרות עסקיות כלליות, ברשומה יחידה.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `store_setting_id` | `smallint` | כן | תמיד 1 |
| `store_open` | `boolean` | כן | מצב פתיחה כללי |
| `lock_mode` | `text` | כן | `open`, `closed`, `scheduled` |
| `lock_message` | `text` | לא | הודעה ללקוח |
| `minimum_order_total` | `numeric(12,2)` | כן | מינימום סכום להזמנה |
| `max_advance_days` | `integer` | לא | כמה ימים קדימה ניתן להזמין |
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
