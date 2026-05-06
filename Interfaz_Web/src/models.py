from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP, func
from sqlalchemy.orm import relationship
from .database import Base

class Usuario(Base):
    __tablename__ = "Usuarios"
    ID = Column(Integer, primary_key=True, index=True)
    Nombre = Column(String)
    Email = Column(String, unique=True)
    Contraseña = Column(String)

class Robot(Base):
    __tablename__ = "Robots"
    ID = Column(Integer, primary_key=True, index=True)
    Nombre = Column(String)
    Direccion_Red = Column(String)
    Usuario_ID = Column(Integer, ForeignKey("Usuarios.ID"))
    
    propietario = relationship("Usuario")

class Almacen(Base):
    __tablename__ = "Almacen"
    ID = Column(Integer, primary_key=True)
    Nombre = Column(String)
    Propietario_ID = Column(Integer, ForeignKey("Usuarios.ID"))
    Robots_ID = Column(Integer, ForeignKey("Robots.ID"))

class Producto(Base):
    __tablename__ = "Producto"
    ID = Column(Integer, primary_key=True)
    Nombre = Column(String)
    Cantidad = Column(Integer)
    Almacen_ID = Column(Integer, ForeignKey("Almacen.ID"))

class Historial(Base):
    __tablename__ = "Historial"
    ID = Column(Integer, primary_key=True)
    ID_Robot = Column(Integer, ForeignKey("Robots.ID"))
    Mensaje = Column(String)
    Fecha = Column(TIMESTAMP, server_default=func.now())