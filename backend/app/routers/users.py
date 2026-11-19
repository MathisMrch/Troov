"""GET /users/{id}, /users/{id}/listings, /users/{id}/favorites, POST|DELETE /users/{id}/follow"""
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Response

from app.db.mongo import db
from app.db.neo4j_db import run as cypher
from app.schemas.listing import ListingOut
from app.schemas.user import UserProfile
from app.security import get_current_user, get_optional_user
from app.serializers import listings_out, user_out
from app.utils import to_oid

router = APIRouter(prefix="/users", tags=["users"])

# Neo4j : FOLLOWS et LIKES (User.id et Product.id = _id MongoDB en chaîne)
PROFILE_Q = """
MATCH (u:User {id: $id})
RETURN size([(u)<-[:FOLLOWS]-(x) | x]) AS followers,
       size([(u)-[:FOLLOWS]->(x) | x]) AS following,
       $viewer <> '' AND EXISTS { (:User {id: $viewer})-[:FOLLOWS]->(u) } AS isFollowing
"""
FOLLOW_Q = """
MERGE (a:User {id: $a}) MERGE (b:User {id: $b})
MERGE (a)-[r:FOLLOWS]->(b) ON CREATE SET r.followedAt = datetime()
"""
UNFOLLOW_Q = "MATCH (:User {id: $a})-[r:FOLLOWS]->(:User {id: $b}) DELETE r"
LIKED_Q = "MATCH (:User {id: $id})-[:LIKES]->(p:Product) RETURN p.id AS id"


def get_user_or_404(user_id: str) -> dict:
    oid = to_oid(user_id)
    doc = db.users.find_one({"_id": oid}) if oid else None
    if not doc:
        raise HTTPException(404, "Utilisateur introuvable")
    return doc


@router.get("/{user_id}", response_model=UserProfile, response_model_exclude_none=True)
def get_user(user_id: str, viewer: dict | None = Depends(get_optional_user)):
    user = get_user_or_404(user_id)
    row = (cypher(PROFILE_Q, id=str(user["_id"]), viewer=str(viewer["_id"]) if viewer else "")
           or [{"followers": 0, "following": 0, "isFollowing": False}])[0]
    is_me = viewer is not None and viewer["_id"] == user["_id"]
    return {
        **user_out(user, with_email=is_me),
        "followersCount": row["followers"],
        "followingCount": row["following"],
        "listingsCount": db.listings.count_documents({"sellerId": user["_id"], "status": "active"}),
        "isFollowing": bool(row["isFollowing"]),
    }


@router.get("/{user_id}/listings", response_model=list[ListingOut], response_model_exclude_none=True)
def get_user_listings(user_id: str):
    user = get_user_or_404(user_id)
    docs = db.listings.find({"sellerId": user["_id"], "status": "active"}).sort("createdAt", -1)
    return listings_out(list(docs))


@router.get("/{user_id}/favorites", response_model=list[ListingOut], response_model_exclude_none=True)
def get_user_favorites(user_id: str):
    user = get_user_or_404(user_id)
    ids = [ObjectId(row["id"]) for row in cypher(LIKED_Q, id=str(user["_id"]))]
    docs = db.listings.find({"_id": {"$in": ids}, "status": "active"}).sort("createdAt", -1)
    return listings_out(list(docs))


@router.post("/{user_id}/follow", status_code=204)
def follow_user(user_id: str, me: dict = Depends(get_current_user)):
    target = get_user_or_404(user_id)
    if target["_id"] == me["_id"]:
        raise HTTPException(400, "Vous ne pouvez pas vous suivre vous-même")
    cypher(FOLLOW_Q, a=str(me["_id"]), b=str(target["_id"]))
    return Response(status_code=204)


@router.delete("/{user_id}/follow", status_code=204)
def unfollow_user(user_id: str, me: dict = Depends(get_current_user)):
    target = get_user_or_404(user_id)
    cypher(UNFOLLOW_Q, a=str(me["_id"]), b=str(target["_id"]))
    return Response(status_code=204)
