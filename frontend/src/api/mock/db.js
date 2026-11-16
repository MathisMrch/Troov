// "Base de données" fictive en mémoire, sauvegardée dans le localStorage
// pour que les inscriptions et abonnements survivent à un rechargement.

import { seed } from './data';

const STORAGE_KEY = 'sm_mock_db';

function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // données corrompues : on repart des données initiales
  }
  return structuredClone(seed);
}

export const db = load();

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // stockage indisponible : les données restent en mémoire
  }
}

export function resetMockDb() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

// Ne renvoie jamais le mot de passe au front
export function publicUser({ password: _password, ...user }) {
  return user;
}

// En mock, le token est simplement "mock-<id utilisateur>"
export function userIdFromToken(token) {
  return token?.startsWith('mock-') ? token.slice(5) : null;
}
