import { api } from '../api.js';

function fmtDt(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function toDatetimeLocal(s) {
  if (!s) return '';
  const d = new Date(s);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusBadge(e) {
  if (e.dt_hr_efet_fim)    return `<span class="badge badge-muted">Encerrado</span>`;
  if (e.dt_hr_efet_inicio) return `<span class="badge badge-warning">Em andamento</span>`;
  return `<span class="badge badge-info">Programado</span>`;
}

export async function mount(container) {
  let tipos = [], locais = [], eventos = [];

  async function loadFilters() {
    [tipos, locais] = await Promise.all([api.tipos.list(), api.locais.list()]);
  }

  function tipoOpts(sel = '') {
    return `<option value="">Todos os tipos</option>` +
      tipos.map(t => `<option value="${t.id_tipo_evento}" ${sel == t.id_tipo_evento ? 'selected' : ''}>${t.descricao}</option>`).join('');
  }

  function localOpts(sel = '') {
    return `<option value="">Todos os locais</option>` +
      locais.map(l => `<option value="${l.id_local}" ${sel == l.id_local ? 'selected' : ''}>${l.nome}</option>`).join('');
  }

  function renderTable(list) {
    const tbody = document.getElementById('eventos-tbody');
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7">
        <div class="empty-state"><div class="empty-state-icon">📅</div><p>Nenhum evento encontrado.</p></div>
      </td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(e => {
      const started = !!e.dt_hr_efet_inicio;
      const ended   = !!e.dt_hr_efet_fim;
      return `<tr>
        <td>
          <div style="font-weight:600;color:var(--text)">${e.tipo_evento?.descricao || '—'}</div>
          <div style="font-size:.75rem;color:var(--text-muted)">${e.local?.nome || '—'}</div>
        </td>
        <td>
          <div>${fmtDt(e.dt_hr_prog_inicio)}</div>
          <div style="font-size:.75rem;color:var(--text-muted)">${fmtDt(e.dt_hr_prog_fim)}</div>
        </td>
        <td>
          ${e.dt_hr_efet_inicio
            ? `<div>${fmtDt(e.dt_hr_efet_inicio)}</div>
               ${e.dt_hr_efet_fim ? `<div style="font-size:.75rem;color:var(--text-muted)">${fmtDt(e.dt_hr_efet_fim)}</div>` : ''}`
            : '<span style="color:var(--text-light)">—</span>'}
        </td>
        <td style="text-align:center">${e.qtd_participantes_esperados}</td>
        <td>${statusBadge(e)}</td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-secondary btn-sm" data-edit="${e.id_evento}">Editar</button>
            <button class="btn btn-secondary btn-sm" data-escala="${e.id_evento}" title="Ver escala">📋</button>
            ${!started ? `<button class="btn btn-success btn-sm" data-iniciar="${e.id_evento}">Iniciar</button>` : ''}
            ${started && !ended ? `<button class="btn btn-secondary btn-sm" data-finalizar="${e.id_evento}">Finalizar</button>` : ''}
            <button class="btn btn-danger btn-sm" data-del="${e.id_evento}">✕</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-del]').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Excluir este evento permanentemente?')) return;
        try { await api.eventos.remove(+btn.dataset.del); window.toast('Evento excluído'); loadData(); }
        catch (err) { window.toast(err.message, 'error'); }
      };
    });
    tbody.querySelectorAll('[data-edit]').forEach(btn => {
      btn.onclick = () => openEdit(list.find(e => e.id_evento == btn.dataset.edit));
    });
    tbody.querySelectorAll('[data-iniciar]').forEach(btn => {
      btn.onclick = async () => {
        try { await api.eventos.iniciar(+btn.dataset.iniciar); window.toast('Evento iniciado'); loadData(); }
        catch (err) { window.toast(err.message, 'error'); }
      };
    });
    tbody.querySelectorAll('[data-finalizar]').forEach(btn => {
      btn.onclick = async () => {
        try { await api.eventos.finalizar(+btn.dataset.finalizar); window.toast('Evento finalizado'); loadData(); }
        catch (err) { window.toast(err.message, 'error'); }
      };
    });
    tbody.querySelectorAll('[data-escala]').forEach(btn => {
      btn.onclick = () => { window.location.hash = '#alocacoes'; sessionStorage.setItem('filter_evento', btn.dataset.escala); };
    });
  }

  async function loadData() {
    const params = {};
    const tipo  = document.getElementById('filter-tipo')?.value;
    const local = document.getElementById('filter-local')?.value;
    const ini   = document.getElementById('filter-ini')?.value;
    const fim   = document.getElementById('filter-fim')?.value;
    if (tipo)  params.id_tipo_evento = tipo;
    if (local) params.id_local = local;
    if (ini)   params.data_inicio = ini;
    if (fim)   params.data_fim = fim;

    document.getElementById('eventos-tbody').innerHTML =
      `<tr><td colspan="7" class="loading"><span class="spinner"></span>Carregando...</td></tr>`;
    try {
      eventos = await api.eventos.list(Object.keys(params).length ? params : undefined);
      renderTable(eventos);
      document.getElementById('evento-count').textContent = `${eventos.length} evento${eventos.length !== 1 ? 's' : ''}`;
    } catch (err) {
      window.toast(err.message, 'error');
    }
  }

  function formHtml(ev) {
    const tipoOps = tipos.map(t => `<option value="${t.id_tipo_evento}" ${ev && t.id_tipo_evento == ev.id_tipo_evento ? 'selected' : ''}>${t.descricao}</option>`).join('');
    const locOps  = locais.map(l => `<option value="${l.id_local}" ${ev && l.id_local == ev.id_local ? 'selected' : ''}>${l.nome}</option>`).join('');
    return `<form>
      <div class="form-group"><label>Tipo de Evento</label>
        <select id="m-tipo" required><option value="">Selecione...</option>${tipoOps}</select></div>
      <div class="form-group"><label>Local</label>
        <select id="m-local" required><option value="">Selecione...</option>${locOps}</select></div>
      <div class="form-group"><label>Início Programado</label>
        <input type="datetime-local" id="m-ini" value="${ev ? toDatetimeLocal(ev.dt_hr_prog_inicio) : ''}" required></div>
      <div class="form-group"><label>Fim Programado</label>
        <input type="datetime-local" id="m-fim" value="${ev ? toDatetimeLocal(ev.dt_hr_prog_fim) : ''}" required></div>
      <div class="form-group"><label>Qtd. Participantes Esperados</label>
        <input type="number" id="m-qtd" value="${ev ? ev.qtd_participantes_esperados : 0}" min="0"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="window.closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>`;
  }

  function openCreate() {
    window.openModal('Novo Evento', formHtml(null), async (form) => {
      try {
        await api.eventos.create({
          id_tipo_evento: +form.querySelector('#m-tipo').value,
          id_local:       +form.querySelector('#m-local').value,
          dt_hr_prog_inicio: form.querySelector('#m-ini').value,
          dt_hr_prog_fim:    form.querySelector('#m-fim').value,
          qtd_participantes_esperados: +form.querySelector('#m-qtd').value,
        });
        window.toast('Evento criado com sucesso!');
        window.closeModal();
        loadData();
      } catch (err) { window.toast(err.message, 'error'); }
    });
  }

  function openEdit(ev) {
    window.openModal('Editar Evento', formHtml(ev), async (form) => {
      try {
        await api.eventos.update(ev.id_evento, {
          id_tipo_evento: +form.querySelector('#m-tipo').value,
          id_local:       +form.querySelector('#m-local').value,
          dt_hr_prog_inicio: form.querySelector('#m-ini').value,
          dt_hr_prog_fim:    form.querySelector('#m-fim').value,
          qtd_participantes_esperados: +form.querySelector('#m-qtd').value,
        });
        window.toast('Evento atualizado!');
        window.closeModal();
        loadData();
      } catch (err) { window.toast(err.message, 'error'); }
    });
  }

  container.innerHTML = `
    <div class="page-header">
      <h1>Eventos <small id="evento-count"></small></h1>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-novo">+ Novo Evento</button>
      </div>
    </div>
    <div class="filter-bar">
      <label>Tipo<select id="filter-tipo" style="min-width:160px"></select></label>
      <label>Local<select id="filter-local" style="min-width:140px"></select></label>
      <label>A partir de<input type="date" id="filter-ini"></label>
      <label>Até<input type="date" id="filter-fim"></label>
      <button class="btn btn-secondary" id="btn-filtrar">Filtrar</button>
      <button class="btn btn-ghost btn-sm" id="btn-limpar">Limpar</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Tipo / Local</th>
          <th>Programado</th>
          <th>Efetivo</th>
          <th style="text-align:center">Qtd.</th>
          <th>Status</th>
          <th>Ações</th>
        </tr></thead>
        <tbody id="eventos-tbody"></tbody>
      </table>
    </div>
  `;

  await loadFilters();
  document.getElementById('filter-tipo').innerHTML  = tipoOpts();
  document.getElementById('filter-local').innerHTML = localOpts();
  document.getElementById('btn-novo').onclick    = openCreate;
  document.getElementById('btn-filtrar').onclick = loadData;
  document.getElementById('btn-limpar').onclick  = () => {
    document.getElementById('filter-tipo').value  = '';
    document.getElementById('filter-local').value = '';
    document.getElementById('filter-ini').value   = '';
    document.getElementById('filter-fim').value   = '';
    loadData();
  };
  loadData();
}
