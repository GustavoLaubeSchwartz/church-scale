from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ministerio
from app.schemas import LoginRequest, MinisterioOut, TokenOut
from app.security import create_access_token, get_current_ministerio, verify_password

router = APIRouter()


@router.post("/login", response_model=TokenOut)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    ministerio = db.query(Ministerio).filter(Ministerio.login == body.login).first()
    if not ministerio or not verify_password(body.senha, ministerio.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login ou senha inválidos",
        )
    token = create_access_token({"sub": str(ministerio.id_ministerio)})
    return TokenOut(access_token=token, ministerio=ministerio)


@router.get("/me", response_model=MinisterioOut)
def me(_auth=Depends(get_current_ministerio)):
    return _auth
