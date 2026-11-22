"""Annonces :  CRUD + recherche """
import re
from typing import Literal

from bson import Decimal128
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app import graph_sync
from app.db.mongo import db
from app.schemas.listing import ListingOut, ListingCreate, ListingUpdate
from app.security import get_current_user
from app.serializers import listings_out
from app.utils import best_effort, now, to_oid

router = APIRouter(prefix="/listings", tags=["listings"])

SORTS = {
    "recent": [("createdAt", -1), ("_id", -1)],
    "price_asc": [("price", 1), ("_id", -1)],
    "price_desc": [("price", -1), ("_id", -1)],
}


def _dec(value) -> Decimal128:
    return Decimal128(str(value))


def _ensure_refs(category_id=None, brand_id=None, condition_id=None):
    """Pas de clés étrangères dans Mongo : vérification manuelle."""
    for coll, value, label in (("categories", category_id, "Catégorie"),
                               ("brands", brand_id, "Marque"),
                               ("conditions", condition_id, "État")):
        if value is not None and db[coll].count_documents({"_id": value}, limit=1) == 0:
            raise HTTPException(422, f"{label} inconnue")


def _get_or_404(listing_id: str) -> dict:
    oid = to_oid(listing_id)
    doc = db.listings.find_one({"_id": oid}) if oid else None
    if not doc or doc["status"] == "deleted":
        raise HTTPException(404, "Annonce introuvable")
    return doc


def _check_owner(doc: dict, user: dict):
    if doc["sellerId"] != user["_id"]:
        raise HTTPException(403, "Vous n'êtes pas le vendeur de cette annonce")


@router.get("", response_model=list[ListingOut], response_model_exclude_none=True)
def search_listings(
    q: str | None = Query(None, min_length=1, max_length=100),
    category_id: int | None = Query(None, alias="categoryId"),
    brand_id: int | None = Query(None, alias="brandId"),
    condition_id: int | None = Query(None, alias="conditionId"),
    seller_id: str | None = Query(None, alias="sellerId"),
    city: str | None = None,
    min_price: float | None = Query(None, alias="minPrice", ge=0),
    max_price: float | None = Query(None, alias="maxPrice", ge=0),
    sort: Literal["recent", "price_asc", "price_desc"] = "recent",
    limit: int = Query(12, ge=1, le=100),
    skip: int = Query(0, ge=0),
):
    flt: dict = {"status": "active"}
    if q:
        flt["title"] = {"$regex": re.escape(q), "$options": "i"}
    if category_id is not None:
        flt["categoryId"] = category_id
    if brand_id is not None:
        flt["brandId"] = brand_id
    if condition_id is not None:
        flt["conditionId"] = condition_id
    if seller_id:
        oid = to_oid(seller_id)
        if oid is None:
            return []
        flt["sellerId"] = oid
    if city:
        flt["location.city"] = {"$regex": f"^{re.escape(city)}$", "$options": "i"}
    price = {}
    if min_price is not None:
        price["$gte"] = _dec(min_price)
    if max_price is not None:
        price["$lte"] = _dec(max_price)
    if price:
        flt["price"] = price

    docs = db.listings.find(flt).sort(SORTS[sort]).skip(skip).limit(limit)
    return listings_out(list(docs))


@router.get("/{listing_id}", response_model=ListingOut, response_model_exclude_none=True)
def get_listing(listing_id: str):
    return listings_out([_get_or_404(listing_id)])[0]


@router.post("", response_model=ListingOut, response_model_exclude_none=True,
             status_code=status.HTTP_201_CREATED)
def create_listing(payload: ListingCreate, user: dict = Depends(get_current_user)):
    _ensure_refs(payload.categoryId, payload.brandId, payload.conditionId)
    doc = {
        "title": payload.title.strip(),
        "description": payload.description,
        "price": _dec(payload.price),
        "categoryId": payload.categoryId,
        "brandId": payload.brandId,
        "conditionId": payload.conditionId,
        "images": payload.images,
        "location": payload.location.model_dump() if payload.location
                    else {"city": user.get("city", ""), "postalCode": ""},
        "sellerId": user["_id"],
        "status": "active",
        "createdAt": now(),
    }
    doc["_id"] = db.listings.insert_one(doc).inserted_id
    best_effort(graph_sync.publish_product, str(doc["_id"]), str(user["_id"]),
                payload.categoryId, payload.brandId)
    return listings_out([doc])[0]


@router.patch("/{listing_id}", response_model=ListingOut, response_model_exclude_none=True)
def update_listing(listing_id: str, payload: ListingUpdate, user: dict = Depends(get_current_user)):
    doc = _get_or_404(listing_id)
    _check_owner(doc, user)

    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(422, "Aucune modification fournie")
    if any(v is None for v in changes.values()):
        raise HTTPException(422, "Valeur null interdite")

    _ensure_refs(changes.get("categoryId"), changes.get("brandId"), changes.get("conditionId"))
    if "price" in changes:
        changes["price"] = _dec(changes["price"])
    if "title" in changes:
        changes["title"] = changes["title"].strip()

    db.listings.update_one({"_id": doc["_id"]}, {"$set": changes})

    if changes.get("categoryId", doc["categoryId"]) != doc["categoryId"]:
        best_effort(graph_sync.change_category, listing_id, changes["categoryId"])
    if changes.get("brandId", doc["brandId"]) != doc["brandId"]:
        best_effort(graph_sync.change_brand, listing_id, changes["brandId"])
    if changes.get("status", doc["status"]) != doc["status"]:
        best_effort(graph_sync.set_status, listing_id, changes["status"])

    return listings_out([db.listings.find_one({"_id": doc["_id"]})])[0]


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing(listing_id: str, user: dict = Depends(get_current_user)):
    doc = _get_or_404(listing_id)
    _check_owner(doc, user)
    db.listings.update_one({"_id": doc["_id"]}, {"$set": {"status": "deleted"}})
    best_effort(graph_sync.set_status, listing_id, "deleted")
    return Response(status_code=status.HTTP_204_NO_CONTENT)