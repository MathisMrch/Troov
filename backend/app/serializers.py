"""Transforme les documents MongoDB en objets au format du frontend (clés `_id`, `category`, `condition`...)."""
from app.db.mongo import db
from app.utils import to_float


def user_out(doc: dict, with_email: bool = False) -> dict:
    cats = {c["_id"]: c["name"] for c in db.categories.find({"_id": {"$in": doc.get("preferences", [])}})}
    out = {
        "_id": str(doc["_id"]),
        "username": doc["username"],
        "firstName": doc.get("firstName", ""),
        "lastName": doc.get("lastName", ""),
        "bio": doc.get("bio", ""),
        "city": doc.get("city", ""),
        "interests": [cats[i] for i in doc.get("preferences", []) if i in cats],
        "createdAt": doc["createdAt"],
    }
    if with_email:
        out["email"] = doc["email"]
    return out


def listings_out(docs: list[dict]) -> list[dict]:
    """Annonces enrichies (catégorie, état, marque, vendeur) avec 4 requêtes pour toute la liste."""
    if not docs:
        return []

    def names(coll, key, field, projection=None):
        ids = list({d[key] for d in docs})
        return {x["_id"]: x for x in coll.find({"_id": {"$in": ids}}, projection)}

    cats = names(db.categories, "categoryId", "name")
    conds = names(db.conditions, "conditionId", "label")
    brands = names(db.brands, "brandId", "name")
    sellers = names(db.users, "sellerId", "username", {"username": 1})

    out = []
    for d in docs:
        seller = sellers.get(d["sellerId"])
        out.append({
            "_id": str(d["_id"]),
            "title": d["title"],
            "description": d.get("description", ""),
            "price": to_float(d["price"]),
            "category": cats.get(d["categoryId"], {}).get("name", ""),
            "condition": conds.get(d["conditionId"], {}).get("label", ""),
            "brand": brands.get(d["brandId"], {}).get("name", ""),
            "sellerId": str(d["sellerId"]),
            "seller": {"_id": str(seller["_id"]), "username": seller["username"]} if seller else None,
            "city": d.get("location", {}).get("city", ""),
            "images": d.get("images", []),
            "createdAt": d["createdAt"],
        })
    return out
