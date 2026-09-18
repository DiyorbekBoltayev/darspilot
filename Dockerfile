# DarsPilot API: FastAPI + OpenCV + GPT
# Eski CPU li serverlar uchun: --build-arg PY=3.12 --build-arg REQ=requirements-oldcpu.txt
ARG PY=3.13
FROM python:${PY}-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# PDF uchun DejaVu shriftlari, OpenCV uchun glib
RUN apt-get update \
    && apt-get install -y --no-install-recommends fonts-dejavu-core libglib2.0-0 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
ARG REQ=requirements.txt
COPY ${REQ} ./requirements.txt
RUN pip install -r requirements.txt

COPY app ./app

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD curl -fsS http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
