// Annonces et recommandations — routes FastAPI : /listings, /recommendations

import { USE_MOCK, mockDelay, request, tokenStorage } from './client';
import { db, userIdFromToken } from './mock/db';
import { rank } from './mock/search';

const withSeller = (listing) => {
  const seller = db.users.find((u) => u._id === listing.sellerId);
  return { ...listing, seller: seller && { _id: seller._id, username: seller.username } };
};

// GET /listings?limit=  ->  annonces les plus récentes
export async function getRecentListings(limit = 12) {
  if (USE_MOCK) {
    await mockDelay();
    return [...db.listings]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map(withSeller);
  }
  return request(`/listings?limit=${limit}`);
}

// GET /recommendations  ->  annonces recommandées pour l'utilisateur connecté
// Côté backend : requêtes Cypher (centres d'intérêt, vendeurs suivis, amis d'amis…).
// Chaque annonce porte un champ "reason" expliquant la recommandation.
export async function getRecommendations(limit = 4) {
  if (USE_MOCK) {
    await mockDelay();
    const me = db.users.find((u) => u._id === userIdFromToken(tokenStorage.get()));
    if (!me) return [];

    const followed = db.follows.filter((f) => f.follower === me._id).map((f) => f.following);
    const liked = db.likes.filter((l) => l.userId === me._id).map((l) => l.listingId);

    return db.listings
      .filter((l) => l.sellerId !== me._id && !liked.includes(l._id))
      .map((l) => {
        const fromFollowed = followed.includes(l.sellerId);
        const fromInterest = me.interests?.includes(l.category);
        if (!fromFollowed && !fromInterest) return null;
        const seller = db.users.find((u) => u._id === l.sellerId);
        const reason = fromFollowed
          ? `Vendu par ${seller.firstName}, que vous suivez`
          : `Vous aimez la catégorie ${l.category}`;
        return { ...withSeller(l), reason, score: (fromFollowed ? 2 : 0) + (fromInterest ? 1 : 0) };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  return request(`/recommendations?limit=${limit}`);
}

// GET /listings/search?q=&category=&minPrice=&maxPrice=&sort=
// Recherche intelligente (titre, marque, catégorie, état, ville, description) + filtres + tri.
// sort : relevance (défaut) | price_asc | price_desc | recent
export async function searchListings({ q = '', category, minPrice, maxPrice, sort = 'relevance' } = {}) {
  if (USE_MOCK) {
    await mockDelay(200);
    const categoryName = db.categories.find((c) => String(c.id) === String(category))?.name;
    const filtered = db.listings.filter(
      (l) =>
        (!category || l.category === categoryName) &&
        (minPrice === undefined || minPrice === '' || l.price >= Number(minPrice)) &&
        (maxPrice === undefined || maxPrice === '' || l.price <= Number(maxPrice)),
    );
    const items = rank(filtered.map(withSeller), q);
    if (sort === 'price_asc') items.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') items.sort((a, b) => b.price - a.price);
    else if (sort === 'recent' || !q.trim()) items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items.slice(0, 60);
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ q, category, minPrice, maxPrice, sort })) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  }
  return request(`/listings/search?${params}`);
}
