from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/historial",
    tags=["historial"]
)

# ENDPOINT: Obtener historial (con paginación y ordenado por fecha reciente)
@router.get("/", response_model=List[schemas.HistorialResponse])
def obtener_historial(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    logs = db.query(models.Historial).order_by(models.Historial.Fecha.desc()).offset(skip).limit(limit).all()
    return logs

# ENDPOINT: Obtener historial de un robot específico
@router.get("/robot/{robot_id}", response_model=List[schemas.HistorialResponse])
def obtener_historial_por_robot(robot_id: int, db: Session = Depends(get_db)):
    logs = db.query(models.Historial).filter(models.Historial.ID_Robot == robot_id).order_by(models.Historial.Fecha.desc()).all()
    return logs

# ENDPOINT: Subir un nuevo evento al historial
@router.post("/", response_model=schemas.HistorialResponse)
def crear_evento_historial(evento: schemas.HistorialCreate, db: Session = Depends(get_db)):
    nuevo_log = models.Historial(
        ID_Robot=evento.ID_Robot,
        Mensaje=evento.Mensaje
        # Fecha se genera automáticamente en la DB
    )
    db.add(nuevo_log)
    db.commit()
    db.refresh(nuevo_log)
    return nuevo_log