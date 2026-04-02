#!/bin/sh

set -e

if [ -n "${RENDER_EXTERNAL_URL}" ]; then
  export FRONTEND_BASE_URL="${FRONTEND_BASE_URL:-$RENDER_EXTERNAL_URL}"
  export CORS_ORIGINS="${CORS_ORIGINS:-$RENDER_EXTERNAL_URL}"
fi

alembic upgrade head
exec gunicorn -k uvicorn.workers.UvicornWorker -c gunicorn_conf.py app.main:app
