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

CMD ["uvicorn", "aerotwin.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
