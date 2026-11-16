// Profils et abonnements — routes FastAPI : /users/*
// MongoDB : collection users ; Neo4j : relations FOLLOWS et LIKES

import { ApiError, USE_MOCK, mockDelay, request, tokenStorage } from './client';
import { db, publicUser, save, userIdFromToken } from './mock/db';

const currentUserId = () => userIdFromToken(tokenStorage.get());

// GET /users/{id}  ->  profil + compteurs (followersCount, followingCount, isFollowing)
export async function getUser(id) {
  if (USE_MOCK) {
    await mockDelay();
    const user = db.users.find((u) => u._id === id);
    if (!user) throw new ApiError('Utilisateur introuvable', 404);
    return {
      ...publicUser(user),
      followersCount: db.follows.filter((f) => f.following === id).length,
      followingCount: db.follows.filter((f) => f.follower === id).length,
      listingsCount: db.listings.filter((l) => l.sellerId === id).length,
      isFollowing: db.follows.some((f) => f.follower === currentUserId() && f.following === id),
    };
  }
  return request(`/users/${id}`);
}

// GET /users/{id}/listings  ->  annonces publiées (relation SELLS)
export async function getUserListings(id) {
  if (USE_MOCK) {
    await mockDelay();
    return db.listings.filter((l) => l.sellerId === id);
  }
  return request(`/users/${id}/listings`);
}

// GET /users/{id}/favorites  ->  annonces aimées (relation LIKES)
export async function getUserFavorites(id) {
  if (USE_MOCK) {
    await mockDelay();
    const ids = db.likes.filter((l) => l.userId === id).map((l) => l.listingId);
    return db.listings.filter((l) => ids.includes(l._id));
  }
  return request(`/users/${id}/favorites`);
}

// POST /users/{id}/follow
export async function followUser(id) {
  if (USE_MOCK) {
    await mockDelay(150);
    const me = currentUserId();
    if (!db.follows.some((f) => f.follower === me && f.following === id)) {
      db.follows.push({ follower: me, following: id });
      save();
    }
    return null;
  }
  return request(`/users/${id}/follow`, { method: 'POST' });
}

// DELETE /users/{id}/follow
export async function unfollowUser(id) {
  if (USE_MOCK) {
    await mockDelay(150);
    const me = currentUserId();
    db.follows = db.follows.filter((f) => !(f.follower === me && f.following === id));
    save();
    return null;
  }
  return request(`/users/${id}/follow`, { method: 'DELETE' });
}
