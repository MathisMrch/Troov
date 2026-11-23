"""
Recherche « intelligente » d'annonces.

- Normalisation : minuscules, sans accents, ponctuation ignorée ("Lévi's" == "levis").
- Racinisation légère : pluriels ramenés au singulier ("robes" == "robe").
- Préfixes : "bask" trouve "baskets" (recherche pendant la saisie).
- Fautes de frappe : "zarra" trouve "zara" (similarité >= 0.8 sur les mots de 4 lettres et plus).
- Synonymes : "basket", "sneakers", "bottes"... renvoient vers la catégorie Chaussures, etc.
- Pondération par champ : titre et marque comptent plus que la description.

Le score d'une annonce = somme, pour chaque mot recherché, du meilleur champ trouvé.
Les annonces qui contiennent le plus de mots de la recherche passent en premier.
"""
import re
import unicodedata
from difflib import SequenceMatcher

# Poids d'un mot trouvé dans chaque champ
WEIGHTS = {"title": 3.0, "brand": 3.0, "category": 2.5, "condition": 1.0, "city": 1.0, "description": 1.0}
FUZZY_FACTOR = 0.5   # un mot trouvé avec une faute vaut la moitié
PREFIX_FACTOR = 0.8  # un début de mot vaut un peu moins qu'un mot entier
FUZZY_MIN_RATIO = 0.8
SYNONYM_BONUS = 1.0  # le mot désigne aussi la catégorie de l'annonce

STOPWORDS = {
    "a", "au", "aux", "de", "des", "du", "en", "et", "la", "le", "les", "l", "d", "un", "une",
    "pour", "avec", "sans", "sur", "taille", "t", "pointure", "the", "of",
}

# Mot (normalisé et racinisé) -> nom de catégorie (tel que dans MongoDB)
SYNONYMS = {
    "Robes": ["robe", "combinaison"],
    "Chaussures": ["chaussure", "basket", "sneaker", "botte", "bottine", "escarpin", "sandale", "mocassin", "tennis"],
    "Vestes": ["veste", "blouson", "manteau", "doudoune", "parka", "blazer", "perfecto"],
    "Hauts": ["haut", "top", "tshirt", "tee", "chemise", "chemisier", "pull", "sweat", "debardeur", "gilet"],
    "Pantalons": ["pantalon", "jean", "short", "chino", "legging", "jogging"],
    "Sacs": ["sac", "pochette", "cabas", "besace", "cartable", "valise"],
    "Accessoires": ["accessoire", "ceinture", "casquette", "bonnet", "echarpe", "lunette", "chapeau", "foulard"],
    "Sport": ["sport", "survetement", "maillot", "running", "fitness"],
    "Bijoux": ["bijou", "collier", "bague", "bracelet", "boucle", "montre"],
}


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "")
    text = "".join(c for c in text if not unicodedata.combining(c)).lower()
    text = text.replace("'", "").replace("’", "").replace("-", "")
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def stem(word: str) -> str:
    # Pluriels français simples : robes -> robe, bijoux -> bijou, jeans -> jean
    if len(word) > 3 and word[-1] in "sx":
        return word[:-1]
    return word


def tokenize(text: str) -> list[str]:
    return [stem(w) for w in normalize(text).split() if w not in STOPWORDS]


SYNONYM_INDEX = {stem(normalize(w)): cat for cat, words in SYNONYMS.items() for w in words}


def parse_query(q: str) -> list[str]:
    seen, tokens = set(), []
    for t in tokenize(q):
        if t not in seen:
            seen.add(t)
            tokens.append(t)
    return tokens


def _match(token: str, words: list[str]) -> float:
    """1 si le mot est présent, PREFIX_FACTOR si c'est un début de mot, FUZZY_FACTOR si proche, sinon 0."""
    best = 0.0
    for w in words:
        if w == token:
            return 1.0
        if len(token) >= 2 and w.startswith(token):
            best = max(best, PREFIX_FACTOR)
        elif len(token) >= 4 and len(w) >= 4 and abs(len(w) - len(token)) <= 2:
            if SequenceMatcher(None, token, w).ratio() >= FUZZY_MIN_RATIO:
                best = max(best, FUZZY_FACTOR)
    return best


def score_listing(tokens: list[str], listing: dict) -> tuple[int, float]:
    """(nombre de mots trouvés, score pondéré) pour une annonce au format du frontend."""
    fields = {f: tokenize(listing.get(f) or "") for f in WEIGHTS}
    matched, total = 0, 0.0
    for token in tokens:
        best = max(WEIGHTS[f] * _match(token, words) for f, words in fields.items())
        # Synonyme d'une catégorie : "basket" -> Chaussures. Bonus si le mot est aussi dans le titre,
        # pour que "jean" classe le pantalon avant la veste en jean.
        if SYNONYM_INDEX.get(token) == listing.get("category"):
            best = max(best, WEIGHTS["category"]) + (SYNONYM_BONUS if best > 0 else 0)
        if best > 0:
            matched += 1
            total += best
    return matched, total


def rank(listings: list[dict], q: str) -> list[dict]:
    """Garde les annonces qui contiennent au moins un mot de la recherche, triées par pertinence."""
    tokens = parse_query(q)
    if not tokens:
        return listings
    scored = []
    for item in listings:
        matched, total = score_listing(tokens, item)
        if matched:
            item["score"] = round(total, 2)
            scored.append((matched, total, item))
    scored.sort(key=lambda x: (x[0], x[1], x[2]["createdAt"]), reverse=True)
    best_matched = scored[0][0] if scored else 0
    # Si certaines annonces contiennent tous les mots, on n'affiche que celles-là
    if best_matched == len(tokens):
        scored = [s for s in scored if s[0] == best_matched]
    return [item for _, _, item in scored]
