import { api } from './api.js';
import { mount as mountDashboard }  from './pages/dashboard.js';
import { mount as mountEventos }    from './pages/eventos.js';
import { mount as mountPessoas }    from './pages/pessoas.js';
import { mount as mountHabilidades }from './pages/habilidades.js';
import { mount as mountLocais }     from './pages/locais.js';
import { mount as mountTipos }      from './pages/tipos_evento.js';
import { mount as mountAlocacoes }  from './pages/alocacoes.js';
import { mount as mountRelatorios } from './pages/relatorios.js';

// ── Toast ──────────────────────────────────────────────────────────────────
const TOAST_ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

window.toast = function (message, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.success}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" aria-label="Fechar">✕</button>
  `;
  el.querySelector('.toast-close').onclick = () => dismissToast(el);
  container.appendChild(el);
  const timer = setTimeout(() => dismissToast(el), 4000);
  el._timer = timer;
};

function dismissToast(el) {
  clearTimeout(el._timer);
  el.classList.add('hiding');
  setTimeout(() => el.remove(), 280);
}

// ── Modal ──────────────────────────────────────────────────────────────────
let _currentOnSubmit = null;

window.openModal = function (title, bodyHtml, onSubmit) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').removeAttribute('hidden');
  _currentOnSubmit = onSubmit;
  if (onSubmit) {
    const form = document.querySelector('#modal-body form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = form.querySelector('[type=submit]');
        const origText = btn?.textContent;
        if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
        try {
          await onSubmit(form);
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = origText || 'Salvar'; }
        }
      };
    }
  }
};

window.closeModal = function () {
  document.getElementById('modal-overlay').setAttribute('hidden', '');
  document.getElementById('modal-body').innerHTML = '';
  _currentOnSubmit = null;
};

// ── Navigation ─────────────────────────────────────────────────────────────
const ROUTES = {
  '#painel':       { label: '🏠 Dashboard',       mount: mountDashboard },
  '#eventos':      { label: '📅 Eventos',          mount: mountEventos },
  '#pessoas':      { label: '👥 Pessoas',          mount: mountPessoas },
  '#habilidades':  { label: '⭐ Habilidades',      mount: mountHabilidades },
  '#locais':       { label: '📍 Locais',           mount: mountLocais },
  '#tipos-evento': { label: '🎯 Tipos de Evento',  mount: mountTipos },
  '#alocacoes':    { label: '📋 Escalas',          mount: mountAlocacoes },
  '#relatorios':   { label: '📊 Relatórios',       mount: mountRelatorios },
};

const NAV_ITEMS = [
  { hash: '#painel',       icon: '🏠', label: 'Dashboard' },
  { hash: '#eventos',      icon: '📅', label: 'Eventos' },
  { hash: '#pessoas',      icon: '👥', label: 'Pessoas' },
  { hash: '#habilidades',  icon: '⭐', label: 'Habilidades' },
  { hash: '#locais',       icon: '📍', label: 'Locais' },
  { hash: '#tipos-evento', icon: '🎯', label: 'Tipos de Evento' },
  { hash: '#alocacoes',    icon: '📋', label: 'Escalas' },
  { hash: '#relatorios',   icon: '📊', label: 'Relatórios' },
];

function buildSidebar() {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = NAV_ITEMS.map(item => `
    <div class="nav-item" data-hash="${item.hash}" title="${item.label}">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
    </div>
  `).join('');
  nav.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      window.location.hash = el.dataset.hash;
      closeMobileSidebar();
    });
  });
}

function updateActiveNav() {
  const hash = window.location.hash || '#painel';
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.hash === hash);
  });
  const route = ROUTES[hash] || ROUTES['#painel'];
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = route.label.replace(/^[^ ]+ /, '');
}

async function navigate() {
  const hash = window.location.hash || '#painel';
  const route = ROUTES[hash] || ROUTES['#painel'];
  const content = document.getElementById('content');
  content.innerHTML = `<div class="loading"><span class="spinner"></span>Carregando...</div>`;
  updateActiveNav();
  window.closeModal();
  try {
    await route.mount(content);
  } catch (err) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠</div>
        <p>Erro ao carregar a página: ${err.message}</p>
      </div>`;
  }
}

// ── Sidebar collapse ───────────────────────────────────────────────────────
function initSidebarToggle() {
  const shell = document.getElementById('app-shell');
  const btn   = document.getElementById('sidebar-toggle');
  if (!btn) return;

  if (localStorage.getItem('sidebar_collapsed') === 'true') {
    shell.classList.add('sidebar-collapsed');
    btn.textContent = '▶';
  }

  btn.addEventListener('click', () => {
    const collapsed = shell.classList.toggle('sidebar-collapsed');
    btn.textContent = collapsed ? '▶' : '◀';
    localStorage.setItem('sidebar_collapsed', collapsed);
  });
}

// ── Mobile sidebar ─────────────────────────────────────────────────────────
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// ── Auth ───────────────────────────────────────────────────────────────────
async function boot() {
  // Force initial state via inline style — bypasses any CSS specificity issue
  document.getElementById('login-overlay').style.display = 'flex';
  document.getElementById('app-shell').style.display = 'none';

  const token = localStorage.getItem('church_token');

  if (token) {
    try {
      const me = await api.auth.me();
      showApp(me);
    } catch (_) {
      localStorage.removeItem('church_token');
      showLogin();
    }
  } else {
    showLogin();
  }

  // Login form
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    const numero_celular = document.getElementById('login-input').value.trim();
    const senha = document.getElementById('senha-input').value;

    const errBox = document.getElementById('login-error');
    const errMsg = document.getElementById('login-error-msg');
    errBox.classList.remove('visible');
    errMsg.textContent = '';

    btn.disabled = true;
    btn.textContent = 'Entrando...';

    try {
      const data = await api.auth.login(numero_celular, senha);
      localStorage.setItem('church_token', data.access_token);
      showApp(data.pessoa);
    } catch (err) {
      const msg = err.message || 'Erro ao fazer login. Tente novamente.';
      errMsg.textContent = msg;
      errBox.classList.add('visible');
      document.getElementById('senha-input').value = '';
      document.getElementById('senha-input').focus();
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });

  // Session expired from any API call → show login without full reload
  window.addEventListener('auth:expired', () => {
    window.removeEventListener('hashchange', navigate);
    showLogin();
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    if (!confirm('Deseja sair do sistema?')) return;
    localStorage.removeItem('church_token');
    window.location.hash = '';
    location.reload();
  });

  // Modal close
  document.querySelector('.modal-close').addEventListener('click', window.closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) window.closeModal();
  });

  // Mobile hamburger
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('open');
  });
  document.getElementById('sidebar-overlay').addEventListener('click', closeMobileSidebar);
}

function showLogin() {
  const overlay = document.getElementById('login-overlay');
  const shell   = document.getElementById('app-shell');
  overlay.classList.remove('login-exit');
  overlay.style.display = 'flex';
  shell.classList.remove('app-enter');
  shell.style.display = 'none';
  document.getElementById('login-input').focus();
}

function showApp(pessoa) {
  const overlay = document.getElementById('login-overlay');
  const shell   = document.getElementById('app-shell');

  overlay.classList.add('login-exit');
  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.classList.remove('login-exit');
  }, 350);

  shell.style.display = 'flex';
  shell.classList.add('app-enter');
  setTimeout(() => shell.classList.remove('app-enter'), 500);

  const name     = (pessoa && pessoa.nome) || (pessoa && pessoa.numero_celular) || 'Usuário';
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const avatarEl = document.getElementById('sidebar-avatar');
  const nameEl   = document.getElementById('sidebar-user-name');
  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl)   nameEl.textContent   = name;

  buildSidebar();
  initSidebarToggle();
  window.addEventListener('hashchange', navigate);
  navigate();
}

boot();
