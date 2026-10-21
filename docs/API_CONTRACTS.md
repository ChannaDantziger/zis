# חוזי API — P1

[אינדקס](PLAN_INDEX.md) · [ארכיטקטורה](BACKEND_ARCHITECTURE.md) · [קוד החוזים](../zis-api/src/contracts/index.ts).

זהו חוזה נתונים לפני חיבור מסכי Frontend. הנתיבים מסומנים כ־P2/P5 כאשר השרת עדיין אינו מממש אותם. כל סכום מוחזר כמחרוזת עשרונית כדי למנוע עיגול JavaScript. אין בדוגמאות פרטי לקוח או סוד אמיתי.

## כללים משותפים

- `Content-Type: application/json` לכל גוף JSON.
- `GET` ציבורי מחזיר רק קטגוריות, מוצרים, וריאציות, תמונות, FAQ, אזורי משלוח וכללי זמינות פעילים.
- עימוד משתמש ב־`page` ו־`pageSize`; ברירת המחדל היא 24, והמקסימום הוא 50.
- כל תגובה יכולה לכלול `X-Request-Id`; שגיאה מחזירה `{ "error": { "code", "message", "fields?", "requestId?" } }`.
- השרת לא מחזיר `storage_path`, נתוני Admin, payload של ספק תשלום או פרטי כרטיס ללקוח.

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
| `POST /admin/products/:id/variants` | Admin | יצירת וריאציה ומלאי התחלתי ורישום Audit |
| `GET /event-gallery` | ציבורי | תמונות אירועים שפורסמו בלבד |

תמונת מוצר כוללת `imageId`, `url`, `altText`, `imageType` ו־`sortOrder`. URL מדיה נוצר מחדש על ידי השרת; הוא אינו אסמכתה קבועה. העלאה מותרת רק ל־JPEG/PNG/WebP עד 5 MiB. קובץ חדש נבדק ונרשם לפני הסרת הקודם.

## משלוח, זמינות ו־Quote

| שיטה ונתיב | הרשאה | חוזה |
|---|---|---|
| `GET /store-status` | ציבורי | פתיחה, הודעת סגירה, אזור זמן ושעת יציאה כללית |
| GET /shipping/methods | ציבורי | { data: ShippingMethodResponse[] }, פעילות בלבד |
| `GET /shipping/zones` | ציבורי | אזורים פעילים בלבד |
| `POST /availability` | ציבורי | `AvailabilityRequest` → `AvailabilityResponse` |
| `POST /quote` | ציבורי | `ShippingQuoteInput` → `QuotePreview` |

`QuotePreview` הוא חישוב תצוגה בלבד: `reservationCreated` תמיד `false`, אין לו תוקף ואין בו הבטחת מחיר או מלאי. ביצירת הזמנה השרת מחשב מחדש מחיר, מינימום, אזור, סגירות, cutoff ושעון `Asia/Jerusalem`; לוח חגים אינו מופעל בשלב זה.

מינימום ההזמנה נשלח בהגדרות כ־`minimumProductSubtotal` ונקרא במסד מתוך `store_settings.minimum_product_subtotal`. Quote ויצירת הזמנה משווים אליו את סכום המוצרים לפני משלוח; אי עמידה מחזירה `MINIMUM_ORDER_NOT_MET`.

## יצירת הזמנה ואישור אורח

`POST /orders` מקבל `Idempotency-Key` אטומי וגוף `CreateOrderInput`. השרת שומר הזמנה `pending`/`ordered` לפני פנייה לספק התשלום ומחזיר רק לאחר commit. כשל תשלום אינו מוחק את ההזמנה או את העגלה המקומית.

```json
{
  "customerName": "לקוחה לדוגמה",
  "customerPhone": "0500000000",
  "customerEmail": "customer@example.invalid",
  "deliveryDate": "2026-10-01",
  "shippingZoneId": "00000000-0000-0000-0000-000000000001",
  "shippingMethodId": "00000000-0000-0000-0000-000000000002",
  "items": [{ "productVariantId": "00000000-0000-0000-0000-000000000003", "quantitySets": 1 }],
  "deliveryAddress": { "city": "ירושלים", "street": "רחוב הדוגמה", "houseNumber": "1" }
}
```

תגובה מוצלחת מחזירה `orderId`, `orderNumber`, `status`, `paymentStatus`, `total`, `currency` ו־`confirmationToken`. האסימון אקראי, קצר־תוקף ומאוחסן במסד רק כ־hash; משך התוקף יוגדר ב־Config לפני הפעלת הנתיב. `GET /orders/confirmation` יקבל ב־Authorization: Bearer את האסימון ולא מספר הזמנה בלבד, ויחזיר תקציר מצומצם: מספר הזמנה, סטטוסים, תאריך, סכום ומטבע. כתובת, טלפון, Email ופרטי פריטים אינם נחשפים במסלול זה.

## קודי שגיאה מחייבים

## Admin תפעולי

| `GET /admin/commerce/settings` | Admin פעיל | הגדרות עסק, אזורי משלוח, שיטות, כללי תמחור וסגירות |
| `PATCH /admin/commerce/settings` | מנהל תפעול | cutoff, שעת יציאה כללית, טווח הזמנה, סגירת חנות ומינימום סכום מוצרים להזמנה (ללא דמי משלוח) |
| `POST/PATCH /admin/shipping/zones/:id` | מנהל תפעול | יצירה/עדכון אזור ושעת יציאה אזורית |
| `PATCH /admin/shipping/methods/:id` | מנהל תפעול | שינוי שם והפעלה של שיטת משלוח |
| `POST/PATCH /admin/shipping/rules/:id` | מנהל תפעול | כלל מחיר לפי אזור, שיטה וטווח Sets |
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

POST /orders ואישור האורח נוספו בקוד ונבדקו מקומית; [תיעוד](ORDER_CREATION.md). מיגרציה 010 טרם הורצה. תצורת אסימון חסרה מחזירה 503 ORDER_CREATION_NOT_CONFIGURED. Quote ויצירה דורשים system_defaults.tax_rate מפורש; חסר או לא תקין מחזיר 503 COMMERCE_TAX_NOT_CONFIGURED. QuotePreview כולל taxRate ופירוק מס מתוך מחיר כולל, ללא תוספת מס נוספת. אין ספק תשלום או אישור חיוב. בדיקות HTTP/DB ודפדפן מלא עדיין פתוחות.
