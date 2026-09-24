# חוזי API — P1

[אינדקס](../PLAN_INDEX.md) · [ארכיטקטורה](../BACKEND_ARCHITECTURE.md) · [קוד החוזים](../zis-api/src/contracts/index.ts).

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
| `POST /admin/media/upload` | Admin | העלאה חדשה וקבלת URL חתום קצר־תוקף |
| `POST /admin/products/:id/images` | Admin | יצירת metadata לאחר העלאה מאומתת |
| `PATCH /admin/product-images/:id` | Admin | alt, סדר, סוג, החלפה או ארכוב לוגי |
| `GET /event-gallery` | ציבורי | תמונות אירועים שפורסמו בלבד |

תמונת מוצר כוללת `imageId`, `url`, `altText`, `imageType` ו־`sortOrder`. URL מדיה נוצר מחדש על ידי השרת; הוא אינו אסמכתה קבועה. העלאה מותרת רק ל־JPEG/PNG/WebP עד 5 MiB. קובץ חדש נבדק ונרשם לפני הסרת הקודם.

## משלוח, זמינות ו־Quote

| שיטה ונתיב | הרשאה | חוזה |
|---|---|---|
| `GET /store-status` | ציבורי | פתיחה, הודעת סגירה ואזור זמן עסקי |
| `GET /shipping/zones` | ציבורי | אזורים פעילים בלבד |
| `POST /availability` | ציבורי | `AvailabilityRequest` → `AvailabilityResponse` |
| `POST /quote` | ציבורי | `ShippingQuoteInput` → `QuotePreview` |

`QuotePreview` הוא חישוב תצוגה בלבד: `reservationCreated` תמיד `false`, אין לו תוקף ואין בו הבטחת מחיר או מלאי. ביצירת הזמנה השרת מחשב מחדש מחיר, מינימום, אזור, סגירות, חג/ערב חג, cutoff ושעון `Asia/Jerusalem`.

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

תגובה מוצלחת מחזירה `orderId`, `orderNumber`, `status`, `paymentStatus`, `total`, `currency` ו־`confirmationToken`. האסימון אקראי, קצר־תוקף ומאוחסן במסד רק כ־hash; משך התוקף יוגדר ב־Config לפני הפעלת הנתיב. `GET /orders/confirmation` יקבל את האסימון ולא מספר הזמנה בלבד, ויחזיר תקציר מצומצם: מספר הזמנה, סטטוסים, תאריך, סכום ומטבע. כתובת, טלפון, Email ופרטי פריטים אינם נחשפים במסלול זה.

## קודי שגיאה מחייבים

| HTTP | `code` | שימוש |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | גוף, UUID, תאריך, כמות או עימוד לא תקינים |
| 401 | `AUTHENTICATION_REQUIRED` | חסר Bearer בנתיב Admin |
| 403 | `ADMIN_ACCESS_REQUIRED` | משתמש אינו Admin פעיל |
| 404 | `NOT_FOUND` | ישות או מדיה שאינה קיימת/אינה חשופה |
| 409 | `CONFLICT` | Idempotency שונה, מלאי השתנה או התנגשות פרסום |
| 422 | `BUSINESS_RULE_VIOLATION` | חנות סגורה, אזור ללא כלל, מינימום או תאריך אסור |
| 500 | `INTERNAL_ERROR` | שגיאה שאינה נחשפת ללקוח; הפרטים בלוג מסונן |

החוזים הטיפוסיים נמצאים ב־`zis-api/src/contracts`; מימוש Routes/Controllers/Services יתחבר אליהם ב־P2 וב־P5.
