import base64
import json
from fastapi import APIRouter, Depends, HTTPException, status, Response
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
def login(datos_login: schemas.LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.Email == datos_login.Email).first()
    
    if not user or user.Contraseña != datos_login.Contraseña:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )
    
    # Creamos un diccionario con la info que queremos guardar en la cookie
    user_info = {
        "id": user.ID,
        "nombre": user.Nombre,
        "email": user.Email
    }

    # "Ciframos" (Codificamos) en Base64 para que no sea texto plano en el navegador
    user_data_str = json.dumps(user_info)
    encoded_data = base64.b64encode(user_data_str.encode()).decode()

    # Seteamos la cookie
    response.set_cookie(
        key="session_user", 
        value=encoded_data,
        max_age=3600, # Expira en 1 hora
        httponly=False, # Importante: False para que JavaScript PUEDA leerla
        samesite="lax"
    )
    
    return {"mensaje": "Login exitoso", "usuario": user_info}