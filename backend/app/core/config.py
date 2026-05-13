from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    STORAGE_BUCKET: str = "nodi-audio"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
