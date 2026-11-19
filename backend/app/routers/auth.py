"""POST /auth/login, POST /auth/register, GET /auth/me  ->  { access_token, user }"""
from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError

from app.db.mongo import db
from app.db.neo4j_db import run as cypher
from app.db.redis_db import r
from app.schemas.auth import LoginIn, RegisterIn, TokenOut
from app.schemas.user import UserOut
from app.security import create_token, get_current_user, hash_password, verify_password
from app.serializers import user_out
from app.utils import best_effort, now

router = APIRouter(prefix="/auth", tags=["auth"])

W_PREFERENCE = 2  # poids d'un centre d'intérêt déclaré à l'inscription


def resolve_categories(interests: list) -> list[int]:
    """Noms, slugs ou ids de catégories -> ids. Les valeurs inconnues sont ignorées."""
    lookup = {}
    for c in db.categories.find():
        lookup[str(c["_id"])] = c["_id"]
        lookup[c["name"].lower()] = c["_id"]
        lookup[c["slug"].lower()] = c["_id"]
    ids = [lookup.get(str(i).strip().lower()) for i in interests]
    return sorted({i for i in ids if i is not None})


def project_new_user(user_id: str, username: str, category_ids: list[int]):
    cypher("MERGE (u:User {id: $id}) ON CREATE SET u.username = $username", id=user_id, username=username)
    for cid in category_ids:
        r.zincrby(f"user:{user_id}:interest:category", W_PREFERENCE, cid)


@router.post("/register", response_model=TokenOut, response_model_exclude_none=True, status_code=201)
def register(body: RegisterIn):
    prefs = resolve_categories(body.interests)
    doc = {
        "username": body.username,
        "email": body.email.strip().lower(),
        "passwordHash": hash_password(body.password),
        "createdAt": now(),
    }
    for field in ("firstName", "lastName", "bio", "city"):
        if getattr(body, field):
            doc[field] = getattr(body, field)
    if prefs:
        doc["preferences"] = prefs

    # Vérification explicite pour un message exact ; l'index unique de MongoDB reste le garde-fou
    # en cas d'inscriptions simultanées.
    if db.users.find_one({"email": doc["email"]}, {"_id": 1}):
        raise HTTPException(409, "Un compte existe déjà avec cet email")
    if db.users.find_one({"username": body.username}, {"_id": 1}):
        raise HTTPException(409, "Ce nom d’utilisateur est déjà pris")
    try:
        doc["_id"] = db.users.insert_one(doc).inserted_id
    except DuplicateKeyError:
        raise HTTPException(409, "Un compte existe déjà avec cet email ou ce nom d’utilisateur")

    best_effort(project_new_user, str(doc["_id"]), doc["username"], prefs)
    return {"access_token": create_token(doc["_id"]), "user": user_out(doc, with_email=True)}


@router.post("/login", response_model=TokenOut, response_model_exclude_none=True)
def login(body: LoginIn):
    user = db.users.find_one({"email": body.email.strip().lower()})
    if not user or not verify_password(body.password, user.get("passwordHash", "")):
        raise HTTPException(401, "Email ou mot de passe incorrect")
    return {"access_token": create_token(user["_id"]), "user": user_out(user, with_email=True)}


@router.get("/me", response_model=UserOut, response_model_exclude_none=True)
def me(user: dict = Depends(get_current_user)):
    return user_out(user, with_email=True)
