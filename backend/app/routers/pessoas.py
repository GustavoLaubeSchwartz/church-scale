from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Habilidade, Membro, Ministerio, Pessoa, Visitante
from app.schemas import (
    HabilidadeOut,
    MembroCreate,
    MembroOut,
    MembroUpdate,
    MinisterioOut,
    PessoaUpdate,
    VisitanteCreate,
    VisitanteOut,
    VisitanteUpdate,
)
from app.security import get_current_ministerio

import datetime as _dt

router = APIRouter()


def _get_pessoa_or_404(db: Session, cpf: str) -> Pessoa:
    obj = db.get(Pessoa, cpf)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não encontrada")
    return obj


# ── CRUD Principal ────────────────────────────────────────────────────────────

@router.get("/")
def list_pessoas(
    tipo: Optional[str] = Query(None, description="membro ou visitante"),
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    query = db.query(Pessoa)
    if tipo == "membro":
        query = query.join(Membro, Pessoa.cpf == Membro.cpf)
    elif tipo == "visitante":
        query = query.join(Visitante, Pessoa.cpf == Visitante.cpf)
    pessoas = query.order_by(Pessoa.nome).all()

    result = []
    for p in pessoas:
        base = {
            "cpf": p.cpf,
            "nome": p.nome,
            "data_nascimento": p.data_nascimento,
            "numero_celular": p.numero_celular,
        }
        if p.membro:
            result.append({**base, "tipo": "membro", "nome_celula": p.membro.nome_celula})
        elif p.visitante:
            result.append({
                **base,
                "tipo": "visitante",
                "batizado": p.visitante.batizado,
                "quanto_tempo_pastoreio": p.visitante.quanto_tempo_pastoreio,
                "cpf_quem_convidou": p.visitante.cpf_quem_convidou,
            })
        else:
            result.append({**base, "tipo": "desconhecido"})
    return result


@router.post("/membro", status_code=status.HTTP_201_CREATED)
def create_membro(
    body: MembroCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    if db.get(Pessoa, body.cpf):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="CPF já cadastrado")
    pessoa = Pessoa(
        cpf=body.cpf,
        nome=body.nome,
        data_nascimento=body.data_nascimento,
        numero_celular=body.numero_celular,
    )
    membro = Membro(cpf=body.cpf, nome_celula=body.nome_celula)
    pessoa.membro = membro
    db.add(pessoa)
    db.commit()
    db.refresh(pessoa)
    return {
        "cpf": pessoa.cpf,
        "nome": pessoa.nome,
        "data_nascimento": pessoa.data_nascimento,
        "numero_celular": pessoa.numero_celular,
        "tipo": "membro",
        "nome_celula": membro.nome_celula,
    }


@router.post("/visitante", status_code=status.HTTP_201_CREATED)
def create_visitante(
    body: VisitanteCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    if db.get(Pessoa, body.cpf):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="CPF já cadastrado")
    if body.cpf_quem_convidou and not db.get(Pessoa, body.cpf_quem_convidou):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa que convidou não encontrada")
    pessoa = Pessoa(
        cpf=body.cpf,
        nome=body.nome,
        data_nascimento=body.data_nascimento,
        numero_celular=body.numero_celular,
    )
    visitante = Visitante(
        cpf=body.cpf,
        batizado=body.batizado,
        quanto_tempo_pastoreio=body.quanto_tempo_pastoreio,
        cpf_quem_convidou=body.cpf_quem_convidou,
    )
    pessoa.visitante = visitante
    db.add(pessoa)
    db.commit()
    db.refresh(pessoa)
    return {
        "cpf": pessoa.cpf,
        "nome": pessoa.nome,
        "data_nascimento": pessoa.data_nascimento,
        "numero_celular": pessoa.numero_celular,
        "tipo": "visitante",
        "batizado": visitante.batizado,
        "quanto_tempo_pastoreio": visitante.quanto_tempo_pastoreio,
        "cpf_quem_convidou": visitante.cpf_quem_convidou,
    }


@router.get("/{cpf}")
def get_pessoa(
    cpf: str,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    pessoa = _get_pessoa_or_404(db, cpf)
    base = {
        "cpf": pessoa.cpf,
        "nome": pessoa.nome,
        "data_nascimento": pessoa.data_nascimento,
        "numero_celular": pessoa.numero_celular,
    }
    if pessoa.membro:
        return {**base, "tipo": "membro", "nome_celula": pessoa.membro.nome_celula}
    if pessoa.visitante:
        return {
            **base,
            "tipo": "visitante",
            "batizado": pessoa.visitante.batizado,
            "quanto_tempo_pastoreio": pessoa.visitante.quanto_tempo_pastoreio,
            "cpf_quem_convidou": pessoa.visitante.cpf_quem_convidou,
        }
    return {**base, "tipo": "desconhecido"}


class _PessoaUpdateFull(BaseModel):
    nome: Optional[str] = None
    data_nascimento: Optional[_dt.date] = None
    numero_celular: Optional[str] = None
    nome_celula: Optional[str] = None
    batizado: Optional[bool] = None
    quanto_tempo_pastoreio: Optional[str] = None
    cpf_quem_convidou: Optional[str] = None


@router.put("/{cpf}")
def update_pessoa(
    cpf: str,
    body: _PessoaUpdateFull,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    pessoa = _get_pessoa_or_404(db, cpf)
    if body.nome is not None:
        pessoa.nome = body.nome
    if body.data_nascimento is not None:
        pessoa.data_nascimento = body.data_nascimento
    if body.numero_celular is not None:
        pessoa.numero_celular = body.numero_celular
    if pessoa.membro and body.nome_celula is not None:
        pessoa.membro.nome_celula = body.nome_celula
    if pessoa.visitante:
        if body.batizado is not None:
            pessoa.visitante.batizado = body.batizado
        if body.quanto_tempo_pastoreio is not None:
            pessoa.visitante.quanto_tempo_pastoreio = body.quanto_tempo_pastoreio
        if body.cpf_quem_convidou is not None:
            if not db.get(Pessoa, body.cpf_quem_convidou):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa que convidou não encontrada")
            pessoa.visitante.cpf_quem_convidou = body.cpf_quem_convidou
    db.commit()
    db.refresh(pessoa)
    return get_pessoa(cpf, db, _auth)


@router.delete("/{cpf}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pessoa(
    cpf: str,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    pessoa = _get_pessoa_or_404(db, cpf)
    db.delete(pessoa)
    db.commit()


# ── Habilidades da pessoa ─────────────────────────────────────────────────────

@router.get("/{cpf}/habilidades", response_model=List[HabilidadeOut])
def list_habilidades_pessoa(
    cpf: str,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    pessoa = _get_pessoa_or_404(db, cpf)
    return pessoa.habilidades


class HabilidadeBody(BaseModel):
    id_habilidade: int


@router.post("/{cpf}/habilidades", response_model=List[HabilidadeOut], status_code=status.HTTP_201_CREATED)
def add_habilidade_pessoa(
    cpf: str,
    body: HabilidadeBody,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    pessoa = _get_pessoa_or_404(db, cpf)
    habilidade = db.get(Habilidade, body.id_habilidade)
    if habilidade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habilidade não encontrada")
    if habilidade in pessoa.habilidades:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Pessoa já possui esta habilidade")
    pessoa.habilidades.append(habilidade)
    db.commit()
    db.refresh(pessoa)
    return pessoa.habilidades


@router.delete("/{cpf}/habilidades/{id_habilidade}", status_code=status.HTTP_204_NO_CONTENT)
def remove_habilidade_pessoa(
    cpf: str,
    id_habilidade: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    pessoa = _get_pessoa_or_404(db, cpf)
    habilidade = db.get(Habilidade, id_habilidade)
    if habilidade is None or habilidade not in pessoa.habilidades:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não possui esta habilidade")
    pessoa.habilidades.remove(habilidade)
    db.commit()


# ── Ministérios da pessoa ─────────────────────────────────────────────────────

@router.get("/{cpf}/ministerios", response_model=List[MinisterioOut])
def list_ministerios_pessoa(
    cpf: str,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    pessoa = _get_pessoa_or_404(db, cpf)
    return pessoa.ministerios


class MinisterioBody(BaseModel):
    id_ministerio: int


@router.post("/{cpf}/ministerios", response_model=List[MinisterioOut], status_code=status.HTTP_201_CREATED)
def add_ministerio_pessoa(
    cpf: str,
    body: MinisterioBody,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    pessoa = _get_pessoa_or_404(db, cpf)
    ministerio = db.get(Ministerio, body.id_ministerio)
    if ministerio is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ministério não encontrado")
    if ministerio in pessoa.ministerios:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Pessoa já participa deste ministério")
    pessoa.ministerios.append(ministerio)
    db.commit()
    db.refresh(pessoa)
    return pessoa.ministerios


@router.delete("/{cpf}/ministerios/{id_ministerio}", status_code=status.HTTP_204_NO_CONTENT)
def remove_ministerio_pessoa(
    cpf: str,
    id_ministerio: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    pessoa = _get_pessoa_or_404(db, cpf)
    ministerio = db.get(Ministerio, id_ministerio)
    if ministerio is None or ministerio not in pessoa.ministerios:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não participa deste ministério")
    pessoa.ministerios.remove(ministerio)
    db.commit()
