# חוזי API — P1

[אינדקס](PLAN_INDEX.md) · [ארכיטקטורה](BACKEND_ARCHITECTURE.md) · [קוד החוזים](../zis-api/src/contracts/index.ts).

זהו חוזה נתונים לפני חיבור מסכי Frontend. הנתיבים מסומנים כ־P2/P5 כאשר השרת עדיין אינו מממש אותם. כל סכום מוחזר כמחרוזת עשרונית כדי למנוע עיגול JavaScript. אין בדוגמאות פרטי לקוח או סוד אמיתי.

## כללים משותפים

- `Content-Type: application/json` לכל גוף JSON.
- `GET` ציבורי מחזיר רק קטגוריות, מוצרים, וריאציות, תמונות, FAQ, אזורי משלוח וכללי זמינות פעילים.
- עימוד משתמש ב־`page` ו־`pageSize`; ברירת המחדל היא 24, והמקסימום הוא 50.
- כל תגובה יכולה לכלול `X-Request-Id`; שגיאה מחזירה `{ "error": { "code", "message", "fields?", "requestId?" } }`.
- השרת לא מחזיר `storage_path`, נתוני Admin, payload של ספק תשלום או פרטי כרטיס ללקוח.
- `pricePerUnit` הוא מחיר של יחידה פיזית גם במוצר פשוט וגם בווריאציה; מחיר Set מחושב בשרת ובחנות כמחיר ליחידה כפול `setSize`.
- במוצר פשוט `available_items` נספר ביחידות פיזיות; שדה `availableSets` ללקוחה הוא `floor(available_items / set_size)`. בווריאציה `availableSets` נשלף מ־`product_variants.available_sets`.

## קטלוג ומדיה

| שיטה ונתיב | הרשאה | חוזה |
|---|---|---|
| `GET /categories` | ציבורי | `{ data: CatalogCategory[] }` |
| `GET /catalog` | ציבורי | `CatalogResponse`, עם `categorySlug`, `search`, `sort`, `direction`, `page`, `pageSize` |
| `GET /catalog/:productId` | ציבורי | `CatalogProduct` פעיל בלבד |
| `GET /faq` | ציבורי | רשומות `active` לפי `sortOrder` |
| `POST /admin/media/upload` | Admin | גוף בינארי; `X-Media-Bucket`, `X-File-Name`, `Content-Type`; העלאה חדשה וקבלת URL חתום קצר־תוקף |
| `POST /admin/products/:id/images` | Admin | יצירת metadata לאחר העלאה מאומתת |
| `PATCH /admin/product-images/:id` | Admin | alt, סדר, סוג או ארכוב לוגי; החלפה מתבצעת בהעלאה חדשה ואז עדכון metadata |
| `POST /admin/products` | Admin | יצירת מוצר במצב טיוטה ורישום Audit |
| `GET /admin/products` | מנהלת תפעול | `page` ו־`categoryId` אופציונלי מסוג UUID; עמוד של 25 מוצרים, ספירה מסוננת וכל הקטגוריות. מימוש 21.10.2026 |
| `PATCH /admin/products/:id` | מנהלת תפעול | עריכת מוצר עם גרסה; `pricePerUnit` יכול להישאר `null` למוצר עם מחירי וריאציות. פרסום נבדק בשרת |
| `POST /admin/products/:id/variants` | Admin | יצירת וריאציה עם `pricePerUnit`, מלאי התחלתי ורישום Audit |
| `GET /event-gallery` | ציבורי | תמונות אירועים שפורסמו בלבד |

תמונת מוצר כוללת `imageId`, `url`, `altText`, `imageType` ו־`sortOrder`. URL מדיה נוצר מחדש על ידי השרת; הוא אינו אסמכתה קבועה. העלאה מותרת רק ל־JPEG/PNG/WebP עד 5 MiB. קובץ חדש נבדק ונרשם לפני הסרת הקודם.

## משלוח, זמינות ו־Quote

| שיטה ונתיב | הרשאה | חוזה |
|---|---|---|
| `GET /store-status` | ציבורי | פתיחה, הודעת סגירה, אזור זמן, שעת יציאה ו־`minimumProductSubtotal` כמחרוזת כספית |
| `GET /shipping/zones` | ציבורי | אזורים פעילים בלבד |
| `POST /availability` | ציבורי | `AvailabilityRequest` → `AvailabilityResponse` |
| `POST /quote` | ציבורי | `ShippingQuoteInput` → `QuotePreview` |

`QuotePreview` הוא חישוב תצוגה בלבד: `reservationCreated` תמיד `false`, אין לו תוקף ואין בו הבטחת מחיר או מלאי. מחיר המוצרים מחושב כמחיר יחידה × מספר יחידות פיזיות ב־Set × מספר Sets. ביצירת הזמנה השרת מחשב מחדש מחיר, מינימום, אזור, סגירות, cutoff ושעון `Asia/Jerusalem`; לוח חגים אינו מופעל בשלב זה.

מינימום ההזמנה נשלח בהגדרות כ־`minimumProductSubtotal` ונקרא במסד מתוך `store_settings.minimum_product_subtotal`. Quote ויצירת הזמנה משווים אליו את סכום המוצרים לפני משלוח; אי עמידה מחזירה `MINIMUM_ORDER_NOT_MET`.

עדכון קוד 29.10.2026: `/store-status` מחזיר את המינימום עבור שלב המוצרים והעגלה; ערך חסר אינו מתפרש כ־0. חוסר מוצר/כמות ב־Quote מחזיר `STOCK_UNAVAILABLE`, כדי לא לערבב חוסר מלאי עם תאריך/אזור לא תקינים.

## יצירת הזמנה ואישור אורח

`POST /orders` מקבל `Idempotency-Key` אטומי וגוף `CreateOrderInput`. השרת שומר הזמנה `pending`/`ordered` לפני פנייה לספק התשלום ומחזיר רק לאחר commit. כשל תשלום אינו מוחק את ההזמנה או את העגלה המקומית.

`PATCH /orders/pending` מקבל את רשימת הפריטים הסופית, כולל שינוי כמות, הוספה, הסרה או החלפה, עם `Authorization: Bearer <confirmationToken>`, כותרת `Idempotency-Key` וגוף `{ "expectedVersion": "...", "items": [...] }`. הרשימה חייבת לכלול 1–100 פריטים ייחודיים בכמויות חיוביות. אין מזהה הזמנה או מחיר בגוף: האסימון מזהה את ההזמנה, ו־`version` מוחזר ביצירה ובאישור. האסימון חייב להיות בתוקף ולא מבוטל.

העריכה נועלת את ההזמנה והאסימון בטרנזקציה, מותרת רק ב־`ordered/pending` ונדחית אם קיים תשלום `pending/authorized/paid`. נבדקים פרסום/כשירות מכירה, זמינות ומינימום של כל הפריטים הסופיים. לפריט שכבר נמצא בהזמנה נשמר Snapshot ומחיר יחידה קיים; פריט חדש מקבל Snapshot ומחיר ממקור האמת. הוספה/עדכון/מחיקת שורות וסכומי שורות, משלוח, מס וסכום כולל נשמרים יחד, ללא שינוי סטטוס או מלאי. שינוי גרסה מחזיר `409 ORDER_CHANGED`; מצב שאינו ניתן לעריכה מחזיר `409 ORDER_NOT_EDITABLE`.

מפתחות העריכה נשמרים בטבלה נפרדת `order_pending_edit_requests` מ־[016](../zis-db/migrations/016_pending_order_edit_requests.sql), עם hash של הפעולה, ההזמנה והגוף ו־metadata של התשובה. ניסיון חוזר באותו גוף/מפתח מחזיר את תשובת העריכה שנשמרה; גוף/הזמנה אחרים באותו מפתח מחזירים התנגשות. מפתחות יצירה ועריכה הם מרחבים נפרדים; unique של טבלת היצירה על order_id נשאר ללא שינוי. **016 לא הורצה ודורשת החלה ידנית בתהליך המאושר לפני הפעלת העריכה מול DB**; בהיעדרה מוחזר `503 PENDING_ORDER_EDIT_NOT_CONFIGURED`.

האישור הפרטי המאומת כולל גם `items` עם IDs/variant IDs/quantities בלבד, ללא פרטי לקוחה או כתובת; `items` ו־`version` נקראים יחד. אי התאמת גרסה חוסמת עריכה ותשלום עד טעינה מפורשת של הרשימה והגרסה העדכניות; אין עדכון version בלבד מעל רשימה מקומית ישנה. בקשת עריכה שתוצאתה לא ידועה נשארת בניסיון חוזר עם אותו מפתח וגוף.

```json
{
  "customerName": "לקוחה לדוגמה",
  "customerPhone": "0500000000",
  "customerEmail": "customer@example.invalid",
  "deliveryDate": "2026-10-01",
  "shippingZoneId": "00000000-0000-0000-0000-000000000001",
  "items": [{ "productVariantId": "00000000-0000-0000-0000-000000000003", "quantitySets": 1 }],
  "deliveryAddress": { "city": "ירושלים", "street": "רחוב הדוגמה", "houseNumber": "1" }
}
```

תגובה מוצלחת מחזירה `orderId`, `orderNumber`, `status`, `paymentStatus`, `total`, `currency` ו־`confirmationToken`. האסימון אקראי, קצר־תוקף ומאוחסן במסד רק כ־hash; משך התוקף יוגדר ב־Config לפני הפעלת הנתיב. `GET /orders/confirmation` יקבל ב־Authorization: Bearer את האסימון ולא מספר הזמנה בלבד, ויחזיר תקציר מצומצם: מספר הזמנה, סטטוסים, תאריך, סכום ומטבע. כתובת, טלפון, Email ופרטי פריטים אינם נחשפים במסלול זה.

## קודי שגיאה מחייבים

## Admin תפעולי

| `GET /admin/commerce/settings` | Admin פעיל | הגדרות עסק, אזורי משלוח, כללי תמחור וסגירות |
| `PATCH /admin/commerce/settings` | מנהל תפעול | cutoff, שעת יציאה כללית, טווח הזמנה, סגירת חנות ומינימום סכום מוצרים להזמנה (ללא דמי משלוח) |
| `POST/PATCH /admin/shipping/zones/:id` | מנהל תפעול | יצירה/עדכון אזור ושעת יציאה אזורית |
| `POST/PATCH /admin/shipping/rules/:id` | מנהל תפעול | כלל מחיר לפי אזור וטווח Sets |
| `POST/PATCH /admin/store-closures/:id` | מנהל תפעול | חלון סגירה מתוזמן; עדכון לוגי באמצעות `isActive` |

| שיטה ונתיב | הרשאה | חוזה |
|---|---|---|
| `GET /admin/dashboard?date=YYYY-MM-DD` | Admin פעיל | סיכום יום, משימות פתוחות, הזמנות הבאות וסיכום ייצור |
| `GET /admin/orders?deliveryDate=YYYY-MM-DD` | Admin פעיל | שורות הזמנה, סינון/מיון, `allowedNextStatuses` ו־`version` |
| `GET /admin/orders/page` | מנהל תפעול פעיל | `{ data, page, variants }`; עימוד 24 עד 50, מסנני יום/סטטוס/עיר/וריאציה ו־no-store; [פרטים](ADMIN_ORDERS.md) |
| `GET /admin/orders/:orderId` | מנהל תפעול פעיל | פרטים מוגנים, Snapshot פריטים, הקדשה, משימות פתוחות והיסטוריה; UUID, 404 ו־`Cache-Control: no-store` |
| `GET /admin/production?date=YYYY-MM-DD` | Admin פעיל | קיבוץ Sets לפי מוצר/וריאציה להזמנות ששולמו |
| `POST /admin/orders/bulk-status` | Admin פעיל | `{ items: [{ orderId, version }], targetStatus }`; מחזיר תוצאה נפרדת לכל הזמנה |
| `GET /admin/tasks` | מנהל תפעול פעיל | מסנן `status`, עימוד `page/pageSize`, תשובה `{ data, page }` |
| `POST /admin/tasks` | מנהל תפעול פעיל | `{ title }` בלבד; יצירת משימה ידנית פתוחה בעדיפות רגילה, 201 |
| `PATCH /admin/tasks/:taskId` | מנהל תפעול פעיל | `{ status: done/dismissed, version }` בלבד; סגירה ידנית עם Audit וגרסה |

עדכון משימות 08.10: `openTaskCount` בדשבורד סופר את כלל המשימות הפתוחות בנפרד מרשימת התצוגה. פעולות משימה דורשות `operations_manager` מפורש וכוללות `no-store`; זהות היוצר/הסוגר נקבעת בשרת. משימות מערכת נדחות בסגירה ידנית. ניסיון סגירה חוזר לאותו מצב אינו כותב שוב; יצירה אינה Idempotent. חוזים, קודי שגיאה וגבולות ב־[ADMIN_TASKS](ADMIN_TASKS.md).

שינוי מרוכז מותר רק קדימה: `ordered` ששולמה → `in_preparation` → `packed` → `in_transit` → `delivered` → `approved`. השרת בודק גרסה, תשלום, תפקיד ומעבר חוקי; הצלחות נרשמות ב־`order_status_history`, והזמנות שנכשלו אינן מונעות הצלחה של אחרות באותה בקשה.

עדכון 08.10: רשימת ההזמנות מקבלת `status`, `productVariantId`, `location` (עיר), `sortBy` (`status/product/location/orderNumber/total`) ו־`sortDirection` (`asc/desc`). מיון סטטוס לפי סדר תפעולי. `paymentStatus` נוסף כדי לא לתייג הזמנה ממתינה כשולמה; `ordered` ללא `paid` מחזירה `allowedNextStatuses: []`. תאריך אספקה מוחזר כמחרוזת `YYYY-MM-DD`. הרשימה אינה מחזירה פרטי לקוחה או כתובת מלאה.

פרטי הזמנה ממומשים בקוד בלבד ואינם נתיב אורח. הם כוללים `orderId`, `orderNumber`, `status`, `paymentStatus`, `deliveryDate`, `total`, `version`, פרטי לקוחה, כתובת עם שדות מותרים בלבד, `venueName`, `dedicationText`, `customerNotes`, `items`, `history`, `tasks` ו־`allowedNextStatuses`. משלוחן או זהות ללא תפקיד מפורש אינם מורשים לנתיב זה; מסך אספקה ייעודי והרשאות שיוך להזמנות נשארים להמשך. שגיאת ישות חסרה בנתיב זה היא `ORDER_NOT_FOUND`.

| HTTP | `code` | שימוש |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | גוף, UUID, תאריך, כמות או עימוד לא תקינים |
| 401 | `AUTHENTICATION_REQUIRED` | חסר Bearer בנתיב Admin |
| 403 | `ADMIN_ACCESS_REQUIRED` | משתמש אינו Admin פעיל |
| 404 | `NOT_FOUND` | ישות או מדיה שאינה קיימת/אינה חשופה |
| 409 | `CONFLICT` | Idempotency שונה, מלאי השתנה או התנגשות פרסום |
| 422 | `BUSINESS_RULE_VIOLATION` | חנות סגורה, אזור ללא כלל או תאריך אסור |
| 422 | `MINIMUM_ORDER_NOT_MET` | סכום המוצרים נמוך ממינימום ההזמנה; דמי משלוח אינם נכללים |
| 500 | `INTERNAL_ERROR` | שגיאה שאינה נחשפת ללקוח; הפרטים בלוג מסונן |

החוזים הטיפוסיים נמצאים ב־`zis-api/src/contracts`; מימוש Routes/Controllers/Services יתחבר אליהם ב־P2 וב־P5.

## מימוש P5 — 10.10.2026

POST /orders ואישור האורח נוספו בקוד ונבדקו מקומית; [תיעוד](ORDER_CREATION.md). מיגרציה 010 טרם הורצה. תצורת אסימון חסרה מחזירה 503 ORDER_CREATION_NOT_CONFIGURED. Quote/Checkout אינם קוראים שיעור מס; השדות tax_total/tax_rate נשמרים כאפס עד פיתוח החשבונית. אין ספק תשלום או אישור חיוב. בדיקות HTTP/DB ודפדפן מלא עדיין פתוחות.
