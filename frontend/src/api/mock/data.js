// Données fictives initiales.
// La forme des objets suit ce que l'API renverra :
//  - users / listings  -> collections MongoDB
//  - follows / likes   -> relations Neo4j (FOLLOWS, LIKES)

export const seed = {
  users: [
    {
      _id: 'u1',
      username: 'sarah',
      email: 'demo@troov.fr',
      password: 'demo1234', // uniquement en mock : le backend stockera un hash
      firstName: 'Sarah',
      lastName: 'Lefèvre',
      bio: 'Étudiante à Tours, passionnée de tech et de musique.',
      city: 'Tours',
      interests: ['Informatique', 'Musique'],
      createdAt: '2026-09-02T10:00:00Z',
    },
    {
      _id: 'u2',
      username: 'adam',
      email: 'adam@troov.fr',
      password: 'adam1234',
      firstName: 'Adam',
      lastName: 'Bernard',
      bio: 'Je revends le matériel informatique que je n’utilise plus.',
      city: 'Orléans',
      interests: ['Informatique', 'Sport'],
      createdAt: '2026-08-15T09:30:00Z',
    },
    {
      _id: 'u3',
      username: 'lea',
      email: 'lea@troov.fr',
      password: 'lea12345',
      firstName: 'Léa',
      lastName: 'Dubois',
      bio: 'Musicienne et cycliste du dimanche.',
      city: 'Tours',
      interests: ['Musique', 'Sport', 'Livres'],
      createdAt: '2026-07-20T14:00:00Z',
    },
  ],

  listings: [
    {
      _id: 'l1',
      title: 'Clavier mécanique RGB',
      description: 'Switches rouges, très bon état, câble USB-C fourni.',
      price: 79,
      category: 'Informatique',
      condition: 'Très bon état',
      sellerId: 'u2',
      city: 'Orléans',
      createdAt: '2026-11-14T18:20:00Z',
    },
    {
      _id: 'l2',
      title: 'Écran 27" QHD',
      description: 'Écran 144 Hz, aucun pixel mort, pied réglable.',
      price: 180,
      category: 'Informatique',
      condition: 'Bon état',
      sellerId: 'u2',
      city: 'Orléans',
      createdAt: '2026-11-12T11:00:00Z',
    },
    {
      _id: 'l3',
      title: 'Guitare acoustique',
      description: 'Guitare folk avec housse et accordeur.',
      price: 150,
      category: 'Musique',
      condition: 'Bon état',
      sellerId: 'u3',
      city: 'Tours',
      createdAt: '2026-11-10T16:45:00Z',
    },
    {
      _id: 'l4',
      title: 'Vélo de ville',
      description: 'Taille M, 7 vitesses, révisé récemment.',
      price: 220,
      category: 'Sport',
      condition: 'Très bon état',
      sellerId: 'u3',
      city: 'Tours',
      createdAt: '2026-11-08T09:10:00Z',
    },
    {
      _id: 'l5',
      title: 'Lampe de bureau LED',
      description: 'Trois niveaux de luminosité, bras articulé.',
      price: 25,
      category: 'Maison',
      condition: 'Neuf',
      sellerId: 'u1',
      city: 'Tours',
      createdAt: '2026-11-05T13:30:00Z',
    },
    {
      _id: 'l6',
      title: 'Casque audio sans fil',
      description: 'Réduction de bruit active, 30 h d’autonomie.',
      price: 95,
      category: 'Musique',
      condition: 'Bon état',
      sellerId: 'u2',
      city: 'Orléans',
      createdAt: '2026-11-03T20:00:00Z',
    },
  ],

  // (follower)-[:FOLLOWS]->(following)
  follows: [
    { follower: 'u1', following: 'u2' },
    { follower: 'u3', following: 'u1' },
    { follower: 'u2', following: 'u3' },
  ],

  // (user)-[:LIKES]->(listing)
  likes: [
    { userId: 'u1', listingId: 'l3' },
    { userId: 'u3', listingId: 'l1' },
  ],
};
