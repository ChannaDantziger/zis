# אימות חוזר: תשלום ניסוי ודשבורד — 17.11.2026

[אינדקס](PLAN_INDEX.md) · [תוצאות בדיקת התשלום הקודמת](PAYMENT_TEST_RESULTS.md) · [תוכנית P6](IMPLEMENTATION_PLAN.md).

## מסקנה

בקוד המקומי, הזמנת ניסוי נוצרת רק עם התחברות `operations_manager`; האישור המדומה דורש שוב מנהלת פעילה, מסמן את התשלום `paid`, רושם תשלום מדומה בסך 0 ואירוע Audit, ומפחית מלאי בטרנזקציה אחת. בדיקת קבלה מול PostgreSQL מבודד עברה. במסד, סטטוס ההזמנה נשאר `ordered` — כלומר **„התקבלה”** בממשק הניהול — והתשלום הוא `paid`. הדשבורד מציג הזמנות לפי *תאריך אספקה נבחר*, וברירת המחדל במסך הבית היא היום; הזמנה למועד עתידי לא תופיע בהכרח בלוח של היום.

לא אומתה בסבב זה הזמנה חדשה מול DB חי, ולא נצפתה הזמנה כזו בדפדפן הניהול. לכן התוצאה היא **אימות קוד ובדיקות מבודדות, לא אישור מקצה לקצה ב־Production**.

## רצף הזרימה שנבדק בקוד

1. [`TestCheckoutAccess.tsx`](../apps/storefront/src/features/checkout/TestCheckoutAccess.tsx) מציע כניסת מנהלת למצב ניסוי; [`checkout.store.ts`](../apps/storefront/src/features/checkout/checkout.store.ts) בודק תפקיד `operations_manager` ושולח את יצירת ההזמנה אל `/admin/test-orders` עם Bearer token.
2. [`admin-test-orders.controller.ts`](../zis-api/src/controllers/admin-test-orders.controller.ts) דורש מנהלת פעילה לפני יצירה ואישור. [`order.service.ts`](../zis-api/src/commerce/order.service.ts) מסמן שם וכתובת כ„ניסוי”, ו־[`postgres-order.repository.ts`](../zis-api/src/commerce/postgres-order.repository.ts) מסמן `is_test=true` וכותב Audit בתוך הטרנזקציה.
3. אישור התשלום קורא `/admin/test-orders/:orderId/approve-payment`. [`test-payment.service.ts`](../zis-api/src/commerce/test-payment.service.ts) דוחה הזמנה רגילה, בודק גרסה ומצב, מאמת שוב מחיר ומלאי, רושם `test_payment_approvals`, תשלום `admin_test` עם `is_simulated=true` וסכום 0, מעדכן `payment_status='paid'`, ורושם היסטוריה ו־Audit. סטטוס `ordered` אינו משתנה אוטומטית.
4. [`postgres-home.repository.ts`](../zis-api/src/dashboard/postgres-home.repository.ts) קורא הזמנות לפי תאריך אספקה ללא סינון שמסיר `is_test`. [`HomeStageChart.tsx`](../apps/admin-mobile/src/features/home/HomeStageChart.tsx) מציג הזמנה `ordered/paid` בשלב „התקבלה” עם הכיתוב „שולמה · ממתינה להכנה” ופעולת „התחלת הכנה”. [`OrderStatusBadge.tsx`](../apps/admin-mobile/src/shared/components/OrderStatusBadge.tsx) מגדיר `ordered` כ„התקבלה”.

## תוצאות ריצה

| בדיקה | תוצאה | גבול |
|---|---|---|
| בדיקת קבלה `scripts/payment-review` מול PGlite מבודד | עברה 1/1; `paid`, תשלום מדומה 0, הפחתת מלאי | אינה מתחברת למסד החי או למסך הניהול |
| בדיקות ממוקדות API: הזמנה, אישור ניסוי ודשבורד | עברו 21/21 | חלקן בדיקות יחידה עם SQL מדומה |
| בדיקות Admin | עברו 26/26 | אינן יוצרות הזמנה חיה |
| בדיקות Storefront | בריצה הראשונית 2 בדיקות ישנות נכשלו; לאחר הסרתן לבקשת בעלת האתר, 30/30 עברו | הוסרו רק בדיקת נוסח 503 הישן ובדיקת תאריכים לפי אזור שכבר אינו קיים |
| בדיקות API מלאות | נכשלו בחלק מבדיקות HTTP על `connect EACCES 127.0.0.1` גם בהרצה חוזרת מחוץ למגבלת הרשת | יתר בדיקות היחידה המשיכו; לא ניתן לטעון שהחבילה כולה עברה |
| Typecheck, בנייה; Lint בחנות | עברו בכל שלושת היישומים; Lint עבר בחנות | בנייה אינה מוכיחה זרימה חיה |

## פער שדורש תיקון לפני בדיקת קבלה מלאה

**אישור מנהלת אחרי רענון דף:** [`checkout.store.ts`](../apps/storefront/src/features/checkout/checkout.store.ts) שומר את האישור הפרטי ב־sessionStorage ומשחזר אותו לאחר רענון, אך ה־admin token נשמר בזיכרון בלבד. [`CheckoutPage.tsx`](../apps/storefront/src/pages/CheckoutPage.tsx) מציג מסך הזמנה מיד כשיש `created`, בלי להציג שם את [`TestCheckoutAccess.tsx`](../apps/storefront/src/features/checkout/TestCheckoutAccess.tsx). לכן אחרי רענון של הזמנת ניסוי ממתינה, אין במסך דרך להתחבר שוב כמנהלת ולאשר את התשלום המדומה. צריך לאפשר כניסה חוזרת במסך ההזמנה המשוחזרת, ואז לבדוק שהאישור ממשיך בלי ליצור הזמנה חדשה.

**עדכון בדיקות לפי בקשת בעלת האתר:** שתי הבדיקות שנכשלו בשל ציפיות ישנות הוסרו מ־[`checkout.test.ts`](../apps/storefront/tests/checkout.test.ts). בדיקת החנות המלאה הורצה שוב: 30 עברו, 0 נכשלו. בדיקות התאוששות מניסיון יצירה לא ודאי ואישור תשלום ניסוי נשארו בקובץ ועברו.

## בדיקת הקבלה שעוד חסרה

בסביבת בדיקה מבודדת עם מנהלת מורשית: ליצור הזמנת ניסוי מסומנת, לאשר תשלום מדומה, לוודא שאין חיוב ושיש `paid` ורשומת Audit, לפתוח בדשבורד את תאריך האספקה של ההזמנה, לראות אותה בשלב „התקבלה” ולנסות „התחלת הכנה”. יש לכלול רענון דף לפני האישור. אין לבצע זאת מול Production או על נתוני לקוחות בלי אישור מתאים.
