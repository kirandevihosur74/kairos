FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir uv==0.10.12
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY backend ./backend
RUN useradd --create-home kairos && chown -R kairos:kairos /app
USER kairos
EXPOSE 8000
CMD [".venv/bin/uvicorn", "kairos.app:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000"]
