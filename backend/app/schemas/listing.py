from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SellerRef(BaseModel):
    id: str = Field(alias="_id")
    username: str


class ListingOut(BaseModel):
    """Annonce telle que l'attend le frontend (cf. withSeller du mock)."""
    id: str = Field(alias="_id")
    title: str
    description: str = ""
    price: float
    category: str = ""               # nom de la catégorie
    condition: str = ""              # libellé de l'état
    brand: str = ""
    sellerId: str
    seller: Optional[SellerRef] = None
    city: str = ""
    images: list[str] = []
    createdAt: datetime
    reason: Optional[str] = None     # recommandations uniquement
    score: Optional[float] = None    # recommandations uniquement
