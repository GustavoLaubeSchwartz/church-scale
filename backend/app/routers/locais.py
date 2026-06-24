from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Local, TipoEvento, habilita_table
from app.schemas import LocalCreate, LocalOut, LocalUpdate, TipoEventoOut
from app.security import get_current_ministerio

router = APIRouter()


def _get_or_404(db: Session, id_local: int) -> Local:
    obj = db.get(Local, id_local)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local não encontrado")
    return obj


@router.get("/", response_model=List[LocalOut])
def list_locais(db: Session = Depends(get_db), _auth=Depends(get_current_ministerio)):
    return db.query(Local).order_by(Local.nome).all()


@router.post("/", response_model=LocalOut, status_code=status.HTTP_201_CREATED)
def create_local(
    body: LocalCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    obj = Local(nome=body.nome, capacidade_maxima=body.capacidade_maxima)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{id_local}", response_model=LocalOut)
def get_local(
    id_local: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    return _get_or_404(db, id_local)


@router.put("/{id_local}", response_model=LocalOut)
def update_local(
    id_local: int,
    body: LocalUpdate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    obj = _get_or_404(db, id_local)
    if body.nome is not None:
        obj.nome = body.nome
    if body.capacidade_maxima is not None:
        obj.capacidade_maxima = body.capacidade_maxima
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id_local}", status_code=status.HTTP_204_NO_CONTENT)
def delete_local(
    id_local: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    obj = _get_or_404(db, id_local)
    db.delete(obj)
    db.commit()


@router.get("/{id_local}/tipos-evento", response_model=List[TipoEventoOut])
def list_tipos_habilitados(
    id_local: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    local = _get_or_404(db, id_local)
    return local.tipos_evento


class HabilitaBody(BaseModel):
    id_tipo_evento: int


@router.post("/{id_local}/tipos-evento", response_model=List[TipoEventoOut], status_code=status.HTTP_201_CREATED)
def habilitar_tipo(
    id_local: int,
    body: HabilitaBody,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    local = _get_or_404(db, id_local)
    tipo = db.get(TipoEvento, body.id_tipo_evento)
    if tipo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de evento não encontrado")
    if tipo in local.tipos_evento:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tipo de evento já habilitado neste local")
    local.tipos_evento.append(tipo)
    db.commit()
    db.refresh(local)
    return local.tipos_evento


@router.delete("/{id_local}/tipos-evento/{id_tipo}", status_code=status.HTTP_204_NO_CONTENT)
def desabilitar_tipo(
    id_local: int,
    id_tipo: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    local = _get_or_404(db, id_local)
    tipo = db.get(TipoEvento, id_tipo)
    if tipo is None or tipo not in local.tipos_evento:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de evento não habilitado neste local")
    local.tipos_evento.remove(tipo)
    db.commit()
