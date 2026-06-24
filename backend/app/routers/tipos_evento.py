from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Habilidade, Ministerio, Necessita, TipoEvento
from app.schemas import (
    MinisterioOut,
    NecessitaCreate,
    NecessitaOut,
    NecessitaUpdate,
    TipoEventoCreate,
    TipoEventoOut,
)
from app.security import get_current_ministerio

router = APIRouter()


def _get_or_404(db: Session, id_tipo_evento: int) -> TipoEvento:
    obj = db.get(TipoEvento, id_tipo_evento)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de evento não encontrado")
    return obj


@router.get("/", response_model=List[TipoEventoOut])
def list_tipos(db: Session = Depends(get_db), _auth=Depends(get_current_ministerio)):
    return db.query(TipoEvento).order_by(TipoEvento.descricao).all()


@router.post("/", response_model=TipoEventoOut, status_code=status.HTTP_201_CREATED)
def create_tipo(
    body: TipoEventoCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    existing = db.query(TipoEvento).filter(TipoEvento.descricao == body.descricao).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tipo de evento já cadastrado")
    obj = TipoEvento(descricao=body.descricao)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{id_tipo_evento}", response_model=TipoEventoOut)
def get_tipo(
    id_tipo_evento: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    return _get_or_404(db, id_tipo_evento)


@router.put("/{id_tipo_evento}", response_model=TipoEventoOut)
def update_tipo(
    id_tipo_evento: int,
    body: TipoEventoCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    obj = _get_or_404(db, id_tipo_evento)
    obj.descricao = body.descricao
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id_tipo_evento}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tipo(
    id_tipo_evento: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    obj = _get_or_404(db, id_tipo_evento)
    db.delete(obj)
    db.commit()


# ── Necessidades (habilidades com qtd) ───────────────────────────────────────

@router.get("/{id_tipo_evento}/habilidades", response_model=List[NecessitaOut])
def list_necessidades(
    id_tipo_evento: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    _get_or_404(db, id_tipo_evento)
    rows = (
        db.query(Necessita, Habilidade)
        .join(Habilidade, Necessita.id_habilidade == Habilidade.id_habilidade)
        .filter(Necessita.id_tipo_evento == id_tipo_evento)
        .all()
    )
    return [
        NecessitaOut(id_habilidade=n.id_habilidade, descricao=h.descricao, qtd=n.qtd)
        for n, h in rows
    ]


@router.post("/{id_tipo_evento}/habilidades", response_model=NecessitaOut, status_code=status.HTTP_201_CREATED)
def add_necessidade(
    id_tipo_evento: int,
    body: NecessitaCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    _get_or_404(db, id_tipo_evento)
    habilidade = db.get(Habilidade, body.id_habilidade)
    if habilidade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habilidade não encontrada")
    existing = db.get(Necessita, (id_tipo_evento, body.id_habilidade))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Necessidade já cadastrada para este tipo")
    obj = Necessita(id_tipo_evento=id_tipo_evento, id_habilidade=body.id_habilidade, qtd=body.qtd)
    db.add(obj)
    db.commit()
    return NecessitaOut(id_habilidade=habilidade.id_habilidade, descricao=habilidade.descricao, qtd=obj.qtd)


@router.put("/{id_tipo_evento}/habilidades/{id_hab}", response_model=NecessitaOut)
def update_necessidade(
    id_tipo_evento: int,
    id_hab: int,
    body: NecessitaUpdate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    obj = db.get(Necessita, (id_tipo_evento, id_hab))
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Necessidade não encontrada")
    habilidade = db.get(Habilidade, id_hab)
    obj.qtd = body.qtd
    db.commit()
    return NecessitaOut(id_habilidade=habilidade.id_habilidade, descricao=habilidade.descricao, qtd=obj.qtd)


@router.delete("/{id_tipo_evento}/habilidades/{id_hab}", status_code=status.HTTP_204_NO_CONTENT)
def remove_necessidade(
    id_tipo_evento: int,
    id_hab: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    obj = db.get(Necessita, (id_tipo_evento, id_hab))
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Necessidade não encontrada")
    db.delete(obj)
    db.commit()


# ── Ministérios que gerenciam este tipo ──────────────────────────────────────

class MinisterioBody(BaseModel):
    id_ministerio: int


@router.get("/{id_tipo_evento}/ministerios", response_model=List[MinisterioOut])
def list_ministerios_gestores(
    id_tipo_evento: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    tipo = _get_or_404(db, id_tipo_evento)
    return tipo.ministerios


@router.post("/{id_tipo_evento}/ministerios", response_model=List[MinisterioOut], status_code=status.HTTP_201_CREATED)
def add_ministerio_gestor(
    id_tipo_evento: int,
    body: MinisterioBody,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    tipo = _get_or_404(db, id_tipo_evento)
    ministerio = db.get(Ministerio, body.id_ministerio)
    if ministerio is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ministério não encontrado")
    if ministerio in tipo.ministerios:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ministério já gerencia este tipo de evento")
    tipo.ministerios.append(ministerio)
    db.commit()
    db.refresh(tipo)
    return tipo.ministerios


@router.delete("/{id_tipo_evento}/ministerios/{id_min}", status_code=status.HTTP_204_NO_CONTENT)
def remove_ministerio_gestor(
    id_tipo_evento: int,
    id_min: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    tipo = _get_or_404(db, id_tipo_evento)
    ministerio = db.get(Ministerio, id_min)
    if ministerio is None or ministerio not in tipo.ministerios:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ministério não gerencia este tipo de evento")
    tipo.ministerios.remove(ministerio)
    db.commit()
