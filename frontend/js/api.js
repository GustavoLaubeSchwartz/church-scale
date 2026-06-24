const BASE = '/api/v1';

function getToken() { return localStorage.getItem('church_token'); }

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem('church_token');
    window.location.reload();
    throw new Error('Sessão expirada');
  }
  if (!res.ok) {
    let detail = res.statusText;
    try { const err = await res.json(); detail = err.detail || JSON.stringify(err); } catch (_) {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  auth: {
    login: (login, senha) => request('POST', '/auth/login', { login, senha }),
    me: () => request('GET', '/auth/me'),
  },

  habilidades: {
    list: () => request('GET', '/habilidades'),
    create: (b) => request('POST', '/habilidades', b),
    update: (id, b) => request('PUT', `/habilidades/${id}`, b),
    remove: (id) => request('DELETE', `/habilidades/${id}`),
  },

  locais: {
    list: () => request('GET', '/locais'),
    create: (b) => request('POST', '/locais', b),
    update: (id, b) => request('PUT', `/locais/${id}`, b),
    remove: (id) => request('DELETE', `/locais/${id}`),
    listTipos: (id) => request('GET', `/locais/${id}/tipos-evento`),
    addTipo: (id, id_tipo) => request('POST', `/locais/${id}/tipos-evento`, { id_tipo_evento: id_tipo }),
    removeTipo: (id, id_tipo) => request('DELETE', `/locais/${id}/tipos-evento/${id_tipo}`),
  },

  tipos: {
    list: () => request('GET', '/tipos-evento'),
    create: (b) => request('POST', '/tipos-evento', b),
    update: (id, b) => request('PUT', `/tipos-evento/${id}`, b),
    remove: (id) => request('DELETE', `/tipos-evento/${id}`),
    listHabilidades: (id) => request('GET', `/tipos-evento/${id}/habilidades`),
    addHabilidade: (id, b) => request('POST', `/tipos-evento/${id}/habilidades`, b),
    updateHabilidade: (id, id_hab, b) => request('PUT', `/tipos-evento/${id}/habilidades/${id_hab}`, b),
    removeHabilidade: (id, id_hab) => request('DELETE', `/tipos-evento/${id}/habilidades/${id_hab}`),
    listMinisterios: (id) => request('GET', `/tipos-evento/${id}/ministerios`),
    addMinisterio: (id, b) => request('POST', `/tipos-evento/${id}/ministerios`, b),
    removeMinisterio: (id, id_min) => request('DELETE', `/tipos-evento/${id}/ministerios/${id_min}`),
  },

  ministerios: {
    list: () => request('GET', '/ministerios'),
    create: (b) => request('POST', '/ministerios', b),
    update: (id, b) => request('PUT', `/ministerios/${id}`, b),
    remove: (id) => request('DELETE', `/ministerios/${id}`),
    listMembros: (id) => request('GET', `/ministerios/${id}/membros`),
    listLideres: (id) => request('GET', `/ministerios/${id}/lideres`),
    addLider: (id, cpf) => request('POST', `/ministerios/${id}/lideres`, { cpf_pessoa: cpf }),
    removeLider: (id, cpf) => request('DELETE', `/ministerios/${id}/lideres/${cpf}`),
  },

  pessoas: {
    list: (tipo) => request('GET', '/pessoas' + (tipo ? `?tipo=${tipo}` : '')),
    createMembro: (b) => request('POST', '/pessoas/membro', b),
    createVisitante: (b) => request('POST', '/pessoas/visitante', b),
    get: (cpf) => request('GET', `/pessoas/${cpf}`),
    update: (cpf, b) => request('PUT', `/pessoas/${cpf}`, b),
    remove: (cpf) => request('DELETE', `/pessoas/${cpf}`),
    listHabilidades: (cpf) => request('GET', `/pessoas/${cpf}/habilidades`),
    addHabilidade: (cpf, id_hab) => request('POST', `/pessoas/${cpf}/habilidades`, { id_habilidade: id_hab }),
    removeHabilidade: (cpf, id_hab) => request('DELETE', `/pessoas/${cpf}/habilidades/${id_hab}`),
    listMinisterios: (cpf) => request('GET', `/pessoas/${cpf}/ministerios`),
    addMinisterio: (cpf, id_min) => request('POST', `/pessoas/${cpf}/ministerios`, { id_ministerio: id_min }),
    removeMinisterio: (cpf, id_min) => request('DELETE', `/pessoas/${cpf}/ministerios/${id_min}`),
  },

  eventos: {
    list: (params) => request('GET', '/eventos' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (b) => request('POST', '/eventos', b),
    get: (id) => request('GET', `/eventos/${id}`),
    update: (id, b) => request('PUT', `/eventos/${id}`, b),
    remove: (id) => request('DELETE', `/eventos/${id}`),
    iniciar: (id) => request('PATCH', `/eventos/${id}/iniciar`),
    finalizar: (id) => request('PATCH', `/eventos/${id}/finalizar`),
  },

  alocacoes: {
    list: (params) => request('GET', '/alocacoes' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (b) => request('POST', '/alocacoes', b),
    remove: (id) => request('DELETE', `/alocacoes/${id}`),
  },

  relatorios: {
    escalaEvento: (id) => request('GET', `/relatorios/escala-evento/${id}`),
    agendaPessoa: (cpf) => request('GET', `/relatorios/agenda-pessoa/${cpf}`),
    participacao: (ini, fim) => request('GET', `/relatorios/participacao?ini=${ini}&fim=${fim}`),
    coberturaQuorum: (id) => request('GET', `/relatorios/cobertura-quorum/${id}`),
    distribuicaoMinisterio: () => request('GET', `/relatorios/distribuicao-ministerio`),
    pastoresVisitantes: () => request('GET', `/relatorios/pastores-visitantes`),
    ocupacaoLocais: () => request('GET', `/relatorios/ocupacao-locais`),
    voluntariosAptos: (id_evento, id_hab) =>
      request('GET', `/relatorios/voluntarios-aptos?id_evento=${id_evento}&id_habilidade=${id_hab}`),
  },
};
