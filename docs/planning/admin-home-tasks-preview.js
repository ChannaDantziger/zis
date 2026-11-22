'use strict';
const TASK_STATES = { open: 'פתוח', in_progress: 'בטיפול', closed: 'סגור' };
let tasks = makeInitialTasks();
let activeTaskId = null;

document.getElementById('task-create').addEventListener('submit', event => {
  event.preventDefault();
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-description').value.trim();
  const status = document.getElementById('task-initial-status').value;
  if (!title || !TASK_STATES[status]) return;
  const id = Math.max(0, ...tasks.map(task => task.id)) + 1;
  tasks.push({ id, title, description, status, history: [{ status, note: description, date: new Date().toISOString() }] });
  event.target.reset(); renderTasks(); renderAll();
  notify(`הדגמה: המשימה נוספה במצב ״${TASK_STATES[status]}״.`);
});

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-task]');
  if (button) showTask(Number(button.dataset.task));
});
document.getElementById('close-task-dialog').addEventListener('click', () => document.getElementById('task-dialog').close());
document.getElementById('task-dialog').addEventListener('close', () => activeTaskId = null);
document.getElementById('reset').addEventListener('click', () => { tasks = makeInitialTasks(); renderTasks(); renderAll(); });
renderTasks(); renderAll();

function taskCounts() {
  const active = tasks.filter(task => task.status !== 'closed').length;
  return { active, open: tasks.filter(task => task.status === 'open').length, in_progress: tasks.filter(task => task.status === 'in_progress').length };
}

function renderAttention() {
  const active = tasks.filter(task => task.status !== 'closed').slice(0, 3);
  document.getElementById('attention').innerHTML = `<div><span class="attention-icon" aria-hidden="true">!</span><b>דורש טיפול · ${taskCounts().active}</b></div>${active.map(task => `<button data-task="${task.id}">${escapeTask(task.title)} <span>פתיחה ←</span></button>`).join('')}${active.length ? '' : '<span>אין משימות פתוחות.</span>'}`;
}

function renderTasks() {
  document.getElementById('task-total').textContent = `${taskCounts().active} פעילות`;
  document.getElementById('task-columns').innerHTML = Object.entries(TASK_STATES).map(([status, label]) => {
    const inColumn = tasks.filter(task => task.status === status);
    return `<div class="task-column" data-task-status="${status}"><h3>${label} <span>${inColumn.length}</span></h3>${inColumn.map(task => `<button class="task-card" data-task="${task.id}"><strong>${escapeTask(task.title)}</strong>${task.description ? `<small>${escapeTask(task.description)}</small>` : ''}<em>${task.history.length} רישומים · פתיחת המשימה ←</em></button>`).join('')}${inColumn.length ? '' : '<p class="muted">אין משימות כאן</p>'}</div>`;
  }).join('');
}

function showTask(id) {
  if (!tasks.some(task => task.id === id)) return;
  activeTaskId = id; renderTaskDialog();
  const dialog = document.getElementById('task-dialog');
  if (!dialog.open) dialog.showModal();
}

function renderTaskDialog() {
  const task = tasks.find(item => item.id === activeTaskId);
  if (!task) return;
  const options = Object.entries(TASK_STATES).map(([key, label]) => `<option value="${key}" ${task.status === key ? 'selected' : ''}>${label}</option>`).join('');
  const history = task.history.map(entry => `<li><b>${TASK_STATES[entry.status]}</b> · ${taskTime(entry.date)}${entry.note ? `<p>${escapeTask(entry.note)}</p>` : '<p>ללא הערה</p>'}</li>`).join('');
  document.getElementById('task-dialog-content').innerHTML = `<div class="dialog-title"><h2 id="task-dialog-title">${escapeTask(task.title)}</h2><span class="task-state" data-task-status="${task.status}">${TASK_STATES[task.status]}</span></div><h3>כל מה שנכתב</h3><ol class="task-history">${history}</ol><form id="task-update"><label>מצב המשימה<select id="task-next-status">${options}</select></label><label>הערה למעבר או למצב הנוכחי<textarea id="task-next-note" rows="3" placeholder="מה נעשה? מה עוד צריך לעשות?"></textarea></label><button class="task-add" type="submit">שמירת מצב והערה</button></form>`;
  document.getElementById('task-update').addEventListener('submit', event => {
    event.preventDefault();
    const status = document.getElementById('task-next-status').value;
    const note = document.getElementById('task-next-note').value.trim();
    if (!TASK_STATES[status] || (status === task.status && !note)) return;
    task.status = status;
    task.history.push({ status, note, date: new Date().toISOString() });
    renderTaskDialog(); renderTasks(); renderAll();
    notify('הדגמה: מצב המשימה וההערה נשמרו במסך.');
  });
}

function taskTime(value) {
  return new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function escapeTask(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function makeInitialTasks() {
  const date = new Date().toISOString();
  return [
    { id: 1, title: 'לבדוק הקדשה להזמנה #1041', description: 'לבדוק את נוסח ההקדשה לפני האריזה.', status: 'open', history: [{ status: 'open', note: 'לבדוק את נוסח ההקדשה לפני האריזה.', date }] },
    { id: 2, title: 'לברר תשלום להזמנה #1046', description: 'ממתינה לתשלום; לעקוב לפני הכנה.', status: 'in_progress', history: [{ status: 'open', note: 'נפתחה משימת מעקב.', date }, { status: 'in_progress', note: 'נבדק מצב התשלום. יש לעקוב.', date }] },
  ];
}
