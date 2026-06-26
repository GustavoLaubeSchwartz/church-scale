import datetime
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Evento, Local, TipoEvento
from app.schemas import EventoCreate, EventoOut, EventoUpdate
from app.security import get_current_pessoa

router = APIRouter()
logger = logging.getLogger(__name__)


def _get_or_404(db: Session, id_evento: int) -> Evento:
    obj = (
        db.query(Evento)
        .options(joinedload(Evento.tipo_evento), joinedload(Evento.local))
        .filter(Evento.id_evento == id_evento)
        .first()
    )
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado")
    return obj


@router.get("", response_model=List[EventoOut])
def list_eventos(
    id_tipo: Optional[int] = Query(None),
    id_local: Optional[int] = Query(None),
    ini: Optional[datetime.datetime] = Query(None),
    fim: Optional[datetime.datetime] = Query(None),
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    logger.debug("Listando eventos — tipo=%s local=%s ini=%s fim=%s", id_tipo, id_local, ini, fim)
    query = (
        db.query(Evento)
        .options(joinedload(Evento.tipo_evento), joinedload(Evento.local))
    )
    if id_tipo is not None:
        query = query.filter(Evento.id_tipo_evento == id_tipo)
    if id_local is not None:
        query = query.filter(Evento.id_local == id_local)
    if ini is not None:
        query = query.filter(Evento.dt_hr_prog_inicio >= ini)
    if fim is not None:
        query = query.filter(Evento.dt_hr_prog_inicio <= fim)
    return query.order_by(Evento.dt_hr_prog_inicio).all()


@router.post("", response_model=EventoOut, status_code=status.HTTP_201_CREATED)
def create_evento(
    body: EventoCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    if body.dt_hr_prog_fim <= body.dt_hr_prog_inicio:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Fim deve ser após o início")

    tipo = db.get(TipoEvento, body.id_tipo_evento)
    if tipo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de evento não encontrado")

    local = db.get(Local, body.id_local)
    if local is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local não encontrado")

    if body.qtd_participantes_esperados > local.capacidade_maxima:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Participantes esperados ({body.qtd_participantes_esperados}) excedem capacidade do local ({local.capacidade_maxima})",
        )

    overlap = (
        db.query(Evento)
        .filter(
            Evento.id_local == body.id_local,
            Evento.dt_hr_prog_inicio < body.dt_hr_prog_fim,
            Evento.dt_hr_prog_fim > body.dt_hr_prog_inicio,
        )
        .first()
    )
    if overlap:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um evento neste local neste horário",
        )

    obj = Evento(
        id_tipo_evento=body.id_tipo_evento,
        id_local=body.id_local,
        dt_hr_prog_inicio=body.dt_hr_prog_inicio,
        dt_hr_prog_fim=body.dt_hr_prog_fim,
        qtd_participantes_esperados=body.qtd_participantes_esperados,
    )
    db.add(obj)
    db.commit()
    logger.info(
        "Evento criado: id=%d tipo='%s' local='%s' início=%s",
        obj.id_evento, tipo.descricao, local.nome, body.dt_hr_prog_inicio,
    )
    return _get_or_404(db, obj.id_evento)


@router.get("/{id_evento}", response_model=EventoOut)
def get_evento(
    id_evento: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    return _get_or_404(db, id_evento)


@router.put("/{id_evento}", response_model=EventoOut)
def update_evento(
    id_evento: int,
    body: EventoUpdate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    obj = _get_or_404(db, id_evento)
    if body.id_tipo_evento is not None:
        if db.get(TipoEvento, body.id_tipo_evento) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de evento não encontrado")
        obj.id_tipo_evento = body.id_tipo_evento
    if body.id_local is not None:
        if db.get(Local, body.id_local) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local não encontrado")
        obj.id_local = body.id_local
    if body.dt_hr_prog_inicio is not None:
        obj.dt_hr_prog_inicio = body.dt_hr_prog_inicio
    if body.dt_hr_prog_fim is not None:
        obj.dt_hr_prog_fim = body.dt_hr_prog_fim
    if body.qtd_participantes_esperados is not None:
        obj.qtd_participantes_esperados = body.qtd_participantes_esperados
    db.commit()
    logger.info("Evento atualizado: id=%d", id_evento)
    return _get_or_404(db, id_evento)


@router.delete("/{id_evento}", status_code=status.HTTP_204_NO_CONTENT)
def delete_evento(
    id_evento: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    obj = db.get(Evento, id_evento)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado")
    db.delete(obj)
    db.commit()
    logger.info("Evento removido: id=%d", id_evento)


@router.patch("/{id_evento}/iniciar", response_model=EventoOut)
def iniciar_evento(
    id_evento: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    obj = db.get(Evento, id_evento)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado")
    if obj.dt_hr_efet_inicio is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Evento já foi iniciado")
    obj.dt_hr_efet_inicio = datetime.datetime.utcnow()
    db.commit()
    logger.info("Evento iniciado: id=%d em %s", id_evento, obj.dt_hr_efet_inicio)
    return _get_or_404(db, id_evento)


@router.patch("/{id_evento}/finalizar", response_model=EventoOut)
def finalizar_evento(
    id_evento: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    obj = db.get(Evento, id_evento)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado")
    if obj.dt_hr_efet_inicio is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Evento ainda não foi iniciado")
    if obj.dt_hr_efet_fim is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Evento já foi finalizado")
    obj.dt_hr_efet_fim = datetime.datetime.utcnow()
    db.commit()
    logger.info("Evento finalizado: id=%d em %s", id_evento, obj.dt_hr_efet_fim)
    return _get_or_404(db, id_evento)
