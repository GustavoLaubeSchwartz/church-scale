import { api } from '../api.js';

function fmtDt(s) { return s ? new Date(s).toLocaleString('pt-BR') : '—'; }

export async function mount(container) {
  let eventos = [], pessoas = [], habilidades = [], ministerios = [];
  let filterEvento = sessionStorage.getItem('filter_evento') || '';
  sessionStorage.removeItem('filter_evento');

  async function loadAux() {
    [eventos, pessoas, habilidades, ministerios] = await Promise.all([
      api.eventos.list(),
      api.pessoas.list(),
      api.habilidades.list(),
      api.ministerios.list(),
    ]);
  }

  function eventoLabel(e) {
    return `#${e.id_evento} — ${e.tipo_evento?.descricao || '?'} (${fmtDt(e.dt_hr_prog_inicio)})`;
  }

  function eventoOpts(sel = '') {
    return `<option value="">Todos</option>` +
      eventos.map(e => `<option value="${e.id_evento}" ${sel == e.id_evento ? 'selected' : ''}>${eventoLabel(e)}</option>`).join('');
  }

  async function loadData() {
    const tbody = document.getElementById('aloc-tbody');
    tbody.innerHTML = `<tr><td colspan="6" class="loading"><span class="spinner"></span></td></tr>`;
    const params = {};
    const ev = document.getElementById('filter-evento')?.value;
    if (ev) params.id_evento = ev;
    try {
      const list = await api.alocacoes.list(Object.keys(params).length ? params : undefined);
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Nenhum registro encontrado.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(a => {
        const ev = eventos.find(e => e.id_evento === a.id_evento);
        const pessoa = pessoas.find(p => p.cpf === a.cpf_pessoa);
        const hab = habilidades.find(h => h.id_habilidade === a.id_habilidade);
        const min = ministerios.find(m => m.id_ministerio === a.id_ministerio);
        return `<tr>
          <td>${a.id_alocacao}</td>
          <td>${ev ? `#${ev.id_evento} ${ev.tipo_evento?.descricao || ''}` : a.id_evento}</td>
          <td>${pessoa ? pessoa.nome : a.cpf_pessoa}</td>
          <td>${hab ? hab.descricao : a.id_habilidade}</td>
          <td>${min ? min.nome : a.id_ministerio}</td>
          <td><button class="btn btn-danger btn-sm" data-del="${a.id_alocacao}">Remover</button></td>
        </tr>`;
      }).join('');

      tbody.querySelectorAll('[data-del]').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Remover alocação?')) return;
          try { await api.alocacoes.remove(+btn.dataset.del); window.toast('Alocação removida'); loadData(); }
          catch (err) { window.toast(err.message, 'error'); }
        };
      });
    } catch (err) { window.toast(err.message, 'error'); }
  }

  function openCreate() {
    const html = `<form>
      <div class="form-group"><label>Evento</label>
        <select id="m-evento" required>
          <option value="">Selecione...</option>
          ${eventos.map(e => `<option value="${e.id_evento}">${eventoLabel(e)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Pessoa (CPF)</label>
        <select id="m-pessoa" required>
          <option value="">Selecione...</option>
          ${pessoas.map(p => `<option value="${p.cpf}">${p.nome} (${p.cpf})</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Habilidade</label>
        <select id="m-hab" required>
          <option value="">Selecione...</option>
          ${habilidades.map(h => `<option value="${h.id_habilidade}">${h.descricao}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Ministério</label>
        <select id="m-min" required>
          <option value="">Selecione...</option>
          ${ministerios.map(m => `<option value="${m.id_ministerio}">${m.nome}</option>`).join('')}
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>`;
    window.openModal('Nova Alocação', html, async (form) => {
      try {
        await api.alocacoes.create({
          id_evento: +form.querySelector('#m-evento').value,
          cpf_pessoa: form.querySelector('#m-pessoa').value,
          id_habilidade: +form.querySelector('#m-hab').value,
          id_ministerio: +form.querySelector('#m-min').value,
        });
        window.toast('Alocação criada');
        window.closeModal();
        loadData();
      } catch (err) { window.toast(err.message, 'error'); }
    });
  }

  container.innerHTML = `
    <div class="page-header">
      <h1>📋 Alocações</h1>
      <div class="page-actions"><button class="btn btn-primary" id="btn-novo">+ Nova Alocação</button></div>
    </div>
    <div class="filter-bar">
      <label>Filtrar por Evento<select id="filter-evento"></select></label>
      <button class="btn btn-secondary" id="btn-filtrar">Filtrar</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Evento</th><th>Pessoa</th><th>Habilidade</th><th>Ministério</th><th>Ações</th></tr></thead>
        <tbody id="aloc-tbody"></tbody>
      </table>
    </div>
  `;

  await loadAux();
  const selEvento = document.getElementById('filter-evento');
  selEvento.innerHTML = eventoOpts(filterEvento);
  document.getElementById('btn-novo').onclick = openCreate;
  document.getElementById('btn-filtrar').onclick = loadData;
  loadData();
}
