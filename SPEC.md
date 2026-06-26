# Church Scale — Especificação de Sistema (v2)

## Contexto

Sistema de escalas de voluntários para a Igreja Evangélica Vida. Pessoas com
permissionamento adequado (tipicamente líderes) efetuam login e operam as escalas.
O acesso é controlado por `permissionamento` e `senha` diretamente na entidade PESSOA —
não existe mais a entidade Ministério.

---

## Modelo de Domínio (v2)

### Entidades

| Entidade    | Atributos-chave |
|-------------|-----------------|
| LOCAL       | id_local (PK), nome, capacidade_maxima |
| HABILIDADE  | id_habilidade (PK), descricao (UNIQUE) |
| TIPO_EVENTO | id_tipo_evento (PK), descricao (UNIQUE) |
| PESSOA      | id_pessoa (PK, autoincrement), nome, numero_celular (UNIQUE), data_nascimento, permissionamento (`MEMBRO`\|`LIDER`\|`ADMIN`), senha_hash (nullable) |
| MEMBRO      | id_membro (PK), id_pessoa (FK→PESSOA UNIQUE), nome_celula, liderado_por (FK→PESSOA nullable) |
| VISITANTE   | id_visitante (PK), id_pessoa (FK→PESSOA UNIQUE), batizado (bool), e_pastor (bool), convidado_por (FK→PESSOA nullable) |
| EVENTO      | id_evento (PK), id_tipo_evento (FK), id_local (FK), dt_hr_prog_inicio, dt_hr_prog_fim, dt_hr_efet_inicio (nullable), dt_hr_efet_fim (nullable), qtd_participantes_esperados |
| ALOCACAO    | **PK composta** (id_evento FK, id_habilidade FK, id_pessoa FK) |

### Tabelas de Junção (N:N)

| Tabela   | Relação                  | Atributos extras |
|----------|--------------------------|------------------|
| NECESSITA | TIPO_EVENTO ↔ HABILIDADE | qtd (int > 0)   |
| POSSUI   | PESSOA ↔ HABILIDADE       | —                |
| HOSPEDAR | LOCAL ↔ TIPO_EVENTO       | —                |

> **Removidas do v1:** MINISTERIO, PARTICIPA, GERENCIA, HABILITA, LIDERA.

---

## Regras de Negócio

1. Um local comporta apenas um evento por intervalo de tempo (sem sobreposição de `dt_hr_prog`).
2. A pessoa só pode ser alocada num evento se **possuir** a habilidade informada (tabela POSSUI).
3. A mesma pessoa não pode ser alocada em dois eventos simultâneos (conflito de horário).
4. `qtd_participantes_esperados` não pode exceder a `capacidade_maxima` do local.
5. NECESSITA define o quórum mínimo de voluntários por habilidade para um tipo de evento.
6. `dt_hr_efet_inicio` e `dt_hr_efet_fim` registram o horário real (base para controle de atrasos).
7. Tipo de evento só pode ser realizado em local que o habilite (tabela HOSPEDAR).
8. `dt_hr_prog_fim > dt_hr_prog_inicio` (check constraint no banco).

---

## API Contract

**Base URL:** `/api/v1`  
**Autenticação:** JWT Bearer — todas as rotas exigem token, exceto `POST /auth/login`.  
**Content-Type:** `application/json`  
**Formato de timestamp:** ISO 8601 (`2026-06-29T09:00:00`)

### Auth

| Método | Rota        | Body                          | Retorno                      |
|--------|-------------|-------------------------------|------------------------------|
| POST   | /auth/login | `{numero_celular, senha}`     | `{access_token, pessoa}`     |
| GET    | /auth/me    | —                             | PessoaOut                    |

### Pessoas

| Método | Rota                                           | Body / Params           |
|--------|------------------------------------------------|-------------------------|
| GET    | /pessoas                                       | ?tipo=membro\|visitante |
| GET    | /pessoas/{id_pessoa}                           | —                       |
| POST   | /pessoas/membro                                | MembroCreate            |
| POST   | /pessoas/visitante                             | VisitanteCreate         |
| PUT    | /pessoas/{id_pessoa}                           | PessoaUpdate            |
| DELETE | /pessoas/{id_pessoa}                           | —                       |
| GET    | /pessoas/{id_pessoa}/habilidades               | —                       |
| POST   | /pessoas/{id_pessoa}/habilidades               | `{id_habilidade}`       |
| DELETE | /pessoas/{id_pessoa}/habilidades/{id_hab}      | —                       |

### Habilidades

| Método | Rota               | Body        |
|--------|--------------------|-------------|
| GET    | /habilidades       | —           |
| POST   | /habilidades       | `{descricao}` |
| GET    | /habilidades/{id}  | —           |
| PUT    | /habilidades/{id}  | `{descricao}` |
| DELETE | /habilidades/{id}  | —           |

### Locais

| Método | Rota                                | Body                       |
|--------|-------------------------------------|----------------------------|
| GET    | /locais                             | —                          |
| POST   | /locais                             | `{nome, capacidade_maxima}` |
| GET    | /locais/{id}                        | —                          |
| PUT    | /locais/{id}                        | LocalUpdate                |
| DELETE | /locais/{id}                        | —                          |
| GET    | /locais/{id}/tipos-evento           | tipos habilitados          |
| POST   | /locais/{id}/tipos-evento           | `{id_tipo_evento}`         |
| DELETE | /locais/{id}/tipos-evento/{id_tipo} | —                          |

### Tipos de Evento

| Método | Rota                                      | Body                 |
|--------|-------------------------------------------|----------------------|
| GET    | /tipos-evento                             | —                    |
| POST   | /tipos-evento                             | `{descricao}`        |
| GET    | /tipos-evento/{id}                        | —                    |
| PUT    | /tipos-evento/{id}                        | `{descricao}`        |
| DELETE | /tipos-evento/{id}                        | —                    |
| GET    | /tipos-evento/{id}/habilidades            | lista com qtd        |
| POST   | /tipos-evento/{id}/habilidades            | `{id_habilidade, qtd}` |
| PUT    | /tipos-evento/{id}/habilidades/{id_hab}   | `{qtd}`              |
| DELETE | /tipos-evento/{id}/habilidades/{id_hab}   | —                    |

### Eventos

| Método | Rota                        | Body / Params                     |
|--------|-----------------------------|-----------------------------------|
| GET    | /eventos                    | ?id_tipo=&id_local=&ini=&fim=     |
| POST   | /eventos                    | EventoCreate                      |
| GET    | /eventos/{id}               | —                                 |
| PUT    | /eventos/{id}               | EventoUpdate                      |
| DELETE | /eventos/{id}               | —                                 |
| PATCH  | /eventos/{id}/iniciar       | — (sets efet_inicio = now)        |
| PATCH  | /eventos/{id}/finalizar     | — (sets efet_fim = now)           |

### Alocações

> PK composta — o delete usa os 3 IDs no path.

| Método | Rota                                              | Body / Params          |
|--------|---------------------------------------------------|------------------------|
| GET    | /alocacoes                                        | ?id_evento=&id_pessoa= |
| POST   | /alocacoes                                        | AlocacaoCreate         |
| DELETE | /alocacoes/{id_evento}/{id_habilidade}/{id_pessoa}| —                      |

### Relatórios (9 queries)

| Rota | Descrição |
|------|-----------|
| GET /relatorios/escala-evento/{id_evento} | Escala completa de um evento (pessoa, habilidade, tipo membro/visitante) |
| GET /relatorios/agenda-pessoa/{id_pessoa} | Eventos futuros de um voluntário |
| GET /relatorios/participacao?ini=&fim= | Contagem de alocações por pessoa num período |
| GET /relatorios/cobertura-quorum/{id_evento} | Habilidades com quórum descoberto vs. total |
| GET /relatorios/aptidao-habilidade | Aptos × acionamentos por habilidade (substitui distribuição por ministério) |
| GET /relatorios/pastores-visitantes | Visitantes, se é pastor, e quem os convidou |
| GET /relatorios/ocupacao-locais | Quantidade de eventos por local |
| GET /relatorios/voluntarios-aptos?id_evento=&id_habilidade= | Voluntários aptos não escalados |
| GET /relatorios/controle-atrasos | Atraso de início e duração efetiva × planejada de todos os eventos |

---

## Schemas Pydantic (resumo)

```
PessoaBase:      nome, numero_celular, data_nascimento, permissionamento
MembroCreate:    PessoaBase + senha?, nome_celula?, liderado_por?
VisitanteCreate: PessoaBase + senha?, batizado, e_pastor, convidado_por?
PessoaUpdate:    todos os campos opcionais (base + subtipo)
PessoaOut:       id_pessoa, nome, numero_celular, data_nascimento, permissionamento, tipo

EventoCreate:    id_tipo_evento, id_local, dt_hr_prog_inicio, dt_hr_prog_fim, qtd_participantes_esperados
AlocacaoCreate:  id_evento, id_pessoa, id_habilidade
LoginRequest:    numero_celular, senha
TokenOut:        access_token, token_type, pessoa: PessoaOut
```

---

## Credenciais padrão (seed v2)

| Nome             | Celular       | Senha     | Permissionamento |
|------------------|---------------|-----------|-----------------|
| Gustavo Schwartz | 27999990001   | lider123  | LIDER           |
| Diego Ferreira   | 27999990005   | lider456  | LIDER           |

> Os demais membros e visitantes do seed não têm senha definida (não podem logar).

---

## Stack

- **Backend:** FastAPI 0.115+ · SQLAlchemy 2.0 · PostgreSQL 16 · python-jose · passlib/bcrypt · Pydantic v2
- **Frontend:** Vanilla ES Modules (sem framework/bundler)
- **Infra:** Docker Compose (postgres + backend)
- **Auth flow:** `POST /auth/login` → JWT Bearer → todas as rotas protegidas
