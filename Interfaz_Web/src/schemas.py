from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional

# Schemas de usuarios

class UsuarioCreate(BaseModel):
    Nombre: str
    Email: EmailStr
    Contraseña: str

class LoginRequest(BaseModel):
    Email: EmailStr
    Contraseña: str

class UsuarioResponse(BaseModel):
    ID: int
    Nombre: str
    Email: EmailStr

    class Config:
        from_attributes = True

# Schemas de avisos

class AvisoBase(BaseModel):
    Tipo: str
    Robot: int
    Almacen: int
    Informacion: str

class AvisoCreate(AvisoBase):
    pass

class AvisoResponse(AvisoBase):
    ID: int
    Tiempo: datetime

    model_config = ConfigDict(from_attributes=True)
    
# Schemas de historial

class HistorialBase(BaseModel):
    ID_Robot: int
    Mensaje: str

class HistorialCreate(HistorialBase):
    pass

class HistorialResponse(HistorialBase):
    ID: int
    Fecha: datetime

    model_config = ConfigDict(from_attributes=True)