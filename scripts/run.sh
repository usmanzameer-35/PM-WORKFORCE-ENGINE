#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
if [[ ! -x backend/.venv/bin/python ]]; then
  echo 'First follow README setup to install backend/.venv and frontend dependencies.' >&2
  exit 1
fi
cleanup() { [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null || true; [[ -n "${WEB_PID:-}" ]] && kill "$WEB_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
(cd backend && exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000) &
API_PID=$!
(cd frontend && pnpm build && exec pnpm start) &
WEB_PID=$!
echo 'Open http://localhost:3000 after the frontend finishes building. Ctrl+C stops both servers.'
wait "$WEB_PID"
