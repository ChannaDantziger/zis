> מפרט תכנון, לא אישור לסכמה חיה. [מפת ERD](../../ERD_SCHEMA.md) · [אינדקס](../../PLAN_INDEX.md) · [פערים](../../OPEN_ISSUES.md).
> יש לקרוא יחד עם [עדכוני הסכמה](POLICIES_AND_UPDATES.md) ו־[מודל המלאי](../../INVENTORY_MODEL.md); שדות 003/004 אינם משוכפלים בכל טבלה.

## טבלאות הזמנות ותשלום

### `orders`

הזמנה של אורח או משתמש עתידי, כולל כתובת משלוח וסכומים מחושבים.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `order_id` | `uuid` | כן | Primary Key |
| `order_number` | `text` | כן | מספר הזמנה לתצוגה |
| `status` | `text` | כן | סטטוס עסקי |
| `payment_status` | `text` | כן | `pending`, `authorized`, `paid`, `failed` |
| `customer_name` | `text` | כן | שם המזמין |
| `customer_phone` | `text` | כן | טלפון |
| `customer_email` | `text` | כן | אימייל |
| `delivery_address` | `jsonb` | כן | כתובת יעד למשלוח בלבד |
| `shipping_zone_id` | `uuid` | כן | FK ל־`shipping_zones.shipping_zone_id` |
| `shipping_method_id` | `uuid` | כן | FK ל־`shipping_methods.shipping_method_id` |
| `delivery_date` | `date` | כן | תאריך יעד |
| `delivery_time_window` | `jsonb` | לא | חלון שעות |
| `subtotal` | `numeric(12,2)` | כן | סכום מוצרים |
| `shipping_total` | `numeric(12,2)` | כן | עלות משלוח |
| `discount_total` | `numeric(12,2)` | כן | הנחה; בשלב ראשון 0 |
| `total` | `numeric(12,2)` | כן | סכום סופי |
| `customer_notes` | `text` | לא | הערת לקוח |
| `internal_notes` | `text` | לא | הערה פנימית |
| `created_at` | `timestamptz` | כן | זמן יצירה |
| `updated_at` | `timestamptz` | כן | זמן עדכון |

אילוצים ואינדקסים:

- `UNIQUE (order_number)`.
- `CHECK (subtotal >= 0 AND shipping_total >= 0 AND discount_total >= 0 AND total >= 0)`.
- `CHECK (status IN ('ordered', 'in_preparation', 'packed', 'in_transit', 'delivered', 'approved', 'cancelled'))`.
- `CHECK (payment_status IN ('pending', 'authorized', 'paid', 'failed'))`.
- FK ל־`shipping_zones` ול־`shipping_methods`.
- אינדקס `idx_orders_status_created` על `(status, created_at DESC)`.
- אינדקס `idx_orders_customer_email` על `(customer_email)`.
- אינדקס `idx_orders_delivery_date_status` על `(delivery_date, status)`.

### `order_items`

פריטי ההזמנה עם Snapshot בלתי תלוי במוצר הנוכחי.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `order_item_id` | `uuid` | כן | Primary Key |
| `order_id` | `uuid` | כן | FK ל־`orders.order_id` |
| `product_id` | `uuid` | לא | קשר למוצר המקורי |
| `product_variant_id` | `uuid` | לא | קשר לווריאציה המקורית |
| `product_name_snapshot` | `text` | כן | שם בזמן הרכישה |
| `variant_name_snapshot` | `text` | כן | וריאציה בזמן הרכישה |
| `product_code_snapshot` | `text` | כן | Product Code בזמן הרכישה |
| `set_size_snapshot` | `integer` | כן | גודל Set בזמן הרכישה |
| `unit_set_price_snapshot` | `numeric(12,2)` | כן | מחיר Set בזמן הרכישה |
| `quantity_sets` | `integer` | כן | מספר Sets שנרכשו |
| `line_total` | `numeric(12,2)` | כן | מחיר שורה |

אילוצים ואינדקסים:

- `FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE RESTRICT`.
- קשרי מוצר/וריאציה יהיו nullable כדי לאפשר שמירת היסטוריה גם לאחר ארכוב.
- `CHECK (quantity_sets >= 1 AND set_size_snapshot >= 1)`.
- `CHECK (unit_set_price_snapshot >= 0 AND line_total >= 0)`.
- אינדקס `idx_order_items_order` על `(order_id)`.
- אינדקס `idx_order_items_variant` על `(product_variant_id)`.

### `order_status_history`

היסטוריית מעברי סטטוס להזמנה.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `order_status_history_id` | `uuid` | כן | Primary Key |
| `order_id` | `uuid` | כן | FK ל־`orders.order_id` |
| `from_status` | `text` | לא | הסטטוס הקודם |
| `to_status` | `text` | כן | הסטטוס החדש |
| `changed_by` | `uuid` | לא | Admin או מערכת |
| `note` | `text` | לא | הסבר לשינוי |
| `created_at` | `timestamptz` | כן | זמן שינוי |

אילוצים ואינדקסים:

- `CHECK (to_status IN ('ordered', 'in_preparation', 'packed', 'in_transit', 'delivered', 'approved', 'cancelled'))`.
- אינדקס `idx_order_status_history_order_time` על `(order_id, created_at DESC)`.

כללי סטטוס: `ordered -> in_preparation -> packed -> in_transit -> delivered -> approved`.
Admin רשאי לבטל רק לפני `packed`; לאחר הביטול הסטטוס `cancelled` גלוי וההחלטה נרשמת בהיסטוריה ובלוג.

### `payments`

מעקב אחר פעולות סליקה ללא שמירת פרטי כרטיס.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `payment_id` | `uuid` | כן | Primary Key |
| `order_id` | `uuid` | כן | FK ל־`orders.order_id` |
| `provider` | `text` | כן | ספק הסליקה |
| `provider_transaction_id` | `text` | לא | מזהה עסקה אצל הספק |
| `amount` | `numeric(12,2)` | כן | סכום החיוב |
| `currency` | `char(3)` | כן | ברירת מחדל `ILS` |
| `status` | `text` | כן | `pending`, `authorized`, `paid`, `failed` |
| `provider_payload` | `jsonb` | לא | מידע טכני מצומצם ומסונן |
| `created_at` | `timestamptz` | כן | זמן יצירה |
| `updated_at` | `timestamptz` | כן | זמן עדכון |

אינדקסים:

- `UNIQUE (provider, provider_transaction_id)` כאשר המזהה אינו null.
- `idx_payments_order_status` על `(order_id, status)`.
- אין לשמור מספר כרטיס, CVV או תוקף.

### `invoices`

קישור בין הזמנה ששולמה לבין מסמך שהופק בחשבונית ירוקה.

| שדה | סוג | חובה | הסבר |
|---|---|---:|---|
| `invoice_id` | `uuid` | כן | Primary Key |
| `order_id` | `uuid` | כן | FK ל־`orders.order_id` |
| `provider` | `text` | כן | `green_invoice` בשלב הראשון |
| `provider_document_id` | `text` | לא | מזהה המסמך אצל הספק |
| `document_number` | `text` | לא | מספר חשבונית/קבלה |
| `document_type` | `text` | כן | סוג המסמך |
| `status` | `text` | כן | `pending`, `issued`, `failed`, `cancelled` |
| `document_url` | `text` | לא | קישור למסמך אם קיים |
| `error_message` | `text` | לא | שגיאה טכנית |
| `created_at` | `timestamptz` | כן | זמן יצירה |
| `updated_at` | `timestamptz` | כן | זמן עדכון |

אילוצים ואינדקסים:

- אינדקס `idx_invoices_order_status` על `(order_id, status)`.
- `UNIQUE (provider, provider_document_id)` כאשר המזהה אינו null.
