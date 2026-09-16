import os
from datetime import timedelta


def _get_database_uri(environment_names, default_database):
    database_url = next(
        (os.getenv(name) for name in environment_names if os.getenv(name)),
        f"postgresql://postgres:postgres@localhost:5432/{default_database}",
    )
    database_url = database_url.replace("postgres://", "postgresql://", 1)

    if not database_url.startswith(("postgresql://", "postgresql+psycopg2://")):
        raise ValueError("Only PostgreSQL database URLs are supported")

    return database_url


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = _get_database_uri(
        ("DATABASE_URL", "POSTGRES_URL", "POSTGRES_DATABASE_URL"),
        "elitenet_masters",
    )
    ADMIN_TOKEN_EXP_MINUTES = int(os.getenv("ADMIN_TOKEN_EXP_MINUTES", "480"))
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=ADMIN_TOKEN_EXP_MINUTES)
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


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
