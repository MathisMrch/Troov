"""GET /listings?limit=  ->  annonces actives les plus récentes"""
from fastapi import APIRouter, Query

from app.db.mongo import db
from app.schemas.listing import ListingOut
from app.serializers import listings_out

router = APIRouter(prefix="/listings", tags=["listings"])


@router.get("", response_model=list[ListingOut], response_model_exclude_none=True)
def get_recent_listings(limit: int = Query(12, ge=1, le=100)):
    docs = db.listings.find({"status": "active"}).sort([("createdAt", -1), ("_id", -1)]).limit(limit)
    return listings_out(list(docs))
