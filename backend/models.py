from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field
from typing import Literal, Optional, List
from datetime import datetime

Base = declarative_base()

# SQLAlchemy модели для базы данных
class MasterDB(Base):
    __tablename__ = "masters"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    color = Column(String, nullable=False)
    telegram_id = Column(Integer, unique=True, nullable=True) 
    role = Column(String, default="master")
    appointments = relationship("AppointmentDB", back_populates="master")

class AppointmentDB(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    time = Column(String, nullable=False)
    duration = Column(Integer, default=60)
    client_name = Column(String, nullable=False)
    comment = Column(Text, nullable=True)
    date = Column(String, nullable=False)
    status = Column(String(20), default="scheduled")
    cash_payment = Column(Float, default=0)
    card_payment = Column(Float, default=0)
    master_id = Column(Integer, ForeignKey("masters.id"))
    master = relationship("MasterDB", back_populates="appointments")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic модели для API
class Payment(BaseModel):
    cash: float = 0
    card: float = 0

class AppointmentBase(BaseModel):
    time: str
    duration: int = 60
    clientName: str
    comment: Optional[str] = ""
    date: str

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    clientName: Optional[str] = None
    comment: Optional[str] = None
    duration: Optional[int] = None
    time: Optional[str] = None
    status: Optional[Literal["scheduled", "completed", "cancelled"]] = None
    payment: Optional[Payment] = None

class Appointment(AppointmentBase):
    id: str
    status: Literal["scheduled", "completed", "cancelled"] = "scheduled"

    payment: Optional[Payment] = None
    
    class Config:
        orm_mode = True

class MasterBase(BaseModel):
    name: str
    color: str
    role: str = "master"  

class MasterCreate(MasterBase):
    pass

class Master(MasterBase):
    id: str
    
    class Config:
        orm_mode = True

class CompleteAppointmentRequest(BaseModel):
    payment: Payment

class Stats(BaseModel):
    totalAppointments: int
    completedAppointments: int
    totalRevenue: float