import datetime
from typing import List, Optional
from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey, Integer,
    String, Table, CheckConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# --- Association tables (pure join, no extra columns) ---

possui_table = Table(
    "possui", Base.metadata,
    Column("id_pessoa", Integer, ForeignKey("pessoa.id_pessoa", ondelete="CASCADE"), primary_key=True),
    Column("id_habilidade", Integer, ForeignKey("habilidade.id_habilidade", ondelete="CASCADE"), primary_key=True),
)

hospedar_table = Table(
    "hospedar", Base.metadata,
    Column("id_local", Integer, ForeignKey("local.id_local", ondelete="CASCADE"), primary_key=True),
    Column("id_tipo_evento", Integer, ForeignKey("tipo_evento.id_tipo_evento", ondelete="CASCADE"), primary_key=True),
)


# --- ORM Models ---

class Local(Base):
    __tablename__ = "local"

    id_local: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    capacidade_maxima: Mapped[int] = mapped_column(Integer, nullable=False, default=100)

    tipos_evento: Mapped[List["TipoEvento"]] = relationship(
        secondary=hospedar_table, back_populates="locais"
    )
    eventos: Mapped[List["Evento"]] = relationship(back_populates="local")


class Habilidade(Base):
    __tablename__ = "habilidade"

    id_habilidade: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    descricao: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    pessoas: Mapped[List["Pessoa"]] = relationship(secondary=possui_table, back_populates="habilidades")
    alocacoes: Mapped[List["Alocacao"]] = relationship(back_populates="habilidade")


class TipoEvento(Base):
    __tablename__ = "tipo_evento"

    id_tipo_evento: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    descricao: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    necessidades: Mapped[List["Necessita"]] = relationship(
        back_populates="tipo_evento", cascade="all, delete-orphan"
    )
    locais: Mapped[List["Local"]] = relationship(secondary=hospedar_table, back_populates="tipos_evento")
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

    id_pessoa: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    numero_celular: Mapped[Optional[str]] = mapped_column(String(15), unique=True)
    data_nascimento: Mapped[Optional[datetime.date]] = mapped_column(Date)
    permissionamento: Mapped[str] = mapped_column(String(20), nullable=False, default="MEMBRO")
    senha_hash: Mapped[Optional[str]] = mapped_column(String(255))

    membro: Mapped[Optional["Membro"]] = relationship(
        back_populates="pessoa",
        cascade="all, delete-orphan",
        uselist=False,
        foreign_keys="Membro.id_pessoa",
    )
    visitante: Mapped[Optional["Visitante"]] = relationship(
        back_populates="pessoa",
        cascade="all, delete-orphan",
        uselist=False,
        foreign_keys="Visitante.id_pessoa",
    )
    habilidades: Mapped[List["Habilidade"]] = relationship(secondary=possui_table, back_populates="pessoas")
    alocacoes: Mapped[List["Alocacao"]] = relationship(
        back_populates="pessoa",
        foreign_keys="Alocacao.id_pessoa",
    )
    convidados: Mapped[List["Visitante"]] = relationship(
        back_populates="quem_convidou",
        foreign_keys="Visitante.convidado_por",
    )
    liderados: Mapped[List["Membro"]] = relationship(
        back_populates="lider",
        foreign_keys="Membro.liderado_por",
    )


class Membro(Base):
    __tablename__ = "membro"

    id_membro: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_pessoa: Mapped[int] = mapped_column(
        Integer, ForeignKey("pessoa.id_pessoa", ondelete="CASCADE"), unique=True, nullable=False
    )
    nome_celula: Mapped[Optional[str]] = mapped_column(String(50))
    liderado_por: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("pessoa.id_pessoa", ondelete="SET NULL")
    )

    pessoa: Mapped["Pessoa"] = relationship(back_populates="membro", foreign_keys=[id_pessoa])
    lider: Mapped[Optional["Pessoa"]] = relationship(back_populates="liderados", foreign_keys=[liderado_por])


class Visitante(Base):
    __tablename__ = "visitante"

    id_visitante: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_pessoa: Mapped[int] = mapped_column(
        Integer, ForeignKey("pessoa.id_pessoa", ondelete="CASCADE"), unique=True, nullable=False
    )
    batizado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    e_pastor: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    convidado_por: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("pessoa.id_pessoa", ondelete="SET NULL")
    )

    pessoa: Mapped["Pessoa"] = relationship(back_populates="visitante", foreign_keys=[id_pessoa])
    quem_convidou: Mapped[Optional["Pessoa"]] = relationship(back_populates="convidados", foreign_keys=[convidado_por])


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

    id_evento: Mapped[int] = mapped_column(
        Integer, ForeignKey("evento.id_evento", ondelete="CASCADE"), primary_key=True
    )
    id_habilidade: Mapped[int] = mapped_column(
        Integer, ForeignKey("habilidade.id_habilidade"), primary_key=True
    )
    id_pessoa: Mapped[int] = mapped_column(
        Integer, ForeignKey("pessoa.id_pessoa"), primary_key=True
    )

    evento: Mapped["Evento"] = relationship(back_populates="alocacoes")
    pessoa: Mapped["Pessoa"] = relationship(back_populates="alocacoes", foreign_keys=[id_pessoa])
    habilidade: Mapped["Habilidade"] = relationship(back_populates="alocacoes")
