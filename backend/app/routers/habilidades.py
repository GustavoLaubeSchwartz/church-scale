import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Habilidade
from app.schemas import HabilidadeCreate, HabilidadeOut
from app.security import get_current_pessoa

router = APIRouter()
logger = logging.getLogger(__name__)


def _get_or_404(db: Session, id_habilidade: int) -> Habilidade:
    obj = db.get(Habilidade, id_habilidade)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habilidade não encontrada")
    return obj


@router.get("", response_model=List[HabilidadeOut])
def list_habilidades(db: Session = Depends(get_db), _auth=Depends(get_current_pessoa)):
    logger.debug("Listando habilidades")
    return db.query(Habilidade).order_by(Habilidade.descricao).all()


@router.post("", response_model=HabilidadeOut, status_code=status.HTTP_201_CREATED)
def create_habilidade(
    body: HabilidadeCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    existing = db.query(Habilidade).filter(Habilidade.descricao == body.descricao).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Habilidade já cadastrada")
    obj = Habilidade(descricao=body.descricao)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    logger.info("Habilidade criada: '%s' (id=%d)", obj.descricao, obj.id_habilidade)
    return obj


@router.get("/{id_habilidade}", response_model=HabilidadeOut)
def get_habilidade(
    id_habilidade: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    return _get_or_404(db, id_habilidade)


@router.put("/{id_habilidade}", response_model=HabilidadeOut)
def update_habilidade(
    id_habilidade: int,
    body: HabilidadeCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    obj = _get_or_404(db, id_habilidade)
    old = obj.descricao
    obj.descricao = body.descricao
    db.commit()
    db.refresh(obj)
    logger.info("Habilidade atualizada: '%s' → '%s' (id=%d)", old, obj.descricao, obj.id_habilidade)
    return obj


@router.delete("/{id_habilidade}", status_code=status.HTTP_204_NO_CONTENT)
def delete_habilidade(
    id_habilidade: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    obj = _get_or_404(db, id_habilidade)
    descricao = obj.descricao
    db.delete(obj)
    db.commit()
    logger.info("Habilidade removida: '%s' (id=%d)", descricao, id_habilidade)
