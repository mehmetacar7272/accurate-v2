from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "ACCURATE V2"
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    SECRET_KEY: str = "change-this-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8
    DATABASE_URL: str = "sqlite:///./accurate_v2.db"

settings = Settings()
