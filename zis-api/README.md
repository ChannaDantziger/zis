# ZIS API

[אינדקס](../docs/PLAN_INDEX.md) · [תיעוד Backend](../docs/BACKEND_IMPLEMENTATION.md).

שרת Express/TypeScript חלקי. קיימים liveness/readiness, קטגוריות/קטלוג/מוצר, העלאת מדיה Admin, ניהול metadata, התאמת מלאי, Dashboard תפעולי והגדרות מסחר/משלוח. חיבור Production משתמש ב־`DATABASE_URL`; `DATABASE_URL_TRN` מיועד ל־Development בלבד. Checkout מלא, תשלום, PDF ו־Push עדיין אינם גמורים; לוח חגים אינו מופעל בשלב זה.

## פיתוח

מתוך zis-api:

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run dev
```

לאחר build ניתן להפעיל באמצעות npm.cmd start. אין כרגע סקריפט lint.

השרת קורא הגדרות מסביבת התהליך וטוען קובץ סביבה מקומי כאשר Node.js תומך ב־`process.loadEnvFile`. ב־Production נבחר `DATABASE_URL` לפי `NODE_ENV`; ב־Development נבחר `DATABASE_URL_TRN`. נדרשות גם הגדרות Supabase בצד שרת. אין לקרוא או להציג ערכים סודיים. הוראות הרצה מרוכזות נמצאות ב־[מדריך הפיתוח](../docs/DEVELOPMENT.md).

בדיקת Integration נשארת מיועדת ל־Development בלבד; אין להריץ אותה על Production. בדיקות `check:db-migrations` ו־`check:manual-schema` משתמשות תמיד ב־`DATABASE_URL` של Production והן read-only.

מצב בדיקות עדכני: [IMPLEMENTATION_PROGRESS](../docs/IMPLEMENTATION_PROGRESS.md). `/health/live` מאשר שהשרת עונה; `/health/ready` בודק תלויות שהוזרקו, ובשרת מלא כולל PostgreSQL.

פרטי החיבור החי, בחירת `DATABASE_URL_TRN`/`DATABASE_URL`, משתני Supabase, `VITE_API_BASE_URL` וסדר אימות המיגרציות נמצאים ב־[LIVE_CONNECTION_RUNBOOK](../docs/LIVE_CONNECTION_RUNBOOK.md). אין הפעלה אוטומטית של migrations בעת עליית השרת.
