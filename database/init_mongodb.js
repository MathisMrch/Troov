// =============================================================================
// init_mongodb.js : initialisation MongoDB
// Collections : users, categories, conditions, brands, listings (+ counters)
// Exécution : mongosh "mongodb://localhost:27017" init_mongodb.js
//
// Le champ `id` du DBML correspond au champ `_id` de MongoDB.
// Mettre SEED = false pour créer uniquement la structure (collections,
// validateurs, index) sans injecter de données de test.
// =============================================================================

const SEED = true;
const database = db.getSiblingDB("WebData");

const I = NumberInt;      // entiers 32 bits (ids de categories, brands, conditions)
const D = NumberDecimal;  // decimal (price)

// -----------------------------------------------------------------------------
// Identifiants fixes des données de test (réutilisés dans Neo4j et Redis)
// -----------------------------------------------------------------------------
const U1 = ObjectId("64f0000000000000000000a1"); // marie_75
const U2 = ObjectId("64f0000000000000000000a2"); // lucas_37
const U3 = ObjectId("64f0000000000000000000a3"); // sofia_44

const L1 = ObjectId("64f0000000000000000000b1");
const L2 = ObjectId("64f0000000000000000000b2");
const L3 = ObjectId("64f0000000000000000000b3");
const L4 = ObjectId("64f0000000000000000000b4");
const L5 = ObjectId("64f0000000000000000000b5");
const L6 = ObjectId("64f0000000000000000000b6");

// -----------------------------------------------------------------------------
// Utilitaire : crée la collection ou met à jour son validateur
// -----------------------------------------------------------------------------
function ensureCollection(name, validator) {
  const exists = database.getCollectionNames().includes(name);
  const options = validator
    ? { validator: { $jsonSchema: validator }, validationLevel: "moderate", validationAction: "error" }
    : {};
  if (!exists) {
    database.createCollection(name, options);
    print(`+ collection créée : ${name}`);
  } else if (validator) {
    database.runCommand({ collMod: name, ...options });
    print(`~ validateur mis à jour : ${name}`);
  }
}

const intId = { bsonType: ["int", "long"] };

// -----------------------------------------------------------------------------
// 1. users
// -----------------------------------------------------------------------------
ensureCollection("users", {
  bsonType: "object",
  required: ["username", "email", "createdAt"],
  properties: {
    username: { bsonType: "string", minLength: 3, maxLength: 30 },
    email: { bsonType: "string", pattern: "^.+@.+\\..+$" },
    city: { bsonType: "string" },
    // centres d'intérêt : ids de categories, ex. [1, 4, 9]
    preferences: { bsonType: "array", items: intId },
    createdAt: { bsonType: "date" }
  }
});

database.users.createIndex({ username: 1 }, { unique: true });
database.users.createIndex({ email: 1 }, { unique: true });

// -----------------------------------------------------------------------------
// 2. categories
// -----------------------------------------------------------------------------
ensureCollection("categories", {
  bsonType: "object",
  required: ["_id", "name", "slug"],
  properties: {
    _id: intId,
    name: { bsonType: "string" },
    slug: { bsonType: "string" }
  }
});
database.categories.createIndex({ slug: 1 }, { unique: true });

// -----------------------------------------------------------------------------
// 3. conditions
// -----------------------------------------------------------------------------
ensureCollection("conditions", {
  bsonType: "object",
  required: ["_id", "label", "slug"],
  properties: {
    _id: intId,
    label: { bsonType: "string" },
    slug: { bsonType: "string" }
  }
});
database.conditions.createIndex({ slug: 1 }, { unique: true });

// -----------------------------------------------------------------------------
// 4. brands
// -----------------------------------------------------------------------------
ensureCollection("brands", {
  bsonType: "object",
  required: ["_id", "name", "slug"],
  properties: {
    _id: intId,
    name: { bsonType: "string" },
    slug: { bsonType: "string" }
  }
});
database.brands.createIndex({ name: 1 }, { unique: true });
database.brands.createIndex({ slug: 1 }, { unique: true });

// -----------------------------------------------------------------------------
// 5. listings
//    Références : categoryId, brandId, conditionId (int), sellerId (ObjectId).
//    MongoDB n'impose pas les clés étrangères : l'intégrité est gérée par l'app.
// -----------------------------------------------------------------------------
ensureCollection("listings", {
  bsonType: "object",
  required: ["title", "price", "categoryId", "brandId", "conditionId", "sellerId", "status", "createdAt"],
  properties: {
    title: { bsonType: "string", minLength: 3, maxLength: 100 },
    description: { bsonType: "string", maxLength: 2000 },
    price: { bsonType: "decimal", minimum: 0 },
    categoryId: intId,
    brandId: intId,
    conditionId: intId,
    images: { bsonType: "array", items: { bsonType: "string" } },
    location: {
      bsonType: "object",
      properties: {
        city: { bsonType: "string" },
        postalCode: { bsonType: "string" }
      }
    },
    sellerId: { bsonType: "objectId" },
    // valeur par défaut côté application : "active"
    status: { enum: ["active", "sold", "deleted"] },
    createdAt: { bsonType: "date" }
  }
});

database.listings.createIndex({ sellerId: 1 });
database.listings.createIndex({ categoryId: 1, price: 1 });
database.listings.createIndex({ brandId: 1 });
database.listings.createIndex({ createdAt: -1 });

// -----------------------------------------------------------------------------
// 6. counters (technique) : simule l'auto-incrément des ids entiers
//    Usage applicatif :
//      db.counters.findOneAndUpdate({ _id: "brands" }, { $inc: { seq: 1 } },
//                                   { returnDocument: "after" }).seq
// -----------------------------------------------------------------------------
ensureCollection("counters", null);

// -----------------------------------------------------------------------------
// 7. Données de test (idempotentes)
// -----------------------------------------------------------------------------
if (SEED) {
  const now = new Date();
  const upsertAll = (coll, docs) =>
    docs.forEach(d => database[coll].replaceOne({ _id: d._id }, d, { upsert: true }));

  upsertAll("categories", [
    { _id: I(1), name: "Dresses",     slug: "dresses" },
    { _id: I(2), name: "Shoes",       slug: "shoes" },
    { _id: I(3), name: "Jackets",     slug: "jackets" },
    { _id: I(4), name: "Tops",        slug: "tops" },
    { _id: I(5), name: "Pants",       slug: "pants" },
    { _id: I(6), name: "Bags",        slug: "bags" },
    { _id: I(7), name: "Accessories", slug: "accessories" },
    { _id: I(8), name: "Sportswear",  slug: "sportswear" },
    { _id: I(9), name: "Jewelry",     slug: "jewelry" }
  ]);

  upsertAll("conditions", [
    { _id: I(1), label: "New with tags",    slug: "new-with-tags" },
    { _id: I(2), label: "New without tags", slug: "new-without-tags" },
    { _id: I(3), label: "Very good",        slug: "very-good" },
    { _id: I(4), label: "Good",             slug: "good" },
    { _id: I(5), label: "Satisfactory",     slug: "satisfactory" }
  ]);

  upsertAll("brands", [
    { _id: I(1), name: "Zara",   slug: "zara" },
    { _id: I(2), name: "Nike",   slug: "nike" },
    { _id: I(3), name: "Levi's", slug: "levis" },
    { _id: I(4), name: "Mango",  slug: "mango" },
    { _id: I(5), name: "H&M",    slug: "hm" },
    { _id: I(6), name: "Adidas", slug: "adidas" }
  ]);

  // $max : ne fait jamais reculer un compteur déjà avancé
  [["categories", 9], ["conditions", 5], ["brands", 6]].forEach(([name, seq]) =>
    database.counters.updateOne({ _id: name }, { $max: { seq: I(seq) } }, { upsert: true })
  );

  upsertAll("users", [
    { _id: U1, username: "marie_75", email: "marie_75@example.com", city: "Tours",
      preferences: [I(1), I(2)], createdAt: now },
    { _id: U2, username: "lucas_37", email: "lucas_37@example.com", city: "Tours",
      preferences: [I(3), I(5)], createdAt: now },
    { _id: U3, username: "sofia_44", email: "sofia_44@example.com", city: "Nantes",
      preferences: [I(1), I(6)], createdAt: now }
  ]);

  const listing = (_id, sellerId, title, price, categoryId, brandId, conditionId, city, postalCode, description) => ({
    _id, title, description,
    price: D(price),
    categoryId: I(categoryId), brandId: I(brandId), conditionId: I(conditionId),
    images: [`https://cdn.example.com/listings/${_id.toHexString()}/1.jpg`],
    location: { city, postalCode },
    sellerId,
    status: "active",
    createdAt: now
  });

  upsertAll("listings", [
    listing(L1, U1, "Floral Zara dress size M",        "25.00", 1, 1, 3, "Tours",  "37000", "Worn twice, perfect condition."),
    listing(L2, U2, "Levi's denim jacket size L",      "40.00", 3, 3, 4, "Tours",  "37000", "Classic fit, some wear on the cuffs."),
    listing(L3, U3, "Long black Zara dress size S",    "30.00", 1, 1, 2, "Nantes", "44000", "Never worn, tags removed."),
    listing(L4, U1, "Nike Air Max sneakers size 39",   "55.00", 2, 2, 3, "Tours",  "37000", "Barely used."),
    listing(L5, U2, "High-waist Levi's jeans size 38", "35.00", 5, 3, 4, "Tours",  "37000", "Straight cut."),
    listing(L6, U3, "Black leather Mango handbag",     "45.00", 6, 4, 3, "Nantes", "44000", "Zip closure, inner pocket.")
  ]);
}

print("Initialisation MongoDB terminée.");
database.getCollectionNames().forEach(n =>
  print(`  ${n.padEnd(12)} ${database[n].countDocuments()} document(s)`)
);
