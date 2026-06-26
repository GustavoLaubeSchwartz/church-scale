import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Alocacao, Evento, Habilidade, Pessoa, possui_table
from app.schemas import AlocacaoCreate, AlocacaoOut
from app.security import get_current_pessoa

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=List[AlocacaoOut])
def list_alocacoes(
    id_evento: Optional[int] = Query(None),
    id_pessoa: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    logger.debug("Listando alocações — evento=%s pessoa=%s", id_evento, id_pessoa)
    query = db.query(Alocacao)
    if id_evento is not None:
        query = query.filter(Alocacao.id_evento == id_evento)
    if id_pessoa is not None:
        query = query.filter(Alocacao.id_pessoa == id_pessoa)
    return query.all()


@router.post("", response_model=AlocacaoOut, status_code=status.HTTP_201_CREATED)
def create_alocacao(
    body: AlocacaoCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    evento = db.get(Evento, body.id_evento)
    if evento is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado")

    pessoa = db.get(Pessoa, body.id_pessoa)
    if pessoa is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não encontrada")

    habilidade = db.get(Habilidade, body.id_habilidade)
    if habilidade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habilidade não encontrada")

    possui = (
        db.query(possui_table)
        .filter(
            possui_table.c.id_pessoa == body.id_pessoa,
            possui_table.c.id_habilidade == body.id_habilidade,
        )
        .first()
    )
    if not possui:
        logger.warning(
            "Alocação rejeitada — %s não possui habilidade '%s'",
            pessoa.nome, habilidade.descricao,
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Pessoa não possui a habilidade informada",
        )

    conflito = (
        db.query(Alocacao)
        .join(Evento, Evento.id_evento == Alocacao.id_evento)
        .filter(
            Alocacao.id_pessoa == body.id_pessoa,
            Evento.id_evento != body.id_evento,
            Evento.dt_hr_prog_inicio < evento.dt_hr_prog_fim,
            Evento.dt_hr_prog_fim > evento.dt_hr_prog_inicio,
        )
        .first()
    )
    if conflito:
        logger.warning(
            "Alocação rejeitada — %s possui conflito de horário (evento=%d)",
            pessoa.nome, conflito.id_evento,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pessoa já está alocada em outro evento no mesmo horário",
        )

    obj = Alocacao(
        id_evento=body.id_evento,
        id_pessoa=body.id_pessoa,
        id_habilidade=body.id_habilidade,
    )
    db.add(obj)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Alocação duplicada")
    db.refresh(obj)
    logger.info(
        "Alocação criada: %s → habilidade '%s' no evento id=%d",
        pessoa.nome, habilidade.descricao, body.id_evento,
    )
    return obj


@router.delete("/{id_evento}/{id_habilidade}/{id_pessoa}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alocacao(
    id_evento: int,
    id_habilidade: int,
    id_pessoa: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    obj = db.get(Alocacao, (id_evento, id_habilidade, id_pessoa))
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alocação não encontrada")
    db.delete(obj)
    db.commit()
    logger.info(
        "Alocação removida: pessoa_id=%d habilidade_id=%d evento_id=%d",
        id_pessoa, id_habilidade, id_evento,
    )
