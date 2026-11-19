"""
GET /recommendations?limit=  ->  annonces recommandées pour l'utilisateur connecté

Depuis 2 sources :
  - vendeurs suivis (Neo4j, FOLLOWS)                  score +2  "Vendu par X, que vous suivez"
  - centres d'intérêt (Redis, ZSET interest:category) score +1  "Vous aimez la catégorie Y"
Ne prend pas en compte ses propres annonces et et n'aditionne pas les 2 scorages.
"""
from bson import ObjectId
from fastapi import APIRouter, Depends, Query

from app.db.mongo import db
from app.db.neo4j_db import run as cypher
from app.db.redis_db import r
from app.schemas.listing import ListingOut
from app.security import get_optional_user
from app.serializers import listings_out

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

LIKED_Q = "MATCH (:User {id: $uid})-[:LIKES]->(p:Product) RETURN p.id AS id"
FOLLOWED_Q = "MATCH (:User {id: $uid})-[:FOLLOWS]->(s:User) RETURN s.id AS id"


@router.get("", response_model=list[ListingOut], response_model_exclude_none=True)
def get_recommendations(limit: int = Query(4, ge=1, le=50), user: dict | None = Depends(get_optional_user)):
    if user is None:
        return []
    uid = str(user["_id"])

    liked = [ObjectId(row["id"]) for row in cypher(LIKED_Q, uid=uid)]
    followed = {ObjectId(row["id"]) for row in cypher(FOLLOWED_Q, uid=uid)}
    # Top 3 des catégories dans Redis ; si Redis est vide, préférences déclarées dans MongoDB
    cats = {int(c) for c in r.zrevrange(f"user:{uid}:interest:category", 0, 2)} or set(user.get("preferences", []))

    sources = []
    if followed:
        sources.append({"sellerId": {"$in": list(followed)}})
    if cats:
        sources.append({"categoryId": {"$in": list(cats)}})
    if not sources:
        return []

    flt = {"status": "active", "sellerId": {"$ne": user["_id"]}, "$or": sources}
    if liked:
        flt["_id"] = {"$nin": liked}
    docs = list(db.listings.find(flt).sort("createdAt", -1).limit(100))

    def score(d):
        return (2 if d["sellerId"] in followed else 0) + (1 if d["categoryId"] in cats else 0)

    docs = sorted(docs, key=lambda d: (score(d), d["createdAt"]), reverse=True)[:limit]
    items = listings_out(docs)

    sellers = db.users.find({"_id": {"$in": [d["sellerId"] for d in docs]}}, {"username": 1, "firstName": 1})
    names = {s["_id"]: s.get("firstName") or s["username"] for s in sellers}
    for d, item in zip(docs, items):
        if d["sellerId"] in followed:
            item["reason"] = f"Vendu par {names.get(d['sellerId'], 'ce vendeur')}, que vous suivez"
        else:
            item["reason"] = f"Vous aimez la catégorie {item['category']}"
        item["score"] = score(d)
    return items
