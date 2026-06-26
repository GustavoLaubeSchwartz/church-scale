import { api } from '../api.js';

function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function fmtTime(s) {
  if (!s) return '';
  return new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function dayMon(s) {
  if (!s) return { day: '--', mon: '---' };
  const d = new Date(s);
  return {
    day: d.getDate(),
    mon: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
  };
}

function statusBadge(ev) {
  if (ev.dt_hr_efet_fim)    return `<span class="badge badge-muted">Encerrado</span>`;
  if (ev.dt_hr_efet_inicio) return `<span class="badge badge-warning">Em andamento</span>`;
  return `<span class="badge badge-info">Programado</span>`;
}

function coveragePill(pct) {
  const cls = pct >= 100 ? 'coverage-full' : pct >= 50 ? 'coverage-partial' : 'coverage-empty';
  return `<span class="coverage-pill ${cls}">${Math.round(pct)}%</span>`;
}

export async function mount(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1>Dashboard</h1>
    </div>
    <div class="stat-grid" id="stats-grid">
      ${[1,2,3,4,5,6].map(() => `
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="skeleton" style="width:40px;height:40px;border-radius:10px"></div>
          </div>
          <div class="skeleton skeleton-line" style="width:60px;height:24px;margin-bottom:8px"></div>
          <div class="skeleton skeleton-line" style="width:100px"></div>
        </div>
      `).join('')}
    </div>

    <div class="widget-grid" id="widget-grid">
      <div class="widget">
        <div class="widget-title">Próximos Eventos</div>
        <div class="event-list" id="event-list">
          <div class="loading"><span class="spinner"></span></div>
        </div>
      </div>
      <div class="widget">
        <div class="widget-title">Distribuição por Tipo</div>
        <div class="bar-list" id="tipo-chart">
          <div class="loading"><span class="spinner"></span></div>
        </div>
      </div>
    </div>
  `;

  try {
    const [eventos, pessoas, habilidades, locais, tipos, alocacoes] = await Promise.all([
      api.eventos.list().catch(() => []),
      api.pessoas.list().catch(() => []),
      api.habilidades.list().catch(() => []),
      api.locais.list().catch(() => []),
      api.tipos.list().catch(() => []),
      api.alocacoes.list().catch(() => []),
    ]);

    const membros    = pessoas.filter(p => p.tipo === 'membro').length;
    const visitantes = pessoas.filter(p => p.tipo === 'visitante').length;

    const now = new Date();
    const proximos = eventos
      .filter(e => !e.dt_hr_efet_fim && new Date(e.dt_hr_prog_inicio) >= now)
      .sort((a, b) => new Date(a.dt_hr_prog_inicio) - new Date(b.dt_hr_prog_inicio))
      .slice(0, 6);

    const stats = [
      { icon: '👥', label: 'Membros',      value: membros,      color: 'blue',   sub: `${visitantes} visitantes` },
      { icon: '📅', label: 'Eventos',      value: eventos.length, color: 'green', sub: `${proximos.length} próximos` },
      { icon: '📋', label: 'Alocações',   value: alocacoes.length, color: 'yellow', sub: 'total registradas' },
      { icon: '⭐', label: 'Habilidades', value: habilidades.length, color: 'purple', sub: 'cadastradas' },
      { icon: '📍', label: 'Locais',      value: locais.length,  color: 'gray',  sub: 'disponíveis' },
      { icon: '🎯', label: 'Tipos de Evento', value: tipos.length, color: 'red', sub: 'configurados' },
    ];

    document.getElementById('stats-grid').innerHTML = stats.map(s => `
      <div class="stat-card">
        <div class="stat-card-header">
          <div class="stat-card-icon icon-${s.color}">${s.icon}</div>
        </div>
        <div class="stat-card-value">${s.value}</div>
        <div class="stat-card-label">${s.label}</div>
        ${s.sub ? `<div class="stat-card-sub">${s.sub}</div>` : ''}
      </div>
    `).join('');

    // Próximos eventos
    const eventList = document.getElementById('event-list');
    if (proximos.length === 0) {
      eventList.innerHTML = `
        <div class="empty-state" style="padding:24px">
          <div class="empty-state-icon">📅</div>
          <p>Nenhum evento programado</p>
        </div>`;
    } else {
      eventList.innerHTML = proximos.map(e => {
        const { day, mon } = dayMon(e.dt_hr_prog_inicio);
        const alocs = alocacoes.filter(a => a.id_evento === e.id_evento).length;
        return `<div class="event-item">
          <div class="event-date-box">
            <span class="event-date-day">${day}</span>
            <span class="event-date-mon">${mon}</span>
          </div>
          <div class="event-info">
            <div class="event-name">${e.tipo_evento?.descricao || 'Evento'}</div>
            <div class="event-meta">
              ${e.local?.nome || '—'} · ${fmtTime(e.dt_hr_prog_inicio)}
              · ${alocs} alocado${alocs !== 1 ? 's' : ''}
            </div>
          </div>
          ${statusBadge(e)}
        </div>`;
      }).join('');
    }

    // Distribuição por tipo
    const tipoChart = document.getElementById('tipo-chart');
    const tipoCount = {};
    eventos.forEach(e => {
      const desc = e.tipo_evento?.descricao || 'Sem tipo';
      tipoCount[desc] = (tipoCount[desc] || 0) + 1;
    });
    const entries = Object.entries(tipoCount).sort((a, b) => b[1] - a[1]);
    const max = entries[0]?.[1] || 1;

    if (entries.length === 0) {
      tipoChart.innerHTML = `<div class="empty-state" style="padding:24px"><div class="empty-state-icon">📊</div><p>Nenhum dado disponível</p></div>`;
    } else {
      tipoChart.innerHTML = entries.map(([label, count]) => {
        const pct = (count / max * 100).toFixed(0);
        return `<div class="bar-row">
          <span class="bar-label" title="${label}">${label}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <span class="bar-value">${count}</span>
        </div>`;
      }).join('');
    }

  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><p>Erro ao carregar dados: ${err.message}</p></div>`;
  }
}
