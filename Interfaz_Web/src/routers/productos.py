from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models

router = APIRouter(
    prefix="/productos",
    tags=["productos"]
)

@router.get("/")
def obtener_productos(db: Session = Depends(get_db)):
    return db.query(models.Producto).all()

@router.post("/registrar")
def registrar_producto(nombre: str, db: Session = Depends(get_db)):
    # Buscar producto en la DB
    prod = db.query(models.Producto).filter(models.Producto.Nombre == nombre).first()
    if prod:
        prod.Cantidad += 1
    else:
        # Crear nuevo producto en el almacén por defecto (ID 1)
        prod = models.Producto(Nombre=nombre, Cantidad=1, Almacen=1)
        db.add(prod)
    db.commit()
    db.refresh(prod)
    return {"status": "success", "producto": prod.Nombre, "cantidad": prod.Cantidad}
