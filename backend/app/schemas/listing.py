from datetime import datetime
from typing import Optional, Literal
from decimal import Decimal

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
    category: str = ""
    condition: str = ""
    brand: str = ""
    sellerId: str
    seller: Optional[SellerRef] = None
    city: str = ""
    images: list[str] = []
    createdAt: datetime
    reason: Optional[str] = None
    score: Optional[float] = None

class LocationIn(BaseModel):
    city: str = ""
    postalCode: str = ""


class ListingCreate(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    description: str = Field("", max_length=2000)
    price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    categoryId: int
    brandId: int
    conditionId: int
    images: list[str] = []
    location: LocationIn | None = None


class ListingUpdate(BaseModel):
    """PATCH : tous les champs sont optionnels."""
    title: str | None = Field(None, min_length=3, max_length=100)
    description: str | None = Field(None, max_length=2000)
    price: Decimal | None = Field(None, ge=0, max_digits=10, decimal_places=2)
    categoryId: int | None = None
    brandId: int | None = None
    conditionId: int | None = None
    images: list[str] | None = None
    location: LocationIn | None = None
    status: Literal["active", "sold"] | None = None