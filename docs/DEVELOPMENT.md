# הרצת המערכת בפיתוח (DEV)

[אינדקס](PLAN_INDEX.md) · [README](../README.md) · [חיבור ותצורה](LIVE_CONNECTION_RUNBOOK.md).

עודכן ואומת מול סקריפטי הפרויקט ב־08.10.2026. הפקודות להלן מיועדות ל־PowerShell, מתוך תיקיית המאגר `ZIS`. הרצה מלאה מול DB אינה מאומתת במסגרת עדכון התיעוד.

## היכן מוגדרות הפקודות

פקודות `npm run ...` מוגדרות בשדה `scripts` של `package.json` בכל יישום:

- [שרת API](../zis-api/package.json).
- [ממשק הניהול](../apps/admin-mobile/package.json).

ב־README הראשי יש קיצור להרצה; מסמך זה מרכז התקנה, הפעלה ובדיקות. אין כרגע `package.json` בשורש שמפעיל את שני היישומים יחד.

## הכנה ראשונית

נדרשים Node.js ו־npm התואמים לתלויות הפרויקטים. לטעינה האוטומטית של קובץ הסביבה בשרת נדרש Node.js שתומך ב־`process.loadEnvFile`.

מתקינים תלויות בפעם הראשונה וגם לאחר שינוי בקובצי הנעילה:

```powershell
npm.cmd --prefix zis-api ci
npm.cmd --prefix apps/admin-mobile ci
```

`npm.cmd` מתאים ל־PowerShell גם כשמדיניות ההרצה חוסמת את `npm.ps1`. אפשר להשתמש ב־`npm` בטרמינל שמאפשר אותו.

## הפעלה — שני טרמינלים

טרמינל ראשון, שרת API עם טעינה מחדש לאחר שינוי קוד:

```powershell
$env:NODE_ENV = "development"
npm.cmd --prefix zis-api run dev
```

טרמינל שני, ממשק הניהול:

```powershell
npm.cmd --prefix apps/admin-mobile run dev
```

ברירת המחדל של API היא `http://localhost:3000`; הניהול עולה ב־`http://localhost:5173`. אם הפורט תפוס, Vite עשוי לבחור פורט אחר; הכתובת בפלט הטרמינל היא הקובעת ויש להתאים לה את CORS. עוצרים כל תהליך באמצעות `Ctrl+C` בטרמינל שלו.

## הגדרות וחיבור

- ב־Development השרת משתמש ב־`DATABASE_URL_TRN`; ב־Production הוא משתמש ב־`DATABASE_URL`. הרצה מקומית אינה יוצרת מסד DEV או הפרדה מ־Production.
- להפעלת מסכי הניהול המחוברים נדרשים גם `SUPABASE_URL` ו־`SUPABASE_SERVICE_ROLE_KEY` או `SUPABASE_SECRET_KEY`. פרטי ההגדרות ב־[מדריך החיבור](LIVE_CONNECTION_RUNBOOK.md).
- השרת טוען קובץ סביבה מקומי מתיקיית `zis-api` כשה־Node תומך בכך; משתני סביבת התהליך נתמכים גם הם. סודות נשארים בצד השרת.
- `VITE_API_BASE_URL` קובע לאיזה API הניהול פונה; ברירת המחדל היא `http://localhost:3000`. משתני `VITE_` חשופים בדפדפן ואין לשים בהם סודות.
- `CORS_ALLOWED_ORIGINS` מאפשר להגדיר כתובות ניהול. ב־DEV ברירת המחדל מתירה `localhost:5173` ו־`127.0.0.1:5173`.
- בלי תלויות השרת המלאות ניתן לקבל liveness; readiness ייכשל ומסכי הנתונים לא יעבדו. `/health/live` לבדו אינו הוכחה לחיבור למסד.
- אין הרצת מיגרציות אוטומטית בזמן עליית השרת. מצב Production הוא החלה ידנית מדווחת ללא ledger; אין להריץ מחדש את המיגרציות הקיימות.
- בפרויקט זה הסוכן אינו מריץ מיגרציות. הוא מכין את קובץ המיגרציה ומבקש מבעלת האתר להחיל אותו ידנית בתהליך המאושר של ספק ה־DB.

## בדיקות ובנייה

```powershell
npm.cmd --prefix zis-api run typecheck
npm.cmd --prefix zis-api test
npm.cmd --prefix zis-api run build
npm.cmd --prefix apps/admin-mobile run typecheck
npm.cmd --prefix apps/admin-mobile run build
./scripts/check-docs.ps1
```

בדיקות Integration מיועדות למסד Development בלבד. אין כיום סקריפט `lint`, ובניהול אין סקריפט `test`. מגבלות הרצת הבדיקות בסביבת העבודה מתועדות ב־[מצב ההתקדמות](IMPLEMENTATION_PROGRESS.md).

לאחר בניית API, `npm.cmd --prefix zis-api start` מפעיל את הקוד שנבנה; לפיתוח שוטף משתמשים ב־`run dev`.

## חנות הלקוחות — נוסף ב־09.10.2026

```powershell
npm.cmd --prefix apps/storefront install
npm.cmd --prefix apps/storefront run dev -- --configLoader native
```

כתובת החנות: [localhost:5174](http://127.0.0.1:5174). בפיתוח, `/api` עובר ל־API ב־3000; בייצור נדרש reverse proxy או `VITE_API_BASE_URL` ציבורי בתהליך הבנייה. קובצי סביבה מקומיים אינם נטענים ב־Vite של החנות.

[מדריך החנות](../apps/storefront/README.md) מפרט בדיקות ומסלול אימות חלופי בעזרת התקנת Admin קיימת. לאחר התקנת התלויות בידי בעלת האתר ב־09.10, החנות עברה Lint, טיפוסים, 16 בדיקות ו־Build בפקודות הרגילות; קובץ נעילה קיים. חיבור חי עדיין דורש אימות.
