import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Pessoa
from app.schemas import LoginRequest, PessoaOut, TokenOut
from app.security import create_access_token, get_current_pessoa, verify_password

router = APIRouter()
logger = logging.getLogger(__name__)


def _pessoa_to_out(p: Pessoa) -> PessoaOut:
    tipo = "membro" if p.membro else ("visitante" if p.visitante else "desconhecido")
    return PessoaOut(
        id_pessoa=p.id_pessoa,
        nome=p.nome,
        numero_celular=p.numero_celular,
        data_nascimento=p.data_nascimento,
        permissionamento=p.permissionamento,
        tipo=tipo,
    )


@router.post("/login", response_model=TokenOut)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    logger.info("Tentativa de login: %s", body.numero_celular)

    pessoa = db.query(Pessoa).filter(Pessoa.numero_celular == body.numero_celular).first()

    if not pessoa:
        logger.warning("Login falhou — número não cadastrado: %s", body.numero_celular)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Número de celular não cadastrado no sistema.",
        )

    if not pessoa.senha_hash:
        logger.warning(
            "Login falhou — conta sem senha: %s (%s)", pessoa.nome, body.numero_celular
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Esta conta não possui senha configurada. Contate o administrador.",
        )

    if not verify_password(body.senha, pessoa.senha_hash):
        logger.warning(
            "Login falhou — senha incorreta para: %s (%s)", pessoa.nome, body.numero_celular
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha incorreta. Verifique e tente novamente.",
        )

    logger.info("Login bem-sucedido: %s (%s)", pessoa.nome, body.numero_celular)
    token = create_access_token({"sub": str(pessoa.id_pessoa)})
    return TokenOut(access_token=token, pessoa=_pessoa_to_out(pessoa))


@router.get("/me", response_model=PessoaOut)
def me(current: Pessoa = Depends(get_current_pessoa)):
    logger.debug("GET /me — %s", current.numero_celular)
    return _pessoa_to_out(current)
