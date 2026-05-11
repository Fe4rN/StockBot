from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import usuarios, avisos, historial

# Crea las tablas si no existen (en producción usa Alembic)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="StockBot API")

# Puntos de acceso
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router de usuarios
app.include_router(usuarios.router)
# Router de avisos
app.include_router(avisos.router)
# Router de historial del robot
app.include_router(historial.router)

@app.get("/")
def read_root():
    return {"status": "API Operativa"}