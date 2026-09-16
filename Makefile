.PHONY: install test lint dataset train api dashboard demo fmt

PY ?= python3

install:
	$(PY) -m pip install -e ".[dev,ml]"
	@if [ -d dashboard ] && [ -f dashboard/package.json ]; then cd dashboard && npm install; fi

test:
	$(PY) -m pytest -q

lint:
	$(PY) -m ruff check aerotwin tests scripts

fmt:
	$(PY) -m ruff check --fix aerotwin tests scripts

dataset:
	$(PY) -m scripts.generate_dataset --size small

train:
	$(PY) -m scripts.train_all

api:
	$(PY) -m uvicorn aerotwin.api.main:app --host 0.0.0.0 --port 8000 --reload

dashboard:
	cd dashboard && npm run dev -- --host

demo:
	$(PY) -m scripts.demo
