import os
from datetime import timedelta


def _get_database_uri(environment_names, default_database):
    database_url = next(
        (os.getenv(name) for name in environment_names if os.getenv(name)),
        f"postgresql://postgres:postgres@localhost:5432/{default_database}",
    )
    database_url = database_url.replace("postgres://", "postgresql://", 1)
    database_url = database_url.replace(
        "postgresql+psycopg://", "postgresql+psycopg2://", 1
    )

    if not database_url.startswith(("postgresql://", "postgresql+psycopg2://")):
        raise ValueError(
            "Database URL must be a PostgreSQL connection string, not a Supabase "
            "Project URL or API key"
        )

    return database_url


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY") or "development-only-secret-change-me"
    JWT_SECRET_KEY = SECRET_KEY
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = _get_database_uri(
        ("DATABASE_URL", "POSTGRES_URL", "POSTGRES_DATABASE_URL"),
        "elitenet_masters",
    )
    ADMIN_TOKEN_EXP_MINUTES = int(os.getenv("ADMIN_TOKEN_EXP_MINUTES", "30"))
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=ADMIN_TOKEN_EXP_MINUTES)
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_COOKIE_CSRF_PROTECT = True
    JWT_COOKIE_SAMESITE = "Lax"
    JWT_COOKIE_SECURE = os.getenv("FLASK_ENV") == "production"
    JWT_ACCESS_COOKIE_PATH = "/"
    MPESA_STK_TIMEOUT_MINUTES = int(
        os.getenv("MPESA_STK_TIMEOUT_MINUTES", "5")
    )


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = _get_database_uri(
        ("TEST_DATABASE_URL", "POSTGRES_TEST_DATABASE_URL"),
        "elitenet_masters_test",
    )


class ProductionConfig(Config):
    DEBUG = False

    if os.getenv("FLASK_ENV") == "production" and (
        not os.getenv("SECRET_KEY") or len(os.getenv("SECRET_KEY", "")) < 32
    ):
        raise RuntimeError("Production SECRET_KEY must be set and at least 32 characters long")


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
