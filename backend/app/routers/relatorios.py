import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    AgendaItem,
    CoberturaQuorumItem,
    DistribuicaoMinisterioItem,
    EscalaEventoItem,
    OcupacaoLocalItem,
    ParticipacaoItem,
    PastorVisitanteItem,
    VoluntarioAptoItem,
)
from app.security import get_current_ministerio

router = APIRouter()


@router.get("/escala-evento/{id_evento}", response_model=List[EscalaEventoItem])
def escala_evento(
    id_evento: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    sql = text("""
        SELECT p.cpf AS cpf_pessoa, p.nome AS nome_pessoa,
               h.descricao AS habilidade, m.nome AS ministerio
        FROM alocacao a
        JOIN pessoa p ON p.cpf = a.cpf_pessoa
        JOIN habilidade h ON h.id_habilidade = a.id_habilidade
        JOIN ministerio m ON m.id_ministerio = a.id_ministerio
        WHERE a.id_evento = :id_evento
        ORDER BY m.nome, p.nome
    """)
    rows = db.execute(sql, {"id_evento": id_evento}).mappings().all()
    return [EscalaEventoItem(**r) for r in rows]


@router.get("/agenda-pessoa/{cpf}", response_model=List[AgendaItem])
def agenda_pessoa(
    cpf: str,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    sql = text("""
        SELECT e.id_evento, te.descricao AS tipo_evento, l.nome AS local,
               e.dt_hr_prog_inicio, e.dt_hr_prog_fim,
               h.descricao AS habilidade, m.nome AS ministerio
        FROM alocacao a
        JOIN evento e ON e.id_evento = a.id_evento
        JOIN tipo_evento te ON te.id_tipo_evento = e.id_tipo_evento
        JOIN local l ON l.id_local = e.id_local
        JOIN habilidade h ON h.id_habilidade = a.id_habilidade
        JOIN ministerio m ON m.id_ministerio = a.id_ministerio
        WHERE a.cpf_pessoa = :cpf
          AND e.dt_hr_prog_inicio >= NOW()
        ORDER BY e.dt_hr_prog_inicio
    """)
    rows = db.execute(sql, {"cpf": cpf}).mappings().all()
    return [AgendaItem(**r) for r in rows]


@router.get("/participacao", response_model=List[ParticipacaoItem])
def participacao_periodo(
    ini: datetime.datetime = Query(..., description="Data/hora início do período"),
    fim: datetime.datetime = Query(..., description="Data/hora fim do período"),
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    sql = text("""
        SELECT p.cpf, p.nome, COUNT(a.id_alocacao) AS total_alocacoes
        FROM pessoa p
        JOIN alocacao a ON a.cpf_pessoa = p.cpf
        JOIN evento e ON e.id_evento = a.id_evento
        WHERE e.dt_hr_prog_inicio BETWEEN :ini AND :fim
        GROUP BY p.cpf, p.nome
        ORDER BY total_alocacoes DESC
    """)
    rows = db.execute(sql, {"ini": ini, "fim": fim}).mappings().all()
    return [ParticipacaoItem(**r) for r in rows]


@router.get("/cobertura-quorum/{id_evento}", response_model=List[CoberturaQuorumItem])
def cobertura_quorum(
    id_evento: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    sql = text("""
        SELECT h.descricao AS habilidade,
               n.qtd AS qtd_necessaria,
               COUNT(a.id_alocacao) AS qtd_alocada,
               (COUNT(a.id_alocacao) >= n.qtd) AS coberto
        FROM necessita n
        JOIN habilidade h ON h.id_habilidade = n.id_habilidade
        JOIN evento e ON e.id_tipo_evento = n.id_tipo_evento
        LEFT JOIN alocacao a ON a.id_evento = e.id_evento AND a.id_habilidade = n.id_habilidade
        WHERE e.id_evento = :id_evento
        GROUP BY h.descricao, n.qtd
        ORDER BY coberto, h.descricao
    """)
    rows = db.execute(sql, {"id_evento": id_evento}).mappings().all()
    return [CoberturaQuorumItem(**r) for r in rows]


@router.get("/distribuicao-ministerio", response_model=List[DistribuicaoMinisterioItem])
def distribuicao_ministerio(
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    sql = text("""
        SELECT m.nome AS ministerio, COUNT(a.id_alocacao) AS total_participacoes
        FROM ministerio m
        LEFT JOIN alocacao a ON a.id_ministerio = m.id_ministerio
        GROUP BY m.nome
        ORDER BY total_participacoes DESC
    """)
    rows = db.execute(sql).mappings().all()
    return [DistribuicaoMinisterioItem(**r) for r in rows]


@router.get("/pastores-visitantes", response_model=List[PastorVisitanteItem])
def pastores_visitantes(
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    sql = text("""
        SELECT v.cpf AS cpf_visitante, p.nome AS nome_visitante,
               v.cpf_quem_convidou AS cpf_convidador, p2.nome AS nome_convidador
        FROM visitante v
        JOIN pessoa p ON p.cpf = v.cpf
        LEFT JOIN pessoa p2 ON p2.cpf = v.cpf_quem_convidou
        ORDER BY p.nome
    """)
    rows = db.execute(sql).mappings().all()
    return [PastorVisitanteItem(**r) for r in rows]


@router.get("/ocupacao-locais", response_model=List[OcupacaoLocalItem])
def ocupacao_locais(
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    sql = text("""
        SELECT l.id_local, l.nome AS nome_local, COUNT(e.id_evento) AS total_eventos
        FROM local l
        LEFT JOIN evento e ON e.id_local = l.id_local
        GROUP BY l.id_local, l.nome
        ORDER BY total_eventos DESC
    """)
    rows = db.execute(sql).mappings().all()
    return [OcupacaoLocalItem(**r) for r in rows]


@router.get("/voluntarios-aptos", response_model=List[VoluntarioAptoItem])
def voluntarios_aptos(
    id_evento: int = Query(..., description="ID do evento"),
    id_habilidade: int = Query(..., description="ID da habilidade"),
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    sql = text("""
        SELECT p.cpf, p.nome
        FROM pessoa p
        JOIN possui po ON po.cpf_pessoa = p.cpf
        WHERE po.id_habilidade = :id_habilidade
          AND p.cpf NOT IN (
              SELECT a.cpf_pessoa FROM alocacao a WHERE a.id_evento = :id_evento
          )
        ORDER BY p.nome
    """)
    rows = db.execute(sql, {"id_habilidade": id_habilidade, "id_evento": id_evento}).mappings().all()
    return [VoluntarioAptoItem(**r) for r in rows]
