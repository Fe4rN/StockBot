from pydantic import BaseModel, EmailStr
from typing import Optional

# Lo que se necesita para crear un usuario
class UsuarioCreate(BaseModel):
    Nombre: str
    Email: EmailStr
    Contraseña: str

# Lo que se necesita para el login
class LoginRequest(BaseModel):
    Email: EmailStr
    Contraseña: str

# Lo que la API devuelve (sin mostrar la contraseña por seguridad)
class UsuarioResponse(BaseModel):
    ID: int
    Nombre: str
    Email: EmailStr

    class Config:
        from_attributes = True