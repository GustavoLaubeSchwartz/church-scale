import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ministerio, Pessoa, lidera_table
from app.schemas import MembroOut, MinisterioCreate, MinisterioOut, MinisterioUpdate, VisitanteOut
from app.security import get_current_ministerio, hash_password

router = APIRouter()


def _get_or_404(db: Session, id_ministerio: int) -> Ministerio:
    obj = db.get(Ministerio, id_ministerio)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ministério não encontrado")
    return obj


@router.get("/", response_model=List[MinisterioOut])
def list_ministerios(db: Session = Depends(get_db), _auth=Depends(get_current_ministerio)):
    return db.query(Ministerio).order_by(Ministerio.nome).all()


@router.post("/", response_model=MinisterioOut, status_code=status.HTTP_201_CREATED)
def create_ministerio(
    body: MinisterioCreate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    existing = db.query(Ministerio).filter(Ministerio.login == body.login).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Login já cadastrado")
    obj = Ministerio(
        nome=body.nome,
        login=body.login,
        senha_hash=hash_password(body.senha),
        criado_em=body.criado_em or datetime.date.today(),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{id_ministerio}", response_model=MinisterioOut)
def get_ministerio(
    id_ministerio: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    return _get_or_404(db, id_ministerio)


@router.put("/{id_ministerio}", response_model=MinisterioOut)
def update_ministerio(
    id_ministerio: int,
    body: MinisterioUpdate,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    obj = _get_or_404(db, id_ministerio)
    if body.nome is not None:
        obj.nome = body.nome
    if body.login is not None:
        conflict = db.query(Ministerio).filter(Ministerio.login == body.login, Ministerio.id_ministerio != id_ministerio).first()
        if conflict:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Login já em uso")
        obj.login = body.login
    if body.senha is not None:
        obj.senha_hash = hash_password(body.senha)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id_ministerio}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ministerio(
    id_ministerio: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    obj = _get_or_404(db, id_ministerio)
    db.delete(obj)
    db.commit()


# ── Membros ───────────────────────────────────────────────────────────────────

@router.get("/{id_ministerio}/membros")
def list_membros(
    id_ministerio: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    ministerio = _get_or_404(db, id_ministerio)
    result = []
    for pessoa in ministerio.membros:
        if pessoa.membro:
            result.append({
                "cpf": pessoa.cpf,
                "nome": pessoa.nome,
                "data_nascimento": pessoa.data_nascimento,
                "numero_celular": pessoa.numero_celular,
                "tipo": "membro",
                "nome_celula": pessoa.membro.nome_celula,
            })
        else:
            result.append({
                "cpf": pessoa.cpf,
                "nome": pessoa.nome,
                "data_nascimento": pessoa.data_nascimento,
                "numero_celular": pessoa.numero_celular,
                "tipo": "visitante",
            })
    return result


# ── Líderes ───────────────────────────────────────────────────────────────────

@router.get("/{id_ministerio}/lideres")
def list_lideres(
    id_ministerio: int,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    ministerio = _get_or_404(db, id_ministerio)
    return [
        {"cpf": p.cpf, "nome": p.nome, "numero_celular": p.numero_celular}
        for p in ministerio.lideres
    ]


class LiderBody(BaseModel):
    cpf_pessoa: str


@router.post("/{id_ministerio}/lideres", status_code=status.HTTP_201_CREATED)
def add_lider(
    id_ministerio: int,
    body: LiderBody,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    ministerio = _get_or_404(db, id_ministerio)
    pessoa = db.get(Pessoa, body.cpf_pessoa)
    if pessoa is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não encontrada")
    if pessoa in ministerio.lideres:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Pessoa já é líder deste ministério")
    ministerio.lideres.append(pessoa)
    db.commit()
    return {"detail": "Líder adicionado com sucesso"}


@router.delete("/{id_ministerio}/lideres/{cpf}", status_code=status.HTTP_204_NO_CONTENT)
def remove_lider(
    id_ministerio: int,
    cpf: str,
    db: Session = Depends(get_db),
    _auth=Depends(get_current_ministerio),
):
    ministerio = _get_or_404(db, id_ministerio)
    pessoa = db.get(Pessoa, cpf)
    if pessoa is None or pessoa not in ministerio.lideres:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não é líder deste ministério")
    ministerio.lideres.remove(pessoa)
    db.commit()
