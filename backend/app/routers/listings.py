"""
GET /listings?limit=         ->  annonces actives les plus récentes
GET /listings/search?q=...   ->  recherche intelligente + filtres (catégorie, prix) + tri
"""
from enum import Enum

from bson import Decimal128
from fastapi import APIRouter, HTTPException, Query

from app.db.mongo import db
from app.schemas.listing import ListingOut
from app.search import rank
from app.serializers import listings_out

router = APIRouter(prefix="/listings", tags=["listings"])

SEARCH_POOL = 500  # nombre maximum d'annonces examinées par la recherche


class SortBy(str, Enum):
    relevance = "relevance"
    price_asc = "price_asc"
    price_desc = "price_desc"
    recent = "recent"


@router.get("", response_model=list[ListingOut], response_model_exclude_none=True)
def get_recent_listings(limit: int = Query(12, ge=1, le=100)):
    docs = db.listings.find({"status": "active"}).sort([("createdAt", -1), ("_id", -1)]).limit(limit)
    return listings_out(list(docs))


@router.get("/search", response_model=list[ListingOut], response_model_exclude_none=True)
def search_listings(
    q: str = Query("", max_length=100, description="Mots recherchés (titre, marque, catégorie, état, ville…)"),
    category: int | None = Query(None, description="Id de catégorie (GET /categories)"),
    minPrice: float | None = Query(None, ge=0),
    maxPrice: float | None = Query(None, ge=0),
    sort: SortBy = SortBy.relevance,
    limit: int = Query(60, ge=1, le=100),
):
    if minPrice is not None and maxPrice is not None and minPrice > maxPrice:
        raise HTTPException(422, "Le prix minimum doit être inférieur au prix maximum")

    # 1. Filtres exacts dans MongoDB (index { categoryId, price })
    flt: dict = {"status": "active"}
    if category is not None:
        flt["categoryId"] = category
    price = {}
    if minPrice is not None:
        price["$gte"] = Decimal128(str(minPrice))
    if maxPrice is not None:
        price["$lte"] = Decimal128(str(maxPrice))
    if price:
        flt["price"] = price

    docs = list(db.listings.find(flt).sort("createdAt", -1).limit(SEARCH_POOL))

    # 2. Pertinence textuelle sur les annonces enrichies (marque, catégorie, état en toutes lettres)
    items = rank(listings_out(docs), q)

    # 3. Tri demandé (la pertinence est déjà appliquée par rank)
    if sort is SortBy.price_asc:
        items.sort(key=lambda x: x["price"])
    elif sort is SortBy.price_desc:
        items.sort(key=lambda x: x["price"], reverse=True)
    elif sort is SortBy.recent or not q.strip():
        items.sort(key=lambda x: x["createdAt"], reverse=True)
    return items[:limit]
