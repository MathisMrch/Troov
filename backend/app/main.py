"""Point d'entrée de l'API (FastAPI)."""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from neo4j.exceptions import ServiceUnavailable
from pymongo.errors import PyMongoError
from redis.exceptions import RedisError

from app.config import settings
from app.db import neo4j_db
from app.db.mongo import client as mongo_client
from app.db.redis_db import r
from app.routers import auth, categories, listings, recommendations, users

app = FastAPI(title="API Troov")

app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                   allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    err = exc.errors()[0]
    field = ".".join(str(p) for p in err["loc"] if p not in ("body", "query", "path"))
    return JSONResponse(status_code=422, content={"detail": f"{field} : {err['msg']}" if field else err["msg"]})


@app.exception_handler(ServiceUnavailable)
@app.exception_handler(RedisError)
@app.exception_handler(PyMongoError)
async def database_error(request: Request, exc: Exception):
    return JSONResponse(status_code=503, content={"detail": "Service temporairement indisponible"})


@app.get("/health", tags=["health"])
def health():
    mongo_client.admin.command("ping")
    neo4j_db.driver.verify_connectivity()
    r.ping()
    return {"mongo": "ok", "neo4j": "ok", "redis": "ok"}


for module in (auth, users, listings, categories, recommendations):
    app.include_router(module.router)
