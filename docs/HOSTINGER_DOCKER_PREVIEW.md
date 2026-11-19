# Docker ופריסה ל־Hostinger — מצב Preview סגור

[אינדקס](PLAN_INDEX.md) · [ארכיטקטורה](HOSTINGER_DEPLOYMENT_ARCHITECTURE.md) · [מבנה Git](PRODUCTION_GIT_BRANCHES.md) · [תוכנית מסירה](PRODUCTION_DEPLOYMENT_PLAN.md).

**הוכן בקוד ב־19.11.2026; Docker images טרם נבנו או נפרסו.** Docker אינו מותקן בסביבת העבודה המקומית. שלושת `npm run build` עברו ב־19.11; שני Builds של Vite הציגו אזהרת גודל bundle, ללא כשל. YAML נותח בהצלחה כתחביר. חיבור Hostinger, סודות, CI והרצה חיה לא אומתו. מאגר GitHub `ChannaDantziger/zis` נצפה כ־Public וענף ברירת המחדל כ־`master` דרך חיבור GitHub ב־19.11. בעלת האתר דיווחה שה־VPS נוצר עם Docker, שאין דומיין, ושהבדיקה תישאר על המסד הפעיל ללא שינוי סכמה ועם פעולות דומות ל־Production. מצב ה־VPS והמסד לא אומת עצמאית.

## מה נוצר

| קובץ | תפקיד |
|---|---|
| [Dockerfile API](../zis-api/Dockerfile) | build TypeScript, התקנת תלויות runtime בלבד, משתמש `node`, readiness |
| [Dockerfile חנות](../apps/storefront/Dockerfile) | build Vite ותמונת Nginx ללא root |
| [Dockerfile ניהול](../apps/admin-mobile/Dockerfile) | build Vite נפרד ותמונת Nginx ללא root |
| [החרגות Docker](../.dockerignore) | מונעות משלוח קובצי סביבה, Git, node_modules, build/נתונים מקומיים ל־build context |
| [תצורת Nginx](../deploy/frontend.conf) | SPA refresh ו־proxy של `/api/` לשרת הפנימי |
| [Compose](../docker-compose.yml) | API פנימי; חנות ב־127.0.0.1:5174 וניהול ב־127.0.0.1:5173 על ה־VPS |
| [CI](../.github/workflows/ci.yml) | שלושת Docker builds בכל PR ל־`master` או `production` |
| [Deploy](../.github/workflows/deploy.yml) | אימות build בכל push ל־`production`; פריסה ל־VPS רק כשמשתנה ההפעלה הוגדר במפורש |

זהו **Preview סגור** על ה־VPS, לא אתר לקוחות חי. ה־API אינו מפרסם פורט אל ה־host, והחנות/ניהול קשורים ל־loopback בלבד. אין כרגע כתובת ציבורית או HTTPS לאפליקציה. שיטת הגישה המתוכננת היא מנהרת SSH מוצפנת מן המחשב שלך אל ה־VPS. גם אם המאגר ציבורי, סודות אינם נמצאים ב־Git או ב־image.

## חיבור GitHub ל־Hostinger — לביצוע בעלת האתר אחרי בדיקת CI

ב־GitHub → Settings → Secrets and variables → Actions, ליצור **Repository secrets** בשמות המדויקים הבאים ולהזין את הערכים ישירות שם: `HOSTINGER_API_KEY`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ORDER_CONFIRMATION_TOKEN_SECRET`. הסוד האחרון חייב להיות ייעודי, באורך של לפחות 32 תווים, ואין לשתף אותו בצ'אט. לא מוסיפים קובץ `.env` ל־Git/Compose.

באותו מסך, ליצור **Repository variables**: `HOSTINGER_VM_ID` עם המספר שמופיע ב־Hostinger hPanel, `CORS_ALLOWED_ORIGINS` עם `http://localhost:5174,http://localhost:5173` למנהרת Preview, ו־`ORDER_CONFIRMATION_TOKEN_TTL_SECONDS` לפי המדיניות המאושרת. משתנה `HOSTINGER_DEPLOY_ENABLED` נשאר חסר/`false` עד שאימות הבנייה, מצב ה־DB, ההרשאות והגנת הענף הושלמו. אין לשלוח ערכי secrets לצ'אט. [מדריך Hostinger ל־Action](https://github.com/marketplace/actions/deploy-on-hostinger-vps) מציג את ה־VM ID, API key ו־`environment-variables`.

לאחר PR מאושר ומיזוג ל־`production`, `ci.yml` מריץ build ב־PR ו־`deploy.yml` בונה שוב על ה־commit הממוזג. רק כשהמתג `HOSTINGER_DEPLOY_ENABLED=true`, ה־job האחרון ינסה להעלות את פרויקט `zis-preview` ל־VPS דרך Hostinger. **אין להפעיל את המתג רק על סמך קיום הקבצים**; הבנייה וה־Compose טרם נבדקו בפועל.

## גישה לאחר פריסה מאושרת

במחשב שלך, עם משתמש SSH וכתובת ה־VPS שמופיעים ב־Hostinger, אפשר ליצור מנהרה (ערכי הדוגמה אינם פרטי גישה):

```powershell
ssh -N -L 5174:127.0.0.1:5174 -L 5173:127.0.0.1:5173 <ssh-user>@<vps-address>
```

כשהחלון נשאר פתוח, החנות אמורה להיות ב־`http://localhost:5174` והניהול ב־`http://localhost:5173`. ה־SSH מצפין את התעבורה בין המחשב ל־VPS; HTTP כאן מוגבל ל־localhost בשני הקצוות. אין לפתוח ב־Hostinger firewall את 5173/5174 לציבור. יש לאמת בפועל ש־`/api/health/ready`, Login, קטלוג ותמונות עובדים ושאין גישה ציבורית לפורטים לפני שימוש בנתונים חיים.

## גבולות לפני אתר חי

- אותו DB פעיל פירושו שכתיבה ב־Preview תשנה נתונים חיים. בעלת האתר בחרה במסלול זה; יש להשתמש בנתוני ניסיון מזוהים, לתאם זמן בדיקה ולהימנע מפעולות לקוח/תשלום אמיתיות עד שיש תהליך קבלה. אין לבצע מיגרציות דרך Docker, CI או agent.
- אין דומיין/HTTPS ציבורי. כדי לפרסם אתר ללקוחות צריך כתובת HTTPS מאומתת ו־reverse proxy, כתובות CORS/Callback מאושרות, קובץ Compose לפריסה ציבורית, ניטור וגיבוי. Hostinger אינה מבטיחה Auto SSL ליישום Compose מותאם אישית על סמך העובדה שה־VPS קיים.
- rate limit ב־API משתמש ב־`request.ip`; מאחורי proxy יש לבדוק את שרשרת כתובות הלקוח לפני פתיחה לציבור, כדי למנוע מגבלה משותפת לכל המשתמשים או אמון ב־header מזויף.
- מיזוג ל־`production` אינו אישור השקה: מסלולי רכישה, תשלום ותפעול לפי `IMPLEMENTATION_PLAN.md` עדיין צריכים לעבור את שערי P8/P9. פריסה ציבורית תחייב אישור מפורש על גרסה מוכנה.

## אימות שנדרש לביצוע בהמשך

1. CI מוכיח שכל שלושת images נבנים מהמאגר ללא סודות; עד כה עברו רק Builds מקומיים של Node/Vite.
2. `docker compose config` ו־`docker compose up` בסביבה מורשית מוכיחים תצורה והרצה; כלי Docker לא זמין כאן.
3. מנהרת SSH ו־health נבדקים מול VPS; אין גישה ציבורית לפורטי Preview.
4. בדיקות קבלה על נתוני ניסיון מאושרים, גיבוי לפני כתיבה, ותיעוד תוצאה.
5. לפני פריסה ציבורית: החלטת כתובת HTTPS, תצורת proxy, CI/branch rule נאכפים, ניטור ותרגיל שחזור.
