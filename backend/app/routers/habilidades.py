from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Habilidade
from app.schemas import HabilidadeCreate, HabilidadeOut
from app.security import get_current_ministerio

router = APIRouter()


def _get_or_404(db: Session, id_habilidade: int) -> Habilidade:
    obj = db.get(Habilidade, id_habilidade)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habilidade não encontrada")
    return obj


@router.get("/", response_model=List[HabilidadeOut])
def list_habilidades(db: Session = Depends(get_db), _auth=Depends(get_current_ministerio)):
    return db.query(Habilidade).order_by(Habilidade.descricao).all()


@router.post("/", response_model=HabilidadeOut, status_code=status.HTTP_201_CREATED)
def create_habilidade(
    body: HabilidadeCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    existing = db.query(Habilidade).filter(Habilidade.descricao == body.descricao).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Habilidade já cadastrada")
    obj = Habilidade(descricao=body.descricao)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{id_habilidade}", response_model=HabilidadeOut)
def get_habilidade(
    id_habilidade: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    return _get_or_404(db, id_habilidade)


@router.put("/{id_habilidade}", response_model=HabilidadeOut)
def update_habilidade(
    id_habilidade: int,
    body: HabilidadeCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    obj = _get_or_404(db, id_habilidade)
    obj.descricao = body.descricao
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id_habilidade}", status_code=status.HTTP_204_NO_CONTENT)
def delete_habilidade(
    id_habilidade: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    obj = _get_or_404(db, id_habilidade)
    db.delete(obj)
    db.commit()
