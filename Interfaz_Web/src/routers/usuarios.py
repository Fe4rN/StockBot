from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/usuarios",
    tags=["usuarios"]
)

@router.post("/registro", response_model=schemas.UsuarioResponse)
def registrar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    # Verificar si el email existe
    usuario_existente = db.query(models.Usuario).filter(models.Usuario.Email == usuario.Email).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Crear el nuevo usuario
    nuevo_usuario = models.Usuario(
        Nombre=usuario.Nombre,
        Email=usuario.Email,
        Contraseña=usuario.Contraseña  # Guardado en texto plano por tu petición
    )
    
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario

@router.post("/login")
def login(datos_login: schemas.LoginRequest, db: Session = Depends(get_db)):
    # Buscar al usuario por email
    user = db.query(models.Usuario).filter(models.Usuario.Email == datos_login.Email).first()
    
    # Validar existencia y contraseña
    if not user or user.Contraseña != datos_login.Contraseña:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )
    
    # 3. Retornar éxito (en un estándar real aquí daríamos un Token JWT)
    return {
        "mensaje": "Login exitoso",
        "usuario": {
            "id": user.ID,
            "nombre": user.Nombre,
            "email": user.Email
        }
    }