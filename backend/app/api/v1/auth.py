from fastapi import APIRouter
from pydantic import BaseModel
from app.core.permissions import ROLES
from app.core.security import create_access_token

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(payload: LoginRequest):
    role = "Admin" if payload.username.lower() == "admin" else "Saha Personeli"
    if role not in ROLES:
        role = "Saha Personeli"
    return {
        "access_token": create_access_token(payload.username),
        "token_type": "bearer",
        "user": {
            "username": payload.username,
            "full_name": payload.username,
            "role": role,
        },
    }
