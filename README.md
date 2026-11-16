# TROOV

Marketplace sociale réalisée pour le cours **Web Languages for Data Storage and Management**.

- **MongoDB** (documents) : profils, annonces, commentaires, commandes
- **Neo4j** (graphe) : abonnements, favoris, centres d'intérêt, recommandations
- **Frontend** : React + Vite + Tailwind CSS
- **Backend** : FastAPI (Python) — à venir

## Structure

```
Projet_noe4j/
├── frontend/                React + Vite + Tailwind
│   ├── .env.example         configuration (URL de l'API, mode mock)
│   └── src/
│       ├── api/             appels à l'API, un fichier par domaine
│       │   ├── client.js    fetch + token JWT + bascule mock/API
│       │   ├── auth.js      connexion, inscription, session
│       │   ├── users.js     profils, abonnements (FOLLOWS), favoris (LIKES)
│       │   ├── listings.js  annonces, recommandations
│       │   └── mock/        données fictives (sans backend)
│       ├── components/      composants réutilisables
│       ├── context/         AuthContext (utilisateur connecté)
│       ├── pages/           Accueil, Connexion, Inscription, Profil, 404
│       └── constants.js     catégories
└── backend/                 FastAPI (vide pour l'instant)
    └── app/
        ├── routers/         une route par domaine
        ├── db/              connexions MongoDB / Neo4j
        └── schemas/         modèles Pydantic
```

## Lancer le frontend

Prérequis : Node.js 20 ou plus récent.

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Ouvrir http://localhost:5173.

**Compte de test (mode mock)** : `demo@troov.fr` / `demo1234`

Les inscriptions et abonnements faits en mode mock sont enregistrés dans le
`localStorage` du navigateur. Pour revenir aux données de départ, il suffit de vider le
stockage du site (outils de développement → Application → Local Storage).

## Mock / vraie API

Dans `frontend/.env` :

| Variable        | Rôle                                                      |
|-----------------|-----------------------------------------------------------|
| `VITE_USE_MOCK` | `true` : données fictives ; `false` : appelle FastAPI      |
| `VITE_API_URL`  | URL de l'API (par défaut `http://localhost:8000`)          |

## Contrat d'API attendu par le frontend

L'authentification passe par un token JWT envoyé dans l'en-tête
`Authorization: Bearer <token>`. Les erreurs suivent le format FastAPI : `{ "detail": "message" }`.

| Méthode | Route                         | Réponse                                   | Base(s)          |
|---------|-------------------------------|-------------------------------------------|------------------|
| POST    | `/auth/register`              | `{ access_token, user }`                  | MongoDB + Neo4j  |
| POST    | `/auth/login`                 | `{ access_token, user }`                  | MongoDB          |
| GET     | `/auth/me`                    | `user`                                    | MongoDB          |
| GET     | `/users/{id}`                 | `user` + `followersCount`, `followingCount`, `listingsCount`, `isFollowing` | MongoDB + Neo4j |
| GET     | `/users/{id}/listings`        | `listing[]`                               | Neo4j (SELLS) → MongoDB |
| GET     | `/users/{id}/favorites`       | `listing[]`                               | Neo4j (LIKES) → MongoDB |
| POST    | `/users/{id}/follow`          | 204                                       | Neo4j (FOLLOWS)  |
| DELETE  | `/users/{id}/follow`          | 204                                       | Neo4j (FOLLOWS)  |
| GET     | `/listings?limit=`            | `listing[]` (avec `seller`)               | MongoDB          |
| GET     | `/recommendations?limit=`     | `listing[]` (avec `seller` et `reason`)   | Neo4j → MongoDB  |

La forme exacte des objets `user` et `listing` est visible dans
[`frontend/src/api/mock/data.js`](frontend/src/api/mock/data.js).

## Répartition

| Étudiant | Fonctionnalité            | Fichiers principaux côté front                     |
|----------|---------------------------|----------------------------------------------------|
| Alex     | Profils et vendeurs       | `api/users.js`, `pages/Profile.jsx`                |
| Mathis   | Publication des annonces  | `api/listings.js`, page de publication (à créer)   |
| Bastien  | Recherche et catégories   | page de recherche (à créer), `constants.js`        |
| Douae    | Favoris et préférences    | `api/users.js` (favoris), interface favoris        |
| Yoan     | Recommandations           | `api/listings.js` (`getRecommendations`), `pages/Home.jsx` |
