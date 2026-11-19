"""
Les utilisateurs du seed MongoDB n'ont pas de mot de passe. Cette commande leur en donne un : docker compose exec api python -m scripts.seed_passwords
"""
from app.db.mongo import db
from app.security import hash_password

PASSWORD = "Password123!"
EMAILS = ["marie_75@example.com", "lucas_37@example.com", "sofia_44@example.com"]

res = db.users.update_many({"email": {"$in": EMAILS}}, {"$set": {"passwordHash": hash_password(PASSWORD)}})
print(f"{res.modified_count} utilisateur(s) mis à jour. Connexion : {', '.join(EMAILS)} / {PASSWORD}")
