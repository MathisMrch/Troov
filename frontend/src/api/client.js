// Client HTTP commun à tous les modules de src/api.
// Chaque module (auth, users, listings) choisit entre les données fictives
// et la vraie API FastAPI selon USE_MOCK.

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const TOKEN_KEY = 'sm_token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStorage.get();
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Impossible de joindre le serveur', 0);
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // FastAPI renvoie les erreurs sous la forme { "detail": "..." }
    const detail = typeof data?.detail === 'string' ? data.detail : 'Une erreur est survenue';
    throw new ApiError(detail, response.status);
  }
  return data;
}

// Simule la latence réseau en mode mock
export const mockDelay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
