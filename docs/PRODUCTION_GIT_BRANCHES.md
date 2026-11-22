# מבנה Git ו־PR לפריסת Hostinger

[README](../README.md) · [תוכנית פריסה](PRODUCTION_DEPLOYMENT_PLAN.md) · [מוכנות שלב 0](PRODUCTION_READINESS_PHASE_0.md).

**החלטת בעלת האתר, 18.11.2026:** `production` יהיה ענף הגרסה החיה. שינוי נכנס אליו דרך Pull Request מאושר; לאחר הקמת Docker ו־CI, מיזוג אליו יפעיל פריסה ל־Hostinger. החלטת הענפים התקבלה, אך החיבור לאירוח עדיין לא הוגדר.

**בדיקת מצב עדכנית, 18.11.2026:** `production` קיים מקומית וב־`origin`, ועוקב אחרי `origin/production`. `master` ו־`production` מצביעים על אותו commit מקומי `56960dd`; `origin/HEAD` מצביע על `origin/main`, שהוא commit ישן יותר לפי הרשומות המקומיות. הבדיקה לא ביצעה `fetch`, ולכן מצב השרת בזמן אמת אינו מאומת. אין להריץ מחדש את פקודות יצירת הענף שלהלן. לא נמצאו `docker-compose.yml` או Workflow תחת `.github/workflows`; קובצי YAML אחרים במאגר מיועדים ל־skills.

**דיווח בעלת האתר, 18.11.2026:** GitHub מציג הודעה ש־rulesets אינם נאכפים במאגר הפרטי בתוכנית החשבון הנוכחית עד מעבר לתוכנית מתאימה. לכן אין להחשיב את `production` כמוגן, גם אם טופס ה־ruleset נשמר. לפני אוטומציית פריסה על כל push יש להפעיל אכיפה בתוכנית מתאימה; אם נשארים בתוכנית הנוכחית, יש לתכנן Workflow פריסה ידני עם `workflow_dispatch` ובחירה מודעת של גרסה, ולא לפרוס אוטומטית מכל push לענף. מצב החיוב/התוכנית לא אומת עצמאית.

**עדכון 19.11.2026:** המאגר הועבר ל־Public לפי בעלת האתר ואומת דרך חיבור GitHub; ענף ברירת המחדל הוא `master`. אכיפת ruleset ל־`production` עדיין לא אומתה. [Workflow Preview](HOSTINGER_DOCKER_PREVIEW.md) מאזין ל־push ל־`production` אך Job הפריסה כבוי עד הגדרת `HOSTINGER_DEPLOY_ENABLED=true` לאחר אימות.

| ענף | תפקיד | PR הבא |
|---|---|---|
| `codex/<topic>` | עבודה על שינוי ממוקד | `master` |
| `master` | שילוב ובדיקת שינויים; אינו פורס לאתר החי | `production` |
| `production` | מקור הגרסה לפריסת האתר החי | אין push ישיר |

במאגר קיימים גם `master`, `codex/admin-simplification` ו־remote בשם `origin`. יעד ה־remote, מצב סנכרון והרשאות לא נבדקו. ל־PR מהעבודה בוחרים במפורש `base: master`; ל־PR שחרור בוחרים `base: production`. אם מעוניינים ש־PR חדש יציע `master` אוטומטית, בעלת המאגר יכולה לשנות את default branch מ־`main` ל־`master` בהגדרות Git provider, לאחר בדיקת ההשפעה על אוטומציות קיימות.

## 1. בדיקת ענף production הקיים

הפקודות הן ל־PowerShell מתיקיית ZIS. `fetch` מעדכן מידע על הענפים המרוחקים בלי לשנות את הקבצים המקומיים. בודקים ששני הענפים קיימים ומציגים את ה־commit האחרון בכל אחד.

```powershell
cd "C:\Users\123\Documents\ChatGPT\ZIS"
git status --short --branch
git fetch origin
git branch -avv
git log -1 --oneline origin/master
git log -1 --oneline origin/production
```

אין ליצור או לדחוף את הענף מחדש. אין להריץ `reset`, `clean` או החלפת ענף כדי לעקוף את השינויים המקומיים.

## 2. הגנת הענף ב־Git provider

אם `origin` הוא GitHub, להגדיר ב־Repository Settings → Rules → Rulesets (או Branch protection) עבור `production`: דרישת PR, אישור בעלת האתר/מורשה שחרור, חסימת force push ומחיקה, וחסימת push ישיר גם למנהלים אם האפשרות קיימת. לאחר שה־CI קיים ועובד, להוסיף בדיקות חובה לפני merge. אין להגדיר בדיקה שאינה קיימת כדרישת חובה.

## 3. מסלול העבודה וה־PR

מסיימים את השינויים המקומיים בענף העבודה. בוחרים במפורש רק קבצים של אותה משימה; `git add .` עלול לכלול עבודות אחרות.

```powershell
git status --short
git add <נתיבים-של-המשימה-בלבד>
git diff --cached --stat
git commit -m "Describe the completed change"
git push -u origin codex/admin-simplification
```

פותחים PR מ־`codex/admin-simplification` אל `master`, בודקים וממזגים. לשחרור פותחים PR מ־`master` אל `production`, מתעדים מה נכלל, איך נבדק, השלכות DB/תצורה ודרך חזרה, וממזגים רק לאחר אישור. ב־GitHub CLI מחובר לחשבון המתאים:

```powershell
gh pr create --base master --head codex/admin-simplification --title "תיאור השינוי" --body "מה השתנה, איך נבדק ומה נשאר פתוח"
gh pr create --base production --head master --title "Release to production" --body "גרסה, בדיקות, סיכונים ודרך חזרה"
```

ה־PR השני מתאים רק אם כל `master` מוכן לשחרור. אחרת יוצרים ענף release מה־commit המאושר ומגישים ממנו PR ל־`production`.

## 4. חיבור ל־Hostinger

למסלול Docker נדרש **Hostinger VPS עם Docker template** או אירוח אחר שתומך בקונטיינרים. [מדריך Hostinger ל־GitHub Actions](https://www.hostinger.com/support/deploy-to-hostinger-vps-using-github-actions/) מתאר פריסה על push לענף שנבחר ודורש VPS, קובץ Compose, מפתח API ומזהה VM. אינטגרציית Git הרגילה של [Hostinger לאתרי PHP/HTML](https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/) אינה מסלול Docker ל־API של ZIS.

```text
ענף עבודה → PR ל-master → בדיקות → PR ל-production → אישור ומיזוג
→ GitHub Actions על push ל-production → Docker/Compose → Hostinger VPS
```

אם הגנת הענף נאכפת בתוכנית החשבון, נגדיר את ה־Workflow להאזין **רק** ל־`production`. אם אין אכיפה, נגדיר פריסה ידנית בלבד מתוך Actions לאחר בדיקת הגרסה. קובץ Compose מסוג `docker-compose.yml` יוכן בשלב 3 של [תוכנית הפריסה](PRODUCTION_DEPLOYMENT_PLAN.md), וקובץ Workflow מסוג `.github/workflows/deploy-production.yml` בשלב 4; החיבור והרצת הפריסה נבדקים בהמשך ב־Staging ורק אז ב־Production. את מפתח Hostinger מזינים ישירות ב־GitHub Actions Secrets; לא בצ'אט או ב־Git. Dockerfiles, Compose, CI, VPS וסודות טרם הוגדרו, ולכן push לענף אינו מפעיל פריסה כעת. מיגרציות DB לעולם אינן מופעלות אוטומטית ב־merge, ב־CI או ב־container startup; בעלת תפקיד מורשית מבצעת אותן ידנית בתהליך המאושר.

## שער להפעלת אוטומציית Production

- [ ] תוכנית Hostinger תומכת ב־Docker/Compose ובשירותי ZIS.
- [ ] Docker build ו־Compose נבדקו; CI בודק PR.
- [ ] `production` מוגן ו־Workflow הפריסה מאזין רק לו.
- [ ] סודות מוגדרים אצל הספק, בלי קובצי סביבה ב־Git/image.
- [ ] Staging עבר קבלה, מצב DB ידוע, ויש גיבוי ודרך חזרה.
- [ ] בעלת האתר אישרה את הגרסה ואת מועד השחרור.
