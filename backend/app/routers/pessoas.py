import datetime as _dt
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Habilidade, Membro, Pessoa, Visitante
from app.schemas import HabilidadeOut, MembroCreate, PessoaUpdate, VisitanteCreate
from app.security import get_current_pessoa, hash_password

router = APIRouter()
logger = logging.getLogger(__name__)


def _get_pessoa_or_404(db: Session, id_pessoa: int) -> Pessoa:
    obj = db.get(Pessoa, id_pessoa)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não encontrada")
    return obj


def _build_out(p: Pessoa) -> dict:
    base = {
        "id_pessoa": p.id_pessoa,
        "nome": p.nome,
        "numero_celular": p.numero_celular,
        "data_nascimento": p.data_nascimento,
        "permissionamento": p.permissionamento,
    }
    if p.membro:
        return {**base, "tipo": "membro", "nome_celula": p.membro.nome_celula, "liderado_por": p.membro.liderado_por}
    if p.visitante:
        return {
            **base,
            "tipo": "visitante",
            "batizado": p.visitante.batizado,
            "e_pastor": p.visitante.e_pastor,
            "convidado_por": p.visitante.convidado_por,
        }
    return {**base, "tipo": "desconhecido"}


# ── CRUD Principal ────────────────────────────────────────────────────────────

@router.get("")
def list_pessoas(
    tipo: Optional[str] = Query(None, description="membro ou visitante"),
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    logger.debug("Listando pessoas — filtro tipo=%s", tipo)
    query = db.query(Pessoa)
    if tipo == "membro":
        query = query.join(Membro, Pessoa.id_pessoa == Membro.id_pessoa)
    elif tipo == "visitante":
        query = query.join(Visitante, Pessoa.id_pessoa == Visitante.id_pessoa)
    return [_build_out(p) for p in query.order_by(Pessoa.nome).all()]


@router.post("/membro", status_code=status.HTTP_201_CREATED)
def create_membro(
    body: MembroCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    if body.liderado_por and not db.get(Pessoa, body.liderado_por):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Líder não encontrado")
    pessoa = Pessoa(
        nome=body.nome,
        numero_celular=body.numero_celular,
        data_nascimento=body.data_nascimento,
        permissionamento=body.permissionamento,
        senha_hash=hash_password(body.senha) if body.senha else None,
    )
    membro = Membro(nome_celula=body.nome_celula, liderado_por=body.liderado_por)
    pessoa.membro = membro
    db.add(pessoa)
    db.commit()
    db.refresh(pessoa)
    logger.info("Membro criado: %s (id=%d)", pessoa.nome, pessoa.id_pessoa)
    return _build_out(pessoa)


@router.post("/visitante", status_code=status.HTTP_201_CREATED)
def create_visitante(
    body: VisitanteCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    if body.convidado_por and not db.get(Pessoa, body.convidado_por):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa que convidou não encontrada")
    pessoa = Pessoa(
        nome=body.nome,
        numero_celular=body.numero_celular,
        data_nascimento=body.data_nascimento,
        permissionamento=body.permissionamento,
        senha_hash=hash_password(body.senha) if body.senha else None,
    )
    visitante = Visitante(
        batizado=body.batizado,
        e_pastor=body.e_pastor,
        convidado_por=body.convidado_por,
    )
    pessoa.visitante = visitante
    db.add(pessoa)
    db.commit()
    db.refresh(pessoa)
    logger.info("Visitante criado: %s (id=%d)", pessoa.nome, pessoa.id_pessoa)
    return _build_out(pessoa)


@router.get("/{id_pessoa}")
def get_pessoa(
    id_pessoa: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    return _build_out(_get_pessoa_or_404(db, id_pessoa))


@router.put("/{id_pessoa}")
def update_pessoa(
    id_pessoa: int,
    body: PessoaUpdate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    pessoa = _get_pessoa_or_404(db, id_pessoa)
    if body.nome is not None:
        pessoa.nome = body.nome
    if body.numero_celular is not None:
        pessoa.numero_celular = body.numero_celular
    if body.data_nascimento is not None:
        pessoa.data_nascimento = body.data_nascimento
    if body.permissionamento is not None:
        pessoa.permissionamento = body.permissionamento
    if body.senha is not None:
        pessoa.senha_hash = hash_password(body.senha)
    if pessoa.membro:
        if body.nome_celula is not None:
            pessoa.membro.nome_celula = body.nome_celula
        if body.liderado_por is not None:
            if not db.get(Pessoa, body.liderado_por):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Líder não encontrado")
            pessoa.membro.liderado_por = body.liderado_por
    if pessoa.visitante:
        if body.batizado is not None:
            pessoa.visitante.batizado = body.batizado
        if body.e_pastor is not None:
            pessoa.visitante.e_pastor = body.e_pastor
        if body.convidado_por is not None:
            if not db.get(Pessoa, body.convidado_por):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa que convidou não encontrada")
            pessoa.visitante.convidado_por = body.convidado_por
    db.commit()
    db.refresh(pessoa)
    logger.info("Pessoa atualizada: %s (id=%d)", pessoa.nome, pessoa.id_pessoa)
    return _build_out(pessoa)


@router.delete("/{id_pessoa}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pessoa(
    id_pessoa: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    pessoa = _get_pessoa_or_404(db, id_pessoa)
    nome = pessoa.nome
    db.delete(pessoa)
    db.commit()
    logger.info("Pessoa removida: %s (id=%d)", nome, id_pessoa)


# ── Habilidades da pessoa ─────────────────────────────────────────────────────

@router.get("/{id_pessoa}/habilidades", response_model=List[HabilidadeOut])
def list_habilidades_pessoa(
    id_pessoa: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    return _get_pessoa_or_404(db, id_pessoa).habilidades


class HabilidadeBody(BaseModel):
    id_habilidade: int


@router.post("/{id_pessoa}/habilidades", response_model=List[HabilidadeOut], status_code=status.HTTP_201_CREATED)
def add_habilidade_pessoa(
    id_pessoa: int,
    body: HabilidadeBody,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    pessoa = _get_pessoa_or_404(db, id_pessoa)
    habilidade = db.get(Habilidade, body.id_habilidade)
    if habilidade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habilidade não encontrada")
    if habilidade in pessoa.habilidades:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Pessoa já possui esta habilidade")
    pessoa.habilidades.append(habilidade)
    db.commit()
    db.refresh(pessoa)
    logger.info("Habilidade '%s' adicionada à pessoa %s (id=%d)", habilidade.descricao, pessoa.nome, id_pessoa)
    return pessoa.habilidades


@router.delete("/{id_pessoa}/habilidades/{id_habilidade}", status_code=status.HTTP_204_NO_CONTENT)
def remove_habilidade_pessoa(
    id_pessoa: int,
    id_habilidade: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_pessoa),
):
    pessoa = _get_pessoa_or_404(db, id_pessoa)
    habilidade = db.get(Habilidade, id_habilidade)
    if habilidade is None or habilidade not in pessoa.habilidades:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não possui esta habilidade")
    pessoa.habilidades.remove(habilidade)
    db.commit()
    logger.info("Habilidade '%s' removida da pessoa %s (id=%d)", habilidade.descricao, pessoa.nome, id_pessoa)
