from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Alocacao, Evento, Habilidade, Ministerio, Pessoa, participa_table, possui_table
from app.schemas import AlocacaoCreate, AlocacaoOut
from app.security import get_current_ministerio

router = APIRouter()


@router.get("/", response_model=List[AlocacaoOut])
def list_alocacoes(
    id_evento: Optional[int] = Query(None),
    cpf_pessoa: Optional[str] = Query(None),
    id_ministerio: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    query = db.query(Alocacao)
    if id_evento is not None:
        query = query.filter(Alocacao.id_evento == id_evento)
    if cpf_pessoa is not None:
        query = query.filter(Alocacao.cpf_pessoa == cpf_pessoa)
    if id_ministerio is not None:
        query = query.filter(Alocacao.id_ministerio == id_ministerio)
    return query.all()


@router.post("/", response_model=AlocacaoOut, status_code=status.HTTP_201_CREATED)
def create_alocacao(
    body: AlocacaoCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    # 1. Evento existe?
    evento = db.get(Evento, body.id_evento)
    if evento is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado")

    # 2. Pessoa existe?
    pessoa = db.get(Pessoa, body.cpf_pessoa)
    if pessoa is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não encontrada")

    # 3. Habilidade existe?
    habilidade = db.get(Habilidade, body.id_habilidade)
    if habilidade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habilidade não encontrada")

    # 4. Ministério existe?
    ministerio = db.get(Ministerio, body.id_ministerio)
    if ministerio is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ministério não encontrado")

    # 5. Pessoa possui a habilidade?
    possui = (
        db.query(possui_table)
        .filter(
            possui_table.c.cpf_pessoa == body.cpf_pessoa,
            possui_table.c.id_habilidade == body.id_habilidade,
        )
        .first()
    )
    if not possui:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Pessoa não possui a habilidade informada",
        )

    # 6. Pessoa participa do ministério?
    participa = (
        db.query(participa_table)
        .filter(
            participa_table.c.cpf_pessoa == body.cpf_pessoa,
            participa_table.c.id_ministerio == body.id_ministerio,
        )
        .first()
    )
    if not participa:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Pessoa não participa do ministério informado",
        )

    # 7. Conflito de horário (pessoa alocada em evento simultâneo)?
    conflito = (
        db.query(Alocacao)
        .join(Evento, Evento.id_evento == Alocacao.id_evento)
        .filter(
            Alocacao.cpf_pessoa == body.cpf_pessoa,
            Evento.id_evento != body.id_evento,
            Evento.dt_hr_prog_inicio < evento.dt_hr_prog_fim,
            Evento.dt_hr_prog_fim > evento.dt_hr_prog_inicio,
        )
        .first()
    )
    if conflito:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pessoa já está alocada em outro evento no mesmo horário",
        )

    obj = Alocacao(
        id_evento=body.id_evento,
        cpf_pessoa=body.cpf_pessoa,
        id_habilidade=body.id_habilidade,
        id_ministerio=body.id_ministerio,
    )
    db.add(obj)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Alocação duplicada")
    db.refresh(obj)
    return obj


@router.delete("/{id_alocacao}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alocacao(
    id_alocacao: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    obj = db.get(Alocacao, id_alocacao)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alocação não encontrada")
    db.delete(obj)
    db.commit()
