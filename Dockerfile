# AeroTwin backend image: FastAPI + the digital twin core.
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
COPY aerotwin ./aerotwin
COPY configs ./configs
COPY scripts ./scripts

RUN pip install --no-cache-dir -e ".[dev]"

EXPOSE 8000

# Hosts such as Render/Railway/Fly inject $PORT. Keep a single worker: sessions,
# replay and the live buffer are in-process state shared with /ws/live.
CMD ["sh", "-c", "exec uvicorn aerotwin.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
