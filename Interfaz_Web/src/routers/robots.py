from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/robots",
    tags=["robots"]
)

@router.post("/buscar", response_model=schemas.RobotResponse)
def buscar_robot_por_nombre(
    criterio: schemas.RobotSearch, 
    db: Session = Depends(get_db)
):
    """
    Busca un robot por su nombre enviando un JSON en el cuerpo de la petición.
    """
    robot = db.query(models.Robot).filter(models.Robot.Nombre == criterio.Nombre).first()
    
    if not robot:
        raise HTTPException(
            status_code=404, 
            detail=f"No se encontró ningún robot con el nombre '{criterio.Nombre}'"
        )
    
    return robot