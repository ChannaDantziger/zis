# אתר הלקוחות — ZIS

[אינדקס](../../docs/PLAN_INDEX.md) · [מימוש ואימות](../../docs/STOREFRONT_IMPLEMENTATION.md).

נוסף ב־09.10.2026: יישום React/TypeScript/Vite עצמאי, בעברית וב־RTL, עם Mantine, MobX ו־TanStack Query.

## הרצה

מתוך שורש המאגר:

```powershell
npm.cmd --prefix apps/storefront install
npm.cmd --prefix apps/storefront run dev -- --configLoader native
```

החנות עולה ב־[localhost:5174](http://127.0.0.1:5174). בפיתוח בלבד, `/api` מועבר לשרת API ב־`127.0.0.1:3000`. יש להפעיל את השרת בנפרד לפי [מדריך הפיתוח](../../docs/DEVELOPMENT.md).

Vite אינו טוען קובצי סביבה מקומיים. ניתן להגדיר ב־process את `VITE_API_BASE_URL` ככתובת API ציבורית לפני ההרצה/הבנייה. בייצור חייבים כתובת API או reverse proxy עבור `/api`; אין proxy אוטומטי ב־Build או ב־preview.

## בדיקות

```powershell
npm.cmd --prefix apps/storefront run typecheck
npm.cmd --prefix apps/storefront run lint
npm.cmd --prefix apps/storefront test
npm.cmd --prefix apps/storefront run build
```

ב־09.10.2026 בעלת האתר התקינה תלויות ונוצר קובץ נעילה. `lint`, `typecheck`, `test` (16 בדיקות) ו־`build` עברו מתוך יישום החנות. הגדרת `preserveSymlinks` ב־Vite מאפשרת Build בסביבת Windows שבה `realpath` נחסם. אין בכך אימות API/DB חי.

לפני ההתקנה העצמאית, DNS חסם הורדות בסביבת הסוכן. מסלול אימות חלופי עם ספריות Admin קיימות נשמר למקרה הצורך:

```powershell
Set-Location apps/storefront
node tests/verify-existing-dependencies.mjs
```

זהו מסלול אימות מקומי בלבד, התלוי בהתקנה קיימת של `apps/admin-mobile`; הוא אינו תחליף להתקנה עצמאית ב־CI. בדיקת דפדפן משתמשת ב־Playwright מותקן ובנתוני בדיקה מבודדים; ראו [גבולות ופקודות](../../docs/STOREFRONT_IMPLEMENTATION.md).

## גבול המימוש

בית, קטלוג, מוצר, תמונות, וריאציות ועגלה קיימים. `/checkout` מסביר שיצירת הזמנה ותשלום עדיין אינם זמינים ושומר את העגלה. אין רכישה מדומה, נתוני עסק קשיחים, פרטי לקוח שנשמרים בעגלה או גישה ישירה ל־Supabase מהדפדפן.
