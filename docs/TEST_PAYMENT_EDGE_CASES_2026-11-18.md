# מקרי קצה: הזמנת ניסוי, אישור מנהלת ודשבורד — 18.11.2026

[אינדקס](PLAN_INDEX.md) · [אימות תשלום קודם](TEST_PAYMENT_VERIFICATION_2026-11-17.md) · [תוכנית P5–P7](IMPLEMENTATION_PLAN.md).

## היקף וגבולות

הפעלת `zis-edge-case-inventory` על המסלול: מנהלת נכנסת בחנות → יוצרת הזמנת ניסוי → מאשרת תשלום מדומה → ההזמנה מופיעה בניהול בתאריך האספקה כ„התקבלה / שולמה” → אפשר להתחיל הכנה. מדובר במיפוי ממוקד, לא בטענה שכל מקרה אפשרי בעולם נכלל. אין כאן הרשאה לחיוב אמיתי או לשינוי Production.

הרצה חוזרת ב־18.11.2026: 19/19 בדיקות API ממוקדות, 24/24 בדיקות תשלום מול PGlite מבודד, 30/30 בדיקות Storefront ו־26/26 בדיקות ממשק ניהול עברו. אלה 99 בדיקות בסך הכול, אך אין פירוש הדבר שכל אחד מ־18 מקרי הקצה נבדק מקצה לקצה. לא בוצעו הזמנה חיה, דפדפן, DB חיצוני או מיגרציה. „קיים בקוד” אינו שקול לאימות חי.

פקודות ההרצה: `npm.cmd --prefix apps/storefront test`; `npm.cmd --prefix apps/admin-mobile test`; מתוך `zis-api`, `./node_modules/.bin/tsx.cmd --test src/commerce/test-payment.service.test.ts src/commerce/order.service.test.ts src/dashboard/home.service.test.ts src/dashboard/postgres-dashboard.repository.test.ts src/domain/order-status.test.ts`; `npm.cmd --prefix scripts/payment-review test`.

## ממצאים ראשונים לטיפול

1. **כיסוי חלקי לרענון וכניסה חוזרת:** [`checkout.test.ts`](../apps/storefront/tests/checkout.test.ts) מחזירה כעת `confirmation.isTest=true`, ובדיקת יצירה, תשובה אבודה וניסיון אישור חוזר עוברת. הבדיקה אינה מרעננת דף או יוצרת Store חדש מתוך `sessionStorage`, ולכן אינה מוכיחה שחזור הזמנה וכניסה חוזרת לפני אישור. יש להוסיף תרחיש זה.
2. **התחברות חוזרת תלויה בטעינת אישור:** אחרי רענון דף נשמר אישור פרטי ב־sessionStorage, אך טופס כניסת מנהלת במסך הזמנה מוצג רק אם `confirmation?.isTest` ו־`paymentStatus='pending'` ([`CheckoutPage.tsx`](../apps/storefront/src/pages/CheckoutPage.tsx)). אם `GET /orders/confirmation` אינו זמין, נשארת הזמנה משוחזרת ללא אפשרות לאשר עד שהאישור נטען מחדש. זו עצירה בטוחה, אך יש לבדוק שהודעת ההתאוששות והפעולה הבאה מובנות.
3. **רענון אישור מנקה סל מקומי:** [`checkout.store.ts`](../apps/storefront/src/features/checkout/checkout.store.ts) קורא `cartStore.clear()` בכל הצלחת `refreshConfirmation`, גם כאשר הלקוחה כבר הוסיפה לסל מוצרים חדשים לצורך עריכת הזמנה ממתינה. רענון ידני עלול למחוק את התוספות לפני בחירתן. נדרש לצמצם ניקוי סל להשלמת יצירה/התאוששות של אותה הזמנה ולבדוק עריכת pending עם פריט חדש.

## מטריצת מקרי קצה

| מקרה / טריגר | התוצאה הרצויה | ראיה ומצב | השלמה נדרשת |
|---|---|---|---|
| 1. כניסת מנהלת תקינה ויצירת ניסוי | הזמנה אחת `is_test`, שם/רחוב מסומנים | [`order.service.ts`](../zis-api/src/commerce/order.service.ts), בדיקת API ממוקדת עברה | HTTP ודפדפן מול סביבה מבודדת |
| 2. תפקיד חסר, נהג או חשבון לא פעיל | 401/403 בלי כתיבת הזמנה/תשלום | [`admin-test-orders.controller.ts`](../zis-api/src/controllers/admin-test-orders.controller.ts); בדיקות HTTP קיימות, לא רצו כאן עקב מגבלת localhost קודמת | הרצת HTTP בסביבה שמאפשרת socket |
| 3. גוף לקוח מנסה לקבוע `isTest`, סכום או סטטוס | דחייה; השרת מקור האמת | [`order-validation.ts`](../zis-api/src/commerce/order-validation.ts); בדיקת API עברה | אין לבדיקת קבלה זו תלות חיה |
| 4. יצירה חוזרת באותו Idempotency-Key | אותה הזמנה, ללא כפילות | [`postgres-order.repository.ts`](../zis-api/src/commerce/postgres-order.repository.ts); בדיקות שירות קיימות | ניסיון HTTP עם אובדן תשובה |
| 5. אותו מפתח עם תוכן אחר | 409, אין הזמנה נוספת | repository ו־[`order.service.test.ts`](../zis-api/src/commerce/order.service.test.ts) | אימות DB משולב |
| 6. תשובת יצירה אבדה | ניסיון חוזר עם אותו גוף/מפתח | [`checkout.store.ts`](../apps/storefront/src/features/checkout/checkout.store.ts); בדיקת Storefront עברה | רענון דף לפני קבלת תשובה דורש החלטת התאוששות |
| 7. טעינת אישור נכשלת אחרי יצירה | לא ליצור מחדש; לשמור token ולנסות GET שוב | קוד `refreshConfirmation` ו־[`checkout.recovery.ts`](../apps/storefront/src/features/checkout/checkout.recovery.ts); בדיקת Storefront עברה | תצוגת דפדפן כש־GET נכשל |
| 8. רענון דף לפני אישור מנהלת | לשחזר הזמנה, לדרוש כניסה חוזרת, לא לשמור סיסמה | קוד `load` ו־`TestCheckoutAccess`; בדיקת מסלול ניסוי עוברת, אך אינה מבצעת רענון דף | בדיקה עם Store חדש, `sessionStorage` וכניסה חוזרת |
| 9. הרשאת מנהלת פגה לפני יצירה/אישור | לחסום פעולה ולבקש כניסה חוזרת | `checkout.store.ts` מגביל חלון מקומי ל־60 שניות; השרת מאמת מנהלת שוב | בדיקות זמן ופקיעת token בפועל |
| 10. אסימון אישור אורח פג/בוטל | 404, בלי חשיפת הזמנה | [`postgres-order.repository.ts`](../zis-api/src/commerce/postgres-order.repository.ts) בודק תפוגה וביטול; בדיקת שירות עברה | החלטה על דרך התאוששות ללקוחה אחרי תפוגה |
| 11. ניסיון לאשר הזמנה רגילה במסלול ניסוי | 403, ללא חיוב או שינוי מלאי | [`test-payment.service.ts`](../zis-api/src/commerce/test-payment.service.ts); בדיקה ממוקדת עברה | בדיקת הרשאה מחוברת |
| 12. הזמנה/פריטים השתנו במקביל | עצירה, רענון גרסה ורשימת פריטים | `expectedVersion`, `ORDER_CHANGED` ב־`checkout.store.ts` ובשירות; בדיקות API חלקיות | בדיקת שתי בקשות מתחרות מול DB מבודד |
| 13. מחיר/תאריך/כלל משלוח השתנו לפני אישור | אין מעבר ל־paid אם החישוב אינו תקף | השירות מחשב Quote מחדש; בדיקות מבודדות קודמות ב־[`PAYMENT_TEST_RESULTS.md`](PAYMENT_TEST_RESULTS.md) | לאמת מול נתוני staging |
| 14. מלאי אזל או גודל סט השתנה | rollback מלא; אין תשלום או הפחתת מלאי חלקית | השירות נועל מלאי; בדיקות ממוקדות ו־PGlite עברו | תחרות DB אמיתית עם שני מאשרים |
| 15. אישור הצליח אך התשובה אבדה | רענון אישור מגלה `paid`; ניסיון נוסף אינו מפחית מלאי שוב | `test_payment_approvals` ונעילת הזמנה; בדיקות PGlite ו־Storefront לניסיון חוזר עברו | בדיקת מסך עם אובדן תשובה ורענון דף |
| 16. הזמנת ניסוי שכבר שולמה | אין כפתור אישור נוסף; מצב `paid` מוצג | `confirmation.isTest/paymentStatus` ב־Checkout; בדיקת שירות replay עברה | בדיקת דפדפן אחרי רענון |
| 17. הזמנה לתאריך אספקה אחר | תופיע רק בטווח התאריכים המתאים | [`postgres-home.repository.ts`](../zis-api/src/dashboard/postgres-home.repository.ts) מסנן לפי `delivery_date`; ברירת מחדל בדשבורד היא היום | בדיקת UI עם בחירת תאריך/שבוע |
| 18. אישור מדומה הושלם | `ordered/paid` מוצג כ„התקבלה”, אפשר להתחיל הכנה; ללא חיוב | [`HomeStageChart.tsx`](../apps/admin-mobile/src/features/home/HomeStageChart.tsx), [`order-transitions.ts`](../zis-api/src/dashboard/order-transitions.ts); בדיקות יחידה עברו | אימות מסלול מלא ב־staging |

## החלטות ותור עבודה

1. להוסיף לבדיקת החנות תרחיש רענון דף, שחזור הזמנה, כניסה חוזרת ואישור; המוק הנוכחי כבר תוקן והבדיקה הקיימת עוברת.
2. לתקן ניקוי סל ברענון אישור כדי שלא יאבדו תוספות להזמנה ממתינה.
3. להחליט כיצד משחזרים הזמנה אם חלף תוקף אסימון האישור, וכיצד מזהים תוצאת יצירה לא ידועה אחרי רענון דף. החלטות אלה משפיעות על P5/P6; אין להסיק מדיניות מהקוד הקיים.
4. בסביבת בדיקה מבודדת, לאמת HTTP ודפדפן עם מנהלת, רענון, אישור של 0 ₪, Audit, מלאי, והופעה בדשבורד בתאריך האספקה. אין בכך אישור לפריסה או להרצת מיגרציות.
