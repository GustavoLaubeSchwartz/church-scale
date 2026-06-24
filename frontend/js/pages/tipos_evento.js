import { api } from '../api.js';

export async function mount(container) {
  let habilidades = [];

  async function loadAux() {
    habilidades = await api.habilidades.list();
  }

  async function loadData() {
    const tbody = document.getElementById('tipo-tbody');
    tbody.innerHTML = `<tr><td colspan="3" class="loading"><span class="spinner"></span></td></tr>`;
    try {
      const list = await api.tipos.list();
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="3" class="empty-state">Nenhum registro encontrado.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(t => `<tr>
        <td>${t.id_tipo_evento}</td>
        <td>${t.descricao}</td>
        <td><div class="actions-cell">
          <button class="btn btn-secondary btn-sm" data-habs="${t.id_tipo_evento}" data-desc="${t.descricao}">Habilidades</button>
          <button class="btn btn-secondary btn-sm" data-edit="${t.id_tipo_evento}" data-desc="${t.descricao}">Editar</button>
          <button class="btn btn-danger btn-sm" data-del="${t.id_tipo_evento}">Excluir</button>
        </div></td>
      </tr>`).join('');

      tbody.querySelectorAll('[data-del]').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Excluir tipo de evento?')) return;
          try { await api.tipos.remove(+btn.dataset.del); window.toast('Tipo excluído'); loadData(); }
          catch (err) { window.toast(err.message, 'error'); }
        };
      });
      tbody.querySelectorAll('[data-edit]').forEach(btn => {
        btn.onclick = () => openEdit(+btn.dataset.edit, btn.dataset.desc);
      });
      tbody.querySelectorAll('[data-habs]').forEach(btn => {
        btn.onclick = () => openHabilidades(+btn.dataset.habs, btn.dataset.desc);
      });
    } catch (err) { window.toast(err.message, 'error'); }
  }

  async function openHabilidades(id, desc) {
    window.openModal(`Habilidades Necessárias — ${desc}`, '<div class="loading"><span class="spinner"></span></div>', null);
    try {
      const necessidades = await api.tipos.listHabilidades(id);
      const usedIds = necessidades.map(n => n.id_habilidade);
      const disponiveis = habilidades.filter(h => !usedIds.includes(h.id_habilidade));

      const html = `
        <div class="table-wrap" style="margin-bottom:16px">
          <table>
            <thead><tr><th>Habilidade</th><th>Qtd. Mínima</th><th></th></tr></thead>
            <tbody>
              ${necessidades.length ? necessidades.map(n => `<tr>
                <td>${n.descricao}</td>
                <td>
                  <input type="number" class="qtd-input" data-id="${n.id_habilidade}"
                    value="${n.qtd}" min="1" style="width:60px;padding:4px;background:var(--surface-2);border:1px solid var(--border);border-radius:4px;color:var(--text)">
                  <button class="btn btn-secondary btn-sm btn-save-qtd" data-id="${n.id_habilidade}" style="margin-left:4px">✓</button>
                </td>
                <td><button class="btn btn-danger btn-sm" data-rem="${n.id_habilidade}">—</button></td>
              </tr>`).join('') : `<tr><td colspan="3" class="empty-state">Nenhuma habilidade necessária.</td></tr>`}
            </tbody>
          </table>
        </div>
        ${disponiveis.length ? `<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
          <div style="display:flex;flex-direction:column;gap:4px;flex:1">
            <label style="font-size:.72rem;color:var(--text-muted)">Habilidade</label>
            <select id="sel-hab" style="padding:7px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text)">
              ${disponiveis.map(h => `<option value="${h.id_habilidade}">${h.descricao}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            <label style="font-size:.72rem;color:var(--text-muted)">Qtd.</label>
            <input type="number" id="inp-qtd" value="1" min="1" style="width:60px;padding:7px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text)">
          </div>
          <button class="btn btn-primary btn-sm" id="btn-add-hab" style="align-self:flex-end">+ Adicionar</button>
        </div>` : '<p style="color:var(--text-muted);font-size:.82rem">Todas as habilidades já adicionadas.</p>'}
      `;
      document.getElementById('modal-body').innerHTML = html;

      document.querySelectorAll('[data-rem]').forEach(b => {
        b.onclick = async () => {
          try { await api.tipos.removeHabilidade(id, +b.dataset.rem); openHabilidades(id, desc); }
          catch (err) { window.toast(err.message, 'error'); }
        };
      });

      document.querySelectorAll('.btn-save-qtd').forEach(b => {
        b.onclick = async () => {
          const qtd = +document.querySelector(`.qtd-input[data-id="${b.dataset.id}"]`).value;
          try {
            await api.tipos.updateHabilidade(id, +b.dataset.id, { qtd });
            window.toast('Quantidade atualizada');
            openHabilidades(id, desc);
          } catch (err) { window.toast(err.message, 'error'); }
        };
      });

      const btnAdd = document.getElementById('btn-add-hab');
      if (btnAdd) {
        btnAdd.onclick = async () => {
          const id_hab = +document.getElementById('sel-hab').value;
          const qtd = +document.getElementById('inp-qtd').value;
          try { await api.tipos.addHabilidade(id, { id_habilidade: id_hab, qtd }); window.toast('Habilidade adicionada'); openHabilidades(id, desc); }
          catch (err) { window.toast(err.message, 'error'); }
        };
      }
    } catch (err) { window.toast(err.message, 'error'); window.closeModal(); }
  }

  function openCreate() {
    const html = `<form>
      <div class="form-group"><label>Descrição</label><input type="text" id="m-desc" required></div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>`;
    window.openModal('Novo Tipo de Evento', html, async (form) => {
      try {
        await api.tipos.create({ descricao: form.querySelector('#m-desc').value });
        window.toast('Tipo criado');
        window.closeModal();
        loadData();
      } catch (err) { window.toast(err.message, 'error'); }
    });
  }

  function openEdit(id, desc) {
    const html = `<form>
      <div class="form-group"><label>Descrição</label><input type="text" id="m-desc" value="${desc}" required></div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>`;
    window.openModal('Editar Tipo de Evento', html, async (form) => {
      try {
        await api.tipos.update(id, { descricao: form.querySelector('#m-desc').value });
        window.toast('Tipo atualizado');
        window.closeModal();
        loadData();
      } catch (err) { window.toast(err.message, 'error'); }
    });
  }

  container.innerHTML = `
    <div class="page-header">
      <h1>🎯 Tipos de Evento</h1>
      <div class="page-actions"><button class="btn btn-primary" id="btn-novo">+ Novo Tipo</button></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Descrição</th><th>Ações</th></tr></thead>
        <tbody id="tipo-tbody"></tbody>
      </table>
    </div>
  `;

  await loadAux();
  document.getElementById('btn-novo').onclick = openCreate;
  loadData();
}
