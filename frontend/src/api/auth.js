// Authentification — routes FastAPI : /auth/*

import { ApiError, USE_MOCK, mockDelay, request, tokenStorage } from './client';
import { db, publicUser, save, userIdFromToken } from './mock/db';

// POST /auth/login  ->  { access_token, user }
export async function login(email, password) {
  if (USE_MOCK) {
    await mockDelay();
    const user = db.users.find(
      (u) => u.email === email.trim().toLowerCase() && u.password === password,
    );
    if (!user) throw new ApiError('Email ou mot de passe incorrect', 401);
    return { access_token: `mock-${user._id}`, user: publicUser(user) };
  }
  return request('/auth/login', { method: 'POST', body: { email, password }, auth: false });
}

// POST /auth/register  ->  { access_token, user }
export async function register(payload) {
  if (USE_MOCK) {
    await mockDelay();
    const email = payload.email.trim().toLowerCase();
    if (db.users.some((u) => u.email === email)) {
      throw new ApiError('Un compte existe déjà avec cet email', 409);
    }
    if (db.users.some((u) => u.username === payload.username)) {
      throw new ApiError('Ce nom d’utilisateur est déjà pris', 409);
    }
    const user = {
      _id: `u${Date.now()}`,
      ...payload,
      email,
      bio: '',
      city: '',
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    save();
    return { access_token: `mock-${user._id}`, user: publicUser(user) };
  }
  return request('/auth/register', { method: 'POST', body: payload, auth: false });
}

// GET /auth/me  ->  utilisateur connecté
export async function getMe() {
  if (USE_MOCK) {
    await mockDelay(100);
    const user = db.users.find((u) => u._id === userIdFromToken(tokenStorage.get()));
    if (!user) throw new ApiError('Session expirée', 401);
    return publicUser(user);
  }
  return request('/auth/me');
}
