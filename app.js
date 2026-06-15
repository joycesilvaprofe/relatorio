// ─── Estado ──────────────────────────────────────────────────────────────────

let tasks = [];
let idCounter = 1;
let currentFilter = 'all';

// ─── Constantes ──────────────────────────────────────────────────────────────

const statusLabel   = { done: 'Concluído', progress: 'Em andamento', pending: 'Pendente', blocked: 'Bloqueado' };
const statusBadge   = { done: 'badge-done', progress: 'badge-progress', pending: 'badge-pending', blocked: 'badge-blocked' };
const statusIcon    = { done: 'ti-circle-check', progress: 'ti-loader-2', pending: 'ti-clock', blocked: 'ti-alert-circle' };
const priorityLabel = { high: 'Alta', medium: 'Média', low: 'Baixa' };
const priorityBadge = { high: 'badge-high', medium: 'badge-medium', low: 'badge-low' };
const priorityIcon  = { high: '🔴', medium: '🟡', low: '🟢' };

// ─── localStorage ─────────────────────────────────────────────────────────────

const STORAGE_TODAY   = 'relatorio_tasks_today';
const STORAGE_DATE    = 'relatorio_date_today';
const STORAGE_HISTORY = 'relatorio_history';
const STORAGE_COUNTER = 'relatorio_counter';

function todayKey() {
  return new Date().toISOString().slice(0, 10); // "2026-06-15"
}

function saveToday() {
  localStorage.setItem(STORAGE_TODAY, JSON.stringify(tasks));
  localStorage.setItem(STORAGE_DATE, todayKey());
  localStorage.setItem(STORAGE_COUNTER, idCounter);
}

function loadToday() {
  const savedDate = localStorage.getItem(STORAGE_DATE);
  if (savedDate === todayKey()) {
    tasks = JSON.parse(localStorage.getItem(STORAGE_TODAY) || '[]');
    idCounter = parseInt(localStorage.getItem(STORAGE_COUNTER) || '1');
  } else {
    // Novo dia: arquiva o dia anterior no histórico se havia tarefas
    const previousTasks = JSON.parse(localStorage.getItem(STORAGE_TODAY) || '[]');
    if (previousTasks.length > 0 && savedDate) {
      archiveDay(savedDate, previousTasks);
    }
    tasks = [];
    idCounter = 1;
    saveToday();
  }
}

function archiveDay(date, dayTasks) {
  const history = JSON.parse(localStorage.getItem(STORAGE_HISTORY) || '[]');
  const exists = history.find(h => h.date === date);
  if (!exists) {
    history.unshift({ date, tasks: dayTasks });
    // Mantém apenas os últimos 30 dias
    if (history.length > 30) history.pop();
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
  }
}

function loadHistory() {
  return JSON.parse(localStorage.getItem(STORAGE_HISTORY) || '[]');
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('date-label').textContent =
    new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  document.getElementById('task-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
  });

  loadToday();
  render();
  renderHistory();
});

// ─── Tarefas ──────────────────────────────────────────────────────────────────

function addTask() {
  const desc = document.getElementById('task-input').value.trim();
  if (!desc) { showToast('Digite uma descrição para a tarefa.'); return; }

  tasks.push({
    id: idCounter++,
    desc,
    time:     parseFloat(document.getElementById('time-input').value) || 0,
    status:   document.getElementById('status-select').value,
    priority: document.getElementById('priority-select').value,
    proj:     document.getElementById('proj-input').value.trim(),
    obs:      document.getElementById('obs-input').value.trim(),
  });

  document.getElementById('task-input').value  = '';
  document.getElementById('time-input').value  = '';
  document.getElementById('proj-input').value  = '';
  document.getElementById('obs-input').value   = '';

  saveToday();
  render();
  showToast('Tarefa adicionada!');
}

function removeTask(id) {
  const i = tasks.findIndex(t => t.id === id);
  if (i > -1) tasks.splice(i, 1);
  saveToday();
  render();
}

function changeStatus(id, val) {
  const t = tasks.find(t => t.id === id);
  if (t) { t.status = val; saveToday(); render(); }
}

function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

// ─── Render tarefas ───────────────────────────────────────────────────────────

function render() {
  const filtered = currentFilter === 'all' ? tasks : tasks.filter(t => t.status === currentFilter);
  const list = document.getElementById('task-list');

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty">${tasks.length === 0 ? 'Nenhuma tarefa adicionada ainda.' : 'Nenhuma tarefa com esse filtro.'}</div>`;
  } else {
    list.innerHTML = filtered.map(t => `
      <div class="task-item">
        <div class="task-top">
          <i class="ti ${statusIcon[t.status]} task-icon" aria-hidden="true"></i>
          <span class="task-desc">${escapeHtml(t.desc)}</span>
          <button class="btn-icon" onclick="removeTask(${t.id})" aria-label="Remover tarefa">
            <i class="ti ti-trash"></i>
          </button>
        </div>
        <div class="task-meta">
          ${t.proj ? `<span class="badge badge-proj"><i class="ti ti-folder" style="font-size:11px;vertical-align:-1px;margin-right:3px"></i>${escapeHtml(t.proj)}</span>` : ''}
          <span class="badge ${priorityBadge[t.priority]}">${priorityLabel[t.priority]}</span>
          ${t.time > 0 ? `<span class="task-time"><i class="ti ti-clock" style="font-size:12px;vertical-align:-1px"></i> ${t.time}h</span>` : ''}
          <select class="inline-select" onchange="changeStatus(${t.id}, this.value)">
            <option value="done"     ${t.status === 'done'     ? 'selected' : ''}>✅ Concluído</option>
            <option value="progress" ${t.status === 'progress' ? 'selected' : ''}>🔄 Em andamento</option>
            <option value="pending"  ${t.status === 'pending'  ? 'selected' : ''}>⏳ Pendente</option>
            <option value="blocked"  ${t.status === 'blocked'  ? 'selected' : ''}>🚫 Bloqueado</option>
          </select>
          <span class="badge ${statusBadge[t.status]}">${statusLabel[t.status]}</span>
        </div>
        ${t.obs ? `<div class="task-obs">${escapeHtml(t.obs)}</div>` : ''}
      </div>
    `).join('');
  }

  updateStats();
  generateReport(tasks);
}

function updateStats() {
  const total     = tasks.length;
  const done      = tasks.filter(t => t.status === 'done').length;
  const progress  = tasks.filter(t => t.status === 'progress').length;
  const totalTime = tasks.reduce((a, t) => a + t.time, 0);

  document.getElementById('s-total').textContent    = total;
  document.getElementById('s-done').textContent     = done;
  document.getElementById('s-progress').textContent = progress;
  document.getElementById('s-time').textContent     = totalTime > 0 ? totalTime.toFixed(1) + 'h' : '0h';
}

// ─── Histórico ────────────────────────────────────────────────────────────────

function renderHistory() {
  const history = loadHistory();
  const container = document.getElementById('history-list');

  if (history.length === 0) {
    container.innerHTML = '<div class="empty">Nenhum dia arquivado ainda.</div>';
    return;
  }

  container.innerHTML = history.map(entry => {
    const done    = entry.tasks.filter(t => t.status === 'done').length;
    const total   = entry.tasks.length;
    const [y, m, d] = entry.date.split('-');
    const label   = new Date(+y, +m - 1, +d).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
    return `
      <div class="history-item">
        <div>
          <div class="history-date">${label}</div>
          <div class="history-summary">${done} de ${total} tarefa${total !== 1 ? 's' : ''} concluída${done !== 1 ? 's' : ''}</div>
        </div>
        <div class="history-actions">
          <button class="btn btn-secondary" onclick="viewHistoryReport('${entry.date}')" style="font-size:12px;height:30px;padding:0 10px">
            <i class="ti ti-eye"></i> Ver relatório
          </button>
          <button class="btn-icon" onclick="deleteHistoryEntry('${entry.date}')" aria-label="Excluir dia">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function viewHistoryReport(date) {
  const history = loadHistory();
  const entry   = history.find(h => h.date === date);
  if (!entry) return;

  const [y, m, d] = date.split('-');
  const label = new Date(+y, +m - 1, +d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  renderReport(entry.tasks, label, `Exibindo histórico de ${label}`);
  document.querySelector('.report-card').scrollIntoView({ behavior: 'smooth' });
}

function deleteHistoryEntry(date) {
  const history = loadHistory().filter(h => h.date !== date);
  localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
  renderHistory();
  showToast('Dia removido do histórico.');
}

// ─── Relatório ────────────────────────────────────────────────────────────────

let currentReportText = '';

function generateReport(taskList) {
  const label = new Date().toLocaleDateString('pt-BR');
  renderReport(taskList, label, 'Relatório de hoje');
}

function renderReport(taskList, dateLabel, sourceLabel) {
  currentReportText = buildReportText(taskList, dateLabel);
  document.getElementById('report-text').innerHTML = buildReportHTML(taskList, dateLabel);
  document.getElementById('report-source').textContent = sourceLabel;
}

const statusGroupMeta = {
  done:     { label: 'Concluídas',    icon: '✅', css: 'rg-done' },
  progress: { label: 'Em andamento',  icon: '🔄', css: 'rg-progress' },
  pending:  { label: 'Pendentes',     icon: '⏳', css: 'rg-pending' },
  blocked:  { label: 'Bloqueadas',    icon: '🚫', css: 'rg-blocked' },
};

function groupByStatus(taskList) {
  const groups = { done: [], progress: [], pending: [], blocked: [] };
  taskList.forEach(t => groups[t.status]?.push(t));
  return groups;
}

function buildReportHTML(taskList, dateLabel) {
  const total     = taskList.length;
  const done      = taskList.filter(t => t.status === 'done').length;
  const progress  = taskList.filter(t => t.status === 'progress').length;
  const pending   = taskList.filter(t => t.status === 'pending').length;
  const blocked   = taskList.filter(t => t.status === 'blocked').length;
  const totalTime = taskList.reduce((a, t) => a + (t.time || 0), 0);

  let html = `
    <div class="report-doc-header">
      <h2>Relatório Diário de Atividades</h2>
      <p class="report-doc-date">${escapeHtml(dateLabel)}</p>
    </div>`;

  if (total === 0) {
    html += `<div class="empty">Nenhuma tarefa para exibir.</div>`;
    return html;
  }

  html += `
    <div class="report-summary">
      <div class="rs-stat"><strong>${total}</strong><span>Total</span></div>
      <div class="rs-stat"><strong>${done}</strong><span>Concluídas</span></div>
      <div class="rs-stat"><strong>${progress}</strong><span>Em andamento</span></div>
      <div class="rs-stat"><strong>${pending}</strong><span>Pendentes</span></div>
      <div class="rs-stat"><strong>${blocked}</strong><span>Bloqueadas</span></div>
      <div class="rs-stat"><strong>${totalTime > 0 ? totalTime.toFixed(1) + 'h' : '—'}</strong><span>Horas</span></div>
    </div>`;

  const groups = groupByStatus(taskList);

  Object.keys(statusGroupMeta).forEach(key => {
    const list = groups[key];
    if (!list.length) return;
    const meta = statusGroupMeta[key];

    html += `
      <div class="report-group ${meta.css}">
        <h3>${meta.icon} ${meta.label} <span class="rg-count">(${list.length})</span></h3>
        <ul>`;

    list.forEach(t => {
      html += `
          <li>
            <div class="rg-item-main">
              <span class="rg-desc">${escapeHtml(t.desc)}</span>
              <span class="rg-tags">
                ${t.proj ? `<span class="rg-tag rg-tag-proj">${escapeHtml(t.proj)}</span>` : ''}
                <span class="rg-tag rg-tag-priority">${priorityIcon[t.priority]} ${priorityLabel[t.priority]}</span>
                ${t.time > 0 ? `<span class="rg-tag rg-tag-time">${t.time}h</span>` : ''}
              </span>
            </div>
            ${t.obs ? `<div class="rg-obs">${escapeHtml(t.obs)}</div>` : ''}
          </li>`;
    });

    html += `
        </ul>
      </div>`;
  });

  return html;
}

function buildReportText(taskList, dateLabel) {
  if (!taskList || taskList.length === 0) return 'Nenhuma tarefa para exibir.';

  const groups = groupByStatus(taskList);

  const lines = [`RELATÓRIO DIÁRIO — ${dateLabel}`, '─'.repeat(40), ''];

  function block(label, icon, list) {
    if (!list.length) return;
    lines.push(`${icon} ${label}`);
    list.forEach(t => {
      let line = `  • ${t.desc}`;
      if (t.proj) line += ` [${t.proj}]`;
      line += ` ${priorityIcon[t.priority]}`;
      if (t.time > 0) line += ` (${t.time}h)`;
      lines.push(line);
      if (t.obs) lines.push(`    ↳ ${t.obs}`);
    });
    lines.push('');
  }

  block('CONCLUÍDAS',   '✅', groups.done);
  block('EM ANDAMENTO', '🔄', groups.progress);
  block('PENDENTES',    '⏳', groups.pending);
  block('BLOQUEADAS',   '🚫', groups.blocked);

  const totalTime = taskList.reduce((a, t) => a + (t.time || 0), 0);
  if (totalTime > 0) lines.push(`⏱ Tempo total registrado: ${totalTime.toFixed(1)}h`);

  return lines.join('\n');
}

function copyReport() {
  const text = currentReportText;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Relatório copiado!');
    const btn = document.getElementById('copy-btn');
    btn.innerHTML = '<i class="ti ti-check"></i> Copiado!';
    setTimeout(() => { btn.innerHTML = '<i class="ti ti-copy"></i> Copiar'; }, 2000);
  });
}

function printReport() {
  window.print();
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
