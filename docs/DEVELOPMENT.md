# הרצת המערכת ובדיקות בפיתוח

[אינדקס](PLAN_INDEX.md) · [README](../README.md) · [מצב המימוש](IMPLEMENTATION_PROGRESS.md) · [מדריך החיבור](LIVE_CONNECTION_RUNBOOK.md) · [גרסה היסטורית](OLD/DEVELOPMENT_2026-10-08.md).

עודכן ב־18.11.2026 מול הגדרות הסקריפטים בקוד. הפקודות מיועדות ל־PowerShell מתוך תיקיית הפרויקט. החיבור למסד נתונים ולשירותים חיצוניים לא אומת במסגרת עדכון זה.

## התקנה והרצה

נדרשים Node.js ו־npm התואמים לתלויות. מתקינים תלויות לכל יישום לפי קובץ הנעילה שלו:

```powershell
npm.cmd --prefix zis-api ci
npm.cmd --prefix apps/storefront ci
npm.cmd --prefix apps/admin-mobile ci
```

כל פקודת שרת מופעלת בחלון נפרד:

```powershell
npm.cmd --prefix zis-api run dev
npm.cmd --prefix apps/storefront run dev -- --configLoader native
npm.cmd --prefix apps/admin-mobile run dev
```

כתובות הממשקים והפורט בפועל מוצגים בפלט השרתים. הגדרות החיבור נקבעות בסביבה שבה השרת מופעל; לפני פעולה שמשנה נתונים יש לוודא את יעד החיבור. פרטים ומגבלות ב[מדריך החיבור](LIVE_CONNECTION_RUNBOOK.md); אין לשתף סודות בצ׳אט. `health/live` לבדו אינו מאמת חיבור לנתונים.

## בדיקות

```powershell
npm.cmd --prefix zis-api run typecheck
npm.cmd --prefix zis-api test
npm.cmd --prefix apps/storefront run typecheck
npm.cmd --prefix apps/storefront test
npm.cmd --prefix apps/storefront run lint
npm.cmd --prefix apps/admin-mobile run typecheck
npm.cmd --prefix apps/admin-mobile test
./scripts/check-docs.ps1
```

כל יישום מגדיר גם `build`; בדיקות API נוספות לבסיס נתונים מבודד מתוארות במסמכי הנושא שלהן. בדיקה מקומית אינה מוכיחה את מצב השרת או הנתונים החיצוניים. לא הורצו בדיקות יישום במסגרת עדכון מדריך זה.
