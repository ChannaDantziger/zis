# העלאת ניסוי העובדים — רצף ביצוע

[אינדקס](PLAN_INDEX.md) · [גישה מרחוק](HOSTINGER_REMOTE_ACCESS.md) · [משימות בעלת האתר](OWNER_ACTIONS.md).

## מצב 23.11.2026

**עדכון פריסה מאומת:** צילום GitHub של בעלת האתר מציג הצלחה של publish ושל deploy בריצה 45268136546 לאחר retry. שגיאת pull קודמת `denied` נפתרה לפי פלט VPS אחרי `docker logout ghcr.io`. בדיקת דפדפן חיה אישרה טעינת החנות ב־HTTPS, שלושה מוצרים/מחירים, גלריה ו־FAQ; הניהול ב־HTTPS מציג `/login` למשתמש לא מחובר. לא בוצעו Login, יצירת הזמנה, שינוי מלאי או תפעול מחובר בבדיקה זו. אלה עדיין נדרשים לפני טענת השלמת זרימות המערכת. גרסת הריצה לפי צילום: `df33012`.

אימות DNS לפי פלט קונסולת ה־VPS שהעבירה בעלת האתר ב־23.11: גם `zis-store.srv1661524.hstgr.cloud` וגם `zis-admin.srv1661524.hstgr.cloud` מחזירים `31.97.216.23`. חסם הפניית IPv4 נסגר לפי הראיה; תעודות HTTPS, ניתוב Traefik והרצת ZIS עדיין לא אומתו.

הבהרה עדכנית: הניסוי יהיה ציבורי ופתוח ליצירת הזמנות ומשוב ללא סליקה. בעלת העסק תוכל לסגור הזמנות בהגדרות; אין בקשה לסגור כברירת מחדל. הכתובות הארוכות אינן בקרת גישה, והמסד המשותף שומר נתוני הזמנות בפועל. [החלטת בעלת האתר](OWNER_ACTIONS.md).

בעלת האתר אישרה בתשובה מ־23.11 להשאיר תשלום דמו בניסוי העובדים, עם ההגנות הקיימות שנבדקו בקוד; אין חיוב כספי. בקשת ההחלטה שבפסקה ההיסטורית להלן נענתה; אימות guards ב־VPS טרם בוצע.

קוד הפריסה הוכן מקומית ל־HTTPS ולמשיכת images מזוהים מ־GHCR. אין אישור ש־DNS של ZIS קיים, לא בוצעה פריסה, ולא נבדק TLS/ניתוב על VPS. ב־23.11 נבדק בקוד מנגנון תשלום הניסוי: מסנן הזמנות ניסוי והרשאת operations_manager קיימים בשירות, הכפתור מציג שאין חיוב ושיש הפחתת מלאי. נשלחה לבעלת האתר בקשת החלטה חוזרת לפני קידום לענף production; ממתינים לתשובה. אין מדובר בחיוב כספי.

## פיתוח מבצע

1. מכין `deploy/compose.hostinger.yml` עם שלושה image references ללא build מקומי ב־VPS, בלי פורטים ציבוריים ישירים, עם labels לפי צילומי Traefik הקיים (`host`, `websecure`, `letsencrypt`). אותו DB נשאר פעיל; אין מיגרציה.
2. מכין Workflow על `production`: build של כל השירותים, פרסום ל־GHCR לפי commit, העברת digests ל־Hostinger. Job הפריסה דורש `HOSTINGER_DEPLOY_ENABLED=true` ומשיכת images אנונימית תקינה, ואחריו בדיקת שני אתרי HTTPS ו־readiness. כשל בבדיקה אינו rollback אוטומטי.
3. מאמת תצורה ו־PR; אינו כולל שינויים לא קשורים מקומיים. CI על PR ממשיך לבנות images ולבדוק API. Docker אינו זמין כרגע במחשב הפיתוח; נדרשות תוצאות CI לפני קידום.

## בעלת האתר מבצעת לפי הסדר

1. בודקת עם Hostinger שהשמות המוצעים `zis-store.srv1661524.hstgr.cloud` ו־`zis-admin.srv1661524.hstgr.cloud` מפנים ל־VPS ושמותר להנפיק להם תעודות. אם לא, מקבלים כתובות נתמכות או בוחרים דומיין; לא מנחשים DNS ולא פורסים עם שמות בלתי קיימים.
2. עונה אם להשאיר את כפתור תשלום הניסוי עם הרשאת מנהלת והגבלת `is_test`; מצב Production של הענף אינו הופך אישור מדומה לחיוב אמיתי.
3. מוסיפה GitHub Repository variables בשם `ZIS_STORE_HOST` ו־`ZIS_ADMIN_HOST` עם שמות ה־host המאומתים בלבד, ללא `https://` או נתיב. ה־Compose בונה מהם את CORS המדויק, ולכן `CORS_ALLOWED_ORIGINS` הידני של localhost אינו משמש בפריסה זו.
4. משאירה `HOSTINGER_DEPLOY_ENABLED=false` בשחרור ראשון; ממזגים PR עם קוד הפריסה אל master, ואחרי CI ירוק מקדמים ל־production לצורך בנייה ופרסום בלבד.
5. לאחר publish מוצלח נכנסת ל־GitHub profile → Packages. שלוש חבילות אמורות להופיע: `zis-api`, `zis-storefront`, `zis-admin`. לכל אחת בודקת Package settings → Change visibility; אם היא Private, משנה ל־Public רק לאחר בדיקת תכולת ה־images. אין secrets בתמונות. ייתכן ש־GHCR ייצור חבילות פרטיות למרות שהמאגר ציבורי; אם נדרשת פרטיות יש במקום זאת להגדיר credentials ל־registry ב־Hostinger. [GitHub](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).
6. אחרי אישור חשבון/כלל ענף/גיבוי וה־DNS, מגדירה `HOSTINGER_DEPLOY_ENABLED=true`, ניגשת ל־Actions → Publish and deploy ZIS → Run workflow → Branch: production → Run workflow. בריצות עתידיות המיזוג לענף יפעיל את אותו התהליך אוטומטית.
7. ב־Hostinger מאמתת פרויקט `zis` ובתוכו api/storefront/admin במצב Running/Healthy. פותחת חנות וניהול בכתובות המאומתות; אין לעקוף אזהרת תעודה בדפדפן. בודקים יחד Login, תמונות, הזמנת ניסיון ותפעול. אין להעביר secrets בצ'אט או לפתוח הגדרות סודיות בצילום.

## גבולות והחזרה

המסד משותף ונתונים משתנים באמת. גיבוי VPS אינו גיבוי Supabase ו־DB backup אינו כולל תמונות. אין שחזור מסד אוטומטי או שינוי סכמה. יש לתעד שלושת digests ו־commit בכל ריצה; הם מופיעים ב־Actions summary. להחזרת גרסה יש להשתמש בגרסת images קודמת וב־Compose תואם אחרי בדיקת התאמה למסד, בלי למחוק פרויקט או volumes. אי־מוכנות מסלול תשלום/תפעול והיעדר ניטור ושחזור נשארים פערים לפני השקה מלאה לפי P8/P9.
