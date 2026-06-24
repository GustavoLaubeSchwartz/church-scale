# Church Scale — Especificação de Sistema

## Contexto

Sistema de escalas de voluntários para a Igreja Evangélica Vida Nova. Ministérios
cadastram eventos, definem quais habilidades precisam e alocam voluntários à escala.
Apenas líderes de ministério (com login/senha) têm acesso ao sistema.

---

## Modelo de Domínio (modelo corrigido pelo professor)

### Entidades

| Entidade    | Atributos-chave                                                                    |
|-------------|------------------------------------------------------------------------------------|
| LOCAL       | id_local (PK), nome, capacidade_maxima                                             |
| HABILIDADE  | id_habilidade (PK), descricao                                                      |
| MINISTERIO  | id_ministerio (PK), nome, criado_em, login (UNIQUE), senha_hash                    |
| TIPO_EVENTO | id_tipo_evento (PK), descricao                                                     |
| PESSOA      | cpf (PK, 11 dígitos), nome, data_nascimento, numero_celular                        |
| MEMBRO      | id_membro (PK), cpf (FK→PESSOA UNIQUE), nome_celula                               |
| VISITANTE   | id_visitante (PK), cpf (FK→PESSOA UNIQUE), batizado, quanto_tempo_pastoreio, cpf_quem_convidou (FK→PESSOA) |
| EVENTO      | id_evento (PK), id_tipo_evento (FK), id_local (FK), dt_hr_prog_inicio, dt_hr_prog_fim, dt_hr_efet_inicio (nullable), dt_hr_efet_fim (nullable), qtd_participantes_esperados |
| ALOCACAO    | id_alocacao (PK), id_evento (FK), cpf_pessoa (FK), id_habilidade (FK), id_ministerio (FK) |

### Tabelas de Junção (N:N)

| Tabela    | Relação                           | Atributos extras |
|-----------|-----------------------------------|------------------|
| NECESSITA | TIPO_EVENTO ↔ HABILIDADE          | qtd              |
| POSSUI    | PESSOA ↔ HABILIDADE               | —                |
| PARTICIPA | PESSOA ↔ MINISTERIO               | —                |
| GERENCIA  | MINISTERIO ↔ TIPO_EVENTO          | —                |
| HABILITA  | LOCAL ↔ TIPO_EVENTO               | —                |
| LIDERA    | PESSOA ↔ MINISTERIO (líder)       | —                |

---

## Regras de Negócio

1. Um local comporta apenas um evento por intervalo de tempo (sem sobreposição de dt_hr_prog).
2. A pessoa só pode ser alocada num evento se possuir a habilidade informada.
3. A pessoa só pode ser alocada num evento se participar do ministério informado.
4. A mesma pessoa não pode ser alocada em dois eventos simultâneos.
5. NECESSITA define quórum mínimo de voluntários por habilidade para um tipo de evento.
6. dt_hr_efet_inicio e dt_hr_efet_fim registram o histórico real (atrasos).
7. Tipo de evento só pode ser realizado em local que o HABILITA.

---

## API Contract

**Base URL:** `/api/v1`  
**Autenticação:** JWT Bearer — todas as rotas exigem token, exceto `POST /auth/login`.  
**Content-Type:** `application/json`  
**Formato de timestamp:** ISO 8601 (`2025-03-15T09:00:00`)

### Auth

| Método | Rota              | Body                  | Retorno                     |
|--------|-------------------|-----------------------|-----------------------------|
| POST   | /auth/login       | {login, senha}        | {access_token, ministerio}  |
| GET    | /auth/me          | —                     | {id_ministerio, nome, login}|

### Pessoas

| Método | Rota                                          | Body / Params           |
|--------|-----------------------------------------------|-------------------------|
| GET    | /pessoas                                      | ?tipo=membro\|visitante |
| GET    | /pessoas/{cpf}                                | —                       |
| POST   | /pessoas/membro                               | PessoaMembroCreate      |
| POST   | /pessoas/visitante                            | PessoaVisitanteCreate   |
| PUT    | /pessoas/{cpf}                                | PessoaUpdate            |
| DELETE | /pessoas/{cpf}                                | —                       |
| GET    | /pessoas/{cpf}/habilidades                    | —                       |
| POST   | /pessoas/{cpf}/habilidades                    | {id_habilidade}         |
| DELETE | /pessoas/{cpf}/habilidades/{id_habilidade}    | —                       |
| GET    | /pessoas/{cpf}/ministerios                    | —                       |
| POST   | /pessoas/{cpf}/ministerios                    | {id_ministerio}         |
| DELETE | /pessoas/{cpf}/ministerios/{id_ministerio}    | —                       |

### Ministérios

| Método | Rota                                          | Body                    |
|--------|-----------------------------------------------|-------------------------|
| GET    | /ministerios                                  | —                       |
| POST   | /ministerios                                  | MinisterioCreate        |
| GET    | /ministerios/{id}                             | —                       |
| PUT    | /ministerios/{id}                             | MinisterioUpdate        |
| DELETE | /ministerios/{id}                             | —                       |
| GET    | /ministerios/{id}/membros                     | —                       |
| GET    | /ministerios/{id}/lideres                     | —                       |
| POST   | /ministerios/{id}/lideres                     | {cpf_pessoa}            |
| DELETE | /ministerios/{id}/lideres/{cpf}               | —                       |

### Habilidades

| Método | Rota               | Body            |
|--------|--------------------|-----------------|
| GET    | /habilidades       | —               |
| POST   | /habilidades       | {descricao}     |
| GET    | /habilidades/{id}  | —               |
| PUT    | /habilidades/{id}  | {descricao}     |
| DELETE | /habilidades/{id}  | —               |

### Locais

| Método | Rota                                          | Body                         |
|--------|-----------------------------------------------|------------------------------|
| GET    | /locais                                       | —                            |
| POST   | /locais                                       | {nome, capacidade_maxima}    |
| GET    | /locais/{id}                                  | —                            |
| PUT    | /locais/{id}                                  | LocalUpdate                  |
| DELETE | /locais/{id}                                  | —                            |
| GET    | /locais/{id}/tipos-evento                     | tipos habilitados            |
| POST   | /locais/{id}/tipos-evento                     | {id_tipo_evento}             |
| DELETE | /locais/{id}/tipos-evento/{id_tipo}           | —                            |

### Tipos de Evento

| Método | Rota                                                  | Body                     |
|--------|-------------------------------------------------------|--------------------------|
| GET    | /tipos-evento                                         | —                        |
| POST   | /tipos-evento                                         | {descricao}              |
| GET    | /tipos-evento/{id}                                    | —                        |
| PUT    | /tipos-evento/{id}                                    | {descricao}              |
| DELETE | /tipos-evento/{id}                                    | —                        |
| GET    | /tipos-evento/{id}/habilidades                        | lista com qtd            |
| POST   | /tipos-evento/{id}/habilidades                        | {id_habilidade, qtd}     |
| PUT    | /tipos-evento/{id}/habilidades/{id_hab}               | {qtd}                    |
| DELETE | /tipos-evento/{id}/habilidades/{id_hab}               | —                        |
| GET    | /tipos-evento/{id}/ministerios                        | quem gerencia            |
| POST   | /tipos-evento/{id}/ministerios                        | {id_ministerio}          |
| DELETE | /tipos-evento/{id}/ministerios/{id_min}               | —                        |

### Eventos

| Método | Rota                              | Body / Params             |
|--------|-----------------------------------|---------------------------|
| GET    | /eventos                          | ?id_tipo=&id_local=&ini=&fim= |
| POST   | /eventos                          | EventoCreate              |
| GET    | /eventos/{id}                     | —                         |
| PUT    | /eventos/{id}                     | EventoUpdate              |
| DELETE | /eventos/{id}                     | —                         |
| PATCH  | /eventos/{id}/iniciar             | — (sets efet_inicio=now)  |
| PATCH  | /eventos/{id}/finalizar           | — (sets efet_fim=now)     |

### Alocações

| Método | Rota                | Body / Params               |
|--------|---------------------|-----------------------------|
| GET    | /alocacoes          | ?id_evento=&cpf_pessoa=&id_ministerio= |
| POST   | /alocacoes          | AlocacaoCreate              |
| DELETE | /alocacoes/{id}     | —                           |

### Relatórios (8 queries do PDF)

| Rota                                           | Descrição                                            |
|------------------------------------------------|------------------------------------------------------|
| GET /relatorios/escala-evento/{id_evento}       | Escala completa de um evento                         |
| GET /relatorios/agenda-pessoa/{cpf}            | Agenda futura de um voluntário                       |
| GET /relatorios/participacao?ini=&fim=          | Contagem de alocações por pessoa num período         |
| GET /relatorios/cobertura-quorum/{id_evento}   | Habilidades com quórum descoberto vs. total          |
| GET /relatorios/distribuicao-ministerio        | Participações por ministério em eventos              |
| GET /relatorios/pastores-visitantes            | Visitantes e quem os convidou                        |
| GET /relatorios/ocupacao-locais                | Quantidade de eventos por local                      |
| GET /relatorios/voluntarios-aptos?id_evento=&id_habilidade= | Voluntários aptos não escalados        |

---

## Schemas Pydantic (resumo)

```
PessoaBase:        cpf, nome, data_nascimento, numero_celular
MembroCreate:      PessoaBase + nome_celula
VisitanteCreate:   PessoaBase + batizado, quanto_tempo_pastoreio, cpf_quem_convidou
EventoCreate:      id_tipo_evento, id_local, dt_hr_prog_inicio, dt_hr_prog_fim, qtd_participantes_esperados
AlocacaoCreate:    id_evento, cpf_pessoa, id_habilidade, id_ministerio
MinisterioCreate:  nome, login, senha, criado_em
```

---

## Credenciais padrão (seed)

| Ministério      | Login         | Senha         |
|-----------------|---------------|---------------|
| Louvor          | louvor        | louvor123     |
| Multimídia      | multimidia    | multimidia123 |
| Recepção        | recepcao      | recepcao123   |
| Infantil        | infantil      | infantil123   |
| Intercessão     | intercessao   | intercessao123|
