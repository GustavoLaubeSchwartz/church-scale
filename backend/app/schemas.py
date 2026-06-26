import datetime
from typing import Optional, List
from pydantic import BaseModel


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


# ── Pessoa ───────────────────────────────────────────────────────────────────

class PessoaBase(BaseModel):
    nome: str
    numero_celular: Optional[str] = None
    data_nascimento: Optional[datetime.date] = None
    permissionamento: str = "MEMBRO"

class MembroCreate(PessoaBase):
    senha: Optional[str] = None
    nome_celula: Optional[str] = None
    liderado_por: Optional[int] = None

class VisitanteCreate(PessoaBase):
    senha: Optional[str] = None
    batizado: bool = False
    e_pastor: bool = False
    convidado_por: Optional[int] = None

class PessoaUpdate(BaseModel):
    nome: Optional[str] = None
    numero_celular: Optional[str] = None
    data_nascimento: Optional[datetime.date] = None
    permissionamento: Optional[str] = None
    senha: Optional[str] = None
    nome_celula: Optional[str] = None
    liderado_por: Optional[int] = None
    batizado: Optional[bool] = None
    e_pastor: Optional[bool] = None
    convidado_por: Optional[int] = None

class PessoaOut(BaseModel):
    id_pessoa: int
    nome: str
    numero_celular: Optional[str]
    data_nascimento: Optional[datetime.date]
    permissionamento: str
    tipo: str
    model_config = {"from_attributes": True}

class MembroOut(PessoaOut):
    nome_celula: Optional[str]
    liderado_por: Optional[int]

class VisitanteOut(PessoaOut):
    batizado: bool
    e_pastor: bool
    convidado_por: Optional[int]


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
    id_pessoa: int
    id_habilidade: int

class AlocacaoOut(BaseModel):
    id_evento: int
    id_pessoa: int
    id_habilidade: int
    model_config = {"from_attributes": True}

class AlocacaoDetalhada(BaseModel):
    id_evento: int
    id_pessoa: int
    nome_pessoa: str
    habilidade: str
    tipo_pessoa: str
    model_config = {"from_attributes": True}


# ── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    numero_celular: str
    senha: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    pessoa: PessoaOut


# ── Relatórios ───────────────────────────────────────────────────────────────

class EscalaEventoItem(BaseModel):
    id_pessoa: int
    nome_pessoa: str
    habilidade: str
    tipo_pessoa: str

class AgendaItem(BaseModel):
    id_evento: int
    tipo_evento: str
    local: str
    dt_hr_prog_inicio: datetime.datetime
    dt_hr_prog_fim: datetime.datetime
    habilidade: str

class ParticipacaoItem(BaseModel):
    id_pessoa: int
    nome: str
    total_alocacoes: int

class CoberturaQuorumItem(BaseModel):
    habilidade: str
    qtd_necessaria: int
    qtd_alocada: int
    coberto: bool

class AptidaoHabilidadeItem(BaseModel):
    habilidade: str
    total_aptos: int
    total_acionamentos: int

class PastorVisitanteItem(BaseModel):
    id_visitante: int
    nome_visitante: str
    e_pastor: bool
    id_convidador: Optional[int]
    nome_convidador: Optional[str]

class OcupacaoLocalItem(BaseModel):
    id_local: int
    nome_local: str
    total_eventos: int

class VoluntarioAptoItem(BaseModel):
    id_pessoa: int
    nome: str

class AtrasoEventoItem(BaseModel):
    id_evento: int
    tipo_evento: str
    dt_hr_prog_inicio: datetime.datetime
    dt_hr_prog_fim: datetime.datetime
    dt_hr_efet_inicio: Optional[datetime.datetime]
    dt_hr_efet_fim: Optional[datetime.datetime]
    atraso_inicio_min: Optional[int]
    duracao_planejada_min: int
    duracao_efetiva_min: Optional[int]


# Resolve forward refs
LocalComTipos.model_rebuild()
