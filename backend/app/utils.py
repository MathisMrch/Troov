import logging
from datetime import datetime, timezone

from bson import Decimal128, ObjectId
from bson.errors import InvalidId

log = logging.getLogger("app")


def now() -> datetime:
    return datetime.now(timezone.utc)


def to_oid(value) -> ObjectId | None:
    ## ObjectId depuis une chaîne, ou None si invalide
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None


def to_float(value) -> float:
    ## Prix stocké en Decimal128 dans MongoDB -> nombre JSON
    return float(value.to_decimal() if isinstance(value, Decimal128) else value)


def best_effort(fn, *args, **kwargs):
    ## Projection secondaire (Neo4j, Redis) : log si échoue, sans échec de la requête
    try:
        fn(*args, **kwargs)
    except Exception:
        log.exception("Projection secondaire échouée : %s", getattr(fn, "__name__", fn))
