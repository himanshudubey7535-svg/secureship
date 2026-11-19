from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite:///./secureship.db"
    JWT_SECRET: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440
    TRIVY_TIMEOUT: int = 300
    REPORTS_DIR: str = "reports"
    SCAN_RATE_LIMIT_PER_HOUR: int = 20
    MAX_CONCURRENT_SCANS: int = 2
    MAX_REQUEST_BYTES: int = 100_000
    # Comma-separated list of allowed browser origins
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
