import { api } from '../api.js';

function fmtDate(s) { return s ? new Date(s + 'T00:00:00').toLocaleDateString('pt-BR') : '—'; }

export async function mount(container) {
  let tab = 'membro';
  let habilidades = [], ministerios = [];

  async function loadAux() {
    [habilidades, ministerios] = await Promise.all([api.habilidades.list(), api.ministerios.list()]);
  }

  function renderMembros(list) {
    if (!list.length) return `<tr><td colspan="6" class="empty-state">Nenhum registro encontrado.</td></tr>`;
    return list.map(p => `<tr>
      <td>${p.cpf}</td>
      <td>${p.nome}</td>
      <td>${fmtDate(p.data_nascimento)}</td>
      <td>${p.numero_celular || '—'}</td>
      <td>${p.nome_celula || '—'}</td>
      <td><div class="actions-cell">
        <button class="btn btn-secondary btn-sm" data-detalhe="${p.cpf}">Detalhes</button>
        <button class="btn btn-danger btn-sm" data-del="${p.cpf}">Excluir</button>
      </div></td>
    </tr>`).join('');
  }

  function renderVisitantes(list) {
    if (!list.length) return `<tr><td colspan="6" class="empty-state">Nenhum registro encontrado.</td></tr>`;
    return list.map(p => `<tr>
      <td>${p.cpf}</td>
      <td>${p.nome}</td>
      <td>${fmtDate(p.data_nascimento)}</td>
      <td>${p.numero_celular || '—'}</td>
      <td><span class="badge ${p.batizado ? 'badge-success' : 'badge-muted'}">${p.batizado ? 'Sim' : 'Não'}</span></td>
      <td><div class="actions-cell">
        <button class="btn btn-secondary btn-sm" data-detalhe="${p.cpf}">Detalhes</button>
        <button class="btn btn-danger btn-sm" data-del="${p.cpf}">Excluir</button>
      </div></td>
    </tr>`).join('');
  }

  async function loadData() {
    const tbody = document.getElementById('pessoas-tbody');
    tbody.innerHTML = `<tr><td colspan="6" class="loading"><span class="spinner"></span></td></tr>`;
    try {
      const list = await api.pessoas.list(tab);
      if (tab === 'membro') {
        tbody.innerHTML = renderMembros(list);
      } else {
        tbody.innerHTML = renderVisitantes(list);
      }
      bindActions(tbody);
    } catch (err) {
      window.toast(err.message, 'error');
    }
  }

  function bindActions(tbody) {
    tbody.querySelectorAll('[data-del]').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Excluir pessoa?')) return;
        try { await api.pessoas.remove(btn.dataset.del); window.toast('Pessoa excluída'); loadData(); }
        catch (err) { window.toast(err.message, 'error'); }
      };
    });
    tbody.querySelectorAll('[data-detalhe]').forEach(btn => {
      btn.onclick = () => openDetalhes(btn.dataset.detalhe);
    });
  }

  async function openDetalhes(cpf) {
    window.openModal('Carregando...', '<div class="loading"><span class="spinner"></span></div>', null);
    try {
      const [habs, mins] = await Promise.all([
        api.pessoas.listHabilidades(cpf),
        api.pessoas.listMinisterios(cpf),
      ]);
      const habOpts = habilidades.filter(h => !habs.find(x => x.id_habilidade === h.id_habilidade));
      const minOpts = ministerios.filter(m => !mins.find(x => x.id_ministerio === m.id_ministerio));

      const html = `
        <h3 style="margin-bottom:12px;font-family:Georgia,serif">Habilidades</h3>
        <ul style="margin-bottom:16px">
          ${habs.length ? habs.map(h => `<li style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
            <span>${h.descricao}</span>
            <button class="btn btn-danger btn-sm" data-rem-hab="${h.id_habilidade}" data-cpf="${cpf}">—</button>
          </li>`).join('') : '<li style="color:var(--text-muted)">Nenhuma</li>'}
        </ul>
        ${habOpts.length ? `<div style="display:flex;gap:8px;margin-bottom:20px">
          <select id="sel-hab" style="flex:1;padding:7px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text)">
            ${habOpts.map(h => `<option value="${h.id_habilidade}">${h.descricao}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm" id="btn-add-hab" data-cpf="${cpf}">+ Adicionar</button>
        </div>` : ''}
        <h3 style="margin-bottom:12px;font-family:Georgia,serif">Ministérios</h3>
        <ul>
          ${mins.length ? mins.map(m => `<li style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
            <span>${m.nome}</span>
            <button class="btn btn-danger btn-sm" data-rem-min="${m.id_ministerio}" data-cpf="${cpf}">—</button>
          </li>`).join('') : '<li style="color:var(--text-muted)">Nenhum</li>'}
        </ul>
        ${minOpts.length ? `<div style="display:flex;gap:8px;margin-top:12px">
          <select id="sel-min" style="flex:1;padding:7px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text)">
            ${minOpts.map(m => `<option value="${m.id_ministerio}">${m.nome}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm" id="btn-add-min" data-cpf="${cpf}">+ Adicionar</button>
        </div>` : ''}
      `;
      document.getElementById('modal-title').textContent = `Pessoa: ${cpf}`;
      document.getElementById('modal-body').innerHTML = html;

      document.querySelectorAll('[data-rem-hab]').forEach(b => {
        b.onclick = async () => {
          try { await api.pessoas.removeHabilidade(b.dataset.cpf, +b.dataset.remHab); openDetalhes(cpf); }
          catch (err) { window.toast(err.message, 'error'); }
        };
      });
      document.querySelectorAll('[data-rem-min]').forEach(b => {
        b.onclick = async () => {
          try { await api.pessoas.removeMinisterio(b.dataset.cpf, +b.dataset.remMin); openDetalhes(cpf); }
          catch (err) { window.toast(err.message, 'error'); }
        };
      });
      const btnAddHab = document.getElementById('btn-add-hab');
      if (btnAddHab) {
        btnAddHab.onclick = async () => {
          const id = +document.getElementById('sel-hab').value;
          try { await api.pessoas.addHabilidade(cpf, id); window.toast('Habilidade adicionada'); openDetalhes(cpf); }
          catch (err) { window.toast(err.message, 'error'); }
        };
      }
      const btnAddMin = document.getElementById('btn-add-min');
      if (btnAddMin) {
        btnAddMin.onclick = async () => {
          const id = +document.getElementById('sel-min').value;
          try { await api.pessoas.addMinisterio(cpf, id); window.toast('Ministério adicionado'); openDetalhes(cpf); }
          catch (err) { window.toast(err.message, 'error'); }
        };
      }
    } catch (err) {
      window.toast(err.message, 'error');
      window.closeModal();
    }
  }

  function openNovoMembro() {
    const html = `<form>
      <div class="form-group"><label>CPF (11 dígitos)</label><input type="text" id="m-cpf" required maxlength="11" pattern="\\d{11}"></div>
      <div class="form-group"><label>Nome</label><input type="text" id="m-nome" required></div>
      <div class="form-group"><label>Data de Nascimento</label><input type="date" id="m-nasc"></div>
      <div class="form-group"><label>Celular</label><input type="text" id="m-cel"></div>
      <div class="form-group"><label>Nome da Célula</label><input type="text" id="m-celula"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>`;
    window.openModal('Novo Membro', html, async (form) => {
      try {
        await api.pessoas.createMembro({
          cpf: form.querySelector('#m-cpf').value,
          nome: form.querySelector('#m-nome').value,
          data_nascimento: form.querySelector('#m-nasc').value || null,
          numero_celular: form.querySelector('#m-cel').value || null,
          nome_celula: form.querySelector('#m-celula').value || null,
        });
        window.toast('Membro cadastrado');
        window.closeModal();
        loadData();
      } catch (err) { window.toast(err.message, 'error'); }
    });
  }

  function openNovoVisitante() {
    const html = `<form>
      <div class="form-group"><label>CPF (11 dígitos)</label><input type="text" id="m-cpf" required maxlength="11" pattern="\\d{11}"></div>
      <div class="form-group"><label>Nome</label><input type="text" id="m-nome" required></div>
      <div class="form-group"><label>Data de Nascimento</label><input type="date" id="m-nasc"></div>
      <div class="form-group"><label>Celular</label><input type="text" id="m-cel"></div>
      <div class="form-group"><label>Tempo de Pastoreio</label><input type="text" id="m-pastor" placeholder="ex: 6 meses"></div>
      <div class="form-group"><label>CPF de Quem Convidou</label><input type="text" id="m-conv" maxlength="11"></div>
      <div class="form-group"><div class="checkbox-row"><input type="checkbox" id="m-batizado"><label for="m-batizado" style="text-transform:none;font-size:.88rem">Batizado</label></div></div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>`;
    window.openModal('Novo Visitante', html, async (form) => {
      try {
        await api.pessoas.createVisitante({
          cpf: form.querySelector('#m-cpf').value,
          nome: form.querySelector('#m-nome').value,
          data_nascimento: form.querySelector('#m-nasc').value || null,
          numero_celular: form.querySelector('#m-cel').value || null,
          batizado: form.querySelector('#m-batizado').checked,
          quanto_tempo_pastoreio: form.querySelector('#m-pastor').value || null,
          cpf_quem_convidou: form.querySelector('#m-conv').value || null,
        });
        window.toast('Visitante cadastrado');
        window.closeModal();
        loadData();
      } catch (err) { window.toast(err.message, 'error'); }
    });
  }

  function getHeaders() {
    return tab === 'membro'
      ? `<th>CPF</th><th>Nome</th><th>Nasc.</th><th>Celular</th><th>Célula</th><th>Ações</th>`
      : `<th>CPF</th><th>Nome</th><th>Nasc.</th><th>Celular</th><th>Batizado</th><th>Ações</th>`;
  }

  container.innerHTML = `
    <div class="page-header">
      <h1>👥 Pessoas</h1>
      <div class="page-actions" id="tab-actions">
        <button class="btn btn-primary" id="btn-novo-membro">+ Novo Membro</button>
      </div>
    </div>
    <div class="tabs">
      <button class="tab-btn active" data-tab="membro">Membros</button>
      <button class="tab-btn" data-tab="visitante">Visitantes</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr id="pessoas-head">${getHeaders()}</tr></thead>
        <tbody id="pessoas-tbody"></tbody>
      </table>
    </div>
  `;

  await loadAux();

  document.getElementById('btn-novo-membro').onclick = openNovoMembro;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('pessoas-head').innerHTML = getHeaders();
      const actions = document.getElementById('tab-actions');
      if (tab === 'membro') {
        actions.innerHTML = `<button class="btn btn-primary" id="btn-novo-membro">+ Novo Membro</button>`;
        document.getElementById('btn-novo-membro').onclick = openNovoMembro;
      } else {
        actions.innerHTML = `<button class="btn btn-primary" id="btn-novo-visitante">+ Novo Visitante</button>`;
        document.getElementById('btn-novo-visitante').onclick = openNovoVisitante;
      }
      loadData();
    };
  });

  loadData();
}
