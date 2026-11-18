# מבנה Git ו־PR לפריסת Hostinger

[README](../README.md) · [תוכנית פריסה](PRODUCTION_DEPLOYMENT_PLAN.md) · [מוכנות שלב 0](PRODUCTION_READINESS_PHASE_0.md).

**החלטת בעלת האתר, 18.11.2026:** `production` יהיה ענף הגרסה החיה. שינוי נכנס אליו דרך Pull Request מאושר; לאחר הקמת Docker ו־CI, מיזוג אליו יפעיל פריסה ל־Hostinger. החלטת הענפים התקבלה, אך החיבור לאירוח עדיין לא הוגדר.

| ענף | תפקיד | PR הבא |
|---|---|---|
| `codex/<topic>` | עבודה על שינוי ממוקד | `master` |
| `master` | שילוב ובדיקת שינויים; אינו פורס לאתר החי | `production` |
| `production` | מקור הגרסה לפריסת האתר החי | אין push ישיר |

בבדיקה מקומית מ־18.11 נמצאו `master`, `codex/admin-simplification` ו־remote בשם `origin`. לא נמצא `production`. יש שינויים מקומיים רבים שאינם ב־commit; יצירת מצביע ענף אינה כוללת אותם. יעד ה־remote, מצב סנכרון והרשאות לא נבדקו.

## 1. יצירת ענף production

הפקודות הן ל־PowerShell מתיקיית ZIS. בודקים ש־`origin/master` הוא הבסיס הרצוי לפני שתי הפקודות האחרונות. `git branch` אינו מחליף את הענף הפעיל ולכן אינו נוגע בשינויים המקומיים.

```powershell
cd "C:\Users\123\Documents\ChatGPT\ZIS"
git status --short --branch
git fetch origin
git log -1 --oneline origin/master
git branch production origin/master
git push -u origin production
```

אם הענף כבר קיים, לבדוק `git branch -avv` ולא ליצור אותו שוב. לפני `push`, לבדוק שב־Git provider אין אוטומציה חיצונית שמאזינה כבר ל־`production`. אין להריץ `reset`, `clean` או החלפת ענף כדי לעקוף את השינויים המקומיים.

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

את ה־Workflow נגדיר להאזין **רק** ל־`production`. את מפתח Hostinger מזינים ישירות ב־GitHub Actions Secrets; לא בצ'אט או ב־Git. Dockerfiles, Compose, CI, VPS וסודות טרם הוגדרו, ולכן push לענף אינו מפעיל פריסה כעת. מיגרציות DB לעולם אינן מופעלות אוטומטית ב־merge, ב־CI או ב־container startup; בעלת תפקיד מורשית מבצעת אותן ידנית בתהליך המאושר.

## שער להפעלת אוטומציית Production

- [ ] תוכנית Hostinger תומכת ב־Docker/Compose ובשירותי ZIS.
- [ ] Docker build ו־Compose נבדקו; CI בודק PR.
- [ ] `production` מוגן ו־Workflow הפריסה מאזין רק לו.
- [ ] סודות מוגדרים אצל הספק, בלי קובצי סביבה ב־Git/image.
- [ ] Staging עבר קבלה, מצב DB ידוע, ויש גיבוי ודרך חזרה.
- [ ] בעלת האתר אישרה את הגרסה ואת מועד השחרור.
