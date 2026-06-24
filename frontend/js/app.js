import { api } from './api.js';
import { mount as mountDashboard } from './pages/dashboard.js';
import { mount as mountEventos } from './pages/eventos.js';
import { mount as mountPessoas } from './pages/pessoas.js';
import { mount as mountMinisterios } from './pages/ministerios.js';
import { mount as mountHabilidades } from './pages/habilidades.js';
import { mount as mountLocais } from './pages/locais.js';
import { mount as mountTipos } from './pages/tipos_evento.js';
import { mount as mountAlocacoes } from './pages/alocacoes.js';
import { mount as mountRelatorios } from './pages/relatorios.js';

// ── Toast ──────────────────────────────────────────────────────────────────
window.toast = function (message, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
};

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
        if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
        try {
          await onSubmit(form);
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
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
  '#painel':       { label: 'Painel',         mount: mountDashboard },
  '#eventos':      { label: 'Eventos',         mount: mountEventos },
  '#pessoas':      { label: 'Pessoas',         mount: mountPessoas },
  '#ministerios':  { label: 'Ministérios',     mount: mountMinisterios },
  '#habilidades':  { label: 'Habilidades',     mount: mountHabilidades },
  '#locais':       { label: 'Locais',          mount: mountLocais },
  '#tipos-evento': { label: 'Tipos de Evento', mount: mountTipos },
  '#alocacoes':    { label: 'Alocações',       mount: mountAlocacoes },
  '#relatorios':   { label: 'Relatórios',      mount: mountRelatorios },
};

const NAV_ITEMS = [
  { hash: '#painel',       icon: '📊', label: 'Painel' },
  { hash: '#eventos',      icon: '📅', label: 'Eventos' },
  { hash: '#pessoas',      icon: '👥', label: 'Pessoas' },
  { hash: '#ministerios',  icon: '⛪', label: 'Ministérios' },
  { hash: '#habilidades',  icon: '⭐', label: 'Habilidades' },
  { hash: '#locais',       icon: '📍', label: 'Locais' },
  { hash: '#tipos-evento', icon: '🎯', label: 'Tipos de Evento' },
  { hash: '#alocacoes',    icon: '📋', label: 'Alocações' },
  { hash: '#relatorios',   icon: '📈', label: 'Relatórios' },
];

function buildSidebar() {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = NAV_ITEMS.map(item => `
    <div class="nav-item" data-hash="${item.hash}">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
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
}

async function navigate() {
  const hash = window.location.hash || '#painel';
  const route = ROUTES[hash] || ROUTES['#painel'];
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading"><span class="spinner"></span>Carregando...</div>';
  updateActiveNav();
  window.closeModal();
  try {
    await route.mount(content);
  } catch (err) {
    content.innerHTML = `<div class="empty-state">Erro ao carregar página: ${err.message}</div>`;
  }
}

// ── Mobile sidebar ─────────────────────────────────────────────────────────
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// ── Auth ───────────────────────────────────────────────────────────────────
async function boot() {
  const loginOverlay = document.getElementById('login-overlay');
  const appShell = document.getElementById('app-shell');
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

  // Login form handler
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    const login = document.getElementById('login-input').value.trim();
    const senha = document.getElementById('senha-input').value;
    const errEl = document.getElementById('login-error');
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Entrando...';
    try {
      const data = await api.auth.login(login, senha);
      localStorage.setItem('church_token', data.access_token);
      showApp(data.ministerio);
    } catch (err) {
      errEl.textContent = err.message || 'Login ou senha inválidos';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
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
  document.getElementById('login-overlay').removeAttribute('hidden');
  document.getElementById('app-shell').setAttribute('hidden', '');
}

function showApp(ministerio) {
  document.getElementById('login-overlay').setAttribute('hidden', '');
  document.getElementById('app-shell').removeAttribute('hidden');
  document.getElementById('ministry-name').textContent = ministerio.nome || ministerio.login;
  buildSidebar();
  window.addEventListener('hashchange', navigate);
  navigate();
}

boot();
