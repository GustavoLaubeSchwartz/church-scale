import { api } from '../api.js';

function fmtDt(s) { return s ? new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'; }

function initials(nome) {
  return (nome || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const AVATAR_COLORS = ['#2563EB','#7C3AED','#DB2777','#059669','#D97706','#DC2626','#0891B2'];
function avatarColor(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xFFFFFFFF;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export async function mount(container) {
  let eventos = [], habilidades = [], pessoas = [];
  let selectedEvento = sessionStorage.getItem('filter_evento') || '';
  sessionStorage.removeItem('filter_evento');
  let viewMode = 'kanban';

  async function loadAux() {
    [eventos, habilidades, pessoas] = await Promise.all([
      api.eventos.list(),
      api.habilidades.list(),
      api.pessoas.list(),
    ]);
  }

  function pessoaNome(id_pessoa) {
    return pessoas.find(p => p.id_pessoa === id_pessoa)?.nome || `#${id_pessoa}`;
  }

  function eventoLabel(e) {
    return `${e.tipo_evento?.descricao || 'Evento'} — ${fmtDt(e.dt_hr_prog_inicio)} (${e.local?.nome || '?'})`;
  }

  function eventoOpts() {
    return `<option value="">— Selecione um evento —</option>` +
      eventos.map(e => `<option value="${e.id_evento}" ${selectedEvento == e.id_evento ? 'selected' : ''}>${eventoLabel(e)}</option>`).join('');
  }

  // ── Kanban ─────────────────────────────────────────────────────────────────
  async function renderKanban() {
    const area = document.getElementById('aloc-area');
    area.innerHTML = `<div class="loading"><span class="spinner"></span>Carregando escala...</div>`;

    if (!selectedEvento) {
      area.innerHTML = `
        <div class="empty-state" style="padding:64px">
          <div class="empty-state-icon">📋</div>
          <p>Selecione um evento acima para visualizar e gerenciar sua escala.</p>
        </div>`;
      return;
    }

    try {
      const evento = eventos.find(e => e.id_evento == selectedEvento);
      const [alocs, requeridas] = await Promise.all([
        api.alocacoes.list({ id_evento: selectedEvento }),
        evento?.id_tipo_evento
          ? api.tipos.listHabilidades(evento.id_tipo_evento).catch(() => [])
          : Promise.resolve([]),
      ]);

      // Build skill columns — requeridas define quorum; extras come from existing alocs
      const allHabs = requeridas.map(r => ({
        id_habilidade: r.id_habilidade,
        descricao: r.descricao,
        quorum: r.qtd ?? 1,   // API returns `qtd`, not `quorum_minimo`
        requerida: true,
      }));

      alocs.forEach(a => {
        if (!allHabs.find(h => h.id_habilidade === a.id_habilidade)) {
          const hab = habilidades.find(h => h.id_habilidade === a.id_habilidade);
          allHabs.push({ id_habilidade: a.id_habilidade, descricao: hab?.descricao || '?', quorum: 1, requerida: false });
        }
      });

      const totalVagas  = allHabs.filter(h => h.requerida).reduce((s, h) => s + h.quorum, 0);
      const totalFilled = alocs.length;
      const pctCover    = totalVagas > 0 ? Math.min(100, (totalFilled / totalVagas) * 100) : (totalFilled > 0 ? 100 : 0);
      const progressColor = pctCover >= 100 ? 'green' : pctCover >= 50 ? '' : 'red';

      area.innerHTML = `
        <div class="card" style="margin-bottom:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
            <div>
              <div style="font-size:.9rem;font-weight:700;color:var(--text);margin-bottom:4px">
                ${evento?.tipo_evento?.descricao || 'Evento'} · ${evento?.local?.nome || '—'}
              </div>
              <div style="font-size:.8rem;color:var(--text-muted)">
                ${fmtDt(evento?.dt_hr_prog_inicio)} → ${fmtDt(evento?.dt_hr_prog_fim)}
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:4px">
                Quórum obrigatório:
                <strong style="color:${pctCover>=100?'var(--success)':pctCover>=50?'var(--warning)':'var(--danger)'}">
                  ${totalFilled}/${totalVagas}
                </strong>
              </div>
              <div class="progress-wrap" style="width:160px">
                <div class="progress-fill ${progressColor}" style="width:${pctCover.toFixed(0)}%"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="kanban-board" id="kanban-board"></div>
      `;

      const board = document.getElementById('kanban-board');

      if (allHabs.length === 0) {
        board.innerHTML = `
          <div class="kanban-col" style="min-width:280px">
            <div class="kanban-col-header">
              <span class="kanban-col-title" style="color:var(--warning)">⚠ Sem requisitos definidos</span>
            </div>
            <p style="font-size:.8rem;color:var(--text-muted);padding:8px 0;line-height:1.5">
              Este tipo de evento não tem habilidades necessárias configuradas.<br>
              Acesse <strong>Tipos de Evento</strong> → <em>Habilidades</em> e defina as funções com quórum mínimo.
            </p>
            <button class="kanban-add" id="btn-add-livre"><span>+</span> Alocar livremente</button>
          </div>`;
        const b = document.getElementById('btn-add-livre');
        if (b) b.onclick = () => openAddModal(null);
        return;
      }

      // Render required skill columns
      allHabs.forEach(hab => {
        const habAlocs = alocs.filter(a => a.id_habilidade === hab.id_habilidade);
        const filled   = habAlocs.length;
        const quorum   = hab.quorum;
        const countColor = filled >= quorum ? 'color:var(--success)' : filled > 0 ? 'color:var(--warning)' : 'color:var(--danger)';

        const col = document.createElement('div');
        col.className = 'kanban-col';
        col.innerHTML = `
          <div class="kanban-col-header">
            <span class="kanban-col-title">
              ${hab.descricao}
              ${!hab.requerida ? '<small style="opacity:.6;font-weight:400"> (extra)</small>' : ''}
            </span>
            <span class="kanban-count" style="${countColor}" title="${filled} de ${quorum} necessários">
              ${filled}/${quorum}
            </span>
          </div>
          <div class="kanban-cards" data-hab="${hab.id_habilidade}">
            ${habAlocs.map(a => {
              const nome  = pessoaNome(a.id_pessoa);
              const color = avatarColor(nome);
              return `<div class="kanban-card">
                <div class="kanban-avatar" style="background:${color}">${initials(nome)}</div>
                <span class="kanban-name" title="${nome}">${nome}</span>
                <button class="kanban-rm" title="Remover"
                  data-ev="${a.id_evento}" data-hab="${a.id_habilidade}" data-pes="${a.id_pessoa}">✕</button>
              </div>`;
            }).join('')}
          </div>
          <button class="kanban-add" data-add-hab="${hab.id_habilidade}">
            <span>+</span> Adicionar pessoa
          </button>
        `;
        board.appendChild(col);
      });

      // "Free" extra column
      const extraCol = document.createElement('div');
      extraCol.className = 'kanban-col';
      extraCol.style.minWidth = '180px';
      extraCol.innerHTML = `
        <div class="kanban-col-header">
          <span class="kanban-col-title" style="color:var(--text-muted)">Outra função</span>
        </div>
        <button class="kanban-add" id="btn-add-livre"><span>+</span> Alocar livremente</button>
      `;
      board.appendChild(extraCol);

      // Wire remove buttons
      board.querySelectorAll('[data-ev]').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Remover esta alocação da escala?')) return;
          try {
            await api.alocacoes.remove(+btn.dataset.ev, +btn.dataset.hab, +btn.dataset.pes);
            window.toast('Alocação removida');
            renderKanban();
          } catch (err) { window.toast(err.message, 'error'); }
        };
      });

      board.querySelectorAll('[data-add-hab]').forEach(btn => {
        btn.onclick = () => openAddModal(+btn.dataset.addHab);
      });

      const btnLivre = document.getElementById('btn-add-livre');
      if (btnLivre) btnLivre.onclick = () => openAddModal(null);

    } catch (err) {
      area.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><p>${err.message}</p></div>`;
    }
  }

  // ── Add modal ──────────────────────────────────────────────────────────────
  async function openAddModal(preselectedHabId) {
    window.openModal(
      preselectedHabId !== null ? 'Adicionar à Escala' : 'Alocar Livremente',
      '<div class="loading"><span class="spinner"></span>Carregando...</div>',
      null,
    );

    try {
      if (preselectedHabId !== null) {
        await buildSpecificModal(preselectedHabId);
      } else {
        buildFreeModal();
      }
    } catch (err) {
      const body = document.getElementById('modal-body');
      if (body) body.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    }
  }

  async function buildSpecificModal(habId) {
    const aptos = await api.relatorios.voluntariosAptos(+selectedEvento, habId);
    const hab   = habilidades.find(h => h.id_habilidade === habId);

    const body = document.getElementById('modal-body');
    body.innerHTML = `
      <form id="add-form">
        <div class="form-group">
          <label>Função</label>
          <div style="padding:8px 12px;background:var(--surface-2);border-radius:var(--radius);font-weight:600;color:var(--text)">
            ${hab?.descricao || '?'}
          </div>
        </div>
        <div class="form-group">
          <label>
            Pessoa apta
            <small style="color:var(--text-muted);font-weight:400">
              — ${aptos.length} disponíve${aptos.length !== 1 ? 'is' : 'l'}
            </small>
          </label>
          ${aptos.length === 0
            ? `<div style="padding:12px;background:var(--surface-2);border-radius:var(--radius);color:var(--text-muted);font-size:.85rem;line-height:1.5">
                Nenhuma pessoa com esta habilidade está disponível para este evento.<br>
                <small>Verifique se as habilidades estão cadastradas em <strong>Pessoas</strong>.</small>
               </div>`
            : `<select id="m-pessoa" required>
                <option value="">Selecione...</option>
                ${aptos.map(p => `<option value="${p.id_pessoa}">${p.nome}</option>`).join('')}
               </select>`
          }
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="window.closeModal()">Cancelar</button>
          ${aptos.length > 0 ? `<button type="submit" class="btn btn-primary">Alocar</button>` : ''}
        </div>
      </form>`;

    const form = document.getElementById('add-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type=submit]');
      if (btn) { btn.disabled = true; btn.textContent = 'Alocando...'; }
      try {
        await api.alocacoes.create({
          id_evento:     +selectedEvento,
          id_pessoa:     +form.querySelector('#m-pessoa').value,
          id_habilidade: habId,
        });
        window.toast('Pessoa alocada com sucesso!');
        window.closeModal();
        renderKanban();
      } catch (err) {
        window.toast(err.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Alocar'; }
      }
    };
  }

  function buildFreeModal() {
    const body = document.getElementById('modal-body');
    body.innerHTML = `
      <form id="add-form">
        <div class="form-group">
          <label>Função / Habilidade</label>
          <select id="m-hab" required>
            <option value="">Selecione uma função...</option>
            ${habilidades.map(h => `<option value="${h.id_habilidade}">${h.descricao}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>
            Pessoa apta
            <small id="aptos-count" style="color:var(--text-muted);font-weight:400"></small>
          </label>
          <select id="m-pessoa" disabled>
            <option value="">Selecione uma função primeiro...</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="window.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="btn-submit-livre" disabled>Alocar</button>
        </div>
      </form>`;

    const selHab = document.getElementById('m-hab');
    const selPes = document.getElementById('m-pessoa');
    const btnSub = document.getElementById('btn-submit-livre');
    const cntEl  = document.getElementById('aptos-count');

    selHab.onchange = async () => {
      const habId = +selHab.value;
      if (!habId) {
        selPes.disabled = true;
        selPes.innerHTML = '<option value="">Selecione uma função primeiro...</option>';
        btnSub.disabled = true;
        cntEl.textContent = '';
        return;
      }
      selPes.disabled = true;
      selPes.innerHTML = '<option value="">Carregando...</option>';
      btnSub.disabled = true;
      try {
        const aptos = await api.relatorios.voluntariosAptos(+selectedEvento, habId);
        cntEl.textContent = `— ${aptos.length} disponíve${aptos.length !== 1 ? 'is' : 'l'}`;
        if (aptos.length === 0) {
          selPes.innerHTML = '<option value="">Nenhuma pessoa apta disponível</option>';
        } else {
          selPes.innerHTML = '<option value="">Selecione...</option>' +
            aptos.map(p => `<option value="${p.id_pessoa}">${p.nome}</option>`).join('');
          selPes.disabled = false;
          btnSub.disabled = false;
        }
      } catch (_) {
        selPes.innerHTML = '<option value="">Erro ao carregar</option>';
        cntEl.textContent = '';
      }
    };

    const form = document.getElementById('add-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!selHab.value || !selPes.value) return;
      if (btnSub) { btnSub.disabled = true; btnSub.textContent = 'Alocando...'; }
      try {
        await api.alocacoes.create({
          id_evento:     +selectedEvento,
          id_pessoa:     +selPes.value,
          id_habilidade: +selHab.value,
        });
        window.toast('Pessoa alocada com sucesso!');
        window.closeModal();
        renderKanban();
      } catch (err) {
        window.toast(err.message, 'error');
        if (btnSub) { btnSub.disabled = false; btnSub.textContent = 'Alocar'; }
      }
    };
  }

  // ── List view ──────────────────────────────────────────────────────────────
  async function renderList() {
    const area = document.getElementById('aloc-area');
    area.innerHTML = `<div class="loading"><span class="spinner"></span>Carregando...</div>`;
    try {
      const params = {};
      if (selectedEvento) params.id_evento = selectedEvento;
      const list = await api.alocacoes.list(Object.keys(params).length ? params : undefined);
      if (!list.length) {
        area.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><p>Nenhuma alocação encontrada.</p></div>`;
        return;
      }
      area.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Evento</th><th>Pessoa</th><th>Habilidade</th><th>Ações</th></tr></thead>
            <tbody>${list.map(a => {
              const ev   = eventos.find(e => e.id_evento === a.id_evento);
              const hab  = habilidades.find(h => h.id_habilidade === a.id_habilidade);
              const nome = pessoaNome(a.id_pessoa);
              return `<tr>
                <td>${ev ? `${ev.tipo_evento?.descricao || '?'} <small style="color:var(--text-muted)">(${fmtDt(ev.dt_hr_prog_inicio)})</small>` : a.id_evento}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div style="width:28px;height:28px;border-radius:50%;background:${avatarColor(nome)};display:flex;align-items:center;justify-content:center;color:white;font-size:.65rem;font-weight:700">
                      ${initials(nome)}
                    </div>
                    ${nome}
                  </div>
                </td>
                <td>${hab ? hab.descricao : a.id_habilidade}</td>
                <td>
                  <button class="btn btn-danger btn-sm"
                    data-ev="${a.id_evento}" data-hab="${a.id_habilidade}" data-pes="${a.id_pessoa}">
                    Remover
                  </button>
                </td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>`;

      area.querySelectorAll('[data-ev]').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Remover alocação?')) return;
          try {
            await api.alocacoes.remove(+btn.dataset.ev, +btn.dataset.hab, +btn.dataset.pes);
            window.toast('Alocação removida');
            renderList();
          } catch (err) { window.toast(err.message, 'error'); }
        };
      });
    } catch (err) {
      area.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><p>${err.message}</p></div>`;
    }
  }

  function render() {
    viewMode === 'kanban' ? renderKanban() : renderList();
  }

  // ── Mount ──────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="page-header">
      <h1>Escalas</h1>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" id="btn-view-kanban">⊞ Kanban</button>
        <button class="btn btn-secondary btn-sm" id="btn-view-list">☰ Lista</button>
      </div>
    </div>
    <div class="filter-bar" style="margin-bottom:20px">
      <label style="flex:1">
        Evento
        <select id="filter-evento" style="min-width:100%"></select>
      </label>
    </div>
    <div id="aloc-area"></div>
  `;

  await loadAux();
  document.getElementById('filter-evento').innerHTML = eventoOpts();

  document.getElementById('filter-evento').addEventListener('change', (e) => {
    selectedEvento = e.target.value;
    render();
  });

  document.getElementById('btn-view-kanban').addEventListener('click', () => {
    viewMode = 'kanban';
    document.getElementById('btn-view-kanban').classList.replace('btn-secondary', 'btn-primary');
    document.getElementById('btn-view-list').classList.replace('btn-primary', 'btn-secondary');
    render();
  });

  document.getElementById('btn-view-list').addEventListener('click', () => {
    viewMode = 'list';
    document.getElementById('btn-view-list').classList.replace('btn-secondary', 'btn-primary');
    document.getElementById('btn-view-kanban').classList.replace('btn-primary', 'btn-secondary');
    render();
  });

  document.getElementById('btn-view-kanban').classList.replace('btn-secondary', 'btn-primary');
  render();
}
