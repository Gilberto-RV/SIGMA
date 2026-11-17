"""Pruebas de la protección del servicio ML (clave compartida y CORS).

Ejecutar desde backend/ml-service:  venv\\Scripts\\python -m pytest -q
"""
import importlib
import os
import sys

import pytest
from fastapi.testclient import TestClient

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

API_KEY = "clave-de-prueba-123"


def build_client(monkeypatch, api_key, cors_origins=""):
    """Recarga config y api con las variables de entorno indicadas."""
    monkeypatch.chdir(ROOT)
    monkeypatch.setenv("ML_API_KEY", api_key)
    monkeypatch.setenv("ML_CORS_ORIGINS", cors_origins)
    import config
    importlib.reload(config)
    import api
    importlib.reload(api)
    return TestClient(api.app)


@pytest.fixture
def client(monkeypatch):
    return build_client(monkeypatch, API_KEY)


def test_health_es_publico(client):
    assert client.get("/health").status_code == 200
    assert client.get("/").status_code == 200


def test_predict_sin_clave_responde_401(client):
    response = client.post("/predict/saturation", json={"viewCount": 10})
    assert response.status_code == 401


def test_predict_con_clave_incorrecta_responde_401(client):
    response = client.post("/predict/saturation", json={"viewCount": 10}, headers={"X-API-Key": "otra"})
    assert response.status_code == 401


def test_model_reload_protegido(client):
    assert client.post("/model/reload").status_code == 401
    assert client.get("/model/info").status_code == 401


def test_predict_con_clave_correcta_pasa_la_proteccion(client):
    response = client.post(
        "/predict/saturation",
        json={"viewCount": 10, "uniqueVisitors": 5, "hour": 12, "dayOfWeek": 2},
        headers={"X-API-Key": API_KEY},
    )
    # 200 con modelos entrenados; 503/500 si faltan los .pkl. Lo importante: no es 401.
    assert response.status_code != 401


def test_cors_no_permite_origenes_por_defecto(client):
    response = client.get("/health", headers={"Origin": "https://sitio-malicioso.example"})
    assert "access-control-allow-origin" not in response.headers


def test_sin_clave_configurada_queda_abierto(monkeypatch):
    open_client = build_client(monkeypatch, "")
    assert open_client.get("/model/info").status_code == 200
