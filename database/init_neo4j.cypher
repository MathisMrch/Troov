// =============================================================================
// init_neo4j.cypher : initialisation Neo4j (graphe de relations)
// Exécution :
//   cypher-shell -u neo4j -p <mot_de_passe> -f init_neo4j.cypher
//
// Modèle :
//   (:User)-[:PUBLISHED]->(:Product)
//   (:Product)-[:IN_CATEGORY]->(:Category)
//   (:Product)-[:HAS_BRAND]->(:Brand)
//   (:User)-[:FOLLOWS {followedAt}]->(:User)
//   (:User)-[:LIKES]->(:Product)
//   (:User)-[:VIEWED {viewCount}]->(:Product)
//
// Correspondance avec MongoDB :
//   User.id     = users._id      (ObjectId en string)
//   Product.id  = listings._id   (ObjectId en string)
//   Category.id = categories._id (entier)
//   Brand.id    = brands._id     (entier)
// Les états (conditions) restent uniquement dans MongoDB.
// Les noeuds Category et Brand sont des copies de référence : MongoDB reste
// la source de vérité de leurs données.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. Contraintes et index
// -----------------------------------------------------------------------------
CREATE CONSTRAINT user_id IF NOT EXISTS
FOR (u:User) REQUIRE u.id IS UNIQUE;

CREATE CONSTRAINT product_id IF NOT EXISTS
FOR (p:Product) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT category_id IF NOT EXISTS
FOR (c:Category) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT brand_id IF NOT EXISTS
FOR (b:Brand) REQUIRE b.id IS UNIQUE;

CREATE INDEX user_username IF NOT EXISTS
FOR (u:User) ON (u.username);

CREATE INDEX product_status IF NOT EXISTS
FOR (p:Product) ON (p.status);

CREATE INDEX category_slug IF NOT EXISTS
FOR (c:Category) ON (c.slug);

// -----------------------------------------------------------------------------
// 2. Données de test : utilisateurs
// -----------------------------------------------------------------------------
UNWIND [
  {id: '64f0000000000000000000a1', username: 'marie_75'},
  {id: '64f0000000000000000000a2', username: 'lucas_37'},
  {id: '64f0000000000000000000a3', username: 'sofia_44'}
] AS row
MERGE (u:User {id: row.id})
  ON CREATE SET u.username = row.username;

// -----------------------------------------------------------------------------
// 3. Données de test : catégories et marques (ids identiques à MongoDB)
// -----------------------------------------------------------------------------
UNWIND [
  {id: 1, name: 'Robes',       slug: 'robes'},
  {id: 2, name: 'Chaussures',  slug: 'chaussures'},
  {id: 3, name: 'Vestes',      slug: 'vestes'},
  {id: 4, name: 'Hauts',       slug: 'hauts'},
  {id: 5, name: 'Pantalons',   slug: 'pantalons'},
  {id: 6, name: 'Sacs',        slug: 'sacs'},
  {id: 7, name: 'Accessoires', slug: 'accessoires'},
  {id: 8, name: 'Sport',       slug: 'sport'},
  {id: 9, name: 'Bijoux',      slug: 'bijoux'}
] AS row
MERGE (c:Category {id: row.id})
  SET c.name = row.name, c.slug = row.slug;

UNWIND [
  {id: 1, name: 'Zara'},
  {id: 2, name: 'Nike'},
  {id: 3, name: "Levi's"},
  {id: 4, name: 'Mango'},
  {id: 5, name: 'H&M'},
  {id: 6, name: 'Adidas'}
] AS row
MERGE (b:Brand {id: row.id})
  ON CREATE SET b.name = row.name;

// -----------------------------------------------------------------------------
// 4. Données de test : produits, vendeurs, catégories, marques
//    Product.status reprend listings.status (active | sold | deleted)
// -----------------------------------------------------------------------------
UNWIND [
  {id: '64f0000000000000000000b1', seller: '64f0000000000000000000a1', category: 1, brand: 1},
  {id: '64f0000000000000000000b2', seller: '64f0000000000000000000a2', category: 3, brand: 3},
  {id: '64f0000000000000000000b3', seller: '64f0000000000000000000a3', category: 1, brand: 1},
  {id: '64f0000000000000000000b4', seller: '64f0000000000000000000a1', category: 2, brand: 2},
  {id: '64f0000000000000000000b5', seller: '64f0000000000000000000a2', category: 5, brand: 3},
  {id: '64f0000000000000000000b6', seller: '64f0000000000000000000a3', category: 6, brand: 4}
] AS row
MERGE (p:Product {id: row.id})
  ON CREATE SET p.status = 'active'
WITH p, row
MATCH (u:User {id: row.seller})
MATCH (c:Category {id: row.category})
MATCH (b:Brand {id: row.brand})
MERGE (u)-[:PUBLISHED]->(p)
MERGE (p)-[:IN_CATEGORY]->(c)
MERGE (p)-[:HAS_BRAND]->(b);

// -----------------------------------------------------------------------------
// 5. Données de test : FOLLOWS
//    marie -> lucas, lucas -> sofia, sofia -> marie, sofia -> lucas
// -----------------------------------------------------------------------------
UNWIND [
  {a: '64f0000000000000000000a1', b: '64f0000000000000000000a2'},
  {a: '64f0000000000000000000a2', b: '64f0000000000000000000a3'},
  {a: '64f0000000000000000000a3', b: '64f0000000000000000000a1'},
  {a: '64f0000000000000000000a3', b: '64f0000000000000000000a2'}
] AS row
MATCH (a:User {id: row.a}), (b:User {id: row.b})
MERGE (a)-[r:FOLLOWS]->(b)
  ON CREATE SET r.followedAt = datetime();

// -----------------------------------------------------------------------------
// 6. Données de test : LIKES
// -----------------------------------------------------------------------------
UNWIND [
  {u: '64f0000000000000000000a1', p: '64f0000000000000000000b3'},
  {u: '64f0000000000000000000a2', p: '64f0000000000000000000b1'},
  {u: '64f0000000000000000000a2', p: '64f0000000000000000000b4'},
  {u: '64f0000000000000000000a3', p: '64f0000000000000000000b1'},
  {u: '64f0000000000000000000a3', p: '64f0000000000000000000b2'}
] AS row
MATCH (u:User {id: row.u}), (p:Product {id: row.p})
MERGE (u)-[:LIKES]->(p);

// -----------------------------------------------------------------------------
// 7. Données de test : VIEWED
// -----------------------------------------------------------------------------
UNWIND [
  {u: '64f0000000000000000000a1', p: '64f0000000000000000000b2', n: 2},
  {u: '64f0000000000000000000a2', p: '64f0000000000000000000b3', n: 1},
  {u: '64f0000000000000000000a3', p: '64f0000000000000000000b4', n: 3}
] AS row
MATCH (u:User {id: row.u}), (p:Product {id: row.p})
MERGE (u)-[r:VIEWED]->(p)
  ON CREATE SET r.viewCount = row.n;

// -----------------------------------------------------------------------------
// 8. Vérification
//    Attendu : User 3, Product 6, Category 9, Brand 6
//              PUBLISHED 6, IN_CATEGORY 6, HAS_BRAND 6, FOLLOWS 4, LIKES 5, VIEWED 3
// -----------------------------------------------------------------------------
MATCH (n)
RETURN 'node' AS kind, labels(n)[0] AS name, count(*) AS total
UNION
MATCH ()-[r]->()
RETURN 'relationship' AS kind, type(r) AS name, count(*) AS total;

// =============================================================================
// Requêtes applicatives (référence, non exécutées par ce script)
// =============================================================================

// Publier une annonce
// MATCH (u:User {id: $sellerId}), (c:Category {id: $categoryId}), (b:Brand {id: $brandId})
// MERGE (p:Product {id: $listingId}) ON CREATE SET p.status = 'active'
// MERGE (u)-[:PUBLISHED]->(p)
// MERGE (p)-[:IN_CATEGORY]->(c)
// MERGE (p)-[:HAS_BRAND]->(b);

// Changer le statut d'une annonce (active | sold | deleted)
// MATCH (p:Product {id: $listingId}) SET p.status = $status;

// Suivre un utilisateur
// MATCH (a:User {id: $followerId}), (b:User {id: $followedId})
// MERGE (a)-[r:FOLLOWS]->(b) ON CREATE SET r.followedAt = datetime();

// Aimer / ne plus aimer une annonce
// MATCH (u:User {id: $userId}), (p:Product {id: $listingId})
// MERGE (u)-[:LIKES]->(p);
// MATCH (:User {id: $userId})-[r:LIKES]->(:Product {id: $listingId}) DELETE r;

// Marquer une annonce comme vue (viewCount vaut 1 à la première vue)
// MATCH (u:User {id: $userId}), (p:Product {id: $listingId})
// MERGE (u)-[r:VIEWED]->(p)
//   ON CREATE SET r.viewCount = 0
// SET r.viewCount = r.viewCount + 1;

// Reco sociale : annonces aimées par les personnes suivies
// MATCH (me:User {id: $userId})-[:FOLLOWS]->(f:User)-[:LIKES]->(p:Product)
// WHERE p.status = 'active'
//   AND NOT (me)-[:LIKES|VIEWED|PUBLISHED]->(p)
// RETURN p.id AS listingId, count(DISTINCT f) AS socialScore
// ORDER BY socialScore DESC LIMIT 50;

// Reco collaborative : annonces aimées par ceux qui aiment les mêmes annonces
// MATCH (me:User {id: $userId})-[:LIKES]->(:Product)<-[:LIKES]-(o:User)-[:LIKES]->(rec:Product)
// WHERE o <> me AND rec.status = 'active'
//   AND NOT (me)-[:LIKES|VIEWED|PUBLISHED]->(rec)
// RETURN rec.id AS listingId, count(DISTINCT o) AS score
// ORDER BY score DESC LIMIT 50;

// Reco par affinité : annonces de même catégorie ou de même marque que celles que j'aime
// MATCH (me:User {id: $userId})-[:LIKES]->(:Product)-[:IN_CATEGORY|HAS_BRAND]->(x)
//       <-[:IN_CATEGORY|HAS_BRAND]-(rec:Product)
// WHERE rec.status = 'active'
//   AND NOT (me)-[:LIKES|VIEWED|PUBLISHED]->(rec)
// RETURN rec.id AS listingId, count(*) AS score
// ORDER BY score DESC LIMIT 50;

// Annonces d'une catégorie ou d'une marque
// MATCH (p:Product {status: 'active'})-[:IN_CATEGORY]->(:Category {id: $categoryId}) RETURN p.id;
// MATCH (p:Product {status: 'active'})-[:HAS_BRAND]->(:Brand {id: $brandId}) RETURN p.id;
