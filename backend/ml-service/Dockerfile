# Servicio de Machine Learning SIGMA-BULL (FastAPI + scikit-learn)
# Los modelos entrenados (.pkl) no van en la imagen: docker-compose monta ./models.
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ML_HOST=0.0.0.0 \
    ML_PORT=8000

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN useradd --create-home appuser && mkdir -p models data && chown -R appuser /app
USER appuser

EXPOSE 8000
CMD ["python", "main.py"]
