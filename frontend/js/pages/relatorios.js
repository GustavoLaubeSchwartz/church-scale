import { api } from '../api.js';

function fmtDt(s) { return s ? new Date(s).toLocaleString('pt-BR') : '—'; }

function section(id, title, bodyHtml) {
  return `<div class="section-card" id="sec-${id}">
    <div class="section-header" data-sec="${id}">
      <h3>${title}</h3>
      <span class="section-toggle" id="toggle-${id}">▼</span>
    </div>
    <div class="section-body" id="body-${id}" style="display:none">
      ${bodyHtml}
    </div>
  </div>`;
}

function table(cols, rows) {
  if (!rows.length) return '<p class="empty-state">Nenhum registro encontrado.</p>';
  return `<div class="table-wrap"><table>
    <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

export async function mount(container) {
  let eventos = [], habilidades = [];

  async function loadAux() {
    [eventos, habilidades] = await Promise.all([api.eventos.list(), api.habilidades.list()]);
  }

  function eventoLabel(e) { return `#${e.id_evento} — ${e.tipo_evento?.descricao || '?'}`; }

  function eventoSel(id, selId = '') {
    return `<select id="${id}" style="padding:7px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);min-width:200px">
      <option value="">Selecione...</option>
      ${eventos.map(e => `<option value="${e.id_evento}" ${e.id_evento == selId ? 'selected' : ''}>${eventoLabel(e)}</option>`).join('')}
    </select>`;
  }

  function habSel(id) {
    return `<select id="${id}" style="padding:7px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);min-width:160px">
      <option value="">Selecione...</option>
      ${habilidades.map(h => `<option value="${h.id_habilidade}">${h.descricao}</option>`).join('')}
    </select>`;
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderEscala(data) {
    const rows = data.map(r => `<tr><td>${r.nome_pessoa}</td><td>${r.cpf_pessoa}</td><td>${r.habilidade}</td><td>${r.ministerio}</td></tr>`).join('');
    document.getElementById('result-escala').innerHTML = table(['Pessoa', 'CPF', 'Habilidade', 'Ministério'], data.length ? [rows] : []);
  }

  function renderAgenda(data) {
    const rows = data.map(r => `<tr>
      <td>${r.id_evento}</td><td>${r.tipo_evento}</td><td>${r.local}</td>
      <td>${fmtDt(r.dt_hr_prog_inicio)}</td><td>${fmtDt(r.dt_hr_prog_fim)}</td>
      <td>${r.habilidade}</td><td>${r.ministerio}</td>
    </tr>`).join('');
    document.getElementById('result-agenda').innerHTML = table(['ID', 'Tipo', 'Local', 'Início', 'Fim', 'Habilidade', 'Ministério'], data.length ? [rows] : []);
  }

  function renderParticipacao(data) {
    const rows = data.map(r => `<tr><td>${r.cpf}</td><td>${r.nome}</td><td>${r.total_alocacoes}</td></tr>`).join('');
    document.getElementById('result-participacao').innerHTML = table(['CPF', 'Nome', 'Total Alocações'], data.length ? [rows] : []);
  }

  function renderQuorum(data) {
    const rows = data.map(r => `<tr>
      <td>${r.habilidade}</td>
      <td>${r.qtd_necessaria}</td>
      <td>${r.qtd_alocada}</td>
      <td><span class="badge ${r.coberto ? 'badge-success' : 'badge-danger'}">${r.coberto ? 'Coberto' : 'Descoberto'}</span></td>
    </tr>`).join('');
    document.getElementById('result-quorum').innerHTML = table(['Habilidade', 'Necessário', 'Alocado', 'Status'], data.length ? [rows] : []);
  }

  function renderDistribuicao(data) {
    if (!data.length) { document.getElementById('result-dist').innerHTML = '<p class="empty-state">Nenhum registro.</p>'; return; }
    const max = Math.max(...data.map(d => d.total_participacoes), 1);
    const bars = data.map(d => `<div class="bar-row">
      <div class="bar-label" title="${d.ministerio}">${d.ministerio}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(d.total_participacoes/max*100)}%"></div></div>
      <div class="bar-value">${d.total_participacoes}</div>
    </div>`).join('');
    document.getElementById('result-dist').innerHTML = `<div class="bar-list">${bars}</div>`;
  }

  function renderPastores(data) {
    const rows = data.map(r => `<tr>
      <td>${r.cpf_visitante}</td><td>${r.nome_visitante}</td>
      <td>${r.cpf_convidador || '—'}</td><td>${r.nome_convidador || '—'}</td>
    </tr>`).join('');
    document.getElementById('result-pastores').innerHTML = table(['CPF Visitante', 'Visitante', 'CPF Convidador', 'Convidado Por'], data.length ? [rows] : []);
  }

  function renderOcupacao(data) {
    const rows = data.map(r => `<tr><td>${r.id_local}</td><td>${r.nome_local}</td><td>${r.total_eventos}</td></tr>`).join('');
    document.getElementById('result-ocupacao').innerHTML = table(['ID', 'Local', 'Total Eventos'], data.length ? [rows] : []);
  }

  function renderAptos(data) {
    const rows = data.map(r => `<tr><td>${r.cpf}</td><td>${r.nome}</td></tr>`).join('');
    document.getElementById('result-aptos').innerHTML = table(['CPF', 'Nome'], data.length ? [rows] : []);
  }

  // ── Build page ────────────────────────────────────────────────────────────

  container.innerHTML = `<div class="page-header"><h1>📈 Relatórios</h1></div>` + [

    section('escala', '1. Escala por Evento', `
      <div class="section-controls">
        <label>Evento<div id="escala-sel-wrap"></div></label>
        <button class="btn btn-primary btn-sm" id="btn-escala">Gerar</button>
      </div>
      <div id="result-escala"></div>
    `),

    section('agenda', '2. Agenda de Voluntário', `
      <div class="section-controls">
        <label>CPF da Pessoa<input type="text" id="inp-cpf-agenda" placeholder="11 dígitos" maxlength="11" style="min-width:140px"></label>
        <button class="btn btn-primary btn-sm" id="btn-agenda">Buscar</button>
      </div>
      <div id="result-agenda"></div>
    `),

    section('participacao', '3. Participação por Período', `
      <div class="section-controls">
        <label>De<input type="date" id="inp-ini-part"></label>
        <label>Até<input type="date" id="inp-fim-part"></label>
        <button class="btn btn-primary btn-sm" id="btn-participacao">Gerar</button>
      </div>
      <div id="result-participacao"></div>
    `),

    section('quorum', '4. Cobertura de Quórum', `
      <div class="section-controls">
        <label>Evento<div id="quorum-sel-wrap"></div></label>
        <button class="btn btn-primary btn-sm" id="btn-quorum">Verificar</button>
      </div>
      <div id="result-quorum"></div>
    `),

    section('dist', '5. Distribuição por Ministério', `
      <div class="section-controls">
        <button class="btn btn-primary btn-sm" id="btn-dist">Carregar</button>
      </div>
      <div id="result-dist"></div>
    `),

    section('pastores', '6. Visitantes e Convidadores', `
      <div class="section-controls">
        <button class="btn btn-primary btn-sm" id="btn-pastores">Carregar</button>
      </div>
      <div id="result-pastores"></div>
    `),

    section('ocupacao', '7. Ocupação de Locais', `
      <div class="section-controls">
        <button class="btn btn-primary btn-sm" id="btn-ocupacao">Carregar</button>
      </div>
      <div id="result-ocupacao"></div>
    `),

    section('aptos', '8. Voluntários Aptos Não Escalados', `
      <div class="section-controls">
        <label>Evento<div id="aptos-ev-wrap"></div></label>
        <label>Habilidade<div id="aptos-hab-wrap"></div></label>
        <button class="btn btn-primary btn-sm" id="btn-aptos">Buscar</button>
      </div>
      <div id="result-aptos"></div>
    `),

  ].join('');

  await loadAux();

  // Inject selects
  document.getElementById('escala-sel-wrap').innerHTML = eventoSel('sel-escala-ev');
  document.getElementById('quorum-sel-wrap').innerHTML = eventoSel('sel-quorum-ev');
  document.getElementById('aptos-ev-wrap').innerHTML = eventoSel('sel-aptos-ev');
  document.getElementById('aptos-hab-wrap').innerHTML = habSel('sel-aptos-hab');

  // Toggle collapse
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
      const sec = header.dataset.sec;
      const body = document.getElementById(`body-${sec}`);
      const toggle = document.getElementById(`toggle-${sec}`);
      const open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
      toggle.classList.toggle('open', !open);
    });
  });

  // Button handlers
  document.getElementById('btn-escala').onclick = async () => {
    const id = document.getElementById('sel-escala-ev').value;
    if (!id) { window.toast('Selecione um evento', 'error'); return; }
    try { renderEscala(await api.relatorios.escalaEvento(id)); }
    catch (err) { window.toast(err.message, 'error'); }
  };

  document.getElementById('btn-agenda').onclick = async () => {
    const cpf = document.getElementById('inp-cpf-agenda').value.trim();
    if (!cpf) { window.toast('Informe o CPF', 'error'); return; }
    try { renderAgenda(await api.relatorios.agendaPessoa(cpf)); }
    catch (err) { window.toast(err.message, 'error'); }
  };

  document.getElementById('btn-participacao').onclick = async () => {
    const ini = document.getElementById('inp-ini-part').value;
    const fim = document.getElementById('inp-fim-part').value;
    if (!ini || !fim) { window.toast('Informe o período', 'error'); return; }
    try { renderParticipacao(await api.relatorios.participacao(ini, fim)); }
    catch (err) { window.toast(err.message, 'error'); }
  };

  document.getElementById('btn-quorum').onclick = async () => {
    const id = document.getElementById('sel-quorum-ev').value;
    if (!id) { window.toast('Selecione um evento', 'error'); return; }
    try { renderQuorum(await api.relatorios.coberturaQuorum(id)); }
    catch (err) { window.toast(err.message, 'error'); }
  };

  document.getElementById('btn-dist').onclick = async () => {
    try { renderDistribuicao(await api.relatorios.distribuicaoMinisterio()); }
    catch (err) { window.toast(err.message, 'error'); }
  };

  document.getElementById('btn-pastores').onclick = async () => {
    try { renderPastores(await api.relatorios.pastoresVisitantes()); }
    catch (err) { window.toast(err.message, 'error'); }
  };

  document.getElementById('btn-ocupacao').onclick = async () => {
    try { renderOcupacao(await api.relatorios.ocupacaoLocais()); }
    catch (err) { window.toast(err.message, 'error'); }
  };

  document.getElementById('btn-aptos').onclick = async () => {
    const ev = document.getElementById('sel-aptos-ev').value;
    const hab = document.getElementById('sel-aptos-hab').value;
    if (!ev || !hab) { window.toast('Selecione evento e habilidade', 'error'); return; }
    try { renderAptos(await api.relatorios.voluntariosAptos(ev, hab)); }
    catch (err) { window.toast(err.message, 'error'); }
  };
}
