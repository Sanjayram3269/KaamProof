from datetime import datetime,timedelta,timezone
from jose import jwt,JWTError
from passlib.context import CryptContext
from fastapi import Depends,HTTPException
from fastapi.security import HTTPBearer,HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.config import settings
from app.db import get_db
from app.models import User
pwd_context=CryptContext(schemes=["bcrypt"],deprecated="auto")
bearer=HTTPBearer(auto_error=False)
def hash_password(password:str)->str:return pwd_context.hash(password)
def verify_password(password:str,hashed:str)->bool:return pwd_context.verify(password,hashed)
def create_access_token(user_id:str)->str:
 exp=datetime.now(timezone.utc)+timedelta(minutes=settings.jwt_expire_minutes)
 return jwt.encode({"sub":user_id,"exp":exp},settings.jwt_secret,algorithm="HS256")
def get_current_user(credentials:HTTPAuthorizationCredentials|None=Depends(bearer),db:Session=Depends(get_db))->User:
 if not credentials:raise HTTPException(401,"Authentication required")
 try:user_id=jwt.decode(credentials.credentials,settings.jwt_secret,algorithms=["HS256"]).get("sub")
 except JWTError:raise HTTPException(401,"Invalid or expired token")
 user=db.get(User,user_id)
 if not user:raise HTTPException(401,"User not found")
 return user
