# ZIS API

[אינדקס](../PLAN_INDEX.md) · [תיעוד Backend](../docs/BACKEND_IMPLEMENTATION.md).

שרת Express/TypeScript חלקי. קיימים GET /health ו־POST /admin/inventory/:productVariantId/adjust; חוזי P1 ושירות Storage קיימים בקוד, אך Routes הקטלוג/מדיה/משלוח/הזמנה עדיין יתווספו ב־P2/P5.

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

השרת קורא הגדרות מסביבת התהליך; קובץ סביבה מקומי אינו נטען אוטומטית בקוד שנבדק. בפיתוח נבחר DATABASE_URL_TRN ובייצור DATABASE_URL לפי NODE_ENV. נדרשות גם הגדרות Supabase בצד שרת. אין לקרוא או להציג ערכים סודיים.

בדיקת מסד מופעלת רק עם RUN_DB_INTEGRATION=true ו־DB פיתוח, אך יש לתקן תחילה את fixture והניקוי לפי O12. ברירת המחדל אינה הרצת DB.

מצב בדיקות עדכני: [IMPLEMENTATION_PROGRESS](../IMPLEMENTATION_PROGRESS.md). /health מאשר שהשרת עונה; אינו בדיקת readiness למסד.
