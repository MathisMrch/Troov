"""Routes pour les catégories et la recherche d'annonces."""
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Query

from app.db import neo4j_db
from app.db.mongo import db
from app.schemas.listing import ListingOut
from app.serializers import listings_out

router = APIRouter(prefix="/listings", tags=["listings"])


@router.get("/categories")
def get_categories():
    categories = db.categories.find().sort("_id", 1)
    resultat = []
    for cat in categories:
        resultat.append({
            "id": cat["_id"],
            "name": cat["name"],
            "slug": cat["slug"],
        })
    return resultat


@router.get("", response_model=list[ListingOut], response_model_exclude_none=True)
def get_listings(
    category_id: Optional[int] = Query(None),
    limit: int = Query(12, ge=1, le=100),
):
    filtre = {"status": "active"}

    if category_id is not None:
        requete_cypher = """
        MATCH (p:Product {status: 'active'})-[:IN_CATEGORY]->(:Category {id: $cat_id})
        RETURN p.id AS id
        """
        lignes = neo4j_db.run(requete_cypher, cat_id=category_id)

        ids_produits = []
        for ligne in lignes:
            ids_produits.append(ObjectId(ligne["id"]))

        if len(ids_produits) == 0:
            return []

        filtre["_id"] = {"$in": ids_produits}

    docs = db.listings.find(filtre).sort([("createdAt", -1), ("_id", -1)]).limit(limit)
    return listings_out(list(docs))