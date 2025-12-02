from typing import Optional
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
import jwt

from database import JWT_SECRET_KEY, get_db
from models import MasterDB


async def verify_token(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        master_id = payload.get("master_id")
        
        if not master_id:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        # Попытка получить мастера с обработкой ошибок подключения
        try:
            master = db.query(MasterDB).filter(MasterDB.id == master_id).first()
        except OperationalError as e:
            # Если ошибка подключения, попробуем создать новую сессию
            raise HTTPException(status_code=503, detail="Database connection error. Please try again.")
            
        if not master:
            raise HTTPException(status_code=401, detail="Master not found")
            
        return {"master_id": master_id, "master": master}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except OperationalError as e:
        raise HTTPException(status_code=503, detail="Database connection error. Please try again.")