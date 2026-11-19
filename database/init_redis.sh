#!/usr/bin/env bash
# =============================================================================
# init_redis.sh : initialisation Redis (activité temps réel + recommandations)
# Exécution :
#   chmod +x init_redis.sh && ./init_redis.sh
# Variables optionnelles : REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB
#
# Redis est schemaless : ce script injecte des données de test qui respectent
# les conventions de clés. Il supprime d'abord les clés user:*, listing:*,
# trending:* et reco:* : ne pas l'utiliser sur une base contenant des données
# réelles.
#
# Conventions
#   user:{userId}:...        userId    = users._id (ObjectId en string)
#   listing:{listingId}:...  listingId = listings._id (ObjectId en string)
#   categoryId, brandId      = ids entiers de categories et brands
#
# Pondération des actions sur les centres d'intérêt :
#   préférence à la création du profil +2, vue +1, like +5, publication +3,
#   unlike -5
#
# Les compteurs (likes_count, views_count) n'existent plus dans MongoDB :
# Redis en est la référence.
# =============================================================================
set -euo pipefail

REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_DB="${REDIS_DB:-0}"

ARGS=(-h "$REDIS_HOST" -p "$REDIS_PORT" -n "$REDIS_DB")
[ -n "${REDIS_PASSWORD:-}" ] && ARGS+=(-a "$REDIS_PASSWORD" --no-auth-warning)

r() { redis-cli "${ARGS[@]}" "$@" > /dev/null; }

redis-cli "${ARGS[@]}" PING > /dev/null || { echo "Redis injoignable"; exit 1; }

# -----------------------------------------------------------------------------
# Identifiants (identiques à MongoDB et Neo4j)
# -----------------------------------------------------------------------------
U1=64f0000000000000000000a1   # marie_75
U2=64f0000000000000000000a2   # lucas_37
U3=64f0000000000000000000a3   # sofia_44

L1=64f0000000000000000000b1   # Floral Zara dress        (U1, cat 1, brand 1)
L2=64f0000000000000000000b2   # Levi's denim jacket      (U2, cat 3, brand 3)
L3=64f0000000000000000000b3   # Long black Zara dress    (U3, cat 1, brand 1)
L4=64f0000000000000000000b4   # Nike Air Max sneakers    (U1, cat 2, brand 2)
L5=64f0000000000000000000b5   # High-waist Levi's jeans  (U2, cat 5, brand 3)
L6=64f0000000000000000000b6   # Black leather handbag    (U3, cat 6, brand 4)

# categories.id
CAT_DRESSES=1; CAT_SHOES=2; CAT_JACKETS=3; CAT_PANTS=5; CAT_BAGS=6
# brands.id
BR_ZARA=1; BR_NIKE=2; BR_LEVIS=3; BR_MANGO=4

NOW=$(date +%s)
DAY=86400

# -----------------------------------------------------------------------------
# 0. Nettoyage des clés de test
# -----------------------------------------------------------------------------
for pattern in "user:*" "listing:*" "trending:*" "reco:*"; do
  redis-cli "${ARGS[@]}" --scan --pattern "$pattern" | xargs -r redis-cli "${ARGS[@]}" DEL > /dev/null
done

# -----------------------------------------------------------------------------
# 1. Vues : ZSET user:{id}:viewed (membre = listingId, score = timestamp)
#    TTL 30 jours
# -----------------------------------------------------------------------------
r ZADD user:$U1:viewed $((NOW - 2*DAY)) $L2
r ZADD user:$U2:viewed $((NOW - 1*DAY)) $L3
r ZADD user:$U3:viewed $((NOW - 3*DAY)) $L4
for u in $U1 $U2 $U3; do r EXPIRE user:$u:viewed $((30*DAY)); done

# -----------------------------------------------------------------------------
# 2. Favoris : SET user:{id}:likes (miroir des relations Neo4j LIKES)
# -----------------------------------------------------------------------------
r SADD user:$U1:likes $L3
r SADD user:$U2:likes $L1 $L4
r SADD user:$U3:likes $L1 $L2

# -----------------------------------------------------------------------------
# 3. Centres d'intérêt
#    ZSET user:{id}:interest:category (membre = categoryId)
#    ZSET user:{id}:interest:brand    (membre = brandId)
#    HASH user:{id}:interest:price    (fourchette de prix consultée)
# -----------------------------------------------------------------------------
# marie_75 : préférences [1,2], publie L1 et L4, like L3, voit L2 (x2)
r ZINCRBY user:$U1:interest:category 10 $CAT_DRESSES
r ZINCRBY user:$U1:interest:category 5  $CAT_SHOES
r ZINCRBY user:$U1:interest:category 2  $CAT_JACKETS
r ZINCRBY user:$U1:interest:brand 8 $BR_ZARA
r ZINCRBY user:$U1:interest:brand 3 $BR_NIKE
r ZINCRBY user:$U1:interest:brand 2 $BR_LEVIS
r HSET user:$U1:interest:price avg 37.5 min 25 max 55

# lucas_37 : préférences [3,5], publie L2 et L5, like L1 et L4, voit L3
r ZINCRBY user:$U2:interest:category 6 $CAT_DRESSES
r ZINCRBY user:$U2:interest:category 5 $CAT_SHOES
r ZINCRBY user:$U2:interest:category 5 $CAT_JACKETS
r ZINCRBY user:$U2:interest:category 5 $CAT_PANTS
r ZINCRBY user:$U2:interest:brand 6 $BR_LEVIS
r ZINCRBY user:$U2:interest:brand 6 $BR_ZARA
r ZINCRBY user:$U2:interest:brand 5 $BR_NIKE
r HSET user:$U2:interest:price avg 37 min 25 max 55

# sofia_44 : préférences [1,6], publie L3 et L6, like L1 et L2, voit L4 (x3)
r ZINCRBY user:$U3:interest:category 10 $CAT_DRESSES
r ZINCRBY user:$U3:interest:category 5  $CAT_BAGS
r ZINCRBY user:$U3:interest:category 5  $CAT_JACKETS
r ZINCRBY user:$U3:interest:category 3  $CAT_SHOES
r ZINCRBY user:$U3:interest:brand 8 $BR_ZARA
r ZINCRBY user:$U3:interest:brand 5 $BR_LEVIS
r ZINCRBY user:$U3:interest:brand 3 $BR_MANGO
r ZINCRBY user:$U3:interest:brand 3 $BR_NIKE
r HSET user:$U3:interest:price avg 39 min 25 max 55

# -----------------------------------------------------------------------------
# 4. Compteurs d'annonces et visiteurs uniques (cohérents avec Neo4j)
# -----------------------------------------------------------------------------
r SET listing:$L1:likes_count 2
r SET listing:$L2:likes_count 1
r SET listing:$L3:likes_count 1
r SET listing:$L4:likes_count 1
r SET listing:$L5:likes_count 0
r SET listing:$L6:likes_count 0

r SET listing:$L1:views_count 0
r SET listing:$L2:views_count 2
r SET listing:$L3:views_count 1
r SET listing:$L4:views_count 3
r SET listing:$L5:views_count 0
r SET listing:$L6:views_count 0

r PFADD listing:$L2:viewers $U1
r PFADD listing:$L3:viewers $U2
r PFADD listing:$L4:viewers $U3
for l in $L2 $L3 $L4; do r EXPIRE listing:$l:viewers $((7*DAY)); done

# -----------------------------------------------------------------------------
# 5. Tendances (like +5, vue +1), global et par catégorie
#    Recalculées périodiquement
# -----------------------------------------------------------------------------
r ZADD trending:listings 10 $L1 7 $L2 6 $L3 8 $L4
r ZADD trending:category:$CAT_DRESSES 10 $L1 6 $L3
r ZADD trending:category:$CAT_JACKETS 7 $L2
r ZADD trending:category:$CAT_SHOES   8 $L4

# -----------------------------------------------------------------------------
# 6. Recommandations en cache : ZSET reco:user:{id}, TTL 15 min
#    score_final = 0.5 x intérêt + 0.3 x social + 0.2 x tendance
#    (scores d'exemple ; l'annonce déjà vue, aimée ou publiée est exclue)
# -----------------------------------------------------------------------------
r ZADD reco:user:$U1 41.0 $L5 33.5 $L6
r ZADD reco:user:$U2 48.0 $L6
r ZADD reco:user:$U3 52.0 $L5
for u in $U1 $U2 $U3; do r EXPIRE reco:user:$u 900; done

# Annonces déjà proposées (évite les doublons), TTL 24 h
r SADD reco:user:$U1:seen $L5
r EXPIRE reco:user:$U1:seen $DAY

# -----------------------------------------------------------------------------
# 7. Vérification
# -----------------------------------------------------------------------------
echo "Initialisation Redis terminée."
echo "Clés présentes : $(redis-cli "${ARGS[@]}" DBSIZE)"
echo "Recommandations pour marie_75 :"
redis-cli "${ARGS[@]}" ZREVRANGE reco:user:$U1 0 9 WITHSCORES
