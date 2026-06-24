"""
Cria as tabelas e popula o banco com dados iniciais do mini-mundo.
Uso:
  python init_db.py          # cria tabelas (se não existirem) e seed (se vazio)
  python init_db.py --reset  # derruba tudo e recria (development only)
"""
import datetime
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, SessionLocal
from app.models import Base, Local, Habilidade, Ministerio, TipoEvento, Pessoa, Membro, Visitante, Evento, Alocacao, Necessita
from app.security import hash_password

# association tables (imported via Base.metadata)
from app.models import participa_table, possui_table, habilita_table, lidera_table, gerencia_table


def init_tables(reset: bool = False):
    if reset:
        Base.metadata.drop_all(bind=engine)
        print("Tabelas removidas.")
    Base.metadata.create_all(bind=engine)
    print("Tabelas criadas/verificadas.")


def seed(db):
    # ── Locais ──────────────────────────────────────────────────────────────
    locais = [
        Local(nome="Templo Principal",       capacidade_maxima=500),
        Local(nome="Salão de Eventos",        capacidade_maxima=200),
        Local(nome="Sala de Reuniões A",      capacidade_maxima=50),
        Local(nome="Auditório Kids",          capacidade_maxima=100),
        Local(nome="Espaço ao Ar Livre",      capacidade_maxima=300),
    ]
    db.add_all(locais)
    db.flush()

    # ── Habilidades ─────────────────────────────────────────────────────────
    habilidades = [
        Habilidade(descricao="Vocal"),
        Habilidade(descricao="Instrumentista"),
        Habilidade(descricao="Operador de Som"),
        Habilidade(descricao="Recepcionista"),
        Habilidade(descricao="Professor Infantil"),
    ]
    db.add_all(habilidades)
    db.flush()

    # ── Ministérios ─────────────────────────────────────────────────────────
    ministerios = [
        Ministerio(nome="Louvor",       login="louvor",      senha_hash=hash_password("louvor123"),      criado_em=datetime.date(2020, 1, 15)),
        Ministerio(nome="Multimídia",   login="multimidia",  senha_hash=hash_password("multimidia123"),  criado_em=datetime.date(2020, 3, 10)),
        Ministerio(nome="Recepção",     login="recepcao",    senha_hash=hash_password("recepcao123"),    criado_em=datetime.date(2021, 6, 5)),
        Ministerio(nome="Infantil",     login="infantil",    senha_hash=hash_password("infantil123"),    criado_em=datetime.date(2021, 8, 20)),
        Ministerio(nome="Intercessão",  login="intercessao", senha_hash=hash_password("intercessao123"), criado_em=datetime.date(2022, 2, 1)),
    ]
    db.add_all(ministerios)
    db.flush()

    # ── Tipos de Evento ──────────────────────────────────────────────────────
    tipos = [
        TipoEvento(descricao="Culto Dominical"),
        TipoEvento(descricao="Culto de Louvor"),
        TipoEvento(descricao="Reunião de Célula"),
        TipoEvento(descricao="Congresso Jovem"),
        TipoEvento(descricao="Culto Infantil"),
    ]
    db.add_all(tipos)
    db.flush()

    # ── Pessoas ──────────────────────────────────────────────────────────────
    pessoas_data = [
        dict(cpf="12345678901", nome="Ana Silva",      data_nascimento=datetime.date(1990, 3, 15), numero_celular="11999990001"),
        dict(cpf="23456789012", nome="Bruno Oliveira", data_nascimento=datetime.date(1985, 7, 22), numero_celular="11999990002"),
        dict(cpf="34567890123", nome="Carla Santos",   data_nascimento=datetime.date(1995, 11, 5), numero_celular="11999990003"),
        dict(cpf="45678901234", nome="Diego Ferreira", data_nascimento=datetime.date(1988, 4, 30), numero_celular="11999990004"),
        dict(cpf="56789012345", nome="Eva Costa",      data_nascimento=datetime.date(2000, 9, 18), numero_celular="11999990005"),
    ]
    pessoas = [Pessoa(**p) for p in pessoas_data]
    db.add_all(pessoas)
    db.flush()

    # Subtipos
    membros = [
        Membro(cpf="12345678901", nome_celula="Célula Alfa"),
        Membro(cpf="23456789012", nome_celula="Célula Beta"),
        Membro(cpf="34567890123", nome_celula="Célula Gama"),
        Membro(cpf="45678901234", nome_celula="Célula Delta"),
    ]
    db.add_all(membros)

    visitante = Visitante(
        cpf="56789012345",
        batizado=False,
        quanto_tempo_pastoreio="6 meses",
        cpf_quem_convidou="12345678901",
    )
    db.add(visitante)
    db.flush()

    # ── Necessita (tipo_evento ↔ habilidade com qtd) ─────────────────────────
    necessidades = [
        Necessita(id_tipo_evento=tipos[0].id_tipo_evento, id_habilidade=habilidades[0].id_habilidade, qtd=3),
        Necessita(id_tipo_evento=tipos[0].id_tipo_evento, id_habilidade=habilidades[1].id_habilidade, qtd=2),
        Necessita(id_tipo_evento=tipos[0].id_tipo_evento, id_habilidade=habilidades[2].id_habilidade, qtd=1),
        Necessita(id_tipo_evento=tipos[0].id_tipo_evento, id_habilidade=habilidades[3].id_habilidade, qtd=4),
        Necessita(id_tipo_evento=tipos[4].id_tipo_evento, id_habilidade=habilidades[4].id_habilidade, qtd=2),
        Necessita(id_tipo_evento=tipos[1].id_tipo_evento, id_habilidade=habilidades[0].id_habilidade, qtd=4),
        Necessita(id_tipo_evento=tipos[1].id_tipo_evento, id_habilidade=habilidades[1].id_habilidade, qtd=3),
    ]
    db.add_all(necessidades)
    db.flush()

    # ── Associações N:N ──────────────────────────────────────────────────────

    # POSSUI (pessoa → habilidade)
    db.execute(possui_table.insert(), [
        {"cpf_pessoa": "12345678901", "id_habilidade": habilidades[0].id_habilidade},
        {"cpf_pessoa": "12345678901", "id_habilidade": habilidades[1].id_habilidade},
        {"cpf_pessoa": "23456789012", "id_habilidade": habilidades[2].id_habilidade},
        {"cpf_pessoa": "34567890123", "id_habilidade": habilidades[3].id_habilidade},
        {"cpf_pessoa": "45678901234", "id_habilidade": habilidades[4].id_habilidade},
    ])

    # PARTICIPA (pessoa → ministério)
    db.execute(participa_table.insert(), [
        {"cpf_pessoa": "12345678901", "id_ministerio": ministerios[0].id_ministerio},
        {"cpf_pessoa": "23456789012", "id_ministerio": ministerios[1].id_ministerio},
        {"cpf_pessoa": "34567890123", "id_ministerio": ministerios[2].id_ministerio},
        {"cpf_pessoa": "45678901234", "id_ministerio": ministerios[3].id_ministerio},
        {"cpf_pessoa": "56789012345", "id_ministerio": ministerios[0].id_ministerio},
    ])

    # LIDERA (líderes dos ministérios)
    db.execute(lidera_table.insert(), [
        {"cpf_pessoa": "12345678901", "id_ministerio": ministerios[0].id_ministerio},
        {"cpf_pessoa": "23456789012", "id_ministerio": ministerios[1].id_ministerio},
        {"cpf_pessoa": "34567890123", "id_ministerio": ministerios[2].id_ministerio},
        {"cpf_pessoa": "45678901234", "id_ministerio": ministerios[3].id_ministerio},
    ])

    # GERENCIA (ministério → tipo de evento)
    db.execute(gerencia_table.insert(), [
        {"id_ministerio": ministerios[0].id_ministerio, "id_tipo_evento": tipos[0].id_tipo_evento},
        {"id_ministerio": ministerios[0].id_ministerio, "id_tipo_evento": tipos[1].id_tipo_evento},
        {"id_ministerio": ministerios[1].id_ministerio, "id_tipo_evento": tipos[0].id_tipo_evento},
        {"id_ministerio": ministerios[3].id_ministerio, "id_tipo_evento": tipos[4].id_tipo_evento},
    ])

    # HABILITA (local → tipo de evento)
    db.execute(habilita_table.insert(), [
        {"id_local": locais[0].id_local, "id_tipo_evento": tipos[0].id_tipo_evento},
        {"id_local": locais[0].id_local, "id_tipo_evento": tipos[1].id_tipo_evento},
        {"id_local": locais[1].id_local, "id_tipo_evento": tipos[3].id_tipo_evento},
        {"id_local": locais[3].id_local, "id_tipo_evento": tipos[4].id_tipo_evento},
        {"id_local": locais[4].id_local, "id_tipo_evento": tipos[3].id_tipo_evento},
    ])

    # ── Eventos ──────────────────────────────────────────────────────────────
    eventos = [
        Evento(
            id_tipo_evento=tipos[0].id_tipo_evento,
            id_local=locais[0].id_local,
            dt_hr_prog_inicio=datetime.datetime(2025, 3, 2, 9, 0),
            dt_hr_prog_fim=datetime.datetime(2025, 3, 2, 11, 30),
            dt_hr_efet_inicio=datetime.datetime(2025, 3, 2, 9, 10),
            dt_hr_efet_fim=datetime.datetime(2025, 3, 2, 11, 45),
            qtd_participantes_esperados=200,
        ),
        Evento(
            id_tipo_evento=tipos[1].id_tipo_evento,
            id_local=locais[0].id_local,
            dt_hr_prog_inicio=datetime.datetime(2025, 3, 5, 19, 30),
            dt_hr_prog_fim=datetime.datetime(2025, 3, 5, 21, 30),
            qtd_participantes_esperados=150,
        ),
        Evento(
            id_tipo_evento=tipos[4].id_tipo_evento,
            id_local=locais[3].id_local,
            dt_hr_prog_inicio=datetime.datetime(2025, 3, 2, 9, 0),
            dt_hr_prog_fim=datetime.datetime(2025, 3, 2, 11, 0),
            qtd_participantes_esperados=60,
        ),
        Evento(
            id_tipo_evento=tipos[3].id_tipo_evento,
            id_local=locais[1].id_local,
            dt_hr_prog_inicio=datetime.datetime(2025, 3, 15, 8, 0),
            dt_hr_prog_fim=datetime.datetime(2025, 3, 15, 18, 0),
            qtd_participantes_esperados=180,
        ),
        Evento(
            id_tipo_evento=tipos[0].id_tipo_evento,
            id_local=locais[0].id_local,
            dt_hr_prog_inicio=datetime.datetime(2025, 3, 9, 9, 0),
            dt_hr_prog_fim=datetime.datetime(2025, 3, 9, 11, 30),
            qtd_participantes_esperados=200,
        ),
    ]
    db.add_all(eventos)
    db.flush()

    # ── Alocações ────────────────────────────────────────────────────────────
    alocacoes = [
        Alocacao(id_evento=eventos[0].id_evento, cpf_pessoa="12345678901", id_habilidade=habilidades[0].id_habilidade, id_ministerio=ministerios[0].id_ministerio),
        Alocacao(id_evento=eventos[0].id_evento, cpf_pessoa="12345678901", id_habilidade=habilidades[1].id_habilidade, id_ministerio=ministerios[0].id_ministerio),
        Alocacao(id_evento=eventos[0].id_evento, cpf_pessoa="23456789012", id_habilidade=habilidades[2].id_habilidade, id_ministerio=ministerios[1].id_ministerio),
        Alocacao(id_evento=eventos[0].id_evento, cpf_pessoa="34567890123", id_habilidade=habilidades[3].id_habilidade, id_ministerio=ministerios[2].id_ministerio),
        Alocacao(id_evento=eventos[2].id_evento, cpf_pessoa="45678901234", id_habilidade=habilidades[4].id_habilidade, id_ministerio=ministerios[3].id_ministerio),
    ]
    db.add_all(alocacoes)
    db.commit()
    print("Dados iniciais inseridos.")


if __name__ == "__main__":
    reset = "--reset" in sys.argv
    init_tables(reset=reset)

    db = SessionLocal()
    try:
        if db.query(Local).count() == 0:
            seed(db)
        else:
            print("Banco já possui dados — seed ignorado.")
    except Exception as e:
        db.rollback()
        print(f"Erro ao popular: {e}")
        raise
    finally:
        db.close()
