import { ApiError } from '../../shared/api/http-client';
import { OUT_OF_STOCK_MESSAGE } from '../../stores/cart.store';

export function testPaymentError(error: unknown): string {
  if (!(error instanceof ApiError)) return 'לא ניתן לאמת את אישור הניסוי. אפשר לנסות שוב את אותה פעולה.';
  const messages: Record<string, string> = {
    ORDER_ITEM_UNITS_MISSING: 'בהזמנה הישנה חסר מספר היחידות בכל סט. יש לבדוק או ליצור מחדש את הזמנת הניסוי.',
    ORDER_PRODUCT_CHANGED: 'מספר היחידות בסט השתנה מאז שמירת ההזמנה. יש לבדוק או ליצור מחדש את הזמנת הניסוי.',
    ORDER_CHANGED: 'ההזמנה השתנתה. רעננו את האישור הפרטי לפני ניסיון נוסף.',
    ORDER_PRICE_CHANGED: 'מחיר ההזמנה השתנה. יש לבדוק או ליצור מחדש את הזמנת הניסוי.',
    STOCK_UNAVAILABLE: 'המלאי אינו מספיק לאישור הזמנת הניסוי. בדקו את הפריטים והכמויות.',
    BUSINESS_RULE_VIOLATION: 'תאריך האספקה או מחיר המשלוח אינם זמינים עוד. בדקו את ההזמנה.',
    INVALID_PAYMENT_STATE: 'מצב ההזמנה השתנה. רעננו את האישור הפרטי.',
    OPERATIONS_MANAGER_REQUIRED: 'הרשאת המנהלת אינה תקפה. יש להתחבר שוב למצב ניסוי.',
  };
  const reference = error.requestId ? ` מזהה פנייה: ${error.requestId}.` : '';
  return (messages[error.code] ?? 'לא ניתן לאמת את אישור הניסוי. אפשר לנסות שוב את אותה פעולה.') + reference;
}

export function checkoutErrorMessage(error: unknown, uncertain: boolean) {
  const reference = error instanceof ApiError && error.requestId ? ` מזהה פנייה: ${error.requestId}.` : '';
  if (error instanceof ApiError && error.code === 'ORIGIN_NOT_ALLOWED') {
    const requestReference = error.requestId ? ` מזהה פנייה: ${error.requestId}.` : '';
    return `החנות אינה מורשית לפנות לשרת מהכתובת הנוכחית.${requestReference} יש לבדוק את הגדרת CORS ולהפעיל מחדש את השרת.`;
  }
  if (error instanceof ApiError && error.code === 'PENDING_ORDER_EDIT_NOT_CONFIGURED') return 'עריכת ההזמנה אינה זמינה עד השלמת עדכון המסד בידי מנהלת החנות. לא נשמר שינוי ולא בוצע חיוב.';
  if (error instanceof ApiError && error.code === 'STOCK_UNAVAILABLE') return OUT_OF_STOCK_MESSAGE;
  if (error instanceof ApiError && error.code === 'ORDER_NOT_EDITABLE') return 'כבר התחיל תשלום להזמנה זו או שההזמנה אינה ממתינה. לא ניתן לשנות אותה כאן.';
  if (error instanceof ApiError && error.code === 'ORDER_CHANGED') return 'ההזמנה השתנתה במקביל. טענו את פרטי ההזמנה העדכניים כדי להמשיך לעריכה או לתשלום.';
  if (error instanceof ApiError && error.code === 'MINIMUM_ORDER_NOT_MET') return 'סכום המוצרים נמוך ממינימום ההזמנה. הוסיפו מוצרים לעגלה כדי להמשיך; דמי המשלוח אינם נכללים במינימום.';
  if (error instanceof ApiError && error.status === 503) return `מצטערים, יש תקלה זמנית בחנות. נשמח לראותכם מאוחר יותר.${reference} אפשר לנסות שוב את אותה בקשה לאחר חזרת השירות.`;
  if (uncertain) return 'לא ניתן לאמת אם ההזמנה נשמרה. נסו שוב כאן עם אותה בקשה; אל תפתחו הזמנה נוספת ואל תרעננו את הדף.';
  if (error instanceof ApiError && error.status === 422) return 'לא ניתן להזמין במועד, באזור או בכמות שבחרתם. בדקו את פרטי המשלוח, המינימום והזמינות.';
  return `מצטערים, יש תקלה בחנות. נשמח לראותכם מאוחר יותר.${reference} הפריטים נשארים בעגלה.`;
}
