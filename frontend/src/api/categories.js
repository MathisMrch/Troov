// Catégories — route FastAPI : GET /categories (collection MongoDB categories)

import { USE_MOCK, mockDelay, request } from './client';
import { db } from './mock/db';

// GET /categories  ->  [{ id, name, slug }]
export async function getCategories() {
  if (USE_MOCK) {
    await mockDelay(100);
    return db.categories;
  }
  return request('/categories', { auth: false });
}
