# מלאי וסטטוסים — התנהגות הקוד הקיים

[אינדקס](../PLAN_INDEX.md) · [מודל יעד](../INVENTORY_MODEL.md) · [פערים](../OPEN_ISSUES.md).
אומת בקריאת קוד ב־18.09.2026; התיאור מבדיל מימוש ממדיניות עסקית שטרם הותאמה.

## מלאי

- זמין ב־product_variants.available_sets, ביחידות Sets ולפי Variant.
- עדכון Admin מקבל delta שלם שאינו אפס וסיבה שאינה ריקה; יתרה שלילית נדחית.
- delta חיובי יוצר restock ושלילי adjustment.
- נשמרים before/after, סוג, סיבה, משתמש והזמנה; delta אינו שדה היסטוריה אחרי מיגרציה 004.
- getDefaultRestockQuantity קורא default_production_quantity_sets.
- עדכון והיסטוריה באותה טרנזקציה; אין כאן עדיין תזמור הזמנה מרובת פריטים.

## מכירה וחוסר — פער עסקי פתוח

- applyPaidSale מיועד להיקרא אחרי תשלום, אך אינו מאמת payment_status שמור בעצמו.
- בקוד, חוסר ללא הסכמה גורם לחריגה.
- בחוסר מאושר נצרך המלאי הזמין; היתרה מוחזרת ב־shortage_sets עם shortage_accepted/deferred.
- הכלל הישן של דחייה מלאה הוחלף ב־22.09 בבחירת מדיניות בניהול, עם חסימת חוסר ידוע כברירת מחדל. השירות עדיין אינו מממש בחירה זו; O02.
- allocation מוחזר לקורא; השירות אינו שומר בעצמו את שורת ההזמנה או מקצה קיבולת שבועית.
- אין בשירות תהליך השלמת deferred או scheduler לעדיפות; זו דרישת יעד שטרם מומשה.
- reversePaidSale מוסיף את הכמות שסופקה ויוצר sale_reversal, בלי בירור צריכה או מניעת ביטול חוזר. יש להשלים O10.

## התראות

- כמות קטנה או שווה לסף יוצרת low_stock בקוד; יש ליישר ניסוחים עסקיים שאומרים “מתחת לסף”.
- חוסר מאושר יוצר inventory_risk, הכולל פרטי קשר מקלט הפעולה.
- Repository יוצר רשומה לכל Admin פעיל; אין שליחת Push בפועל.
- נדרשות הרשאות וגישה מצומצמת למידע ההתראה, ללא הדפסת פרטי לקוחות בלוגים.

## סטטוסים

- נשמרו ordered, in_preparation, packed, in_transit, delivered, approved, cancelled.
- canStartPreparation דורש paid ומצב השווה ל־defaults.preparationStatus.
- Default מתוכנן במיגרציה 003 הוא ordered. עדיין אין מסלול API לקריאת Default ולהתחלת הכנה.
- assertAdminCanCancel אינו חוסם approved/cancelled. לפי ההוראה האחרונה מ־22.09 ביטול אפשרי בכל שלב; O09 מתעד את התאמת החסימות הישנות לתהליך החדש עם שאלת החזקה בחבילה, אישור נוסף, טיפול כספי ומניעת כפילות.
- אין עדיין workflow מלא, עדכון סטטוס ב־DB או Audit מחובר.

## קוד ומיגרציות

[Service](../zis-api/src/inventory/inventory.service.ts), [types](../zis-api/src/inventory/inventory.types.ts), [repository](../zis-api/src/inventory/postgres-inventory.repository.ts), [status](../zis-api/src/domain/order-status.ts), [003](../zis-db/migrations/003_business_decisions.sql), [004](../zis-db/migrations/004_inventory_history_without_delta.sql).

בדיקות ומצב חיבור: [התקדמות](../IMPLEMENTATION_PROGRESS.md). אין הוכחה בסקירה לטרנזקציה שהורצה מול DB חי.
