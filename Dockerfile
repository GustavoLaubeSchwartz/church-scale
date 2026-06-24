FROM python:3.11-slim

WORKDIR /app

# Instala dependências Python primeiro (camada cacheável)
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copia código — backend em /app/backend, frontend em /app/frontend
# Assim os caminhos relativos em main.py (../../frontend) resolvem corretamente
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Entrypoint fica dentro do backend
COPY backend/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

WORKDIR /app/backend

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
