import datetime
from typing import List, Optional
from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey, Integer,
    String, UniqueConstraint, Table, CheckConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# --- Association tables (pure join, no extra columns) ---

participa_table = Table(
    "participa", Base.metadata,
    Column("cpf_pessoa", String(11), ForeignKey("pessoa.cpf", ondelete="CASCADE"), primary_key=True),
    Column("id_ministerio", Integer, ForeignKey("ministerio.id_ministerio", ondelete="CASCADE"), primary_key=True),
)

possui_table = Table(
    "possui", Base.metadata,
    Column("cpf_pessoa", String(11), ForeignKey("pessoa.cpf", ondelete="CASCADE"), primary_key=True),
    Column("id_habilidade", Integer, ForeignKey("habilidade.id_habilidade", ondelete="CASCADE"), primary_key=True),
)

habilita_table = Table(
    "habilita", Base.metadata,
    Column("id_local", Integer, ForeignKey("local.id_local", ondelete="CASCADE"), primary_key=True),
    Column("id_tipo_evento", Integer, ForeignKey("tipo_evento.id_tipo_evento", ondelete="CASCADE"), primary_key=True),
)

lidera_table = Table(
    "lidera", Base.metadata,
    Column("cpf_pessoa", String(11), ForeignKey("pessoa.cpf", ondelete="CASCADE"), primary_key=True),
    Column("id_ministerio", Integer, ForeignKey("ministerio.id_ministerio", ondelete="CASCADE"), primary_key=True),
)

gerencia_table = Table(
    "gerencia", Base.metadata,
    Column("id_ministerio", Integer, ForeignKey("ministerio.id_ministerio", ondelete="CASCADE"), primary_key=True),
    Column("id_tipo_evento", Integer, ForeignKey("tipo_evento.id_tipo_evento", ondelete="CASCADE"), primary_key=True),
)


# --- ORM Models ---

class Local(Base):
    __tablename__ = "local"

    id_local: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    capacidade_maxima: Mapped[int] = mapped_column(Integer, nullable=False, default=100)

    tipos_evento: Mapped[List["TipoEvento"]] = relationship(
        secondary=habilita_table, back_populates="locais"
    )
    eventos: Mapped[List["Evento"]] = relationship(back_populates="local")


class Habilidade(Base):
    __tablename__ = "habilidade"

    id_habilidade: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    descricao: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    pessoas: Mapped[List["Pessoa"]] = relationship(secondary=possui_table, back_populates="habilidades")
    alocacoes: Mapped[List["Alocacao"]] = relationship(back_populates="habilidade")


class Ministerio(Base):
    __tablename__ = "ministerio"

    id_ministerio: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    criado_em: Mapped[datetime.date] = mapped_column(Date, default=datetime.date.today)
    login: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    membros: Mapped[List["Pessoa"]] = relationship(secondary=participa_table, back_populates="ministerios")
    lideres: Mapped[List["Pessoa"]] = relationship(secondary=lidera_table, back_populates="ministerios_liderados")
    tipos_evento: Mapped[List["TipoEvento"]] = relationship(secondary=gerencia_table, back_populates="ministerios")
    alocacoes: Mapped[List["Alocacao"]] = relationship(back_populates="ministerio")


class TipoEvento(Base):
    __tablename__ = "tipo_evento"

    id_tipo_evento: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    descricao: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    necessidades: Mapped[List["Necessita"]] = relationship(
        back_populates="tipo_evento", cascade="all, delete-orphan"
    )
    locais: Mapped[List["Local"]] = relationship(secondary=habilita_table, back_populates="tipos_evento")
    ministerios: Mapped[List["Ministerio"]] = relationship(secondary=gerencia_table, back_populates="tipos_evento")
    eventos: Mapped[List["Evento"]] = relationship(back_populates="tipo_evento")


class Necessita(Base):
    __tablename__ = "necessita"

    id_tipo_evento: Mapped[int] = mapped_column(
        Integer, ForeignKey("tipo_evento.id_tipo_evento", ondelete="CASCADE"), primary_key=True
    )
    id_habilidade: Mapped[int] = mapped_column(
        Integer, ForeignKey("habilidade.id_habilidade", ondelete="CASCADE"), primary_key=True
    )
    qtd: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    tipo_evento: Mapped["TipoEvento"] = relationship(back_populates="necessidades")
    habilidade: Mapped["Habilidade"] = relationship()


class Pessoa(Base):
    __tablename__ = "pessoa"

    cpf: Mapped[str] = mapped_column(String(11), primary_key=True)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    data_nascimento: Mapped[Optional[datetime.date]] = mapped_column(Date)
    numero_celular: Mapped[Optional[str]] = mapped_column(String(15))

    membro: Mapped[Optional["Membro"]] = relationship(
        back_populates="pessoa", cascade="all, delete-orphan", uselist=False
    )
    visitante: Mapped[Optional["Visitante"]] = relationship(
        back_populates="pessoa",
        cascade="all, delete-orphan",
        uselist=False,
        foreign_keys="Visitante.cpf",
    )
    habilidades: Mapped[List["Habilidade"]] = relationship(secondary=possui_table, back_populates="pessoas")
    ministerios: Mapped[List["Ministerio"]] = relationship(secondary=participa_table, back_populates="membros")
    ministerios_liderados: Mapped[List["Ministerio"]] = relationship(
        secondary=lidera_table, back_populates="lideres"
    )
    alocacoes: Mapped[List["Alocacao"]] = relationship(back_populates="pessoa")
    convidados: Mapped[List["Visitante"]] = relationship(
        back_populates="quem_convidou", foreign_keys="Visitante.cpf_quem_convidou"
    )


class Membro(Base):
    __tablename__ = "membro"

    id_membro: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cpf: Mapped[str] = mapped_column(
        String(11), ForeignKey("pessoa.cpf", ondelete="CASCADE"), unique=True, nullable=False
    )
    nome_celula: Mapped[Optional[str]] = mapped_column(String(50))

    pessoa: Mapped["Pessoa"] = relationship(back_populates="membro")


class Visitante(Base):
    __tablename__ = "visitante"

    id_visitante: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cpf: Mapped[str] = mapped_column(
        String(11), ForeignKey("pessoa.cpf", ondelete="CASCADE"), unique=True, nullable=False
    )
    batizado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    quanto_tempo_pastoreio: Mapped[Optional[str]] = mapped_column(String(50))
    cpf_quem_convidou: Mapped[Optional[str]] = mapped_column(
        String(11), ForeignKey("pessoa.cpf", ondelete="SET NULL")
    )

    pessoa: Mapped["Pessoa"] = relationship(back_populates="visitante", foreign_keys=[cpf])
    quem_convidou: Mapped[Optional["Pessoa"]] = relationship(
        back_populates="convidados", foreign_keys=[cpf_quem_convidou]
    )


class Evento(Base):
    __tablename__ = "evento"
    __table_args__ = (
        CheckConstraint("dt_hr_prog_fim > dt_hr_prog_inicio", name="chk_prog_ordem"),
    )

    id_evento: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_tipo_evento: Mapped[int] = mapped_column(Integer, ForeignKey("tipo_evento.id_tipo_evento"), nullable=False)
    id_local: Mapped[int] = mapped_column(Integer, ForeignKey("local.id_local"), nullable=False)
    dt_hr_prog_inicio: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    dt_hr_prog_fim: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    dt_hr_efet_inicio: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    dt_hr_efet_fim: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    qtd_participantes_esperados: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    tipo_evento: Mapped["TipoEvento"] = relationship(back_populates="eventos")
    local: Mapped["Local"] = relationship(back_populates="eventos")
    alocacoes: Mapped[List["Alocacao"]] = relationship(back_populates="evento", cascade="all, delete-orphan")


class Alocacao(Base):
    __tablename__ = "alocacao"
    __table_args__ = (UniqueConstraint("id_evento", "cpf_pessoa", "id_habilidade"),)

    id_alocacao: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_evento: Mapped[int] = mapped_column(
        Integer, ForeignKey("evento.id_evento", ondelete="CASCADE"), nullable=False
    )
    cpf_pessoa: Mapped[str] = mapped_column(String(11), ForeignKey("pessoa.cpf"), nullable=False)
    id_habilidade: Mapped[int] = mapped_column(Integer, ForeignKey("habilidade.id_habilidade"), nullable=False)
    id_ministerio: Mapped[int] = mapped_column(Integer, ForeignKey("ministerio.id_ministerio"), nullable=False)

    evento: Mapped["Evento"] = relationship(back_populates="alocacoes")
    pessoa: Mapped["Pessoa"] = relationship(back_populates="alocacoes")
    habilidade: Mapped["Habilidade"] = relationship(back_populates="alocacoes")
    ministerio: Mapped["Ministerio"] = relationship(back_populates="alocacoes")
