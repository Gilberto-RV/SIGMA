# main.py
"""
Punto de entrada principal del ML Service
"""
import uvicorn
from config import ML_PORT, ML_HOST, ML_RELOAD

if __name__ == "__main__":
    print("🚀 Iniciando ML Service...")
    print(f"📍 Servidor en http://{ML_HOST}:{ML_PORT}")
    print(f"📖 Documentación API: http://localhost:{ML_PORT}/docs")
    print("⏳ Iniciando servidor...")
    # Cadena de importación para poder usar reload (ML_RELOAD=true solo en desarrollo)
    uvicorn.run(
        "api:app",
        host=ML_HOST,
        port=ML_PORT,
        reload=ML_RELOAD,
        log_level="info"
    )
