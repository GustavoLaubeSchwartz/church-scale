import logging
import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.routers import (
    alocacoes,
    auth,
    eventos,
    habilidades,
    locais,
    pessoas,
    relatorios,
    tipos_evento,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)-8s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("church_scale")

app = FastAPI(title="Church Scale", version="2.0.0", redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_P = "/api/v1"
app.include_router(auth.router,         prefix=f"{_P}/auth",         tags=["Auth"])
app.include_router(pessoas.router,      prefix=f"{_P}/pessoas",      tags=["Pessoas"])
app.include_router(habilidades.router,  prefix=f"{_P}/habilidades",  tags=["Habilidades"])
app.include_router(locais.router,       prefix=f"{_P}/locais",       tags=["Locais"])
app.include_router(tipos_evento.router, prefix=f"{_P}/tipos-evento", tags=["Tipos de Evento"])
app.include_router(eventos.router,      prefix=f"{_P}/eventos",      tags=["Eventos"])
app.include_router(alocacoes.router,    prefix=f"{_P}/alocacoes",    tags=["Alocações"])
app.include_router(relatorios.router,   prefix=f"{_P}/relatorios",   tags=["Relatórios"])


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s → %d  (%.1f ms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed,
    )
    return response


FRONTEND = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))


@app.get("/", include_in_schema=False)
def root():
    return FileResponse(os.path.join(FRONTEND, "index.html"))


app.mount("/", StaticFiles(directory=FRONTEND, html=True), name="static")
logger.info("Church Scale v2.0.0 iniciado. Frontend: %s", FRONTEND)
