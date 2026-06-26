"""
Cria as tabelas e popula o banco com dados iniciais do mini-mundo (v2).
Uso:
  python init_db.py          # cria tabelas (se não existirem) e seed (se vazio)
  python init_db.py --reset  # derruba tudo e recria (development only)
"""
import datetime
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, SessionLocal
from app.models import (
    Base, Local, Habilidade, TipoEvento, Pessoa,
    Membro, Visitante, Evento, Alocacao, Necessita,
    possui_table, hospedar_table,
)
from app.security import hash_password


def init_tables(reset: bool = False):
    if reset:
        Base.metadata.drop_all(bind=engine)
        print("Tabelas removidas.")
    Base.metadata.create_all(bind=engine)
    print("Tabelas criadas/verificadas.")


def seed(db):
    # ── Locais ──────────────────────────────────────────────────────────────
    locais = [
        Local(nome="Templo Principal",   capacidade_maxima=500),
        Local(nome="Salão de Eventos",   capacidade_maxima=200),
        Local(nome="Sala de Reuniões A", capacidade_maxima=50),
        Local(nome="Auditório Kids",     capacidade_maxima=100),
        Local(nome="Espaço ao Ar Livre", capacidade_maxima=300),
    ]
    db.add_all(locais)
    db.flush()

    # ── Habilidades ─────────────────────────────────────────────────────────
    habilidades = [
        Habilidade(descricao="Vocal"),
        Habilidade(descricao="Baterista"),
        Habilidade(descricao="Operador de Som"),
        Habilidade(descricao="Operador de Mídia - Letra"),
        Habilidade(descricao="Diácono de Altar"),
        Habilidade(descricao="Recepcionista"),
        Habilidade(descricao="Professor Infantil"),
    ]
    db.add_all(habilidades)
    db.flush()

    # ── Tipos de Evento ──────────────────────────────────────────────────────
    tipos = [
        TipoEvento(descricao="Culto Dominical"),
        TipoEvento(descricao="Culto de Louvor"),
        TipoEvento(descricao="Reunião de Célula"),
        TipoEvento(descricao="Congresso Jovem"),
        TipoEvento(descricao="Culto Infantil"),
        TipoEvento(descricao="Batismo"),
    ]
    db.add_all(tipos)
    db.flush()

    # ── Quórum (NECESSITA) ───────────────────────────────────────────────────
    necessidades = [
        # Culto Dominical
        Necessita(id_tipo_evento=tipos[0].id_tipo_evento, id_habilidade=habilidades[0].id_habilidade, qtd=1),
        Necessita(id_tipo_evento=tipos[0].id_tipo_evento, id_habilidade=habilidades[1].id_habilidade, qtd=1),
        Necessita(id_tipo_evento=tipos[0].id_tipo_evento, id_habilidade=habilidades[3].id_habilidade, qtd=2),
        Necessita(id_tipo_evento=tipos[0].id_tipo_evento, id_habilidade=habilidades[4].id_habilidade, qtd=5),
        # Culto de Louvor
        Necessita(id_tipo_evento=tipos[1].id_tipo_evento, id_habilidade=habilidades[0].id_habilidade, qtd=3),
        Necessita(id_tipo_evento=tipos[1].id_tipo_evento, id_habilidade=habilidades[1].id_habilidade, qtd=1),
        Necessita(id_tipo_evento=tipos[1].id_tipo_evento, id_habilidade=habilidades[2].id_habilidade, qtd=1),
        # Culto Infantil
        Necessita(id_tipo_evento=tipos[4].id_tipo_evento, id_habilidade=habilidades[6].id_habilidade, qtd=2),
    ]
    db.add_all(necessidades)
    db.flush()

    # ── HOSPEDAR (local ↔ tipo_evento) ────────────────────────────────────────
    db.execute(hospedar_table.insert(), [
        {"id_local": locais[0].id_local, "id_tipo_evento": tipos[0].id_tipo_evento},
        {"id_local": locais[0].id_local, "id_tipo_evento": tipos[1].id_tipo_evento},
        {"id_local": locais[1].id_local, "id_tipo_evento": tipos[3].id_tipo_evento},
        {"id_local": locais[3].id_local, "id_tipo_evento": tipos[4].id_tipo_evento},
        {"id_local": locais[4].id_local, "id_tipo_evento": tipos[3].id_tipo_evento},
        {"id_local": locais[4].id_local, "id_tipo_evento": tipos[5].id_tipo_evento},
    ])

    # ── Pessoas (Membros) ────────────────────────────────────────────────────
    # Líder principal — pode logar (permissionamento LIDER)
    gustavo = Pessoa(
        nome="Gustavo Schwartz",
        numero_celular="27999990001",
        data_nascimento=datetime.date(1990, 5, 15),
        permissionamento="LIDER",
        senha_hash=hash_password("lider123"),
    )
    db.add(gustavo)
    db.flush()

    membro_gustavo = Membro(id_pessoa=gustavo.id_pessoa, nome_celula="ON10")
    db.add(membro_gustavo)
    db.flush()

    # Outros membros
    ana = Pessoa(
        nome="Ana Silva",
        numero_celular="27999990002",
        data_nascimento=datetime.date(1993, 3, 20),
        permissionamento="MEMBRO",
    )
    bruno = Pessoa(
        nome="Bruno Oliveira",
        numero_celular="27999990003",
        data_nascimento=datetime.date(1988, 7, 12),
        permissionamento="MEMBRO",
    )
    carla = Pessoa(
        nome="Carla Santos",
        numero_celular="27999990004",
        data_nascimento=datetime.date(1995, 11, 5),
        permissionamento="MEMBRO",
    )
    diego = Pessoa(
        nome="Diego Ferreira",
        numero_celular="27999990005",
        data_nascimento=datetime.date(1985, 4, 30),
        permissionamento="LIDER",
        senha_hash=hash_password("lider456"),
    )
    db.add_all([ana, bruno, carla, diego])
    db.flush()

    db.add_all([
        Membro(id_pessoa=ana.id_pessoa,   nome_celula="Alfa",  liderado_por=gustavo.id_pessoa),
        Membro(id_pessoa=bruno.id_pessoa, nome_celula="Beta",  liderado_por=gustavo.id_pessoa),
        Membro(id_pessoa=carla.id_pessoa, nome_celula="Gama",  liderado_por=diego.id_pessoa),
        Membro(id_pessoa=diego.id_pessoa, nome_celula="Delta"),
    ])
    db.flush()

    # ── Visitante ────────────────────────────────────────────────────────────
    eva = Pessoa(
        nome="Eva Costa",
        numero_celular="27999990006",
        data_nascimento=datetime.date(2000, 9, 18),
        permissionamento="MEMBRO",
    )
    db.add(eva)
    db.flush()

    db.add(Visitante(
        id_pessoa=eva.id_pessoa,
        batizado=True,
        e_pastor=False,
        convidado_por=gustavo.id_pessoa,
    ))

    # Pastor visitante externo
    pastor_joao = Pessoa(
        nome="Pastor João Lima",
        numero_celular="21999990010",
        permissionamento="MEMBRO",
    )
    db.add(pastor_joao)
    db.flush()

    db.add(Visitante(
        id_pessoa=pastor_joao.id_pessoa,
        batizado=True,
        e_pastor=True,
        convidado_por=gustavo.id_pessoa,
    ))
    db.flush()

    # ── POSSUI (pessoa → habilidade) ─────────────────────────────────────────
    db.execute(possui_table.insert(), [
        {"id_pessoa": gustavo.id_pessoa, "id_habilidade": habilidades[0].id_habilidade},
        {"id_pessoa": gustavo.id_pessoa, "id_habilidade": habilidades[4].id_habilidade},
        {"id_pessoa": ana.id_pessoa,     "id_habilidade": habilidades[0].id_habilidade},
        {"id_pessoa": ana.id_pessoa,     "id_habilidade": habilidades[1].id_habilidade},
        {"id_pessoa": bruno.id_pessoa,   "id_habilidade": habilidades[2].id_habilidade},
        {"id_pessoa": bruno.id_pessoa,   "id_habilidade": habilidades[3].id_habilidade},
        {"id_pessoa": carla.id_pessoa,   "id_habilidade": habilidades[5].id_habilidade},
        {"id_pessoa": carla.id_pessoa,   "id_habilidade": habilidades[4].id_habilidade},
        {"id_pessoa": diego.id_pessoa,   "id_habilidade": habilidades[6].id_habilidade},
        {"id_pessoa": diego.id_pessoa,   "id_habilidade": habilidades[4].id_habilidade},
    ])

    # ── Eventos ──────────────────────────────────────────────────────────────
    eventos = [
        Evento(
            id_tipo_evento=tipos[0].id_tipo_evento,
            id_local=locais[0].id_local,
            dt_hr_prog_inicio=datetime.datetime(2026, 6, 29, 9, 0),
            dt_hr_prog_fim=datetime.datetime(2026, 6, 29, 11, 30),
            qtd_participantes_esperados=200,
        ),
        Evento(
            id_tipo_evento=tipos[1].id_tipo_evento,
            id_local=locais[0].id_local,
            dt_hr_prog_inicio=datetime.datetime(2026, 7, 2, 19, 30),
            dt_hr_prog_fim=datetime.datetime(2026, 7, 2, 21, 30),
            qtd_participantes_esperados=150,
        ),
        Evento(
            id_tipo_evento=tipos[4].id_tipo_evento,
            id_local=locais[3].id_local,
            dt_hr_prog_inicio=datetime.datetime(2026, 6, 29, 9, 0),
            dt_hr_prog_fim=datetime.datetime(2026, 6, 29, 11, 0),
            dt_hr_efet_inicio=datetime.datetime(2026, 6, 29, 9, 12),
            dt_hr_efet_fim=datetime.datetime(2026, 6, 29, 11, 5),
            qtd_participantes_esperados=60,
        ),
        Evento(
            id_tipo_evento=tipos[3].id_tipo_evento,
            id_local=locais[1].id_local,
            dt_hr_prog_inicio=datetime.datetime(2026, 7, 12, 8, 0),
            dt_hr_prog_fim=datetime.datetime(2026, 7, 12, 18, 0),
            qtd_participantes_esperados=180,
        ),
        Evento(
            id_tipo_evento=tipos[0].id_tipo_evento,
            id_local=locais[0].id_local,
            dt_hr_prog_inicio=datetime.datetime(2026, 7, 6, 9, 0),
            dt_hr_prog_fim=datetime.datetime(2026, 7, 6, 11, 30),
            qtd_participantes_esperados=220,
        ),
    ]
    db.add_all(eventos)
    db.flush()

    # ── Alocações ────────────────────────────────────────────────────────────
    alocacoes = [
        Alocacao(id_evento=eventos[0].id_evento, id_pessoa=gustavo.id_pessoa, id_habilidade=habilidades[0].id_habilidade),
        Alocacao(id_evento=eventos[0].id_evento, id_pessoa=gustavo.id_pessoa, id_habilidade=habilidades[4].id_habilidade),
        Alocacao(id_evento=eventos[0].id_evento, id_pessoa=ana.id_pessoa,     id_habilidade=habilidades[1].id_habilidade),
        Alocacao(id_evento=eventos[0].id_evento, id_pessoa=bruno.id_pessoa,   id_habilidade=habilidades[3].id_habilidade),
        Alocacao(id_evento=eventos[2].id_evento, id_pessoa=diego.id_pessoa,   id_habilidade=habilidades[6].id_habilidade),
    ]
    db.add_all(alocacoes)
    db.commit()
    print("Dados iniciais inseridos.")
    print(f"  Login de teste: celular=27999990001  senha=lider123")
    print(f"  Login de teste: celular=27999990005  senha=lider456")


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
