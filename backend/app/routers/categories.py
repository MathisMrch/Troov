"""GET /categories  ->  [{ id, name, slug }] (référentiel MongoDB, utilisé par le frontend)"""
from fastapi import APIRouter
from pydantic import BaseModel

from app.db.mongo import db

router = APIRouter(prefix="/categories", tags=["categories"])


class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str


@router.get("", response_model=list[CategoryOut])
def get_categories():
    return [{"id": c["_id"], "name": c["name"], "slug": c["slug"]} for c in db.categories.find().sort("_id", 1)]
