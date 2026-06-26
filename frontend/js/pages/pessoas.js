import { api } from '../api.js';

function fmtDate(s) { return s ? new Date(s + 'T00:00:00').toLocaleDateString('pt-BR') : '—'; }

function initials(nome) {
  return (nome || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const AVATAR_COLORS = ['#2563EB','#7C3AED','#DB2777','#059669','#D97706','#0891B2','#DC2626'];
function avatarColor(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xFFFFFFFF;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export async function mount(container) {
  let tab = 'membro';
  let habilidades = [], pessoasAll = [];
  let viewMode = 'table'; // 'table' | 'cards'

  async function loadAux() {
    [habilidades, pessoasAll] = await Promise.all([
      api.habilidades.list(),
      api.pessoas.list(),
    ]);
  }

  // ── Render table ────────────────────────────────────────────────────────
  function renderTable(list) {
    if (!list.length) {
      return `<div class="empty-state"><div class="empty-state-icon">👥</div><p>Nenhum registro encontrado.</p></div>`;
    }
    const headers = tab === 'membro'
      ? `<th>Nome</th><th>Celular</th><th>Data Nasc.</th><th>Célula</th><th>Acesso</th><th>Ações</th>`
      : `<th>Nome</th><th>Celular</th><th>Data Nasc.</th><th>Batizado</th><th>Pastor</th><th>Ações</th>`;

    const rows = list.map(p => tab === 'membro' ? `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:${avatarColor(p.nome)};display:flex;align-items:center;justify-content:center;color:white;font-size:.7rem;font-weight:700;flex-shrink:0">${initials(p.nome)}</div>
            <span style="font-weight:500">${p.nome}</span>
          </div>
        </td>
        <td>${p.numero_celular || '—'}</td>
        <td>${fmtDate(p.data_nascimento)}</td>
        <td>${p.nome_celula || '—'}</td>
        <td><span class="badge badge-${p.permissionamento === 'ADMIN' ? 'danger' : p.permissionamento === 'LIDER' ? 'warning' : 'muted'}">${p.permissionamento}</span></td>
        <td><div class="actions-cell">
          <button class="btn btn-secondary btn-sm" data-detalhe="${p.id_pessoa}">Habilidades</button>
          <button class="btn btn-danger btn-sm" data-del="${p.id_pessoa}">Excluir</button>
        </div></td>
      </tr>` : `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:${avatarColor(p.nome)};display:flex;align-items:center;justify-content:center;color:white;font-size:.7rem;font-weight:700;flex-shrink:0">${initials(p.nome)}</div>
            <span style="font-weight:500">${p.nome}</span>
          </div>
        </td>
        <td>${p.numero_celular || '—'}</td>
        <td>${fmtDate(p.data_nascimento)}</td>
        <td><span class="badge badge-${p.batizado ? 'success' : 'muted'}">${p.batizado ? 'Sim' : 'Não'}</span></td>
        <td><span class="badge badge-${p.e_pastor ? 'info' : 'muted'}">${p.e_pastor ? 'Pastor' : '—'}</span></td>
        <td><div class="actions-cell">
          <button class="btn btn-secondary btn-sm" data-detalhe="${p.id_pessoa}">Habilidades</button>
          <button class="btn btn-danger btn-sm" data-del="${p.id_pessoa}">Excluir</button>
        </div></td>
      </tr>`
    ).join('');

    return `
      <div class="table-wrap">
        <table>
          <thead><tr>${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // ── Render cards ────────────────────────────────────────────────────────
  function renderCards(list) {
    if (!list.length) {
      return `<div class="empty-state"><div class="empty-state-icon">👥</div><p>Nenhum registro encontrado.</p></div>`;
    }
    return `<div class="person-grid">${list.map(p => {
      const extra = tab === 'membro'
        ? `<div>Célula: <strong>${p.nome_celula || '—'}</strong></div>
           <div style="margin-top:2px">Acesso: <span class="badge badge-${p.permissionamento === 'ADMIN' ? 'danger' : p.permissionamento === 'LIDER' ? 'warning' : 'muted'}" style="font-size:.65rem">${p.permissionamento}</span></div>`
        : `<div>${p.batizado ? '<span class="badge badge-success" style="font-size:.65rem">Batizado</span>' : ''} ${p.e_pastor ? '<span class="badge badge-info" style="font-size:.65rem">Pastor</span>' : ''}</div>`;
      const color = avatarColor(p.nome);
      return `
        <div class="person-card">
          <div class="person-card-header">
            <div class="person-card-avatar" style="background:${color}">${initials(p.nome)}</div>
            <div>
              <div class="person-card-name">${p.nome}</div>
              <div class="person-card-phone">${p.numero_celular || 'Sem celular'}</div>
            </div>
          </div>
          <div class="person-card-body">
            ${extra}
            ${p.data_nascimento ? `<div style="margin-top:4px;font-size:.72rem">Nasc: ${fmtDate(p.data_nascimento)}</div>` : ''}
          </div>
          <div class="person-card-actions">
            <button class="btn btn-secondary btn-xs" data-detalhe="${p.id_pessoa}">Habilidades</button>
            <button class="btn btn-danger btn-xs" data-del="${p.id_pessoa}">Excluir</button>
          </div>
        </div>`;
    }).join('')}</div>`;
  }

  async function loadData() {
    const area = document.getElementById('pessoas-area');
    area.innerHTML = `<div class="loading"><span class="spinner"></span>Carregando...</div>`;
    try {
      const list = await api.pessoas.list(tab);
      area.innerHTML = viewMode === 'cards' ? renderCards(list) : renderTable(list);
      bindActions(area);
    } catch (err) {
      area.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><p>${err.message}</p></div>`;
    }
  }

  function bindActions(area) {
    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Excluir esta pessoa permanentemente?')) return;
        try { await api.pessoas.remove(+btn.dataset.del); window.toast('Pessoa excluída'); loadData(); }
        catch (err) { window.toast(err.message, 'error'); }
      };
    });
    area.querySelectorAll('[data-detalhe]').forEach(btn => {
      btn.onclick = () => openDetalhes(+btn.dataset.detalhe);
    });
  }

  async function openDetalhes(id_pessoa) {
    window.openModal('Carregando...', '<div class="loading"><span class="spinner"></span></div>', null);
    try {
      const habs = await api.pessoas.listHabilidades(id_pessoa);
      const habOpts = habilidades.filter(h => !habs.find(x => x.id_habilidade === h.id_habilidade));
      const pessoa  = pessoasAll.find(p => p.id_pessoa === id_pessoa);
      const color   = avatarColor(pessoa?.nome || '');

      const html = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border)">
          <div style="width:44px;height:44px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-size:.9rem;font-weight:700">${initials(pessoa?.nome)}</div>
          <div>
            <div style="font-weight:700;color:var(--text)">${pessoa?.nome || `#${id_pessoa}`}</div>
            <div style="font-size:.78rem;color:var(--text-muted)">${pessoa?.numero_celular || ''}</div>
          </div>
        </div>
        <div style="font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:10px">Habilidades</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
          ${habs.length ? habs.map(h => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--surface-2);border-radius:var(--radius);border:1px solid var(--border)">
              <span style="font-size:.875rem;color:var(--text)">${h.descricao}</span>
              <button class="btn btn-ghost btn-xs" style="color:var(--danger)" data-rem-hab="${h.id_habilidade}">✕ Remover</button>
            </div>
          `).join('') : '<div style="color:var(--text-muted);font-size:.875rem;padding:8px 0">Nenhuma habilidade cadastrada.</div>'}
        </div>
        ${habOpts.length ? `
          <div style="font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:8px">Adicionar Habilidade</div>
          <div style="display:flex;gap:8px">
            <select id="sel-hab" style="flex:1;padding:8px 10px;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius);color:var(--text);outline:none">
              ${habOpts.map(h => `<option value="${h.id_habilidade}">${h.descricao}</option>`).join('')}
            </select>
            <button class="btn btn-primary btn-sm" id="btn-add-hab">+ Adicionar</button>
          </div>` : `<div style="color:var(--text-muted);font-size:.8rem">Todas as habilidades já foram atribuídas.</div>`}
      `;
      document.getElementById('modal-title').textContent = pessoa?.nome || `Pessoa #${id_pessoa}`;
      document.getElementById('modal-body').innerHTML = html;

      document.querySelectorAll('[data-rem-hab]').forEach(b => {
        b.onclick = async () => {
          try { await api.pessoas.removeHabilidade(id_pessoa, +b.dataset.remHab); openDetalhes(id_pessoa); }
          catch (err) { window.toast(err.message, 'error'); }
        };
      });
      const btnAddHab = document.getElementById('btn-add-hab');
      if (btnAddHab) {
        btnAddHab.onclick = async () => {
          const id = +document.getElementById('sel-hab').value;
          try {
            await api.pessoas.addHabilidade(id_pessoa, id);
            window.toast('Habilidade adicionada');
            openDetalhes(id_pessoa);
          }
          catch (err) { window.toast(err.message, 'error'); }
        };
      }
    } catch (err) {
      window.toast(err.message, 'error');
      window.closeModal();
    }
  }

  function permOpts(sel = 'MEMBRO') {
    return ['MEMBRO', 'LIDER', 'ADMIN'].map(p =>
      `<option value="${p}" ${p === sel ? 'selected' : ''}>${p}</option>`
    ).join('');
  }

  function liderOpts() {
    return pessoasAll.filter(p => p.tipo === 'membro').map(p =>
      `<option value="${p.id_pessoa}">${p.nome}</option>`
    ).join('');
  }

  function openNovoMembro() {
    const html = `<form>
      <div class="form-group"><label>Nome completo</label><input type="text" id="m-nome" required placeholder="Ex: João da Silva"></div>
      <div class="form-group"><label>Celular</label><input type="text" id="m-cel" placeholder="Ex: 27999990001"></div>
      <div class="form-group"><label>Data de Nascimento</label><input type="date" id="m-nasc"></div>
      <div class="form-group"><label>Nome da Célula</label><input type="text" id="m-celula" placeholder="Ex: Célula Norte"></div>
      <div class="form-group"><label>Liderado por</label>
        <select id="m-lider"><option value="">— Nenhum —</option>${liderOpts()}</select>
      </div>
      <div class="form-group"><label>Permissionamento</label>
        <select id="m-perm">${permOpts()}</select>
      </div>
      <div class="form-group"><label>Senha (para acesso ao sistema)</label>
        <input type="password" id="m-senha" placeholder="Deixe vazio se não precisar de acesso">
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="window.closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>`;
    window.openModal('Novo Membro', html, async (form) => {
      try {
        await api.pessoas.createMembro({
          nome:            form.querySelector('#m-nome').value,
          numero_celular:  form.querySelector('#m-cel').value  || null,
          data_nascimento: form.querySelector('#m-nasc').value || null,
          nome_celula:     form.querySelector('#m-celula').value || null,
          liderado_por:    +form.querySelector('#m-lider').value || null,
          permissionamento:form.querySelector('#m-perm').value,
          senha:           form.querySelector('#m-senha').value || null,
        });
        window.toast('Membro cadastrado com sucesso!');
        window.closeModal();
        await loadAux();
        loadData();
      } catch (err) { window.toast(err.message, 'error'); }
    });
  }

  function openNovoVisitante() {
    const html = `<form>
      <div class="form-group"><label>Nome completo</label><input type="text" id="m-nome" required placeholder="Ex: Maria Santos"></div>
      <div class="form-group"><label>Celular</label><input type="text" id="m-cel" placeholder="Ex: 27999990002"></div>
      <div class="form-group"><label>Data de Nascimento</label><input type="date" id="m-nasc"></div>
      <div class="form-group"><label>Convidado por</label>
        <select id="m-conv"><option value="">— Nenhum —</option>
          ${pessoasAll.map(p => `<option value="${p.id_pessoa}">${p.nome}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <div class="checkbox-row">
          <input type="checkbox" id="m-batizado">
          <label for="m-batizado">Batizado(a)</label>
        </div>
      </div>
      <div class="form-group">
        <div class="checkbox-row">
          <input type="checkbox" id="m-pastor">
          <label for="m-pastor">É Pastor(a)</label>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="window.closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>`;
    window.openModal('Novo Visitante', html, async (form) => {
      try {
        await api.pessoas.createVisitante({
          nome:            form.querySelector('#m-nome').value,
          numero_celular:  form.querySelector('#m-cel').value  || null,
          data_nascimento: form.querySelector('#m-nasc').value || null,
          batizado:        form.querySelector('#m-batizado').checked,
          e_pastor:        form.querySelector('#m-pastor').checked,
          convidado_por:   +form.querySelector('#m-conv').value || null,
        });
        window.toast('Visitante cadastrado com sucesso!');
        window.closeModal();
        await loadAux();
        loadData();
      } catch (err) { window.toast(err.message, 'error'); }
    });
  }

  // ── Layout ──────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="page-header">
      <h1>Pessoas</h1>
      <div class="page-actions" id="tab-actions">
        <button class="btn btn-secondary btn-sm" id="btn-view-table" title="Tabela">☰ Tabela</button>
        <button class="btn btn-secondary btn-sm" id="btn-view-cards" title="Cards">⊞ Cards</button>
        <button class="btn btn-primary" id="btn-novo-membro">+ Novo Membro</button>
      </div>
    </div>
    <div class="tabs">
      <button class="tab-btn active" data-tab="membro">Membros</button>
      <button class="tab-btn" data-tab="visitante">Visitantes</button>
    </div>
    <div id="pessoas-area"></div>
  `;

  await loadAux();

  document.getElementById('btn-novo-membro').onclick = openNovoMembro;

  // View toggle
  document.getElementById('btn-view-table').addEventListener('click', () => {
    viewMode = 'table';
    document.getElementById('btn-view-table').classList.replace('btn-secondary', 'btn-primary');
    document.getElementById('btn-view-cards').classList.replace('btn-primary', 'btn-secondary');
    loadData();
  });
  document.getElementById('btn-view-cards').addEventListener('click', () => {
    viewMode = 'cards';
    document.getElementById('btn-view-cards').classList.replace('btn-secondary', 'btn-primary');
    document.getElementById('btn-view-table').classList.replace('btn-primary', 'btn-secondary');
    loadData();
  });

  // Tab switch
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      const actions = document.getElementById('tab-actions');
      if (tab === 'membro') {
        const novoBtn = actions.querySelector('#btn-novo-membro, #btn-novo-visitante');
        if (novoBtn) { novoBtn.id = 'btn-novo-membro'; novoBtn.textContent = '+ Novo Membro'; novoBtn.onclick = openNovoMembro; }
      } else {
        const novoBtn = actions.querySelector('#btn-novo-membro, #btn-novo-visitante');
        if (novoBtn) { novoBtn.id = 'btn-novo-visitante'; novoBtn.textContent = '+ Novo Visitante'; novoBtn.onclick = openNovoVisitante; }
      }
      loadData();
    };
  });

  loadData();
}
