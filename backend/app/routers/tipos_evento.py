from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Habilidade, Necessita, TipoEvento
from app.schemas import (
    NecessitaCreate,
    NecessitaOut,
    NecessitaUpdate,
    TipoEventoCreate,
    TipoEventoOut,
)
from app.security import get_current_pessoa

router = APIRouter()


def _get_or_404(db: Session, id_tipo_evento: int) -> TipoEvento:
    obj = db.get(TipoEvento, id_tipo_evento)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de evento não encontrado")
    return obj


@router.get("", response_model=List[TipoEventoOut])
def list_tipos(db: Session = Depends(get_db), _auth=Depends(get_current_pessoa)):
    return db.query(TipoEvento).order_by(TipoEvento.descricao).all()


@router.post("", response_model=TipoEventoOut, status_code=status.HTTP_201_CREATED)
def create_tipo(
    body: TipoEventoCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    if db.query(TipoEvento).filter(TipoEvento.descricao == body.descricao).first():
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
    _auth=Depends(get_current_pessoa),
):
    return _get_or_404(db, id_tipo_evento)


@router.put("/{id_tipo_evento}", response_model=TipoEventoOut)
def update_tipo(
    id_tipo_evento: int,
    body: TipoEventoCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
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
    _auth=Depends(get_current_pessoa),
):
    obj = _get_or_404(db, id_tipo_evento)
    db.delete(obj)
    db.commit()


# ── Necessidades (habilidades com qtd) ───────────────────────────────────────

@router.get("/{id_tipo_evento}/habilidades", response_model=List[NecessitaOut])
def list_necessidades(
    id_tipo_evento: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
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
    _auth=Depends(get_current_pessoa),
):
    _get_or_404(db, id_tipo_evento)
    habilidade = db.get(Habilidade, body.id_habilidade)
    if habilidade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habilidade não encontrada")
    if db.get(Necessita, (id_tipo_evento, body.id_habilidade)):
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
    _auth=Depends(get_current_pessoa),
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
    _auth=Depends(get_current_pessoa),
):
    obj = db.get(Necessita, (id_tipo_evento, id_hab))
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Necessidade não encontrada")
    db.delete(obj)
    db.commit()
