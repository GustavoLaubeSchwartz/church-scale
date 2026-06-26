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
    let detail = 'Não autorizado';
    try { const err = await res.json(); detail = err.detail || detail; } catch (_) {}
    localStorage.removeItem('church_token');
    window.dispatchEvent(new CustomEvent('auth:expired'));
    throw new Error(detail);
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
    login: (numero_celular, senha) => request('POST', '/auth/login', { numero_celular, senha }),
    me:    ()                       => request('GET',  '/auth/me'),
  },

  habilidades: {
    list:   ()          => request('GET',    '/habilidades'),
    create: (b)         => request('POST',   '/habilidades', b),
    update: (id, b)     => request('PUT',    `/habilidades/${id}`, b),
    remove: (id)        => request('DELETE', `/habilidades/${id}`),
  },

  locais: {
    list:       ()          => request('GET',    '/locais'),
    create:     (b)         => request('POST',   '/locais', b),
    update:     (id, b)     => request('PUT',    `/locais/${id}`, b),
    remove:     (id)        => request('DELETE', `/locais/${id}`),
    listTipos:  (id)        => request('GET',    `/locais/${id}/tipos-evento`),
    addTipo:    (id, id_t)  => request('POST',   `/locais/${id}/tipos-evento`, { id_tipo_evento: id_t }),
    removeTipo: (id, id_t)  => request('DELETE', `/locais/${id}/tipos-evento/${id_t}`),
  },

  tipos: {
    list:              ()          => request('GET',    '/tipos-evento'),
    create:            (b)         => request('POST',   '/tipos-evento', b),
    update:            (id, b)     => request('PUT',    `/tipos-evento/${id}`, b),
    remove:            (id)        => request('DELETE', `/tipos-evento/${id}`),
    listHabilidades:   (id)        => request('GET',    `/tipos-evento/${id}/habilidades`),
    addHabilidade:     (id, b)     => request('POST',   `/tipos-evento/${id}/habilidades`, b),
    updateHabilidade:  (id, ih, b) => request('PUT',    `/tipos-evento/${id}/habilidades/${ih}`, b),
    removeHabilidade:  (id, ih)    => request('DELETE', `/tipos-evento/${id}/habilidades/${ih}`),
  },

  pessoas: {
    list:             (tipo)  => request('GET',    '/pessoas' + (tipo ? `?tipo=${tipo}` : '')),
    createMembro:     (b)     => request('POST',   '/pessoas/membro', b),
    createVisitante:  (b)     => request('POST',   '/pessoas/visitante', b),
    get:              (id)    => request('GET',    `/pessoas/${id}`),
    update:           (id, b) => request('PUT',    `/pessoas/${id}`, b),
    remove:           (id)    => request('DELETE', `/pessoas/${id}`),
    listHabilidades:  (id)    => request('GET',    `/pessoas/${id}/habilidades`),
    addHabilidade:    (id, ih)=> request('POST',   `/pessoas/${id}/habilidades`, { id_habilidade: ih }),
    removeHabilidade: (id, ih)=> request('DELETE', `/pessoas/${id}/habilidades/${ih}`),
  },

  eventos: {
    list:       (params) => request('GET',   '/eventos' + (params ? '?' + new URLSearchParams(params) : '')),
    create:     (b)      => request('POST',  '/eventos', b),
    get:        (id)     => request('GET',   `/eventos/${id}`),
    update:     (id, b)  => request('PUT',   `/eventos/${id}`, b),
    remove:     (id)     => request('DELETE',`/eventos/${id}`),
    iniciar:    (id)     => request('PATCH', `/eventos/${id}/iniciar`),
    finalizar:  (id)     => request('PATCH', `/eventos/${id}/finalizar`),
  },

  alocacoes: {
    list:   (params)                  => request('GET',    '/alocacoes' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (b)                       => request('POST',   '/alocacoes', b),
    remove: (id_ev, id_hab, id_pes)   => request('DELETE', `/alocacoes/${id_ev}/${id_hab}/${id_pes}`),
  },

  relatorios: {
    escalaEvento:       (id)        => request('GET', `/relatorios/escala-evento/${id}`),
    agendaPessoa:       (id)        => request('GET', `/relatorios/agenda-pessoa/${id}`),
    participacao:       (ini, fim)  => request('GET', `/relatorios/participacao?ini=${ini}&fim=${fim}`),
    coberturaQuorum:    (id)        => request('GET', `/relatorios/cobertura-quorum/${id}`),
    aptidaoHabilidade:  ()          => request('GET', `/relatorios/aptidao-habilidade`),
    pastoresVisitantes: ()          => request('GET', `/relatorios/pastores-visitantes`),
    ocupacaoLocais:     ()          => request('GET', `/relatorios/ocupacao-locais`),
    voluntariosAptos:   (id_ev, ih) => request('GET', `/relatorios/voluntarios-aptos?id_evento=${id_ev}&id_habilidade=${ih}`),
    controleAtrasos:    ()          => request('GET', `/relatorios/controle-atrasos`),
  },
};
