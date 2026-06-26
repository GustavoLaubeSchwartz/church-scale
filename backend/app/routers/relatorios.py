import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    AgendaItem,
    AptidaoHabilidadeItem,
    AtrasoEventoItem,
    CoberturaQuorumItem,
    EscalaEventoItem,
    OcupacaoLocalItem,
    ParticipacaoItem,
    PastorVisitanteItem,
    VoluntarioAptoItem,
)
from app.security import get_current_pessoa

router = APIRouter()


@router.get("/escala-evento/{id_evento}", response_model=List[EscalaEventoItem])
def escala_evento(
    id_evento: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    sql = text("""
        SELECT
            p.id_pessoa,
            p.nome AS nome_pessoa,
            h.descricao AS habilidade,
            CASE WHEN m.id_membro IS NOT NULL THEN 'membro' ELSE 'visitante' END AS tipo_pessoa
        FROM alocacao a
        JOIN pessoa p ON p.id_pessoa = a.id_pessoa
        JOIN habilidade h ON h.id_habilidade = a.id_habilidade
        LEFT JOIN membro m ON m.id_pessoa = p.id_pessoa
        WHERE a.id_evento = :id_evento
        ORDER BY h.descricao, p.nome
    """)
    rows = db.execute(sql, {"id_evento": id_evento}).mappings().all()
    return [EscalaEventoItem(**r) for r in rows]


@router.get("/agenda-pessoa/{id_pessoa}", response_model=List[AgendaItem])
def agenda_pessoa(
    id_pessoa: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    sql = text("""
        SELECT
            e.id_evento,
            te.descricao AS tipo_evento,
            l.nome AS local,
            e.dt_hr_prog_inicio,
            e.dt_hr_prog_fim,
            h.descricao AS habilidade
        FROM alocacao a
        JOIN evento e ON e.id_evento = a.id_evento
        JOIN tipo_evento te ON te.id_tipo_evento = e.id_tipo_evento
        JOIN local l ON l.id_local = e.id_local
        JOIN habilidade h ON h.id_habilidade = a.id_habilidade
        WHERE a.id_pessoa = :id_pessoa
          AND e.dt_hr_prog_inicio >= NOW()
        ORDER BY e.dt_hr_prog_inicio
    """)
    rows = db.execute(sql, {"id_pessoa": id_pessoa}).mappings().all()
    return [AgendaItem(**r) for r in rows]


@router.get("/participacao", response_model=List[ParticipacaoItem])
def participacao_periodo(
    ini: datetime.datetime = Query(..., description="Data/hora início do período"),
    fim: datetime.datetime = Query(..., description="Data/hora fim do período"),
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    sql = text("""
        SELECT p.id_pessoa, p.nome, COUNT(*) AS total_alocacoes
        FROM pessoa p
        JOIN alocacao a ON a.id_pessoa = p.id_pessoa
        JOIN evento e ON e.id_evento = a.id_evento
        WHERE e.dt_hr_prog_inicio BETWEEN :ini AND :fim
        GROUP BY p.id_pessoa, p.nome
        ORDER BY total_alocacoes DESC
    """)
    rows = db.execute(sql, {"ini": ini, "fim": fim}).mappings().all()
    return [ParticipacaoItem(**r) for r in rows]


@router.get("/cobertura-quorum/{id_evento}", response_model=List[CoberturaQuorumItem])
def cobertura_quorum(
    id_evento: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    sql = text("""
        SELECT
            h.descricao AS habilidade,
            n.qtd AS qtd_necessaria,
            COUNT(a.id_pessoa) AS qtd_alocada,
            (COUNT(a.id_pessoa) >= n.qtd) AS coberto
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


@router.get("/aptidao-habilidade", response_model=List[AptidaoHabilidadeItem])
def aptidao_habilidade(
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    sql = text("""
        SELECT
            h.descricao AS habilidade,
            COUNT(DISTINCT po.id_pessoa) AS total_aptos,
            COUNT(a.id_pessoa) AS total_acionamentos
        FROM habilidade h
        LEFT JOIN possui po ON po.id_habilidade = h.id_habilidade
        LEFT JOIN alocacao a ON a.id_habilidade = h.id_habilidade
        GROUP BY h.descricao
        ORDER BY total_acionamentos DESC
    """)
    rows = db.execute(sql).mappings().all()
    return [AptidaoHabilidadeItem(**r) for r in rows]


@router.get("/pastores-visitantes", response_model=List[PastorVisitanteItem])
def pastores_visitantes(
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    sql = text("""
        SELECT
            v.id_visitante,
            p.nome AS nome_visitante,
            v.e_pastor,
            v.convidado_por AS id_convidador,
            p2.nome AS nome_convidador
        FROM visitante v
        JOIN pessoa p ON p.id_pessoa = v.id_pessoa
        LEFT JOIN pessoa p2 ON p2.id_pessoa = v.convidado_por
        ORDER BY p.nome
    """)
    rows = db.execute(sql).mappings().all()
    return [PastorVisitanteItem(**r) for r in rows]


@router.get("/ocupacao-locais", response_model=List[OcupacaoLocalItem])
def ocupacao_locais(
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
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
    _auth=Depends(get_current_pessoa),
):
    sql = text("""
        SELECT p.id_pessoa, p.nome
        FROM pessoa p
        JOIN possui po ON po.id_pessoa = p.id_pessoa
        WHERE po.id_habilidade = :id_habilidade
          AND p.id_pessoa NOT IN (
              SELECT a.id_pessoa FROM alocacao a WHERE a.id_evento = :id_evento
          )
        ORDER BY p.nome
    """)
    rows = db.execute(sql, {"id_habilidade": id_habilidade, "id_evento": id_evento}).mappings().all()
    return [VoluntarioAptoItem(**r) for r in rows]


@router.get("/controle-atrasos", response_model=List[AtrasoEventoItem])
def controle_atrasos(
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    sql = text("""
        SELECT
            e.id_evento,
            te.descricao AS tipo_evento,
            e.dt_hr_prog_inicio,
            e.dt_hr_prog_fim,
            e.dt_hr_efet_inicio,
            e.dt_hr_efet_fim,
            CASE
                WHEN e.dt_hr_efet_inicio IS NOT NULL
                THEN EXTRACT(EPOCH FROM (e.dt_hr_efet_inicio - e.dt_hr_prog_inicio)) / 60
                ELSE NULL
            END AS atraso_inicio_min,
            EXTRACT(EPOCH FROM (e.dt_hr_prog_fim - e.dt_hr_prog_inicio)) / 60 AS duracao_planejada_min,
            CASE
                WHEN e.dt_hr_efet_inicio IS NOT NULL AND e.dt_hr_efet_fim IS NOT NULL
                THEN EXTRACT(EPOCH FROM (e.dt_hr_efet_fim - e.dt_hr_efet_inicio)) / 60
                ELSE NULL
            END AS duracao_efetiva_min
        FROM evento e
        JOIN tipo_evento te ON te.id_tipo_evento = e.id_tipo_evento
        ORDER BY e.dt_hr_prog_inicio DESC
    """)
    rows = db.execute(sql).mappings().all()
    result = []
    for r in rows:
        result.append(AtrasoEventoItem(
            id_evento=r["id_evento"],
            tipo_evento=r["tipo_evento"],
            dt_hr_prog_inicio=r["dt_hr_prog_inicio"],
            dt_hr_prog_fim=r["dt_hr_prog_fim"],
            dt_hr_efet_inicio=r["dt_hr_efet_inicio"],
            dt_hr_efet_fim=r["dt_hr_efet_fim"],
            atraso_inicio_min=int(r["atraso_inicio_min"]) if r["atraso_inicio_min"] is not None else None,
            duracao_planejada_min=int(r["duracao_planejada_min"]),
            duracao_efetiva_min=int(r["duracao_efetiva_min"]) if r["duracao_efetiva_min"] is not None else None,
        ))
    return result
