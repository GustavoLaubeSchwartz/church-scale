#!/bin/sh
set -e

echo "Aguardando o banco de dados..."
until python -c "
import sys, os
sys.path.insert(0, '.')
from app.database import engine
from sqlalchemy import text
try:
    with engine.connect() as c:
        c.execute(text('SELECT 1'))
    print('Banco pronto.')
except Exception as e:
    print(f'Banco indisponível: {e}')
    sys.exit(1)
"; do
  sleep 2
done

echo "Iniciando tabelas e seed..."
python init_db.py

echo "Iniciando servidor..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
