import { api } from '../api.js';

export async function mount(container) {
  async function loadData() {
    const tbody = document.getElementById('local-tbody');
    tbody.innerHTML = `<tr><td colspan="4" class="loading"><span class="spinner"></span></td></tr>`;
    try {
      const list = await api.locais.list();
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Nenhum registro encontrado.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(l => `<tr>
        <td>${l.id_local}</td>
        <td>${l.nome}</td>
        <td>${l.capacidade_maxima}</td>
        <td><div class="actions-cell">
          <button class="btn btn-secondary btn-sm" data-tipos="${l.id_local}" data-nome="${l.nome}">Tipos Habilitados</button>
          <button class="btn btn-secondary btn-sm" data-edit='${JSON.stringify({id: l.id_local, nome: l.nome, cap: l.capacidade_maxima})}'>Editar</button>
          <button class="btn btn-danger btn-sm" data-del="${l.id_local}">Excluir</button>
        </div></td>
      </tr>`).join('');

      tbody.querySelectorAll('[data-del]').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Excluir local?')) return;
          try { await api.locais.remove(+btn.dataset.del); window.toast('Local excluído'); loadData(); }
          catch (err) { window.toast(err.message, 'error'); }
        };
      });
      tbody.querySelectorAll('[data-edit]').forEach(btn => {
        btn.onclick = () => { const d = JSON.parse(btn.dataset.edit); openEdit(d.id, d.nome, d.cap); };
      });
      tbody.querySelectorAll('[data-tipos]').forEach(btn => {
        btn.onclick = () => openTipos(+btn.dataset.tipos, btn.dataset.nome);
      });
    } catch (err) { window.toast(err.message, 'error'); }
  }

  async function openTipos(id, nome) {
    window.openModal(`Tipos Habilitados — ${nome}`, '<div class="loading"><span class="spinner"></span></div>', null);
    try {
      const [habilitados, todos] = await Promise.all([api.locais.listTipos(id), api.tipos.list()]);
      const disponiveis = todos.filter(t => !habilitados.find(h => h.id_tipo_evento === t.id_tipo_evento));
      const html = `
        <ul style="margin-bottom:16px">
          ${habilitados.length ? habilitados.map(t => `<li style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
            <span>${t.descricao}</span>
            <button class="btn btn-danger btn-sm" data-rem="${t.id_tipo_evento}">—</button>
          </li>`).join('') : '<li style="color:var(--text-muted)">Nenhum tipo habilitado.</li>'}
        </ul>
        ${disponiveis.length ? `<div style="display:flex;gap:8px">
          <select id="sel-tipo" style="flex:1;padding:7px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text)">
            ${disponiveis.map(t => `<option value="${t.id_tipo_evento}">${t.descricao}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm" id="btn-add-tipo">+ Adicionar</button>
        </div>` : '<p style="color:var(--text-muted);font-size:.82rem">Todos os tipos já habilitados.</p>'}
      `;
      document.getElementById('modal-body').innerHTML = html;

      document.querySelectorAll('[data-rem]').forEach(b => {
        b.onclick = async () => {
          try { await api.locais.removeTipo(id, +b.dataset.rem); openTipos(id, nome); }
          catch (err) { window.toast(err.message, 'error'); }
        };
      });
      const btnAdd = document.getElementById('btn-add-tipo');
      if (btnAdd) {
        btnAdd.onclick = async () => {
          const tid = +document.getElementById('sel-tipo').value;
          try { await api.locais.addTipo(id, tid); window.toast('Tipo habilitado'); openTipos(id, nome); }
          catch (err) { window.toast(err.message, 'error'); }
        };
      }
    } catch (err) { window.toast(err.message, 'error'); window.closeModal(); }
  }

  function openCreate() {
    const html = `<form>
      <div class="form-group"><label>Nome</label><input type="text" id="m-nome" required></div>
      <div class="form-group"><label>Capacidade Máxima</label><input type="number" id="m-cap" value="100" min="1" required></div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>`;
    window.openModal('Novo Local', html, async (form) => {
      try {
        await api.locais.create({
          nome: form.querySelector('#m-nome').value,
          capacidade_maxima: +form.querySelector('#m-cap').value,
        });
        window.toast('Local criado');
        window.closeModal();
        loadData();
      } catch (err) { window.toast(err.message, 'error'); }
    });
  }

  function openEdit(id, nome, cap) {
    const html = `<form>
      <div class="form-group"><label>Nome</label><input type="text" id="m-nome" value="${nome}" required></div>
      <div class="form-group"><label>Capacidade Máxima</label><input type="number" id="m-cap" value="${cap}" min="1" required></div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>`;
    window.openModal('Editar Local', html, async (form) => {
      try {
        await api.locais.update(id, {
          nome: form.querySelector('#m-nome').value,
          capacidade_maxima: +form.querySelector('#m-cap').value,
        });
        window.toast('Local atualizado');
        window.closeModal();
        loadData();
      } catch (err) { window.toast(err.message, 'error'); }
    });
  }

  container.innerHTML = `
    <div class="page-header">
      <h1>📍 Locais</h1>
      <div class="page-actions"><button class="btn btn-primary" id="btn-novo">+ Novo Local</button></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Nome</th><th>Capacidade Máx.</th><th>Ações</th></tr></thead>
        <tbody id="local-tbody"></tbody>
      </table>
    </div>
  `;

  document.getElementById('btn-novo').onclick = openCreate;
  loadData();
}
