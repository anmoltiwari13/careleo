from pydantic_settings import BaseSettings, SettingsConfigDict
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def _replace_query_param(url: str, source_key: str, target_key: str) -> str:
    parts = urlsplit(url)
    query_pairs = []
    changed = False

    for key, value in parse_qsl(parts.query, keep_blank_values=True):
        if key == source_key:
            query_pairs.append((target_key, value))
            changed = True
        else:
            query_pairs.append((key, value))

    if not changed:
        return url

    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query_pairs), parts.fragment))


class Settings(BaseSettings):
    app_name: str = "Careleo API"
    environment: str = "dev"
    api_v1_prefix: str = "/api/v1"

    postgres_user: str = "careleo"
    postgres_password: str = "careleo"
    postgres_db: str = "careleo"
    postgres_host: str = "db"
    postgres_port: int = 5432
    database_url: str | None = None

    redis_url: str = "redis://redis:6379/0"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_exp_minutes: int = 10080

    base_domain: str = "careleo.local"
    cors_origins: str = "http://localhost:5173"
    frontend_base_url: str = "http://localhost:5173"
    frontend_dist_dir: str = "/app/frontend_dist"

    @property
    def async_database_url(self) -> str:
        database_url = self.database_url or (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        if database_url.startswith("postgresql+asyncpg://"):
            return _replace_query_param(database_url, "sslmode", "ssl")
        if database_url.startswith("postgresql+psycopg2://"):
            return _replace_query_param(
                database_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1),
                "sslmode",
                "ssl",
            )
        if database_url.startswith("postgresql://"):
            return _replace_query_param(database_url.replace("postgresql://", "postgresql+asyncpg://", 1), "sslmode", "ssl")
        return _replace_query_param(
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}",
            "sslmode",
            "ssl",
        )

    @property
    def sync_database_url(self) -> str:
        database_url = self.database_url or (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        if database_url.startswith("postgresql+psycopg2://"):
            return database_url
        if database_url.startswith("postgresql+asyncpg://"):
            return database_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
        if database_url.startswith("postgresql://"):
            return database_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()
