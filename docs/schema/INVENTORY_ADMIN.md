> מפרט תכנון, לא אישור לסכמה חיה. [מפת ERD](../ERD_SCHEMA.md) · [אינדקס](../PLAN_INDEX.md) · [פערים](../OPEN_ISSUES.md).
> יש לקרוא יחד עם [עדכוני הסכמה](POLICIES_AND_UPDATES.md) ו־[מודל המלאי](../INVENTORY_MODEL.md); שדות 003/004 אינם משוכפלים בכל טבלה.

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

### `admin_tasks` — מתוכנן ל־P7

משימות תפעול ידניות ומשימות מערכת שדורשות סגירה מפורשת. הודעת Push או `admin_notification` אינן מחליפות משימה פתוחה.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `admin_task_id` | `uuid` | כן | Primary Key |
| `source` | `text` | כן | `system` או `manual` |
| `source_event_key` | `text` | לא | מזהה אירוע יציב למשימת מערכת; מונע כפילויות |
| `title` | `text` | כן | כותרת הפעולה |
| `description` | `text` | לא | פירוט בטוח לתפעול |
| `priority` | `text` | כן | `critical`, `high`, `normal` |
| `status` | `text` | כן | `open`, `done` או `dismissed` |
| `due_at` | `timestamptz` | לא | מועד טיפול, אם קיים |
| `order_id` | `uuid` | לא | FK להזמנה הקשורה, אם קיימת |
| `created_by` | `uuid` | לא | Admin יוצר או מערכת |
| `resolved_by` | `uuid` | לא | מי סגר/ביטל |
| `resolved_at` | `timestamptz` | לא | זמן סגירה/ביטול |
| `created_at` | `timestamptz` | כן | זמן יצירה |
| `updated_at` | `timestamptz` | כן | זמן עדכון |

אילוצים ואינדקסים מתוכננים:

- `CHECK` על `source`, `priority` ו־`status` לפי הערכים שלעיל.
- מפתח ייחודי חלקי על `source_event_key` כאשר מקור המשימה הוא `system` והמשימה פתוחה.
- אינדקס על `(status, priority, due_at)` לרשימת “דורש טיפול” ועל `(order_id)` למשימות הזמנה.
- סגירה, ביטול ושינוי עדיפות נרשמים גם ב־`admin_audit_log`.
- ביצירת משימה ידנית ממשק המשתמש דורש רק `title`; השרת משלים `source = manual`, `priority = normal` ו־`status = open`. `due_at` נשאר null ואין שדה חזרתיות במהדורה הראשונה.

## עדכון הרשאות והתראות — 24.09.2026

- `admin_users.role` מתוכנן כ־`operations_manager` או `delivery_driver`. הראשון בלבד משנה תאריך, סוגר חנות, מבטל ומבצע החזר מלא; השני מסמן הזמנה כ־`delivered` רק ברשימת האספקות המותרת לו.
- `admin_notification_preferences` שומר לכל מנהל שתי בחירות: Push להזמנה חדשה ו־Push למשימה חדשה. ברירת המחדל מופעלת, אך כיבוי למנהל יחיד אינו מוחק את `admin_notifications` או `admin_tasks`.
- `admin_notifications` מורחב לסוגים `new_order` ו־`late_paid_order`. משימת מערכת משתמשת ב־`source_event_key` ייחודי כל עוד היא פתוחה, כדי ש־Webhook/retry לא ייצרו כפילות.
- `admin_tasks`, העדפות, Push devices והתראות מקבלים RLS ללא גישה ציבורית. ה־Admin API הוא נקודת הגישה ובודק תפקיד פעיל; אין להסתמך על רכיב מוסתר.
