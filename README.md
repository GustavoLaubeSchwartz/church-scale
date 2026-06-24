# Church Scale

Sistema de escalas de voluntários para a Igreja Evangélica Vida Nova.

## Stack

- **Backend:** Python 3.11+ · FastAPI · SQLAlchemy 2.0 ORM
- **Banco:** PostgreSQL 16 (via Docker)
- **Frontend:** Vanilla JS SPA (ES modules) · sem dependências externas

---

## Pré-requisitos

- Docker Desktop instalado e rodando
- Python 3.11+
- pip

---

## Iniciando o projeto

### 1. Subir o banco

```bash
cd church-scale
docker compose up -d
```

O container sobe o PostgreSQL na porta **5432** e cria o banco `church_scale` com
o schema automaticamente (via `database/schema.sql`).

### 2. Instalar dependências Python

```bash
cd backend
pip install -r requirements.txt
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite .env se necessário (a config padrão funciona com o docker-compose)
```

### 4. Popular o banco com dados iniciais

```bash
cd backend
python init_db.py
```

Isso recria as tabelas e insere os dados do mini-mundo (5 locais, 5 habilidades,
5 ministérios, 5 tipos de evento, 5 pessoas e 5 alocações).

### 5. Iniciar o servidor

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Acesse: **http://localhost:8000**

---

## Credenciais padrão

| Ministério  | Login         | Senha          |
|-------------|---------------|----------------|
| Louvor      | louvor        | louvor123      |
| Multimídia  | multimidia    | multimidia123  |
| Recepção    | recepcao      | recepcao123    |
| Infantil    | infantil      | infantil123    |
| Intercessão | intercessao   | intercessao123 |

---

## Documentação da API

Com o servidor rodando, acesse:

- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc:       http://localhost:8000/api/v1/redoc

---

## Estrutura do projeto

```
church-scale/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + montagem das rotas
│   │   ├── models.py        # SQLAlchemy ORM
│   │   ├── schemas.py       # Pydantic v2 schemas
│   │   ├── security.py      # JWT + bcrypt
│   │   ├── database.py      # Engine + sessão
│   │   ├── config.py        # Configurações (.env)
│   │   └── routers/         # Um arquivo por domínio
│   │       ├── auth.py
│   │       ├── pessoas.py
│   │       ├── ministerios.py
│   │       ├── habilidades.py
│   │       ├── locais.py
│   │       ├── tipos_evento.py
│   │       ├── eventos.py
│   │       ├── alocacoes.py
│   │       └── relatorios.py
│   ├── init_db.py           # Script de setup + seed
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── api.js           # Cliente HTTP centralizado
│       ├── app.js           # SPA router + shell
│       └── pages/           # Uma página por domínio
├── database/
│   └── schema.sql           # DDL (aplicado pelo Docker na primeira vez)
├── docker-compose.yml
├── SPEC.md                  # Especificação completa do sistema
└── README.md
```

---

## Relatórios disponíveis

1. **Escala por Evento** — lista todos os voluntários de um evento
2. **Agenda de Voluntário** — próximos eventos de uma pessoa
3. **Participação por Período** — total de alocações por pessoa num intervalo
4. **Cobertura de Quórum** — habilidades cobertas vs. necessárias por evento
5. **Distribuição por Ministério** — total de participações por ministério
6. **Pastores/Visitantes** — visitantes e quem os convidou
7. **Ocupação de Locais** — eventos realizados por local
8. **Voluntários Aptos** — pessoas com habilidade X não escaladas no evento Y
