-- Church Scale — DDL v2 (modelo sem Ministério)
-- Banco: PostgreSQL 16

CREATE TABLE local (
    id_local          SERIAL       PRIMARY KEY,
    nome              VARCHAR(100) NOT NULL,
    capacidade_maxima INT          NOT NULL DEFAULT 100
);

CREATE TABLE habilidade (
    id_habilidade SERIAL       PRIMARY KEY,
    descricao     VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE tipo_evento (
    id_tipo_evento SERIAL       PRIMARY KEY,
    descricao      VARCHAR(100) NOT NULL UNIQUE
);

-- Hierarquia de Pessoa (generalização/especialização)
CREATE TABLE pessoa (
    id_pessoa       SERIAL       PRIMARY KEY,
    nome            VARCHAR(100) NOT NULL,
    numero_celular  VARCHAR(15)  UNIQUE,
    data_nascimento DATE,
    permissionamento VARCHAR(20) NOT NULL DEFAULT 'MEMBRO',
    senha_hash      VARCHAR(255)
);

CREATE TABLE membro (
    id_membro    SERIAL  PRIMARY KEY,
    id_pessoa    INT     NOT NULL UNIQUE REFERENCES pessoa(id_pessoa) ON DELETE CASCADE,
    nome_celula  VARCHAR(50),
    liderado_por INT     REFERENCES pessoa(id_pessoa) ON DELETE SET NULL
);

CREATE TABLE visitante (
    id_visitante  SERIAL   PRIMARY KEY,
    id_pessoa     INT      NOT NULL UNIQUE REFERENCES pessoa(id_pessoa) ON DELETE CASCADE,
    batizado      BOOLEAN  NOT NULL DEFAULT FALSE,
    e_pastor      BOOLEAN  NOT NULL DEFAULT FALSE,
    convidado_por INT      REFERENCES pessoa(id_pessoa) ON DELETE SET NULL
);

-- Evento com quatro marcos temporais
CREATE TABLE evento (
    id_evento                   SERIAL    PRIMARY KEY,
    id_tipo_evento              INT       NOT NULL REFERENCES tipo_evento(id_tipo_evento),
    id_local                    INT       NOT NULL REFERENCES local(id_local),
    dt_hr_prog_inicio           TIMESTAMP NOT NULL,
    dt_hr_prog_fim              TIMESTAMP NOT NULL,
    dt_hr_efet_inicio           TIMESTAMP,
    dt_hr_efet_fim              TIMESTAMP,
    qtd_participantes_esperados INT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_prog_ordem CHECK (dt_hr_prog_fim > dt_hr_prog_inicio)
);

-- Alocação: chave composta (evento + habilidade + pessoa)
CREATE TABLE alocacao (
    id_evento     INT NOT NULL REFERENCES evento(id_evento) ON DELETE CASCADE,
    id_habilidade INT NOT NULL REFERENCES habilidade(id_habilidade),
    id_pessoa     INT NOT NULL REFERENCES pessoa(id_pessoa),
    PRIMARY KEY (id_evento, id_habilidade, id_pessoa)
);

-- Quórum: tipo de evento necessita N pessoas com determinada habilidade
CREATE TABLE necessita (
    id_tipo_evento INT NOT NULL REFERENCES tipo_evento(id_tipo_evento) ON DELETE CASCADE,
    id_habilidade  INT NOT NULL REFERENCES habilidade(id_habilidade)  ON DELETE CASCADE,
    qtd            INT NOT NULL DEFAULT 1 CHECK (qtd > 0),
    PRIMARY KEY (id_tipo_evento, id_habilidade)
);

-- Competências de cada pessoa
CREATE TABLE possui (
    id_pessoa     INT NOT NULL REFERENCES pessoa(id_pessoa)    ON DELETE CASCADE,
    id_habilidade INT NOT NULL REFERENCES habilidade(id_habilidade) ON DELETE CASCADE,
    PRIMARY KEY (id_pessoa, id_habilidade)
);

-- Locais habilitados para cada tipo de evento
CREATE TABLE hospedar (
    id_local       INT NOT NULL REFERENCES local(id_local)             ON DELETE CASCADE,
    id_tipo_evento INT NOT NULL REFERENCES tipo_evento(id_tipo_evento) ON DELETE CASCADE,
    PRIMARY KEY (id_local, id_tipo_evento)
);
