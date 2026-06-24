import { api } from '../api.js';

function fmtDt(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('pt-BR');
}

function toDatetimeLocal(s) {
  if (!s) return '';
  const d = new Date(s);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function mount(container) {
  let tipos = [], locais = [], eventos = [];

  async function loadFilters() {
    [tipos, locais] = await Promise.all([api.tipos.list(), api.locais.list()]);
  }

  function tipoOpts(sel = '') {
    return `<option value="">Todos</option>` +
      tipos.map(t => `<option value="${t.id_tipo_evento}" ${sel == t.id_tipo_evento ? 'selected' : ''}>${t.descricao}</option>`).join('');
  }

  function localOpts(sel = '') {
    return `<option value="">Todos</option>` +
      locais.map(l => `<option value="${l.id_local}" ${sel == l.id_local ? 'selected' : ''}>${l.nome}</option>`).join('');
  }

  function renderTable(list) {
    const tbody = document.getElementById('eventos-tbody');
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-state">Nenhum registro encontrado.</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(e => {
      const started = !!e.dt_hr_efet_inicio;
      const ended = !!e.dt_hr_efet_fim;
      return `<tr>
        <td>${e.id_evento}</td>
        <td>${e.tipo_evento?.descricao || '—'}</td>
        <td>${e.local?.nome || '—'}</td>
        <td>${fmtDt(e.dt_hr_prog_inicio)}</td>
        <td>${fmtDt(e.dt_hr_prog_fim)}</td>
        <td>${fmtDt(e.dt_hr_efet_inicio)}</td>
        <td>${fmtDt(e.dt_hr_efet_fim)}</td>
        <td>${e.qtd_participantes_esperados}</td>
        <td><div class="actions-cell">
          <button class="btn btn-secondary btn-sm" data-edit="${e.id_evento}">Editar</button>
          <button class="btn btn-danger btn-sm" data-del="${e.id_evento}">Excluir</button>
          ${!started ? `<button class="btn btn-secondary btn-sm" data-iniciar="${e.id_evento}">Iniciar</button>` : ''}
          ${started && !ended ? `<button class="btn btn-secondary btn-sm" data-finalizar="${e.id_evento}">Finalizar</button>` : ''}
          <button class="btn btn-secondary btn-sm" data-escala="${e.id_evento}">Escala</button>
        </div></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-del]').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Excluir evento?')) return;
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
    const tipo = document.getElementById('filter-tipo')?.value;
    const local = document.getElementById('filter-local')?.value;
    const ini = document.getElementById('filter-ini')?.value;
    const fim = document.getElementById('filter-fim')?.value;
    if (tipo) params.id_tipo_evento = tipo;
    if (local) params.id_local = local;
    if (ini) params.data_inicio = ini;
    if (fim) params.data_fim = fim;
    document.getElementById('eventos-tbody').innerHTML = `<tr><td colspan="9" class="loading"><span class="spinner"></span></td></tr>`;
    try {
      eventos = await api.eventos.list(Object.keys(params).length ? params : undefined);
      renderTable(eventos);
    } catch (err) {
      window.toast(err.message, 'error');
    }
  }

  function openCreate() {
    const html = `<form>
      <div class="form-group"><label>Tipo de Evento</label>
        <select id="m-tipo" required><option value="">Selecione...</option>${tipos.map(t => `<option value="${t.id_tipo_evento}">${t.descricao}</option>`).join('')}</select></div>
      <div class="form-group"><label>Local</label>
        <select id="m-local" required><option value="">Selecione...</option>${locais.map(l => `<option value="${l.id_local}">${l.nome}</option>`).join('')}</select></div>
      <div class="form-group"><label>Início Programado</label><input type="datetime-local" id="m-ini" required></div>
      <div class="form-group"><label>Fim Programado</label><input type="datetime-local" id="m-fim" required></div>
      <div class="form-group"><label>Qtd. Participantes Esperados</label><input type="number" id="m-qtd" value="0" min="0"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>`;
    window.openModal('Novo Evento', html, async (form) => {
      try {
        await api.eventos.create({
          id_tipo_evento: +form.querySelector('#m-tipo').value,
          id_local: +form.querySelector('#m-local').value,
          dt_hr_prog_inicio: form.querySelector('#m-ini').value,
          dt_hr_prog_fim: form.querySelector('#m-fim').value,
          qtd_participantes_esperados: +form.querySelector('#m-qtd').value,
        });
        window.toast('Evento criado');
        window.closeModal();
        loadData();
      } catch (err) { window.toast(err.message, 'error'); }
    });
  }

  function openEdit(ev) {
    const html = `<form>
      <div class="form-group"><label>Tipo de Evento</label>
        <select id="m-tipo" required>${tipos.map(t => `<option value="${t.id_tipo_evento}" ${t.id_tipo_evento == ev.id_tipo_evento ? 'selected' : ''}>${t.descricao}</option>`).join('')}</select></div>
      <div class="form-group"><label>Local</label>
        <select id="m-local" required>${locais.map(l => `<option value="${l.id_local}" ${l.id_local == ev.id_local ? 'selected' : ''}>${l.nome}</option>`).join('')}</select></div>
      <div class="form-group"><label>Início Programado</label><input type="datetime-local" id="m-ini" value="${toDatetimeLocal(ev.dt_hr_prog_inicio)}" required></div>
      <div class="form-group"><label>Fim Programado</label><input type="datetime-local" id="m-fim" value="${toDatetimeLocal(ev.dt_hr_prog_fim)}" required></div>
      <div class="form-group"><label>Qtd. Participantes Esperados</label><input type="number" id="m-qtd" value="${ev.qtd_participantes_esperados}" min="0"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>`;
    window.openModal('Editar Evento', html, async (form) => {
      try {
        await api.eventos.update(ev.id_evento, {
          id_tipo_evento: +form.querySelector('#m-tipo').value,
          id_local: +form.querySelector('#m-local').value,
          dt_hr_prog_inicio: form.querySelector('#m-ini').value,
          dt_hr_prog_fim: form.querySelector('#m-fim').value,
          qtd_participantes_esperados: +form.querySelector('#m-qtd').value,
        });
        window.toast('Evento atualizado');
        window.closeModal();
        loadData();
      } catch (err) { window.toast(err.message, 'error'); }
    });
  }

  container.innerHTML = `
    <div class="page-header">
      <h1>📅 Eventos</h1>
      <div class="page-actions"><button class="btn btn-primary" id="btn-novo">+ Novo Evento</button></div>
    </div>
    <div class="filter-bar">
      <label>Tipo de Evento<select id="filter-tipo">${tipoOpts()}</select></label>
      <label>Local<select id="filter-local">${localOpts()}</select></label>
      <label>Início (de)<input type="date" id="filter-ini"></label>
      <label>Início (até)<input type="date" id="filter-fim"></label>
      <button class="btn btn-secondary" id="btn-filtrar">Filtrar</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>ID</th><th>Tipo</th><th>Local</th>
          <th>Início Prog.</th><th>Fim Prog.</th>
          <th>Início Efet.</th><th>Fim Efet.</th>
          <th>Qtd. Esp.</th><th>Ações</th>
        </tr></thead>
        <tbody id="eventos-tbody"></tbody>
      </table>
    </div>
  `;

  await loadFilters();
  document.getElementById('filter-tipo').innerHTML = tipoOpts();
  document.getElementById('filter-local').innerHTML = localOpts();
  document.getElementById('btn-novo').onclick = openCreate;
  document.getElementById('btn-filtrar').onclick = loadData;
  loadData();
}
