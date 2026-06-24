import { api } from '../api.js';

function fmtDate(s) { return s ? new Date(s + 'T00:00:00').toLocaleDateString('pt-BR') : '—'; }

export async function mount(container) {
  async function loadData() {
    const tbody = document.getElementById('min-tbody');
    tbody.innerHTML = `<tr><td colspan="5" class="loading"><span class="spinner"></span></td></tr>`;
    try {
      const list = await api.ministerios.list();
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Nenhum registro encontrado.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(m => `<tr>
        <td>${m.id_ministerio}</td>
        <td>${m.nome}</td>
        <td>${m.login}</td>
        <td>${fmtDate(m.criado_em)}</td>
        <td><div class="actions-cell">
          <button class="btn btn-secondary btn-sm" data-membros="${m.id_ministerio}" data-nome="${m.nome}">Membros</button>
          <button class="btn btn-secondary btn-sm" data-lideres="${m.id_ministerio}" data-nome="${m.nome}">Líderes</button>
          <button class="btn btn-secondary btn-sm" data-edit='${JSON.stringify({id: m.id_ministerio, nome: m.nome, login: m.login})}'>Editar</button>
          <button class="btn btn-danger btn-sm" data-del="${m.id_ministerio}">Excluir</button>
        </div></td>
      </tr>`).join('');

      tbody.querySelectorAll('[data-del]').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Excluir ministério?')) return;
          try { await api.ministerios.remove(+btn.dataset.del); window.toast('Ministério excluído'); loadData(); }
          catch (err) { window.toast(err.message, 'error'); }
        };
      });

      tbody.querySelectorAll('[data-edit]').forEach(btn => {
        btn.onclick = () => openEdit(JSON.parse(btn.dataset.edit));
      });

      tbody.querySelectorAll('[data-membros]').forEach(btn => {
        btn.onclick = () => openMembros(+btn.dataset.membros, btn.dataset.nome);
      });

      tbody.querySelectorAll('[data-lideres]').forEach(btn => {
        btn.onclick = () => openLideres(+btn.dataset.lideres, btn.dataset.nome);
      });
    } catch (err) { window.toast(err.message, 'error'); }
  }

  async function openMembros(id, nome) {
    window.openModal(`Membros — ${nome}`, '<div class="loading"><span class="spinner"></span></div>', null);
    try {
      const list = await api.ministerios.listMembros(id);
      const html = list.length
        ? `<div class="table-wrap"><table>
            <thead><tr><th>CPF</th><th>Nome</th></tr></thead>
            <tbody>${list.map(p => `<tr><td>${p.cpf}</td><td>${p.nome}</td></tr>`).join('')}</tbody>
           </table></div>`
        : '<p style="color:var(--text-muted)">Nenhum membro cadastrado.</p>';
      document.getElementById('modal-body').innerHTML = html;
    } catch (err) { window.toast(err.message, 'error'); window.closeModal(); }
  }

  async function openLideres(id, nome) {
    window.openModal(`Líderes — ${nome}`, '<div class="loading"><span class="spinner"></span></div>', null);
    try {
      const [list, todas] = await Promise.all([api.ministerios.listLideres(id), api.pessoas.list()]);
      const disponíveis = todas.filter(p => !list.find(l => l.cpf === p.cpf));
      const html = `
        <ul style="margin-bottom:16px">
          ${list.length ? list.map(p => `<li style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
            <span>${p.nome} (${p.cpf})</span>
            <button class="btn btn-danger btn-sm" data-rem="${p.cpf}">—</button>
          </li>`).join('') : '<li style="color:var(--text-muted)">Nenhum líder.</li>'}
        </ul>
        ${disponíveis.length ? `<div style="display:flex;gap:8px">
          <select id="sel-lider" style="flex:1;padding:7px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text)">
            ${disponíveis.map(p => `<option value="${p.cpf}">${p.nome}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm" id="btn-add-lider">+ Adicionar</button>
        </div>` : ''}
      `;
      document.getElementById('modal-body').innerHTML = html;

      document.querySelectorAll('[data-rem]').forEach(b => {
        b.onclick = async () => {
          try { await api.ministerios.removeLider(id, b.dataset.rem); openLideres(id, nome); }
          catch (err) { window.toast(err.message, 'error'); }
        };
      });
      const btnAdd = document.getElementById('btn-add-lider');
      if (btnAdd) {
        btnAdd.onclick = async () => {
          const cpf = document.getElementById('sel-lider').value;
          try { await api.ministerios.addLider(id, cpf); window.toast('Líder adicionado'); openLideres(id, nome); }
          catch (err) { window.toast(err.message, 'error'); }
        };
      }
    } catch (err) { window.toast(err.message, 'error'); window.closeModal(); }
  }

  function openCreate() {
    const html = `<form>
      <div class="form-group"><label>Nome</label><input type="text" id="m-nome" required></div>
      <div class="form-group"><label>Login</label><input type="text" id="m-login" required></div>
      <div class="form-group"><label>Senha</label><input type="password" id="m-senha" required></div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>`;
    window.openModal('Novo Ministério', html, async (form) => {
      try {
        await api.ministerios.create({
          nome: form.querySelector('#m-nome').value,
          login: form.querySelector('#m-login').value,
          senha: form.querySelector('#m-senha').value,
        });
        window.toast('Ministério criado');
        window.closeModal();
        loadData();
      } catch (err) { window.toast(err.message, 'error'); }
    });
  }

  function openEdit({ id, nome, login }) {
    const html = `<form>
      <div class="form-group"><label>Nome</label><input type="text" id="m-nome" value="${nome}" required></div>
      <div class="form-group"><label>Login</label><input type="text" id="m-login" value="${login}" required></div>
      <div class="form-group"><label>Nova Senha (deixe vazio para manter)</label><input type="password" id="m-senha"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>`;
    window.openModal('Editar Ministério', html, async (form) => {
      const body = {
        nome: form.querySelector('#m-nome').value,
        login: form.querySelector('#m-login').value,
      };
      const senha = form.querySelector('#m-senha').value;
      if (senha) body.senha = senha;
      try {
        await api.ministerios.update(id, body);
        window.toast('Ministério atualizado');
        window.closeModal();
        loadData();
      } catch (err) { window.toast(err.message, 'error'); }
    });
  }

  container.innerHTML = `
    <div class="page-header">
      <h1>⛪ Ministérios</h1>
      <div class="page-actions"><button class="btn btn-primary" id="btn-novo">+ Novo Ministério</button></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Nome</th><th>Login</th><th>Criado Em</th><th>Ações</th></tr></thead>
        <tbody id="min-tbody"></tbody>
      </table>
    </div>
  `;

  document.getElementById('btn-novo').onclick = openCreate;
  loadData();
}
