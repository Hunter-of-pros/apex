.PHONY: help install seed test dev backend frontend

help:
	@echo "Meridian CDS — Clinical Decision-Support & Diagnostic Triage System"
	@echo ""
	@echo "Available commands:"
	@echo "  make install    Install Python dependencies and Node modules"
	@echo "  make seed       Seed database with ~40 realistic clinical cases (CXR + Tabular)"
	@echo "  make test       Run full unit and integration test suite"
	@echo "  make backend    Run FastAPI backend server on http://localhost:8000"
	@echo "  make frontend   Run React Vite workstation on http://localhost:3000"
	@echo "  make dev        Launch both backend and frontend concurrently"

install:
	/opt/homebrew/bin/python3.11 -m venv .venv
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -r backend/requirements.txt
	.venv/bin/pip install pydantic-settings greenlet
	cd frontend && npm install

seed:
	PYTHONPATH=. .venv/bin/python backend/scripts/seed_demo_data.py

test:
	PYTHONPATH=. .venv/bin/pytest backend/tests/

backend:
	PYTHONPATH=. .venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

frontend:
	cd frontend && npm run dev -- --port 3000 --host

dev:
	@echo "Starting Meridian CDS (Backend: http://localhost:8000, Frontend: http://localhost:3000)..."
	@trap 'kill 0' EXIT; \
	(PYTHONPATH=. .venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000) & \
	(cd frontend && npm run dev -- --port 3000 --host) & \
	wait
