# חיבור חי — DB, Supabase, API ודשבורד

[אינדקס](PLAN_INDEX.md) · [Backend](BACKEND_IMPLEMENTATION.md) · [משימות בעלת האתר](OWNER_ACTIONS.md) · [מיגרציות](../zis-db/README.md).

עודכן: 08.10.2026. Login מול Production דווח כעובד; בעלת האתר דיווחה שמיגרציות 001–008 הוחלו ידנית ושאין ledger המתעד אותן.

## החלטת סביבה נוכחית

השלב הנוכחי עובד מול Production בלבד. הפרדת Development ו־Production תוצע כשלב תשתיתי נפרד בהמשך, עם DB נפרד, משתני סביבה נפרדים, ledger עצמאי ותהליך מיגרציות/פריסה מבוקר.

## איפה החיבור מתבצע

החיבור נוצר בעת עליית `zis-api/src/server.ts`:

1. `readServerConfig()` בוחר כתובת PostgreSQL לפי `NODE_ENV`.
2. `createSupabaseServerClient()` יוצר Client שרת מול אותו פרויקט Supabase.
3. `createPostgresPool()` יוצר Pool של `pg` מול PostgreSQL.
4. ה־Repositories של קטלוג, מלאי, Dashboard, סטטוסים והגדרות משלוח מקבלים את ה־Pool.
5. `/health/ready` מריץ `select 1` מול PostgreSQL כאשר השרת עלה במצב מלא.

אם אחד מהערכים חסר, השרת עולה במצב מצומצם: נתיבי Admin והחיבור למסד אינם מופעלים. זו אינה הצלחת חיבור.

## משתנים נדרשים

| סביבה | PostgreSQL | Supabase | Frontend |
|---|---|---|---|
| Development | `DATABASE_URL_TRN` | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` או `SUPABASE_SECRET_KEY` | `VITE_API_BASE_URL` |
| Production | `NODE_ENV=production` + `DATABASE_URL` | אותם משתני Supabase | `VITE_API_BASE_URL` של ה־API הציבורי |

ב־Production `DATABASE_URL_TRN` מתעלם בכוונה. כתובת PostgreSQL ומרכיב Supabase חייבים להיות של אותו פרויקט/סביבה. מפתחות נשמרים במנהל סודות או בסביבת התהליך; לא במסמך ולא בצ׳אט.

`VITE_API_BASE_URL` נקבע בזמן build של `apps/admin-mobile`. אם הוא חסר, הלקוח פונה כברירת מחדל ל־`http://localhost:3000`, ולכן דשבורד שפורסם לא יגיע ל־API החי.

## סדר הפעלה בטוח

1. לוודא שה־API רץ עם `NODE_ENV=production` ו־`DATABASE_URL` של אותו פרויקט Supabase; אין להשתמש ב־`DATABASE_URL_TRN`.
2. מאחר שאין ledger להרצות הידניות, לדלג על `check:db-migrations`; הוא דורש טבלת היסטוריה מוכרת ולא יוכל לשחזר בדיעבד מה הורץ.
3. אפשר להריץ `npm.cmd run check:manual-schema` מול `DATABASE_URL` כדי לבדוק קיום טבלאות ועמודות בקריאה בלבד. שמירת הפלט תספק בדיקת schema, לא היסטוריית migrations.
4. אין להריץ `apply:manual-migrations` על Production. מיגרציה חסרה תעבור בתהליך השינוי המאושר של ספק ה־DB, עם גיבוי, חלון שינוי ו־rollback.
5. לוודא שקיים `admin_users` מקושר ל־`auth.users`, עם משתמש פעיל ותפקיד `operations_manager`.
6. להפעיל את ה־API ולבדוק `/health/live`, אחר כך `/health/ready`.
7. לבצע התחברות Supabase, לשמור את ה־access token באפליקציה תחת `zis_admin_access_token`, ולבדוק `GET /admin/commerce/settings`.
8. להזין דרך המסך את כללי המחיר, המינימום, cutoff, שעת היציאה, ימי החלוקה והסגירות.

## מה נחשב הוכחת חיבור

- `/health/ready` מחזיר `ready: true` ו־`postgres: ok`.
- `GET /admin/commerce/settings` מחזיר נתונים מה־DB ולא שגיאת `401`, `403` או `503`.
- מסכי Dashboard, Orders, Production ו־Settings נטענים לאחר Login; עדכון דרך Settings נשמר רק לאחר אישור המשתמשת לבצע שינוי ב־Production.
- Quote עם אזור וכלל קיימים מחזיר מחיר; אזור ללא כלל נדחה.
- בדיקת הרשאה עם משתמש שאינו Admin נדחית, אם קיים חשבון בדיקה בטוח.

## פערים שנמצאו בקוד

- `CommerceService` הציבורי מחובר כעת ל־PostgreSQL. בשלב זה אין טיפול בלוח חגים; `/quote` ו־`/availability` משתמשים רק בימי העבודה ובהשבתות `store_closures`.
- מסך Login ב־`admin-mobile` קיים ונבדק מול Production; אין להדביק token בקוד.
- בדיקת DB Integration נשארת מיועדת ל־Development בלבד; בדיקות Production הן read-only בלבד.
- המיגרציות אינן מופעלות אוטומטית בעת `npm start`.
