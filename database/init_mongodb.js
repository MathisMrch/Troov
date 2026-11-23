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
const database = db.getSiblingDB("vinted_clone"); // même nom que MONGO_DB côté backend

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
    firstName: { bsonType: "string" },
    lastName: { bsonType: "string" },
    bio: { bsonType: "string", maxLength: 500 },
    city: { bsonType: "string" },
    // hash scrypt du mot de passe (géré par le backend, cf. app/security.py)
    passwordHash: { bsonType: "string" },
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
    { _id: I(1), name: "Robes",       slug: "robes" },
    { _id: I(2), name: "Chaussures",  slug: "chaussures" },
    { _id: I(3), name: "Vestes",      slug: "vestes" },
    { _id: I(4), name: "Hauts",       slug: "hauts" },
    { _id: I(5), name: "Pantalons",   slug: "pantalons" },
    { _id: I(6), name: "Sacs",        slug: "sacs" },
    { _id: I(7), name: "Accessoires", slug: "accessoires" },
    { _id: I(8), name: "Sport",       slug: "sport" },
    { _id: I(9), name: "Bijoux",      slug: "bijoux" }
  ]);

  upsertAll("conditions", [
    { _id: I(1), label: "Neuf avec étiquette", slug: "neuf-avec-etiquette" },
    { _id: I(2), label: "Neuf sans étiquette", slug: "neuf-sans-etiquette" },
    { _id: I(3), label: "Très bon état",       slug: "tres-bon-etat" },
    { _id: I(4), label: "Bon état",            slug: "bon-etat" },
    { _id: I(5), label: "Satisfaisant",        slug: "satisfaisant" }
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

  // Mot de passe de test commun : Password123! (hash scrypt, même format que app/security.py)
  const PWD = "scrypt$16384$8$1$a9d759519bd65b8b761cfb51624583bd$c1b9791d9be6dca72f561e8a42917872076ee2d86bd5571155851b2bc63a7417";

  upsertAll("users", [
    { _id: U1, username: "marie_75", email: "marie_75@example.com", passwordHash: PWD,
      firstName: "Marie", lastName: "Martin", city: "Tours",
      bio: "Je vide mon dressing : robes et chaussures en très bon état.",
      preferences: [I(1), I(2)], createdAt: now },
    { _id: U2, username: "lucas_37", email: "lucas_37@example.com", passwordHash: PWD,
      firstName: "Lucas", lastName: "Bernard", city: "Tours",
      bio: "Fan de denim, je revends ce que je ne porte plus.",
      preferences: [I(3), I(5)], createdAt: now },
    { _id: U3, username: "sofia_44", email: "sofia_44@example.com", passwordHash: PWD,
      firstName: "Sofia", lastName: "Petit", city: "Nantes",
      bio: "Étudiante à Nantes, toujours à la recherche de belles pièces.",
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
    listing(L1, U1, "Robe fleurie Zara taille M",       "25.00", 1, 1, 3, "Tours",  "37000", "Portée deux fois, parfait état."),
    listing(L2, U2, "Veste en jean Levi's taille L",    "40.00", 3, 3, 4, "Tours",  "37000", "Coupe classique, légère usure aux poignets."),
    listing(L3, U3, "Robe longue noire Zara taille S",  "30.00", 1, 1, 2, "Nantes", "44000", "Jamais portée, étiquette retirée."),
    listing(L4, U1, "Baskets Nike Air Max pointure 39", "55.00", 2, 2, 3, "Tours",  "37000", "Très peu portées."),
    listing(L5, U2, "Jean taille haute Levi's T38",     "35.00", 5, 3, 4, "Tours",  "37000", "Coupe droite."),
    listing(L6, U3, "Sac à main en cuir noir Mango",    "45.00", 6, 4, 3, "Nantes", "44000", "Fermeture zippée, poche intérieure.")
  ]);
}

print("Initialisation MongoDB terminée.");
database.getCollectionNames().forEach(n =>
  print(`  ${n.padEnd(12)} ${database[n].countDocuments()} document(s)`)
);
