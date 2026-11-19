# החלטת ארכיטקטורה להכנת Docker ו־Hostinger VPS

[אינדקס](PLAN_INDEX.md) · [תוכנית העלאה](PRODUCTION_DEPLOYMENT_PLAN.md) · [מבנה Git](PRODUCTION_GIT_BRANCHES.md) · [משימות בעלת האתר](OWNER_ACTIONS.md) · [פערים](OPEN_ISSUES.md).

**נבדק ב־19.11.2026:** קובצי `package.json`, Vite/API config, לקוחות HTTP, health routes, תוכנית P8 והחלטת U09. לא בוצעו build, בדיקת Docker או חיבור ל־VPS/DB. זהו תכנון פריסה המבוסס על קוד מקומי ותיעוד; פריסה חיה לא אומתה.

## תשובות קצרות

| שאלה | החלטה/המלצה |
|---|---|
| VPN או VPS? | Hostinger **VPS** הוא שרת וירטואלי להרצת Docker. VPN הוא מנהרת רשת פרטית ויכול לשמש לגישת תחזוקה; אינו מקום האירוח עצמו. |
| שלושה שרתים? | לא נדרשים בתחילה. VPS אחד יכול להריץ את שלושת שירותי האפליקציה. DB ו־Storage נשארים בשירות Supabase החיצוני לפי המבנה הקיים. |
| שלושה Docker images? | כן: Storefront סטטי, Admin סטטי, ו־API Node. לכל אחד build ותלות משלו; Compose מנהל אותם יחד. Reverse proxy ל־HTTPS/ניתוב הוא רכיב תשתית נוסף, לא יישום עסקי רביעי. |
| שלוש פריסות? | לא חובה. שחרור אחד מ־`production` יכול לקדם גרסה מזוהה של שלושת התוצרים יחד; Compose אחד מאפשר עדכון שירות נבחר. Staging ו־Production הם פרויקטים/תצורות נפרדים. |
| שלושה מאגרי Git? | לא. המונורפו הקיים מתאים: `apps/storefront`, `apps/admin-mobile`, `zis-api`, ו־`zis-db` בחוזים/מיגרציות ידניות. PR אחד יכול להציג שינוי רוחבי. |
| שלוש כתובות? | מומלץ ב־Production: `shop.<domain>` לחנות, `admin.<domain>` לניהול ו־`api.<domain>` ל־API/Webhooks. אלה שלוש כתובות DNS על אותו VPS, לא שלושה VPS. אפשר לנתב `/api` דרך אותו origin, אך נדרשת בחירת כתובות לפני קיבוע תצורת CORS, callbacks ו־TLS. |

## מפת בקשה וגבולות אמון

```text
דפדפן לקוחה ──HTTPS──> shop.<domain>  ─┐
דפדפן מנהלת ──HTTPS──> admin.<domain> ─┼─> reverse proxy ב־VPS
ספקי Webhook ─HTTPS──> api.<domain>   ─┘       ├─> storefront image: קבצים סטטיים בלבד
                                                 ├─> admin image: קבצים סטטיים בלבד
                                                 └─> api image: Node/Express ─TLS─> Supabase DB/Auth/Storage
```

Admin הוא build נפרד אך כתובתו אינה מנגנון הרשאה. ה־API אוכף אימות והרשאות; אין מפתחות שרת בבניית React. ל־DB אין פורט ציבורי ב־VPS ואין container DB במערך זה. רק reverse proxy מאזין לציבור ב־80/443; API ו־Frontends ברשת Docker פנימית. יש להגן על Docker Manager, SSH ו־hPanel בחשבונות והרשאות מתאימים. [Hostinger מתארת ניתוב כמה פרויקטים/שמות מתחם דרך Traefik ב־80/443](https://www.hostinger.com/support/connecting-multiple-docker-compose-projects-using-traefik-in-hostinger-docker-manager/).

## התאמה לקוד הנוכחי

- `zis-api/package.json`: `build` מריץ TypeScript ו־`start` מריץ `dist/server.js`; נדרש image runtime עם תלויות Production. `src/routes/health.routes.ts` מספק `/health/live` ו־`/health/ready`; readiness בודק PostgreSQL דרך `src/server.ts`.
- `apps/storefront/package.json`: Vite בונה קבצים סטטיים. `src/shared/api/http-client.ts` משתמש ב־`/api` כברירת מחדל; אם API ב־`api.<domain>`, נגדיר `VITE_API_BASE_URL` ציבורי בזמן build ונגדיר CORS במדויק. חלופה היא proxy שמסיר `/api` באותו origin.
- `apps/admin-mobile/package.json`: גם הוא build סטטי. `src/shared/api/http-client.ts` נופל ל־`http://localhost:3000` כשאין `VITE_API_BASE_URL`; לכן ערך API ציבורי בזמן build הוא תנאי לפריסה. דפדפן ב־HTTPS לא צריך לפנות ל־HTTP מקומי.
- `zis-api/src/config/server-config.ts` דורש DB/Supabase ב־Production ואוסר `*` ב־CORS. `DATABASE_TARGET=production` מצביע על `DATABASE_URL`; שמות/ערכים מדויקים ייקבעו בלי לקרוא קובצי סביבה אסורים.
- קובצי `*.yaml` שנמצאו עד כה מיועדים ל־skills. לא נמצא Dockerfile, Compose או `.github/workflows` בסקירת שלב 0; יש לבדוק שוב לפני עריכה כי המאגר משתנה.

## קבצים להכנה באותו מאגר

```text
zis-api/Dockerfile                 הוכן: API, build רב־שלבי ו־runtime ללא root
apps/storefront/Dockerfile         הוכן: בניית Vite ושרת קבצים סטטיים
apps/admin-mobile/Dockerfile       הוכן: build ניהול נפרד
.dockerignore                      הוכן: החרגות build context לכל שלוש התמונות
deploy/frontend.conf               הוכן: SPA ו־proxy פנימי ל־API
docker-compose.yml                 הוכן: Preview סגור דרך loopback, ללא HTTPS ציבורי
.github/workflows/ci.yml           הוכן: Docker builds על PR, לא אומת ב־CI
.github/workflows/deploy.yml       הוכן: push ל-production, שער משתנה כבוי עד הפעלה
deploy/compose.production.yml      מתוכנן אחרי בחירת כתובת HTTPS ציבורית ו־proxy
docs/DEPLOYMENT_RUNBOOK.md         מסירה סופית לאחר פריסה ותרגול חזרה
```

הקבצים הנוכחיים משתמשים בבנייה דרך Hostinger ללא Registry נפרד; לפיתוח שחרור ציבורי נדרש גם תיוג image/commit ודרך חזרה שנבדקה. הסודות מוזנים ב־GitHub/Hostinger Secret Manager לפי מסלול הפריסה, ולא ב־Git, build args, Compose או קובצי `.env`. Workflow לא מריץ מיגרציות; שינויי DB מוכנים ומתועדים ומופעלים ידנית בתהליך המאושר. [Hostinger מפרטת פריסה מ־GitHub Actions ל־VPS עם Docker ו־Compose](https://www.hostinger.com/support/deploy-to-hostinger-vps-using-github-actions/).

## שערי איכות, בקרה ואבטחה

1. **לפני פריסה חיה:** לוודא שיטת TLS/כתובות ושה־ruleset של `production` אכן נאכף. המאגר הועבר ל־Public ב־19.11 לפי בעלת האתר ואומת דרך GitHub; מצב אכיפת הכלל עצמו לא אומת. [קובצי Preview סגור](HOSTINGER_DOCKER_PREVIEW.md) הוכנו, אך מתג הפריסה כבוי עד בדיקת CI/סודות/גישה.
2. **CI:** שלושת builds, typecheck/lint ובדיקות רלוונטיות, בדיקת Docker images ותכולתם, בלי גישה ל־Production DB. כשל חוסם merge כשבדיקות חובה זמינות.
3. **Frontend:** שתי חבילות סטטיות נפרדות; Admin אינו נארז ב־Storefront. `VITE_*` מכיל כתובת ציבורית בלבד, לא סודות. ניתוב SPA עובד גם ברענון.
4. **רשת:** TLS בדפדפן וב־Webhook; CORS רק לכתובות המאושרות; rate limits קיימים נבדקים מאחורי proxy; רק proxy מאזין לציבור. לוגים לא כוללים tokens/פרטי לקוחה.
5. **תפעול:** health/readiness, tag/digest לפריסה, ניטור/גיבוי/rollback. rollback קוד אינו rollback DB. Staging נבדק לפני Production.

## סתירה והחלטה נדרשת לפני Staging מחובר

U09 ב־[OWNER_ACTIONS](OWNER_ACTIONS.md) מתעדת שימוש ללא דומיין וחיבור סביבת הניסוי למסד הקיים. בעלת האתר חזרה ואישרה ב־19.11 אותו DB ופעולות ניסוי בדומה ל־Production, ללא שינוי סכמה. לכן Preview שנבנה כעת אינו Staging מבודד: כתיבה בו משנה נתונים חיים. תוכנית P8 עדיין דורשת הפרדה לפני השקה, ויש לתעד את הפער. עד שיש HTTPS מאומת ניגשים דרך מנהרת SSH ל־localhost בלבד; HTTP ציבורי לא מתאים ל־Admin/הזמנות. אין להניח שכתובת זמנית של Hostinger מספקת HTTPS לפני בדיקה. אין לשנות סכמה אוטומטית.

**מצב:** Dockerfiles, Compose ו־Workflows ל־Preview סגור הוכנו ב־19.11; build ו־VPS לא אומתו. כתובות TLS/פריסה ציבורית ו־Registry טרם נבחרו. זה אינו אישור עלייה לאתר חי.
