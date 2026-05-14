from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    STORAGE_BUCKET: str = "nodi-audio"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1"
    WHISPER_MODEL_SIZE: str = "base"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
