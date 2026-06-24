import { api } from '../api.js';

export async function mount(container) {
  async function loadData() {
    const tbody = document.getElementById('hab-tbody');
    tbody.innerHTML = `<tr><td colspan="3" class="loading"><span class="spinner"></span></td></tr>`;
    try {
      const list = await api.habilidades.list();
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="3" class="empty-state">Nenhum registro encontrado.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(h => `<tr>
        <td>${h.id_habilidade}</td>
        <td>${h.descricao}</td>
        <td><div class="actions-cell">
          <button class="btn btn-secondary btn-sm" data-edit="${h.id_habilidade}" data-desc="${h.descricao}">Editar</button>
          <button class="btn btn-danger btn-sm" data-del="${h.id_habilidade}">Excluir</button>
        </div></td>
      </tr>`).join('');

      tbody.querySelectorAll('[data-del]').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Excluir habilidade?')) return;
          try { await api.habilidades.remove(+btn.dataset.del); window.toast('Habilidade excluída'); loadData(); }
          catch (err) { window.toast(err.message, 'error'); }
        };
      });

      tbody.querySelectorAll('[data-edit]').forEach(btn => {
        btn.onclick = () => openEdit(+btn.dataset.edit, btn.dataset.desc);
      });
    } catch (err) { window.toast(err.message, 'error'); }
  }

  function openCreate() {
    const html = `<form>
      <div class="form-group"><label>Descrição</label><input type="text" id="m-desc" required></div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>`;
    window.openModal('Nova Habilidade', html, async (form) => {
      try {
        await api.habilidades.create({ descricao: form.querySelector('#m-desc').value });
        window.toast('Habilidade criada');
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
    window.openModal('Editar Habilidade', html, async (form) => {
      try {
        await api.habilidades.update(id, { descricao: form.querySelector('#m-desc').value });
        window.toast('Habilidade atualizada');
        window.closeModal();
        loadData();
      } catch (err) { window.toast(err.message, 'error'); }
    });
  }

  container.innerHTML = `
    <div class="page-header">
      <h1>⭐ Habilidades</h1>
      <div class="page-actions"><button class="btn btn-primary" id="btn-novo">+ Nova Habilidade</button></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Descrição</th><th>Ações</th></tr></thead>
        <tbody id="hab-tbody"></tbody>
      </table>
    </div>
  `;

  document.getElementById('btn-novo').onclick = openCreate;
  loadData();
}
