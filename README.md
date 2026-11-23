# TROOV

Marketplace sociale réalisée pour le cours **Web Languages for Data Storage and Management**.

- **MongoDB** (documents) : utilisateurs, annonces, catégories, marques, états
- **Neo4j** (graphe) : abonnements, favoris, publications, vues
- **Redis** (clé-valeur) : centres d'intérêt, activité en temps réel
- **Frontend** : React + Vite + Tailwind CSS
- **Backend** : FastAPI (Python), lancé avec Docker

## Structure

```
Projet
├── docker-compose.yml        MongoDB, Neo4j, Redis, API + interfaces de développement
├── .env                      mots de passe et clé JWT (à ne pas versionner)
├── database/                 scripts d'initialisation des bases
│   ├── init_mongodb.js
│   ├── init_neo4j.cypher
│   └── init_redis.sh
├── frontend/                 React + Vite + Tailwind
│   ├── .env.example          configuration (URL de l'API, mode mock)
│   └── src/
│       ├── api/              appels à l'API, un fichier par domaine
│       │   ├── client.js     fetch + token JWT + bascule mock/API
│       │   ├── auth.js       connexion, inscription, session
│       │   ├── users.js      profils, abonnements (FOLLOWS), favoris (LIKES)
│       │   ├── listings.js   annonces, recommandations
│       │   ├── categories.js catégories (lues dans MongoDB)
│       │   └── mock/         données fictives (sans backend)
│       ├── components/       composants réutilisables
│       ├── context/          AuthContext (utilisateur connecté)
│       ├── pages/            Accueil, Connexion, Inscription, Profil, 404
│       └── utils.js          fonctions d'affichage (nom d'un utilisateur…)
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    ├── scripts/
    │   └── seed_passwords.py mot de passe de test pour les utilisateurs du jeu de données
    └── app/
        ├── main.py           application FastAPI, CORS, gestion des erreurs, /health
        ├── config.py         variables d'environnement
        ├── security.py       hachage des mots de passe, JWT
        ├── serializers.py    documents MongoDB -> format attendu par le frontend
        ├── utils.py          fonctions utilitaires
        ├── routers/          routes par domaine : auth, users, listings, categories, recommendations
        ├── db/               connexions MongoDB / Neo4j / Redis
        └── schemas/          modèles de validation (requêtes et réponses)
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

**Comptes de test** (mock et vraie API) : `marie_75@example.com`, `lucas_37@example.com` ou
`sofia_44@example.com`, mot de passe `Password123!`.

Par défaut, le front appelle l'API (`VITE_USE_MOCK=false`) : lancer d'abord le backend. Pour
travailler sans Docker, mettre `VITE_USE_MOCK=true` : les données fictives reprennent le même
jeu de données que les bases (mêmes identifiants, utilisateurs, annonces et catégories).

Les inscriptions et abonnements faits en mode mock sont enregistrés dans le
`localStorage` du navigateur. Pour revenir aux données de départ, il suffit de vider le
stockage du site (outils de développement → Application → Local Storage).

## Mock / vraie API

Dans `frontend/.env` :

| Variable        | Rôle                                                                                   |
|-----------------|----------------------------------------------------------------------------------------|
| `VITE_USE_MOCK` | `false` (défaut du `.env.example`) : appelle l'API FastAPI ; toute autre valeur, ou absente : données fictives |
| `VITE_API_URL`  | URL de l'API (par défaut `http://localhost:8000`)                                      |

## Lancer le backend

Prérequis : Docker Desktop. Tout se fait depuis la racine du projet.

**1. Démarrer les conteneurs**

```bash
docker compose up -d --build
```

Neo4j met environ 30 secondes à être prêt (`docker compose logs -f neo4j`).

**2. Initialiser les bases (une seule fois)**

```bash
docker cp database/init_mongodb.js mongo:/tmp/init_mongodb.js
docker exec mongo mongosh -u admin -p mongo_pwd --authenticationDatabase admin --file /tmp/init_mongodb.js

docker cp database/init_neo4j.cypher neo4j:/tmp/init_neo4j.cypher
docker exec neo4j cypher-shell -u neo4j -p neo4j_pwd -f /tmp/init_neo4j.cypher

docker run --rm --network troov_default --env-file .env -e REDIS_HOST=redis -v "${PWD}:/init" redis:7 bash -c "tr -d '\r' < /init/database/init_redis.sh | bash"
```

**3. Comptes de test**

`init_mongodb.js` enregistre déjà le hash du mot de passe `Password123!` pour
`marie_75@example.com`, `lucas_37@example.com` et `sofia_44@example.com`.
Pour le régénérer (facultatif) : `docker compose exec api python -m scripts.seed_passwords`.

**4. Vérifier**

`http://localhost:8000/health` doit répondre `{"mongo":"ok","neo4j":"ok","redis":"ok"}`.
Le front (`VITE_USE_MOCK=false`) utilise alors directement l'API.

> Après une modification de `database/`, relancer les scripts de l'étape 2 : ils sont idempotents
> (MongoDB et Neo4j mettent à jour les documents et les nœuds existants).

### Interfaces de développement

| Service               | URL                          | Connexion                                              |
|-----------------------|------------------------------|--------------------------------------------------------|
| API (documentation)   | http://localhost:8000/docs   |                                                        |
| Mongo Express         | http://localhost:8081        | base `vinted_clone` (Pas très coopératif, utilisez compass si vous avez) |
| Neo4j Browser         | http://localhost:7474        | `bolt://localhost:7687`, utilisateur `neo4j`, mot de passe `neo4j_pwd` |
| RedisInsight          | http://localhost:5540        | hôte `redis`, port 6379, mot de passe Redis            |

## Le backend

### Bases de données

| Base    | Rôle                              | Contenu                                                                 |
|---------|-----------------------------------|-------------------------------------------------------------------------|
| MongoDB | Source de vérité des entités      | base `vinted_clone` : `users`, `listings`, `categories`, `brands`, `conditions` |
| Neo4j   | Relations entre les entités       | `(User)-[:FOLLOWS]->(User)`, `(User)-[:LIKES]->(Product)`, `(User)-[:PUBLISHED]->(Product)`, `(User)-[:VIEWED]->(Product)`, `(Product)-[:IN_CATEGORY]->(Category)`, `(Product)-[:HAS_BRAND]->(Brand)` |
| Redis   | Données temps réel                | intérêts par catégorie et par marque, favoris, historique de vues, compteurs, tendances, cache de recommandations |

Un même identifiant relie les trois bases : l'`_id` MongoDB (ObjectId en chaîne) est le
`User.id` / `Product.id` de Neo4j et la clé Redis `user:{id}` / `listing:{id}`. Les catégories,
marques et états ont des identifiants entiers. L'API n'utilise aujourd'hui, côté Redis, que les
intérêts par catégorie ; le reste est initialisé par `init_redis.sh` pour les fonctionnalités à venir.

### Fonctionnement

1. Les **routers** reçoivent les requêtes, identifient l'utilisateur grâce au token JWT
   (`security.py`) et interrogent les bases (`db/`).
2. MongoDB fournit les utilisateurs et les annonces, Neo4j les abonnements et les favoris,
   Redis les centres d'intérêt.
3. Les **serializers** transforment les documents MongoDB dans le format du frontend :
   `_id` en chaîne, `price` en nombre, `category` et `condition` sous forme de noms,
   `seller` intégré à chaque annonce.
4. **Authentification** : mot de passe haché avec scrypt (champ `passwordHash`), token JWT
   valable 24 h. Les routes publiques ignorent un token invalide ou expiré.
5. **Inscription** : l'utilisateur est créé dans MongoDB, ajouté à Neo4j, et ses catégories
   choisies alimentent ses centres d'intérêt dans Redis. Les catégories inconnues sont ignorées.
6. **Recommandations** : annonces des vendeurs suivis (Neo4j, score +2, raison « Vendu par X, que
   vous suivez ») et des catégories préférées (Redis, score +1, raison « Vous aimez la catégorie Y »).
   Les annonces de l'utilisateur et celles qu'il a déjà aimées sont exclues.
7. **Erreurs** : format `{ "detail": "message" }`, y compris pour la validation des champs.
   Une base indisponible renvoie une erreur 503.

Pas encore couvert par le backend : publication, modification et suppression d'annonces,
recherche par filtres, ajout et retrait de favoris.

## Contrat d'API attendu par le frontend

L'authentification passe par un token JWT envoyé dans l'en-tête
`Authorization: Bearer <token>`. Les erreurs suivent le format FastAPI : `{ "detail": "message" }`.

| Méthode | Route                         | Réponse                                   | Base(s)                 |
|---------|-------------------------------|-------------------------------------------|-------------------------|
| POST    | `/auth/register`              | `{ access_token, user }`                  | MongoDB + Neo4j + Redis |
| POST    | `/auth/login`                 | `{ access_token, user }`                  | MongoDB                 |
| GET     | `/auth/me`                    | `user`                                    | MongoDB                 |
| GET     | `/users/{id}`                 | `user` + `followersCount`, `followingCount`, `listingsCount`, `isFollowing` | MongoDB + Neo4j |
| GET     | `/users/{id}/listings`        | `listing[]`                               | MongoDB                 |
| GET     | `/users/{id}/favorites`       | `listing[]`                               | Neo4j (LIKES) → MongoDB |
| POST    | `/users/{id}/follow`          | 204                                       | Neo4j (FOLLOWS)         |
| DELETE  | `/users/{id}/follow`          | 204                                       | Neo4j (FOLLOWS)         |
| GET     | `/listings?limit=`            | `listing[]` (avec `seller`)               | MongoDB                 |
| GET     | `/categories`                 | `[{ id, name, slug }]`                    | MongoDB                 |
| GET     | `/recommendations?limit=`     | `listing[]` (avec `seller`, `reason` et `score`) | Neo4j + Redis → MongoDB |

La forme des objets `user` et `listing` suit
[`frontend/src/api/mock/data.js`](frontend/src/api/mock/data.js). Avec la vraie API, les valeurs
viennent des bases : identifiants ObjectId, catégories et états tels qu'ils sont dans MongoDB.
`email` n'est renvoyé que pour l'utilisateur connecté, et `firstName`, `lastName`, `bio` et `city`
valent une chaîne vide quand ils ne sont pas renseignés.

## Répartition

| Étudiant | Fonctionnalité            | Fichiers principaux côté front                     | Fichiers principaux côté back                     |
|----------|---------------------------|----------------------------------------------------|---------------------------------------------------|
| Alex     | Profils et vendeurs       | `api/users.js`, `pages/Profile.jsx`                | `routers/users.py`, `serializers.py`              |
| Mathis   | Publication des annonces  | `api/listings.js`, page de publication (à créer)   | `routers/listings.py`                             |
| Bastien  | Recherche et catégories   | page de recherche (à créer), `api/categories.js`   | `routers/listings.py`, `routers/categories.py`    |
| Douae    | Favoris et préférences    | `api/users.js` (favoris), interface favoris        | `routers/users.py`                                |
| Yoan     | Recommandations           | `api/listings.js` (`getRecommendations`), `pages/Home.jsx` | `routers/recommendations.py`              |
