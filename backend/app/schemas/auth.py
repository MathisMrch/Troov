from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.user import UserOut


class LoginIn(BaseModel):
    email: str
    password: str


class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: str = Field(pattern=r"^.+@.+\..+$")
    password: str = Field(min_length=8, max_length=128)
    firstName: Optional[str] = Field(None, max_length=100)
    lastName: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    interests: list[str | int] = Field([], description="Noms, slugs ou ids de catégories")


class TokenOut(BaseModel):
    access_token: str
    user: UserOut
