import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.routers import (
    alocacoes,
    auth,
    eventos,
    habilidades,
    locais,
    ministerios,
    pessoas,
    relatorios,
    tipos_evento,
)

app = FastAPI(title="Church Scale", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

api = FastAPI(title="Church Scale API", version="1.0.0")
api.include_router(auth.router,         prefix="/auth",         tags=["Auth"])
api.include_router(pessoas.router,      prefix="/pessoas",      tags=["Pessoas"])
api.include_router(ministerios.router,  prefix="/ministerios",  tags=["Ministérios"])
api.include_router(habilidades.router,  prefix="/habilidades",  tags=["Habilidades"])
api.include_router(locais.router,       prefix="/locais",       tags=["Locais"])
api.include_router(tipos_evento.router, prefix="/tipos-evento", tags=["Tipos de Evento"])
api.include_router(eventos.router,      prefix="/eventos",      tags=["Eventos"])
api.include_router(alocacoes.router,    prefix="/alocacoes",    tags=["Alocações"])
api.include_router(relatorios.router,   prefix="/relatorios",   tags=["Relatórios"])

app.mount("/api/v1", api)

FRONTEND = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))


@app.get("/", include_in_schema=False)
def root():
    return FileResponse(os.path.join(FRONTEND, "index.html"))


app.mount("/", StaticFiles(directory=FRONTEND, html=True), name="static")
