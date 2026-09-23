> מפרט תכנון, לא אישור לסכמה חיה. [מפת ERD](../../ERD_SCHEMA.md) · [אינדקס](../../PLAN_INDEX.md) · [פערים](../../OPEN_ISSUES.md).
> יש לקרוא יחד עם [עדכוני הסכמה](POLICIES_AND_UPDATES.md) ו־[מודל המלאי](../../INVENTORY_MODEL.md); שדות 003/004 אינם משוכפלים בכל טבלה.

## טבלאות מלאי

### `inventory_movements`

יומן תנועות מלאי, כדי שאפשר יהיה להסביר כל שינוי בכמות.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `inventory_movement_id` | `uuid` | כן | Primary Key |
| `product_variant_id` | `uuid` | כן | FK ל־`product_variants.product_variant_id` |
| `order_id` | `uuid` | לא | הזמנה שגרמה לתנועה |
| `movement_type` | `text` | כן | `sale`, `sale_reversal`, `restock`, `adjustment`, `reservation`, `release` |
| `stock_before` | `integer` | כן ביצירה חדשה | יתרה לפני התנועה |
| `stock_after` | `integer` | כן | יתרה לאחר התנועה |
| `reason` | `text` | לא | הסבר |
| `created_by` | `uuid` | לא | Admin או מערכת |
| `created_at` | `timestamptz` | כן | זמן התנועה |

אילוצים ואינדקסים:

- `CHECK (stock_after >= 0)`.
- בתנועות חדשות `stock_before` יישמר במפורש.
- אינדקס `idx_inventory_variant_time` על `(product_variant_id, created_at DESC)`.
- אינדקס `idx_inventory_order` על `(order_id)`.
- עדכון מלאי והוספת תנועת מלאי חייבים להתבצע באותה טרנזקציה.

## טבלאות משתמשים והרשאות

### `admin_users`

פרופיל ניהולי המקושר ל־Supabase Auth.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `admin_user_id` | `uuid` | כן | זהה ל־`auth.users.id` |
| `display_name` | `text` | כן | שם תצוגה |
| `email` | `text` | כן | אימייל מנהל |
| `status` | `text` | כן | `active` או `disabled` |
| `created_at` | `timestamptz` | כן | זמן יצירה |
| `updated_at` | `timestamptz` | כן | זמן עדכון |

### `admin_audit_log`

יומן פעולות ניהול.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `admin_audit_log_id` | `uuid` | כן | Primary Key |
| `admin_user_id` | `uuid` | כן | מי ביצע |
| `action` | `text` | כן | סוג פעולה |
| `entity_type` | `text` | כן | טבלה או ישות |
| `entity_id` | `uuid` | לא | מזהה הרשומה |
| `before_data` | `jsonb` | לא | מצב קודם מסונן |
| `after_data` | `jsonb` | לא | מצב חדש מסונן |
| `created_at` | `timestamptz` | כן | זמן הפעולה |

אינדקסים:

- `idx_audit_entity_time` על `(entity_type, entity_id, created_at DESC)`.
- `idx_audit_user_time` על `(admin_user_id, created_at DESC)`.
