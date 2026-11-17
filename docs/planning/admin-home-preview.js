'use strict';
const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const ASSETS = '../../prototypes/zis-review/assets/';
const STATUS = {
  ordered: { label: 'התקבלה', icon: 'receipt', next: 'in_preparation', action: 'התחלת הכנה' },
  in_preparation: { label: 'בהכנה', icon: 'clock', next: 'packed', action: 'סיום אריזה' },
  packed: { label: 'נארזה', icon: 'box', next: 'in_transit', action: 'יציאה למשלוח' },
  in_transit: { label: 'יצאה', icon: 'truck', next: 'delivered', action: 'סימון כנמסרה' },
  delivered: { label: 'נמסרה', icon: 'check', next: 'approved', action: 'סגירת הזמנה' },
  approved: { label: 'נסגרה', icon: 'double', next: null },
  cancelled: { label: 'בוטלה', icon: 'cancel', next: null },
};
const ICONS = {
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zm3 5h6M9 12h6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  box: '<path d="m3 7 9-4 9 4v10l-9 4-9-4V7zm0 0 9 5 9-5m-9 5v9M7 5l9 5"/>',
  truck: '<path d="M2 5h12v12H2V5zm12 5h4l4 4v3h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  double: '<path d="m2 12 5 5L17 7m-6 8 2 2L23 7"/>',
  cancel: '<circle cx="12" cy="12" r="9"/><path d="m8 8 8 8m0-8-8 8"/>',
};
const PRODUCTS = [
  { id: 'macarons', name: 'מקרונים צבעוניים', category: 'מארזי בוטיק', image: 'standalone-img_macarons.jpg' },
  { id: 'chocolate', name: 'כיפות שוקולד', category: 'קינוחים אישיים', image: 'standalone-img_tartlet.jpg' },
  { id: 'cupcakes', name: 'קאפקייקס מעוצבים', category: 'קינוחים אישיים', image: 'standalone-img_souffle.jpg' },
];
const CITIES = ['ירושלים', 'בית שמש', 'ביתר'];
let orders = createOrders();
let selectedStatus = 'in_preparation';
let selectedProduct = null;
let selectedCity = null;
let openOrder = null;
let toastTimer;
const filters = { production: { mode: 'day', date: TODAY }, cities: { mode: 'day', date: TODAY } };
const el = id => document.getElementById(id);

initialize();

function initialize() {
  el('today-label').textContent = new Intl.DateTimeFormat('he-IL', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(TODAY + 'T12:00:00Z'));
  el('stage-date').textContent = `${dateLabel(TODAY)} · היום`;
  for (const section of Object.keys(filters)) el(`${section}-date`).value = TODAY;
  renderAll();
  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.statusFilter) {
      selectedStatus = button.dataset.statusFilter; renderStatus();
      document.querySelector(`#status-legend [data-status-filter="${selectedStatus}"]`).focus();
    }
    if (button.dataset.order) showOrder(Number(button.dataset.order));
    if (button.dataset.advance) advanceOrder(Number(button.dataset.advance));
    if (button.dataset.correctStatus) correctOrderStatus(Number(button.dataset.correctStatus), button.dataset.targetStatus);
    if (button.dataset.product) { selectedProduct = selectedProduct === button.dataset.product ? null : button.dataset.product; renderProduction(); }
    if (button.dataset.city) { selectedCity = selectedCity === button.dataset.city ? null : button.dataset.city; renderCities(); }
    if (button.dataset.range) {
      filters[button.dataset.range].mode = button.dataset.mode; clearBreakdown(button.dataset.range); renderRanges();
    }
    if (button.dataset.today) {
      const section = button.dataset.today;
      filters[section].date = TODAY; filters[section].mode = 'day'; el(`${section}-date`).value = TODAY;
      clearBreakdown(section); renderRanges();
    }
  });
  for (const section of Object.keys(filters)) el(`${section}-date`).addEventListener('change', event => {
    if (!event.target.value || !event.target.validity.valid) { event.target.value = filters[section].date; return; }
    filters[section].date = event.target.value; clearBreakdown(section); renderRanges();
  });
  el('close-dialog').addEventListener('click', () => el('order-dialog').close());
  el('order-dialog').addEventListener('close', () => openOrder = null);
  el('reset').addEventListener('click', () => {
    orders = createOrders(); selectedStatus = 'in_preparation'; selectedProduct = null; selectedCity = null;
    for (const key of Object.keys(filters)) { filters[key] = { mode: 'day', date: TODAY }; el(`${key}-date`).value = TODAY; }
    renderAll(); notify('נתוני ההדגמה אופסו.');
  });
}

function renderAll() {
  const current = orders.filter(order => order.date === TODAY && order.status !== 'cancelled');
  const preparing = current.filter(needsPreparation);
  const pendingTasks = typeof taskCounts === 'function' ? taskCounts().active : 0;
  const metrics = [
    ['הזמנות היום', current.length, 'לא כולל הזמנות שבוטלו', true],
    ['ממתינות / בהכנה', preparing.length, 'הזמנות ששולמו ודורשות הכנה', false],
    ['דורש טיפול', pendingTasks, 'משימות פתוחות', false],
    ['מוכנות ליציאה', current.filter(order => order.status === 'packed').length, 'הזמנות שכבר נארזו', false],
  ];
  el('metrics').innerHTML = metrics.map(([title, count, note, emphasis]) => `<article class="metric${emphasis ? ' emphasis' : ''}"><div class="metric-label">${title}</div><strong>${count}</strong><small>${note}</small></article>`).join('');
  if (typeof renderAttention === 'function') renderAttention();
  renderStatus(); renderRanges();
  if (openOrder !== null) renderOrder(orders.find(order => order.id === openOrder));
}

function renderStatus() {
  const current = orders.filter(order => order.date === TODAY);
  const counts = Object.fromEntries(Object.keys(STATUS).map(key => [key, current.filter(order => order.status === key).length]));
  el('status-chart').innerHTML = Object.keys(STATUS).filter(key => key !== 'cancelled' && counts[key]).map(key =>
    `<button class="segment" ${tone(key)} style="flex-grow:${counts[key]}" data-status-filter="${key}" aria-pressed="${key === selectedStatus}" aria-label="${STATUS[key].label}: ${counts[key]} הזמנות">${counts[key]}</button>`).join('');
  el('status-legend').innerHTML = Object.entries(STATUS).map(([key, status]) =>
    `<button class="status-choice" ${tone(key)} data-status-filter="${key}" aria-pressed="${key === selectedStatus}">${icon(status.icon)} ${status.label} <b>${counts[key]}</b></button>`).join('');
  const filtered = current.filter(order => order.status === selectedStatus);
  el('stage-details').innerHTML = `<div class="detail-heading"><h3 ${tone(selectedStatus)}>${icon(STATUS[selectedStatus].icon)} ${STATUS[selectedStatus].label} · ${filtered.length} הזמנות</h3><small>כל ההזמנות בשלב זה</small></div><div class="order-grid">${filtered.map(orderCard).join('')}</div>${filtered.length ? '' : '<p class="empty">אין הזמנות בשלב הזה היום.</p>'}`;
}

function orderCard(order) {
  return `<article class="order-row" ${tone(order.status)}><div class="row-top"><button class="order-title" data-order="${order.id}">הזמנה #${order.id}</button>${badge(order.status)}</div>${stagePreview(order)}<div class="row-bottom"><button class="text-link" data-order="${order.id}">פרטים</button>${actionButton(order)}</div></article>`;
}

function stagePreview(order) {
  const products = order.items.map(item => {
    const product = PRODUCTS.find(candidate => candidate.id === item.product);
    const title = product?.name ?? 'מוצר';
    return `<div class="item-preview">${product ? productImage(product) : '<div class="product-thumb image-missing">אין תמונה</div>'}<div><p>${title}</p><small>${item.sets} סטים</small></div></div>`;
  }).join('');
  const statusInfo = order.status === 'ordered' ? (order.paid ? 'שולמה · ממתינה להכנה' : 'ממתינה לתשלום')
    : order.status === 'in_preparation' ? 'בהכנה'
      : order.status === 'packed' ? `${order.packageCount ?? 'לא צוין'} מארזים נארזו · ליציאה`
        : `טלפון למשלוח: ${order.deliveryPhone}`;
  return `<div class="order-products">${products}<small class="order-context">${statusInfo}</small><small class="order-context">${order.city} · ${order.street} ${order.house}</small></div>`;
}

function renderRanges() {
  document.querySelectorAll('[data-range]').forEach(button => {
    const active = filters[button.dataset.range].mode === button.dataset.mode;
    button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active));
  });
  renderProduction(); renderCities();
}

function renderProduction() {
  const matching = rangeOrders('production').filter(needsPreparation);
  const summaries = PRODUCTS.map(product => ({ ...product, sets: matching.reduce((sum, order) => sum + productSets(order, product.id), 0) })).filter(product => product.sets > 0);
  el('production-total').textContent = `${summaries.reduce((sum, product) => sum + product.sets, 0)} סטים`;
  el('production-period').textContent = rangeLabel('production');
  el('production-groups').innerHTML = [...new Set(summaries.map(product => product.category))].map(category =>
    `<h3 class="category-title">${category}</h3><div class="product-grid">${summaries.filter(product => product.category === category).map(product => `<button class="product-tile" data-product="${product.id}" aria-pressed="${selectedProduct === product.id}" aria-label="${product.name}, ${product.sets} סטים. הצגת ההזמנות">${productImage(product)}<div><b>${product.name}</b><strong>${product.sets}</strong> <span>סטים</span></div></button>`).join('')}</div>`).join('') || '<p class="empty">אין הכנות לתאריכים שנבחרו.</p>';
  const selected = summaries.find(product => product.id === selectedProduct);
  const detail = el('production-details'); detail.hidden = !selected;
  if (selected) detail.innerHTML = `<h3>${selected.name} · ${selected.sets} סטים</h3>${matching.filter(order => productSets(order, selected.id)).map(order => breakdownRow(order, `${productSets(order, selected.id)} סטים`)).join('')}`;
}

function renderCities() {
  const matching = rangeOrders('cities').filter(order => order.status !== 'cancelled');
  const counts = CITIES.map(city => ({ city, count: matching.filter(order => order.city === city).length }));
  const max = Math.max(1, ...counts.map(item => item.count));
  el('city-total').textContent = `${matching.length} הזמנות`;
  el('cities-period').textContent = rangeLabel('cities');
  el('city-chart').innerHTML = counts.map(({ city, count }) => `<button class="city-bar" data-city="${city}" aria-pressed="${selectedCity === city}" aria-label="${city}, ${count} הזמנות"><span>${city}</span><span class="city-track"><i style="width:${count / max * 100}%"></i></span><b>${count}</b></button>`).join('');
  const detail = el('city-details'); detail.hidden = selectedCity === null;
  if (selectedCity) {
    const list = matching.filter(order => order.city === selectedCity);
    detail.innerHTML = `<h3>${selectedCity} · ${list.length} הזמנות</h3>${list.map(order => breakdownRow(order, '')).join('') || '<p class="empty">אין הזמנות לעיר בטווח הזה.</p>'}`;
  }
}

function breakdownRow(order, quantity) {
  return `<div class="break-row"><div><button class="text-link" data-order="${order.id}">#${order.id}</button><span>אספקה: ${dateLabel(order.date)}</span>${quantity ? '' : `<span>${order.street} ${order.house}, ${order.city}</span>`}${badge(order.status)}</div><b>${quantity}</b></div>`;
}

function showOrder(id) {
  const order = orders.find(item => item.id === id); if (!order) return;
  openOrder = id; renderOrder(order);
  if (!el('order-dialog').open) el('order-dialog').showModal();
}

function renderOrder(order) {
  el('dialog-content').innerHTML = `<div class="dialog-title"><h2 id="dialog-title">הזמנה #${order.id}</h2>${badge(order.status)}</div><p class="muted">אספקה ${dateLabel(order.date)} · ${order.city}</p><div class="journey">${Object.keys(STATUS).filter(key => key !== 'cancelled' || order.status === 'cancelled').map(key => badge(key, key === order.status ? ' current' : '')).join('')}</div><div class="stage-summary">${stageSummary(order)}</div><h3 class="all-details-title">כל פרטי ההזמנה</h3>${fullOrderDetails(order)}${actionButton(order, ' dialog-action')}${order.status === 'cancelled' ? '' : `<details class="full-order"><summary>פרטים נוספים · תיקון סטטוס שנבחר בטעות</summary>${statusCorrection(order)}</details>`}<p class="muted" style="margin-top:12px">נתוני המחשה בלבד. שינויי הסטטוס במסך זה אינם נשמרים במערכת.</p>`;
}

function statusCorrection(order) {
  return `<div class="status-correction"><p>לשימוש במקרה של שינוי סטטוס בטעות. ביטול הזמנה מתבצע בנפרד.</p><div class="correction-choices">${Object.entries(STATUS).filter(([key]) => key !== 'cancelled').map(([key, status]) => `<button type="button" class="status-choice" ${tone(key)} data-correct-status="${order.id}" data-target-status="${key}" ${key === order.status ? 'disabled' : ''}>${icon(status.icon)} ${status.label}</button>`).join('')}</div></div>`;
}

function fullOrderDetails(order) {
  const currency = amount => `₪${amount}`;
  const field = (label, value) => `<div><dt>${label}</dt><dd>${value === null || value === undefined || value === '' ? 'לא צוין' : value}</dd></div>`;
  const address = `${order.street} ${order.house}${order.apartment ? `, דירה ${order.apartment}` : ''}, ${order.city}`;
  const items = order.items.map(item => { const product = PRODUCTS.find(p => p.id === item.product); return `<div class="detail-item">${productImage(product)}<div><b>${product.name}</b><p>וריאציה: ${item.variant ?? 'מוצר רגיל'} · קוד: ${item.sku ?? 'לא צוין'} · ${item.sets} סטים · ${item.setSize ?? 1} יחידות בסט</p><p>מחיר לסט: ${currency(item.unitPrice ?? 85)} · סך שורה: ${currency((item.unitPrice ?? 85) * item.sets)}</p></div></div>`; }).join('');
  const breakdown = order.items.reduce((sum, item) => sum + (item.unitPrice ?? 85) * item.sets, 0);
  const historyStages = order.status === 'cancelled' ? ['ordered','cancelled'] : Object.keys(STATUS).filter(key => key !== 'cancelled').slice(0, Object.keys(STATUS).indexOf(order.status) + 1);
  return `<div class="full-order-data"><section><h4>הזמנה ומצב</h4><dl>${field('מספר הזמנה', `#${order.id}`)}${field('תאריך יצירת ההזמנה', dateLabel(order.createdAt ?? order.date))}${field('סטטוס תפעולי', STATUS[order.status].label)}${field('סטטוס תשלום', order.paid ? 'שולמה' : 'ממתינה לתשלום')}${field('הזמנת ניסוי', order.isTest ? 'כן · ללא חיוב אשראי' : 'לא')}${field('הזמנה דחופה', order.urgent ? 'כן' : 'לא')}${field('תאריך אספקה', dateLabel(order.date))}</dl></section><section><h4>לקוחה ופרטי קשר</h4><dl>${field('שם המזמינה', order.customerName)}${field('טלפון המזמינה', `<span dir="ltr">${order.customerPhone}</span>`)}${field('דוא״ל', `<span dir="ltr">${order.customerEmail}</span>`)}</dl></section><section><h4>משלוח ושליח</h4><dl>${field('שיטת אספקה', 'משלוח')}${field('אזור משלוח', order.shippingZone)}${field('עיר', order.city)}${field('שכונה', order.neighborhood)}${field('כתובת', address)}${field('מיקוד', order.postalCode)}${field('אולם / מקום מסירה', order.venueName)}${field('טלפון זמין לשליח', `<span dir="ltr">${order.deliveryPhone}</span>`)}${field('חלון מסירה', order.deliveryWindow)}${field('מספר מארזים', order.packageCount ?? 'טרם הוזן באריזה')}${field('הוראות לשליח', order.courierNotes)}</dl></section><section><h4>מוצרים ותכולה</h4>${items}</section><section><h4>הקדשה והערות</h4><dl>${field('הקדשה', order.note)}${field('הערות הלקוחה', order.customerNotes)}${field('הערות פנימיות', order.internalNotes)}</dl></section><section><h4>סכומים</h4><dl>${field('סך מוצרים', currency(breakdown))}${field('דמי משלוח', currency(order.shippingCost ?? Math.max(0, order.total - breakdown)))}${field('הנחה', currency(order.discount ?? 0))}${field('מס', currency(order.tax ?? 0))}${field('סה״כ לתשלום', currency(order.total))}</dl></section><section><h4>היסטוריית טיפול</h4><ol class="detail-history">${historyStages.map(key => `<li>${badge(key)} <span>${dateLabel(order.createdAt ?? order.date)} · הדגמה</span></li>`).join('')}</ol><p class="muted">בחיבור למערכת יוצגו כאן זמני המעבר וההערות שנשמרו לכל שינוי.</p></section></div>`;
}

function correctOrderStatus(id, target) {
  const order = orders.find(item => item.id === id);
  if (!order || !STATUS[target] || target === 'cancelled' || target === order.status) return;
  if (!window.confirm(`האם לאשר תיקון סטטוס של הזמנה #${id} ל״${STATUS[target].label}״?`)) return;
  order.status = target;
  renderAll();
  notify(`הדגמה: סטטוס הזמנה #${id} תוקן ל״${STATUS[target].label}״.`);
}

function stageSummary(order) {
  const items = order.items.map(item => { const product = PRODUCTS.find(p => p.id === item.product); return `<div class="item-preview">${productImage(product)}<div><b>${product.name}</b><p>${item.sets} סטים</p></div></div>`; }).join('');
  const address = `<p><b>לאן:</b> ${order.street} ${order.house}, ${order.city}</p>`;
  const phone = `<p><b>טלפון למשלוח:</b> <span dir="ltr">${order.deliveryPhone}</span></p>`;
  if (order.status === 'ordered') return `<h3>קבלת ההזמנה והתשלום</h3><p><b>מצב התשלום:</b> ${order.paid ? 'שולמה' : 'ממתינה לתשלום'}</p><p><b>סכום הזמנה:</b> ₪${order.total}</p><p><b>אספקה:</b> ${dateLabel(order.date)}</p>`;
  if (order.status === 'in_preparation') return `<h3>מה צריך להכין</h3>${items}`;
  if (order.status === 'packed') return `<h3>החבילה מוכנה ליציאה</h3>${address}${phone}<p><b>תכולה:</b> ${sumSets(order)} סטים</p>`;
  if (order.status === 'in_transit') return `<h3>פרטי המסירה</h3>${address}${phone}<p><b>תאריך אספקה:</b> ${dateLabel(order.date)}</p>`;
  if (order.status === 'delivered') return `<h3>נמסרה — פרטי יעד</h3>${address}${phone}<p>אפשר לסגור את ההזמנה לאחר בדיקה.</p>`;
  return `<h3>${STATUS[order.status].label}</h3>${address}<p>אפשר לפתוח את כל הפרטים למטה.</p>`;
}

function advanceOrder(id) {
  const order = orders.find(item => item.id === id);
  if (!order || !STATUS[order.status].next || (order.status === 'ordered' && !order.paid)) return;
  order.status = STATUS[order.status].next; renderAll();
  notify(`הדגמה: הזמנה #${id} עודכנה ל״${STATUS[order.status].label}״.`);
}

function actionButton(order, extraClass = '') {
  const status = STATUS[order.status];
  if (order.status === 'ordered' && !order.paid) return '<span class="muted">הכנה לאחר תשלום</span>';
  if (!status.next) return `<span class="muted">${order.status === 'cancelled' ? 'הזמנה מבוטלת' : 'הטיפול הושלם'}</span>`;
  return `<button class="status-action${extraClass}" ${tone(status.next)} data-advance="${order.id}">${status.action} ←</button>`;
}

function needsPreparation(order) { return order.paid && ['ordered', 'in_preparation'].includes(order.status); }
function sumSets(order) { return order.items.reduce((sum, item) => sum + item.sets, 0); }
function productSets(order, product) { return order.items.filter(item => item.product === product).reduce((sum, item) => sum + item.sets, 0); }
function icon(name) { return `<svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`; }
function tone(key) { return `data-status="${key}"`; }
function badge(key, extraClass = '') { return `<span class="badge${extraClass}" ${tone(key)}>${icon(STATUS[key].icon)}${STATUS[key].label}</span>`; }
function productImage(product) { return `<img class="product-thumb" src="${ASSETS}${product.image}" alt="${product.name}" loading="lazy">`; }
function dateLabel(date) { return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z')); }
function clearBreakdown(section) { if (section === 'production') selectedProduct = null; else selectedCity = null; }
function rangeBounds(section) {
  const { date, mode } = filters[section]; if (mode === 'day') return [date, date];
  if (section === 'production') return [date, addDays(date, 7)];
  const start = new Date(date + 'T12:00:00Z'); start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 6);
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}
function rangeOrders(section) { const [start, end] = rangeBounds(section); return orders.filter(order => order.date >= start && order.date <= end); }
function rangeLabel(section) { const [start, end] = rangeBounds(section); return start === end ? dateLabel(start) : `${section === 'production' ? 'מהיום הנבחר ועד שבוע קדימה' : 'ראשון–שבת'} · ${dateLabel(start)} – ${dateLabel(end)}`; }
function addDays(date, count) { const value = new Date(date + 'T12:00:00Z'); value.setUTCDate(value.getUTCDate() + count); return value.toISOString().slice(0, 10); }
function notify(message) { clearTimeout(toastTimer); el('toast').textContent = message; el('toast').hidden = false; toastTimer = setTimeout(() => el('toast').hidden = true, 4000); }

function createOrders() {
  const stages = ['ordered','ordered','ordered','ordered','ordered','ordered','in_preparation','in_preparation','in_preparation','in_preparation','packed','packed','packed','in_transit','in_transit','delivered','delivered','approved','cancelled'];
  const result = stages.map((status, index) => {
    const items = [{ product: PRODUCTS[index % PRODUCTS.length].id, sets: index % 4 + 1, unitPrice: 85, setSize: 6, sku: `ZIS-${index + 1}` }, ...(index % 4 === 0 ? [{ product: PRODUCTS[(index + 1) % PRODUCTS.length].id, sets: 2, unitPrice: 85, setSize: 6, sku: `ZIS-${index + 2}` }] : [])];
    return {
      id: 1041 + index, status, paid: index !== 5, date: TODAY, createdAt: TODAY, isTest: index === 4,
      city: CITIES[index % CITIES.length], street: ['הרב קוק','הנביאים','בית ישראל'][index % 3], house: 10 + index,
      neighborhood: index % 3 === 0 ? 'מרכז העיר' : null, apartment: index % 2 ? '3' : null, postalCode: index === 0 ? '9100001' : null,
      shippingZone: `אזור ${CITIES[index % CITIES.length]}`, deliveryWindow: null, venueName: index === 2 ? 'אולם לדוגמה' : null,
      deliveryPhone: `050-000-${String(1000 + index)}`, customerPhone: `050-111-${String(1000 + index)}`,
      customerName: ['חנה כהן','רחל לוי','שרה ישראלי'][index % 3], customerEmail: `customer${index + 1}@example.invalid`,
      shippingCost: 35, discount: 0, tax: 0, total: items.reduce((sum, item) => sum + item.unitPrice * item.sets, 0) + 35,
      packageCount: ['packed','in_transit','delivered','approved'].includes(status) ? index % 3 + 1 : null,
      note: index === 0 ? 'מזל טוב! יש לאשר את נוסח ההקדשה לפני האריזה.' : '',
      customerNotes: index === 0 ? 'נא לתאם הגעה לפני המסירה.' : null, courierNotes: index === 0 ? 'להתקשר בכניסה לבניין.' : null,
      internalNotes: null, items,
    };
  });
  for (const [index, dayOffset] of [1, 2, -1].entries()) result.push({ id: 1060 + index, status: 'ordered', paid: true, date: addDays(TODAY, dayOffset), createdAt: TODAY, city: CITIES[index], street: ['הרב קוק','הנביאים','בית ישראל'][index], house: 30 + index, shippingZone: `אזור ${CITIES[index]}`, deliveryPhone: `050-000-${String(1060 + index)}`, customerPhone: `050-111-${String(1060 + index)}`, customerName: 'לקוחה לדוגמה', customerEmail: `future${index}@example.invalid`, shippingCost: 35, total: (4 + index) * 85 + 35, note: '', items: [{ product: PRODUCTS[index].id, sets: 4 + index, unitPrice: 85, setSize: 6 }] });
  return result;
}
