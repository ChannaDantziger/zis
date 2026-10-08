# פתיחת שיחת עבודה — ZIS

[אינדקס מרכזי](PLAN_INDEX.md).

## הגדרת מודל מומלצת

- עבודה שוטפת על הקוד והתוכנית: **GPT-6.1 Sol · Medium**.
- DB, הרשאות, תשלומים, דיבוג מורכב או החלטות ארכיטקטורה: **GPT-6.1 Sol · High**.
- **GPT-6 Astra · High** לסקירה רחבה במיוחד או ניתוח של סתירות וסיכון גבוה; אין צורך לכל תיקון רגיל.
- שינוי קטן ומוגדר או תיעוד: GPT-6 Luna · Low/Medium.

ההמלצה מבוססת על [OpenAI Model Selection](https://developers.openai.com/api/docs/guides/model-selection) ועל [דף GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol): Sol מתאים לעבודה טכנית מורכבת עם איזון זמן/עלות, ו־Medium הוא נקודת פתיחה מאוזנת; High מתאים לדיבוג ותכנון קשים.

## סדר קריאה

1. [AGENTS](AGENTS.md) והכנת כל קובץ באמצעות `scripts/prepare-file-for-llm.ps1`.
2. [PLAN_INDEX](PLAN_INDEX.md) ו־[guidelines](docs/GUIDELINES.md).
3. [תוכנית העבודה](IMPLEMENTATION_PLAN.md), [מצב המימוש](IMPLEMENTATION_PROGRESS.md) ו־[נושאים פתוחים](OPEN_ISSUES.md).
4. המפרט התחומי וקובצי הקוד הנוגעים למשימה שהמשתמשת ביקשה.

## הוראת המשך שאפשר להעתיק

```text
אנחנו ממשיכים את ZIS. קרא קודם את AGENTS.md, אחר כך PLAN_INDEX.md,
IMPLEMENTATION_PLAN.md, IMPLEMENTATION_PROGRESS.md, OPEN_ISSUES.md,
NEXT_PHASE_PLAN.md ואת המסמך התחומי הרלוונטי. התוכנית הראשית היא מקור האמת.

מצב עדכני ל־08.10.2026: בעלת האתר דיווחה ש־Login ל־Production עובד ושמיגרציות
001–008 הורצו ידנית עד הסוף. אין ledger אמין להרצות האלה; אל תריץ אותן מחדש
ואל תציג את הדיווח כאימות עצמאי. כרגע עובדים מול Production בלבד; בהמשך יש
להציע הפרדה בין DEV ל־PROD. מסכי Admin קיימים בקוד: Login, Dashboard, Orders,
Production ו־Settings. הצעד הקרוב הוא לאמת ולסגור את מסלול Admin מול ה־API,
ואז להמשיך לפי IMPLEMENTATION_PLAN.md לחנות, הזמנות ותשלום.

אל תקרא קובצי `.env` או `.env.*`, אל תבקש סודות בצ'אט, ואל תריץ DDL על
Production. אל תשתמש בארכיון כהוראת ביצוע ואל תמציא הכרעות עסקיות. בצע את
המשימה לפי התלויות, אמת את השינוי ועדכן IMPLEMENTATION_PROGRESS.md ו־OPEN_ISSUES.md.
כל Markdown מתוחזק עד 320 שורות.
```

אין כאן עותק של ספירת בדיקות או רשימת משימות ישנה, כדי שהשיחה הבאה לא תחזור על עבודה שכבר נעשתה.
