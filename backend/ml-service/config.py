# config.py
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/innovatec')
ML_PORT = int(os.getenv('ML_PORT', 8000))
# Solo el backend consume este servicio: por defecto escucha únicamente en localhost.
# En Docker se define ML_HOST=0.0.0.0 para que el contenedor del backend lo alcance.
ML_HOST = os.getenv('ML_HOST', '127.0.0.1')
MODELS_DIR = os.getenv('MODELS_DIR', './models')
DATA_DIR = os.getenv('DATA_DIR', './data')

# Clave compartida con el backend (cabecera X-API-Key). Si está vacía, /predict y /model
# quedan abiertos (solo para desarrollo local) y se avisa al arrancar.
ML_API_KEY = os.getenv('ML_API_KEY', '').strip()
# Orígenes de navegador permitidos por CORS (separados por comas). Vacío: ninguno,
# porque las llamadas llegan del backend, no de un navegador.
ML_CORS_ORIGINS = [o.strip() for o in os.getenv('ML_CORS_ORIGINS', '').split(',') if o.strip()]
# Auto-recarga de uvicorn: útil al desarrollar, no en producción.
ML_RELOAD = os.getenv('ML_RELOAD', 'false').lower() == 'true'

# Crear directorios si no existen
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

