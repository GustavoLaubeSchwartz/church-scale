-- Church Scale — DDL (modelo corrigido pelo professor)
-- Banco: PostgreSQL 16

CREATE TABLE local (
    id_local        SERIAL      PRIMARY KEY,
    nome            VARCHAR(100) NOT NULL,
    capacidade_maxima INT        NOT NULL DEFAULT 100
);

CREATE TABLE habilidade (
    id_habilidade   SERIAL      PRIMARY KEY,
    descricao       VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE ministerio (
    id_ministerio   SERIAL      PRIMARY KEY,
    nome            VARCHAR(100) NOT NULL,
    criado_em       DATE        NOT NULL DEFAULT CURRENT_DATE,
    login           VARCHAR(50)  NOT NULL UNIQUE,
    senha_hash      VARCHAR(255) NOT NULL
);

CREATE TABLE tipo_evento (
    id_tipo_evento  SERIAL      PRIMARY KEY,
    descricao       VARCHAR(100) NOT NULL UNIQUE
);

-- Hierarquia de Pessoa
CREATE TABLE pessoa (
    cpf             CHAR(11)    PRIMARY KEY,
    nome            VARCHAR(100) NOT NULL,
    data_nascimento DATE,
    numero_celular  VARCHAR(15)
);

CREATE TABLE membro (
    id_membro       SERIAL      PRIMARY KEY,
    cpf             CHAR(11)    NOT NULL UNIQUE REFERENCES pessoa(cpf) ON DELETE CASCADE,
    nome_celula     VARCHAR(50)
);

CREATE TABLE visitante (
    id_visitante            SERIAL  PRIMARY KEY,
    cpf                     CHAR(11) NOT NULL UNIQUE REFERENCES pessoa(cpf) ON DELETE CASCADE,
    batizado                BOOLEAN NOT NULL DEFAULT FALSE,
    quanto_tempo_pastoreio  VARCHAR(50),
    cpf_quem_convidou       CHAR(11) REFERENCES pessoa(cpf) ON DELETE SET NULL
);

-- Evento com datas corrigidas (prog + efet)
CREATE TABLE evento (
    id_evento                   SERIAL      PRIMARY KEY,
    id_tipo_evento              INT         NOT NULL REFERENCES tipo_evento(id_tipo_evento),
    id_local                    INT         NOT NULL REFERENCES local(id_local),
    dt_hr_prog_inicio           TIMESTAMP   NOT NULL,
    dt_hr_prog_fim              TIMESTAMP   NOT NULL,
    dt_hr_efet_inicio           TIMESTAMP,
    dt_hr_efet_fim              TIMESTAMP,
    qtd_participantes_esperados INT         NOT NULL DEFAULT 0,
    CONSTRAINT chk_prog_ordem CHECK (dt_hr_prog_fim > dt_hr_prog_inicio)
);

-- Entidade central de escalas (quaternária)
CREATE TABLE alocacao (
    id_alocacao     SERIAL  PRIMARY KEY,
    id_evento       INT     NOT NULL REFERENCES evento(id_evento) ON DELETE CASCADE,
    cpf_pessoa      CHAR(11) NOT NULL REFERENCES pessoa(cpf),
    id_habilidade   INT     NOT NULL REFERENCES habilidade(id_habilidade),
    id_ministerio   INT     NOT NULL REFERENCES ministerio(id_ministerio),
    UNIQUE (id_evento, cpf_pessoa, id_habilidade)
);

-- N:N com atributo
CREATE TABLE necessita (
    id_tipo_evento  INT NOT NULL REFERENCES tipo_evento(id_tipo_evento) ON DELETE CASCADE,
    id_habilidade   INT NOT NULL REFERENCES habilidade(id_habilidade) ON DELETE CASCADE,
    qtd             INT NOT NULL DEFAULT 1 CHECK (qtd > 0),
    PRIMARY KEY (id_tipo_evento, id_habilidade)
);

-- N:N simples
CREATE TABLE possui (
    cpf_pessoa      CHAR(11) NOT NULL REFERENCES pessoa(cpf) ON DELETE CASCADE,
    id_habilidade   INT      NOT NULL REFERENCES habilidade(id_habilidade) ON DELETE CASCADE,
    PRIMARY KEY (cpf_pessoa, id_habilidade)
);

CREATE TABLE participa (
    cpf_pessoa      CHAR(11) NOT NULL REFERENCES pessoa(cpf) ON DELETE CASCADE,
    id_ministerio   INT      NOT NULL REFERENCES ministerio(id_ministerio) ON DELETE CASCADE,
    PRIMARY KEY (cpf_pessoa, id_ministerio)
);

CREATE TABLE gerencia (
    id_ministerio   INT NOT NULL REFERENCES ministerio(id_ministerio) ON DELETE CASCADE,
    id_tipo_evento  INT NOT NULL REFERENCES tipo_evento(id_tipo_evento) ON DELETE CASCADE,
    PRIMARY KEY (id_ministerio, id_tipo_evento)
);

-- NOVO: Local habilita Tipo de Evento
CREATE TABLE habilita (
    id_local        INT NOT NULL REFERENCES local(id_local) ON DELETE CASCADE,
    id_tipo_evento  INT NOT NULL REFERENCES tipo_evento(id_tipo_evento) ON DELETE CASCADE,
    PRIMARY KEY (id_local, id_tipo_evento)
);

-- NOVO: Líder de Ministério (PESSOA que lidera MINISTERIO)
CREATE TABLE lidera (
    cpf_pessoa      CHAR(11) NOT NULL REFERENCES pessoa(cpf) ON DELETE CASCADE,
    id_ministerio   INT      NOT NULL REFERENCES ministerio(id_ministerio) ON DELETE CASCADE,
    PRIMARY KEY (cpf_pessoa, id_ministerio)
);
