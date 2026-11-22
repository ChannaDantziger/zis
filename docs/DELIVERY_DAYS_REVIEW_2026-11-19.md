# בדיקת ימי חלוקה ותיקון מקומי

[אינדקס](PLAN_INDEX.md) · [תוכנית מימוש](IMPLEMENTATION_PLAN.md) · [הגדרות ניהול](ADMIN_COMMERCE_SETTINGS.md)

נבדק ועודכן ב־19.11.2026. בעלת האתר ביקשה שימי החלוקה ייקבעו לפי הבחירה בניהול ולהסיר חסימות קבועות. התיקון בקוד המקומי; נתונים חיים ודפדפן טרם אומתו.

## ממצאים ותיקון

1. `apps/admin-mobile/src/pages/SettingsPage.tsx` מציג שבעה ימי חלוקה ושומר `workingDays`; הבקר `zis-api/src/controllers/admin-commerce-settings.controller.ts` מקבל את שבעתם. ההגדרות נשמרות ונקראות ב־`zis-api/src/operations/postgres-commerce-settings.repository.ts` וב־`zis-api/src/commerce/postgres-commerce.repository.ts`.
2. לפני התיקון `zis-api/src/commerce/delivery-policy.ts` חסם תמיד שישי ושבת. החסימה הוסרה; כעת כל יום מסומן, לרבות שישי ושבת, נבחן לפי שאר הכללים. יום שאינו מסומן נחסם.
3. `zis-api/src/commerce/delivery-dates.ts` מחשב טווח קלנדרי מהיום באזור הזמן העסקי ועד היום שהוגדר כולל, וקורא למדיניות לכל תאריך. `apps/storefront/src/features/checkout/CheckoutForm.tsx`, `checkout.store.ts` ו־`checkout.api.ts` משתמשים ברשימת השרת. אותה מדיניות משמשת גם דרך `zis-api/src/commerce/quote.service.ts` ו־`order.service.ts`. סגירות נקראות ב־`delivery-dates.ts` וב־`postgres-commerce.repository.ts`.
4. שעת החיתוך להזמנה להיום, טווח התאריכים, סגירות ומצב החנות נשארים בתוקף. לא שונו הגדרות או נתוני מסד ולא נדרשה מיגרציה.

## יום ראשון החסר וגבולות הטווח

לא נמצאה חסימה מיוחדת ליום ראשון או כלל המדלג על סוף שבוע. למשל, ביום חמישי טווח של 2 ימים מגיע עד שבת, וטווח 3 מגיע עד יום ראשון כולל. בדיקה מקומית מכסה את שני המקרים ואת התאמת מדיניות השרת לגבול. יום ראשון יכול להיות חסר גם בגלל סגירה, הגדרת ימים, סגירת חנות או cutoff כשהוא היום הנוכחי.

ה־API המקומי ב־`127.0.0.1:3000` לא היה זמין. התאריך המסוים, ההגדרות והסגירות הפעילות לא אומתו; הסיבה למקרה שדווח אינה ידועה.

## אימות ותיעוד

ב־19.11 עברו 21 בדיקות ממוקדות למדיניות, לוח התאריכים, הגדרות, quote והזמנה, וכן בדיקת TypeScript של ה־API. הבדיקות כוללות את כל שבעת הימים, יום לא מסומן, מעבר סוף שבוע, ראשון בגבול הטווח ומחוצה לו, cutoff וסגירה. לא בוצע אימות מחובר ל־DB או בדפדפן.

עודכנו `docs/API_CONTRACTS.md`, `docs/INVENTORY_AND_STATUS.md`, `docs/STOREFRONT_CHECKOUT.md`, `docs/ADMIN_COMMERCE_SETTINGS.md` ו־`docs/IMPLEMENTATION_PLAN.md`. ראו גם `docs/schema/SHIPPING.md` ו־`docs/planning/OPERATIONS_DELIVERY_PLAN.md` לכללי הטווח והסגירות.
