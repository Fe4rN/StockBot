from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/avisos",
    tags=["avisos"]
)

# ENDPOINT: Obtener todos los avisos
@router.get("/", response_model=List[schemas.AvisoResponse])
def obtener_avisos(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    avisos = db.query(models.Aviso).order_by(models.Aviso.Tiempo.desc()).offset(skip).limit(limit).all()
    return avisos

# ENDPOINT: Crear un aviso
@router.post("/", response_model=schemas.AvisoResponse)
def crear_aviso(aviso: schemas.AvisoCreate, db: Session = Depends(get_db)):
    # 1. Validar que el Robot existe (opcional pero recomendado)
    robot_existe = db.query(models.Robot).filter(models.Robot.ID == aviso.Robot).first()
    if not robot_existe:
        raise HTTPException(status_code=404, detail="El Robot especificado no existe")

    # 2. Crear instancia del modelo
    nuevo_aviso = models.Aviso(
        Tipo=aviso.Tipo,
        Robot=aviso.Robot,
        Almacen=aviso.Almacen,
        Informacion=aviso.Informacion
        # 'Tiempo' se genera automáticamente si pusiste el default en la DB o el modelo
    )
    
    db.add(nuevo_aviso)
    db.commit()
    db.refresh(nuevo_aviso)
    return nuevo_aviso