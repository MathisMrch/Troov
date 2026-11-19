"""Mots de passe et JWT."""
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.db.mongo import db
from app.utils import to_oid

_N, _R, _P = 2**14, 8, 1
_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=_N, r=_R, p=_P, dklen=32)
    return f"scrypt${_N}${_R}${_P}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, n, r, p, salt, expected = stored.split("$")
        digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=int(n), r=int(r), p=int(p), dklen=32)
        return hmac.compare_digest(digest, bytes.fromhex(expected))
    except (ValueError, TypeError):
        return False


def create_token(user_id) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode({"sub": str(user_id), "exp": exp}, settings.jwt_secret, algorithm="HS256")


def get_optional_user(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict | None:
    ## Utilisateur du token
    if creds is None:
        return None
    try:
        sub = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=["HS256"])["sub"]
    except (jwt.PyJWTError, KeyError):
        return None
    oid = to_oid(sub)
    return db.users.find_one({"_id": oid}) if oid else None


def get_current_user(user: dict | None = Depends(get_optional_user)) -> dict:
    if user is None:
        raise HTTPException(401, "Session expirée", headers={"WWW-Authenticate": "Bearer"})
    return user
