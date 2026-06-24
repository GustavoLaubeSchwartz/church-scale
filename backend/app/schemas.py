import datetime
from typing import Optional, List
from pydantic import BaseModel, field_validator


# ── Habilidade ──────────────────────────────────────────────────────────────

class HabilidadeBase(BaseModel):
    descricao: str

class HabilidadeCreate(HabilidadeBase):
    pass

class HabilidadeOut(HabilidadeBase):
    id_habilidade: int
    model_config = {"from_attributes": True}


# ── Local ────────────────────────────────────────────────────────────────────

class LocalBase(BaseModel):
    nome: str
    capacidade_maxima: int = 100

class LocalCreate(LocalBase):
    pass

class LocalUpdate(BaseModel):
    nome: Optional[str] = None
    capacidade_maxima: Optional[int] = None

class LocalOut(LocalBase):
    id_local: int
    model_config = {"from_attributes": True}

class LocalComTipos(LocalOut):
    tipos_evento: List["TipoEventoOut"] = []


# ── TipoEvento ───────────────────────────────────────────────────────────────

class TipoEventoBase(BaseModel):
    descricao: str

class TipoEventoCreate(TipoEventoBase):
    pass

class TipoEventoOut(TipoEventoBase):
    id_tipo_evento: int
    model_config = {"from_attributes": True}


class NecessitaCreate(BaseModel):
    id_habilidade: int
    qtd: int = 1

class NecessitaUpdate(BaseModel):
    qtd: int

class NecessitaOut(BaseModel):
    id_habilidade: int
    descricao: str
    qtd: int
    model_config = {"from_attributes": True}


# ── Ministério ───────────────────────────────────────────────────────────────

class MinisterioBase(BaseModel):
    nome: str

class MinisterioCreate(MinisterioBase):
    login: str
    senha: str
    criado_em: Optional[datetime.date] = None

class MinisterioUpdate(BaseModel):
    nome: Optional[str] = None
    login: Optional[str] = None
    senha: Optional[str] = None

class MinisterioOut(MinisterioBase):
    id_ministerio: int
    login: str
    criado_em: datetime.date
    model_config = {"from_attributes": True}


# ── Pessoa ───────────────────────────────────────────────────────────────────

class PessoaBase(BaseModel):
    cpf: str
    nome: str
    data_nascimento: Optional[datetime.date] = None
    numero_celular: Optional[str] = None

    @field_validator("cpf")
    @classmethod
    def cpf_digits_only(cls, v: str) -> str:
        digits = "".join(c for c in v if c.isdigit())
        if len(digits) != 11:
            raise ValueError("CPF deve ter 11 dígitos")
        return digits

class MembroCreate(PessoaBase):
    nome_celula: Optional[str] = None

class VisitanteCreate(PessoaBase):
    batizado: bool = False
    quanto_tempo_pastoreio: Optional[str] = None
    cpf_quem_convidou: Optional[str] = None

class PessoaUpdate(BaseModel):
    nome: Optional[str] = None
    data_nascimento: Optional[datetime.date] = None
    numero_celular: Optional[str] = None

class MembroUpdate(PessoaUpdate):
    nome_celula: Optional[str] = None

class VisitanteUpdate(PessoaUpdate):
    batizado: Optional[bool] = None
    quanto_tempo_pastoreio: Optional[str] = None
    cpf_quem_convidou: Optional[str] = None

class MembroOut(BaseModel):
    cpf: str
    nome: str
    data_nascimento: Optional[datetime.date]
    numero_celular: Optional[str]
    nome_celula: Optional[str]
    model_config = {"from_attributes": True}

class VisitanteOut(BaseModel):
    cpf: str
    nome: str
    data_nascimento: Optional[datetime.date]
    numero_celular: Optional[str]
    batizado: bool
    quanto_tempo_pastoreio: Optional[str]
    cpf_quem_convidou: Optional[str]
    model_config = {"from_attributes": True}

class PessoaOut(BaseModel):
    cpf: str
    nome: str
    data_nascimento: Optional[datetime.date]
    numero_celular: Optional[str]
    tipo: str  # "membro" | "visitante"
    model_config = {"from_attributes": True}


# ── Evento ───────────────────────────────────────────────────────────────────

class EventoCreate(BaseModel):
    id_tipo_evento: int
    id_local: int
    dt_hr_prog_inicio: datetime.datetime
    dt_hr_prog_fim: datetime.datetime
    qtd_participantes_esperados: int = 0

class EventoUpdate(BaseModel):
    id_tipo_evento: Optional[int] = None
    id_local: Optional[int] = None
    dt_hr_prog_inicio: Optional[datetime.datetime] = None
    dt_hr_prog_fim: Optional[datetime.datetime] = None
    qtd_participantes_esperados: Optional[int] = None

class EventoOut(BaseModel):
    id_evento: int
    id_tipo_evento: int
    id_local: int
    dt_hr_prog_inicio: datetime.datetime
    dt_hr_prog_fim: datetime.datetime
    dt_hr_efet_inicio: Optional[datetime.datetime]
    dt_hr_efet_fim: Optional[datetime.datetime]
    qtd_participantes_esperados: int
    tipo_evento: TipoEventoOut
    local: LocalOut
    model_config = {"from_attributes": True}


# ── Alocação ─────────────────────────────────────────────────────────────────

class AlocacaoCreate(BaseModel):
    id_evento: int
    cpf_pessoa: str
    id_habilidade: int
    id_ministerio: int

class AlocacaoOut(BaseModel):
    id_alocacao: int
    id_evento: int
    cpf_pessoa: str
    id_habilidade: int
    id_ministerio: int
    model_config = {"from_attributes": True}

class AlocacaoDetalhada(BaseModel):
    id_alocacao: int
    id_evento: int
    pessoa_nome: str
    cpf_pessoa: str
    habilidade: str
    ministerio: str
    model_config = {"from_attributes": True}


# ── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    login: str
    senha: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    ministerio: MinisterioOut


# ── Relatórios ───────────────────────────────────────────────────────────────

class EscalaEventoItem(BaseModel):
    cpf_pessoa: str
    nome_pessoa: str
    habilidade: str
    ministerio: str

class AgendaItem(BaseModel):
    id_evento: int
    tipo_evento: str
    local: str
    dt_hr_prog_inicio: datetime.datetime
    dt_hr_prog_fim: datetime.datetime
    habilidade: str
    ministerio: str

class ParticipacaoItem(BaseModel):
    cpf: str
    nome: str
    total_alocacoes: int

class CoberturaQuorumItem(BaseModel):
    habilidade: str
    qtd_necessaria: int
    qtd_alocada: int
    coberto: bool

class DistribuicaoMinisterioItem(BaseModel):
    ministerio: str
    total_participacoes: int

class PastorVisitanteItem(BaseModel):
    cpf_visitante: str
    nome_visitante: str
    cpf_convidador: Optional[str]
    nome_convidador: Optional[str]

class OcupacaoLocalItem(BaseModel):
    id_local: int
    nome_local: str
    total_eventos: int

class VoluntarioAptoItem(BaseModel):
    cpf: str
    nome: str


# Resolve forward refs
LocalComTipos.model_rebuild()
