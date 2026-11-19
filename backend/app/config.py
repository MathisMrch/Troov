"""Configuration : uniquement des variables d'environnement."""
import logging
import os

log = logging.getLogger("app")
_DEV_SECRET = "dev-only-secret-change-me-0123456789abcdef"


class Settings:
    def __init__(self):
        env = os.getenv
        self.mongo_host = env("MONGO_HOST", "localhost")
        self.mongo_port = int(env("MONGO_PORT", "27017"))
        self.mongo_user = env("MONGO_USER")
        self.mongo_password = env("MONGO_PASSWORD")
        self.mongo_db = env("MONGO_DB", "vinted_clone")

        self.neo4j_uri = env("NEO4J_URI", "bolt://localhost:7687")
        self.neo4j_user = env("NEO4J_USER", "neo4j")
        self.neo4j_password = env("NEO4J_PASSWORD")

        self.redis_host = env("REDIS_HOST", "localhost")
        self.redis_port = int(env("REDIS_PORT", "6379"))
        self.redis_password = env("REDIS_PASSWORD")

        self.jwt_secret = env("JWT_SECRET") or _DEV_SECRET
        if self.jwt_secret == _DEV_SECRET:
            log.warning("JWT_SECRET absent : clé de développement utilisée")
        self.jwt_expire_minutes = int(env("JWT_EXPIRE_MINUTES", "1440"))

        self.cors_origins = [o.strip() for o in env("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]


settings = Settings()
