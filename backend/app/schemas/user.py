from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserOut(BaseModel):
    """Utilisateur tel que l'attend le frontend (cf. publicUser du mock)."""
    id: str = Field(alias="_id")
    username: str
    email: Optional[str] = None      # uniquement pour l'utilisateur connecté lui-même
    firstName: str = ""
    lastName: str = ""
    bio: str = ""
    city: str = ""
    interests: list[str] = []        # noms de catégories
    createdAt: datetime


class UserProfile(UserOut):
    followersCount: int = 0
    followingCount: int = 0
    listingsCount: int = 0
    isFollowing: bool = False
