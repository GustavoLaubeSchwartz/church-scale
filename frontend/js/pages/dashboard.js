import { api } from '../api.js';

export async function mount(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1>Painel Geral</h1>
    </div>
    <div class="stat-grid" id="stats-grid">
      <div class="loading"><span class="spinner"></span>Carregando...</div>
    </div>
  `;

  try {
    const [eventos, pessoas, ministerios, habilidades, locais] = await Promise.all([
      api.eventos.list().catch(() => []),
      api.pessoas.list().catch(() => []),
      api.ministerios.list().catch(() => []),
      api.habilidades.list().catch(() => []),
      api.locais.list().catch(() => []),
    ]);

    const stats = [
      { icon: '📅', label: 'Eventos',      value: eventos.length },
      { icon: '👥', label: 'Pessoas',       value: pessoas.length },
      { icon: '⛪', label: 'Ministérios',   value: ministerios.length },
      { icon: '⭐', label: 'Habilidades',   value: habilidades.length },
      { icon: '📍', label: 'Locais',        value: locais.length },
    ];

    document.getElementById('stats-grid').innerHTML = stats.map(s => `
      <div class="stat-card">
        <div class="stat-icon">${s.icon}</div>
        <div class="stat-value">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('stats-grid').innerHTML = `<div class="empty-state">Erro ao carregar: ${err.message}</div>`;
  }
}
