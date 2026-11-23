// Données fictives initiales, alignées sur le jeu de données des bases
// (database/init_mongodb.js, init_neo4j.cypher) : mêmes identifiants, mêmes contenus.
// La forme des objets suit ce que l'API renvoie :
//  - users / listings / categories -> collections MongoDB (via les serializers du backend)
//  - follows / likes               -> relations Neo4j (FOLLOWS, LIKES)

const U1 = '64f0000000000000000000a1'; // marie_75
const U2 = '64f0000000000000000000a2'; // lucas_37
const U3 = '64f0000000000000000000a3'; // sofia_44

const L1 = '64f0000000000000000000b1';
const L2 = '64f0000000000000000000b2';
const L3 = '64f0000000000000000000b3';
const L4 = '64f0000000000000000000b4';
const L5 = '64f0000000000000000000b5';
const L6 = '64f0000000000000000000b6';

const CREATED_AT = '2026-11-19T09:00:00Z';

const listing = (_id, sellerId, title, price, category, brand, condition, city, description) => ({
  _id,
  title,
  description,
  price,
  category,
  condition,
  brand,
  sellerId,
  city,
  images: [],
  createdAt: CREATED_AT,
});

export const seed = {
  categories: [
    { id: 1, name: 'Robes', slug: 'robes' },
    { id: 2, name: 'Chaussures', slug: 'chaussures' },
    { id: 3, name: 'Vestes', slug: 'vestes' },
    { id: 4, name: 'Hauts', slug: 'hauts' },
    { id: 5, name: 'Pantalons', slug: 'pantalons' },
    { id: 6, name: 'Sacs', slug: 'sacs' },
    { id: 7, name: 'Accessoires', slug: 'accessoires' },
    { id: 8, name: 'Sport', slug: 'sport' },
    { id: 9, name: 'Bijoux', slug: 'bijoux' },
  ],

  users: [
    {
      _id: U1,
      username: 'marie_75',
      email: 'marie_75@example.com',
      password: 'Password123!', // uniquement en mock : le backend stocke un hash scrypt
      firstName: 'Marie',
      lastName: 'Martin',
      bio: 'Je vide mon dressing : robes et chaussures en très bon état.',
      city: 'Tours',
      interests: ['Robes', 'Chaussures'],
      createdAt: CREATED_AT,
    },
    {
      _id: U2,
      username: 'lucas_37',
      email: 'lucas_37@example.com',
      password: 'Password123!',
      firstName: 'Lucas',
      lastName: 'Bernard',
      bio: 'Fan de denim, je revends ce que je ne porte plus.',
      city: 'Tours',
      interests: ['Vestes', 'Pantalons'],
      createdAt: CREATED_AT,
    },
    {
      _id: U3,
      username: 'sofia_44',
      email: 'sofia_44@example.com',
      password: 'Password123!',
      firstName: 'Sofia',
      lastName: 'Petit',
      bio: 'Étudiante à Nantes, toujours à la recherche de belles pièces.',
      city: 'Nantes',
      interests: ['Robes', 'Sacs'],
      createdAt: CREATED_AT,
    },
  ],

  listings: [
    listing(L1, U1, 'Robe fleurie Zara taille M', 25, 'Robes', 'Zara', 'Très bon état', 'Tours', 'Portée deux fois, parfait état.'),
    listing(L2, U2, "Veste en jean Levi's taille L", 40, 'Vestes', "Levi's", 'Bon état', 'Tours', 'Coupe classique, légère usure aux poignets.'),
    listing(L3, U3, 'Robe longue noire Zara taille S', 30, 'Robes', 'Zara', 'Neuf sans étiquette', 'Nantes', 'Jamais portée, étiquette retirée.'),
    listing(L4, U1, 'Baskets Nike Air Max pointure 39', 55, 'Chaussures', 'Nike', 'Très bon état', 'Tours', 'Très peu portées.'),
    listing(L5, U2, "Jean taille haute Levi's T38", 35, 'Pantalons', "Levi's", 'Bon état', 'Tours', 'Coupe droite.'),
    listing(L6, U3, 'Sac à main en cuir noir Mango', 45, 'Sacs', 'Mango', 'Très bon état', 'Nantes', 'Fermeture zippée, poche intérieure.'),
  ],

  // (follower)-[:FOLLOWS]->(following)
  follows: [
    { follower: U1, following: U2 },
    { follower: U2, following: U3 },
    { follower: U3, following: U1 },
    { follower: U3, following: U2 },
  ],

  // (user)-[:LIKES]->(listing)
  likes: [
    { userId: U1, listingId: L3 },
    { userId: U2, listingId: L1 },
    { userId: U2, listingId: L4 },
    { userId: U3, listingId: L1 },
    { userId: U3, listingId: L2 },
  ],
};
