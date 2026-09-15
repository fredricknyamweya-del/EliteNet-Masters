import os
from datetime import timedelta


def _get_database_uri():
    database_url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
    if database_url:
        return database_url.replace("postgres://", "postgresql://", 1)

    default_postgres_uri = (
        "postgresql://postgres:postgres@localhost:5432/elitenet_masters"
    )
    if os.getenv("FLASK_ENV") == "production":
        return os.getenv("POSTGRES_DATABASE_URL", default_postgres_uri)

    return os.getenv("POSTGRES_DATABASE_URL", default_postgres_uri)


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = _get_database_uri()
    ADMIN_TOKEN_EXP_MINUTES = int(os.getenv("ADMIN_TOKEN_EXP_MINUTES", "480"))
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=ADMIN_TOKEN_EXP_MINUTES)
    MPESA_STK_TIMEOUT_MINUTES = int(
        os.getenv("MPESA_STK_TIMEOUT_MINUTES", "5")
    )


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URL", "sqlite:///elitenet_masters_test.db")


class ProductionConfig(Config):
    DEBUG = False


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
