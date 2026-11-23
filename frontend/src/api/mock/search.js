// Recherche « intelligente » en mode mock : même algorithme que backend/app/search.py
// (normalisation sans accents, pluriels, préfixes, fautes de frappe, synonymes, pondération).

const WEIGHTS = { title: 3, brand: 3, category: 2.5, condition: 1, city: 1, description: 1 };
const FUZZY_FACTOR = 0.5;
const PREFIX_FACTOR = 0.8;
const FUZZY_MIN_RATIO = 0.8;
const SYNONYM_BONUS = 1;

const STOPWORDS = new Set([
  'a', 'au', 'aux', 'de', 'des', 'du', 'en', 'et', 'la', 'le', 'les', 'l', 'd', 'un', 'une',
  'pour', 'avec', 'sans', 'sur', 'taille', 't', 'pointure', 'the', 'of',
]);

const SYNONYMS = {
  Robes: ['robe', 'combinaison'],
  Chaussures: ['chaussure', 'basket', 'sneaker', 'botte', 'bottine', 'escarpin', 'sandale', 'mocassin', 'tennis'],
  Vestes: ['veste', 'blouson', 'manteau', 'doudoune', 'parka', 'blazer', 'perfecto'],
  Hauts: ['haut', 'top', 'tshirt', 'tee', 'chemise', 'chemisier', 'pull', 'sweat', 'debardeur', 'gilet'],
  Pantalons: ['pantalon', 'jean', 'short', 'chino', 'legging', 'jogging'],
  Sacs: ['sac', 'pochette', 'cabas', 'besace', 'cartable', 'valise'],
  Accessoires: ['accessoire', 'ceinture', 'casquette', 'bonnet', 'echarpe', 'lunette', 'chapeau', 'foulard'],
  Sport: ['sport', 'survetement', 'maillot', 'running', 'fitness'],
  Bijoux: ['bijou', 'collier', 'bague', 'bracelet', 'boucle', 'montre'],
};

const normalize = (text) =>
  (text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’-]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const stem = (word) => (word.length > 3 && /[sx]$/.test(word) ? word.slice(0, -1) : word);

const tokenize = (text) =>
  normalize(text)
    .split(' ')
    .filter((w) => w && !STOPWORDS.has(w))
    .map(stem);

const SYNONYM_INDEX = Object.fromEntries(
  Object.entries(SYNONYMS).flatMap(([cat, words]) => words.map((w) => [stem(normalize(w)), cat])),
);

// Similarité de Ratcliff/Obershelp, comme difflib.SequenceMatcher.ratio() en Python
function similarity(a, b) {
  const matches = (s1, s2) => {
    if (!s1 || !s2) return 0;
    let best = 0, i1 = 0, i2 = 0;
    for (let i = 0; i < s1.length; i++) {
      for (let j = 0; j < s2.length; j++) {
        let k = 0;
        while (s1[i + k] && s1[i + k] === s2[j + k]) k++;
        if (k > best) [best, i1, i2] = [k, i, j];
      }
    }
    if (!best) return 0;
    return best + matches(s1.slice(0, i1), s2.slice(0, i2)) + matches(s1.slice(i1 + best), s2.slice(i2 + best));
  };
  return (2 * matches(a, b)) / (a.length + b.length);
}

function match(token, words) {
  let best = 0;
  for (const w of words) {
    if (w === token) return 1;
    if (token.length >= 2 && w.startsWith(token)) best = Math.max(best, PREFIX_FACTOR);
    else if (token.length >= 4 && w.length >= 4 && Math.abs(w.length - token.length) <= 2
      && similarity(token, w) >= FUZZY_MIN_RATIO) best = Math.max(best, FUZZY_FACTOR);
  }
  return best;
}

function scoreListing(tokens, listing) {
  const fields = Object.keys(WEIGHTS).map((f) => [f, tokenize(listing[f])]);
  let matched = 0, total = 0;
  for (const token of tokens) {
    let best = Math.max(...fields.map(([f, words]) => WEIGHTS[f] * match(token, words)));
    if (SYNONYM_INDEX[token] === listing.category) {
      best = Math.max(best, WEIGHTS.category) + (best > 0 ? SYNONYM_BONUS : 0);
    }
    if (best > 0) {
      matched += 1;
      total += best;
    }
  }
  return [matched, total];
}

// Garde les annonces qui contiennent au moins un mot, triées par pertinence
export function rank(listings, q) {
  const tokens = [...new Set(tokenize(q))];
  if (!tokens.length) return listings;
  let scored = listings
    .map((item) => {
      const [matched, total] = scoreListing(tokens, item);
      return { matched, total, item: { ...item, score: Math.round(total * 100) / 100 } };
    })
    .filter((s) => s.matched)
    .sort((a, b) => b.matched - a.matched || b.total - a.total || b.item.createdAt.localeCompare(a.item.createdAt));
  if (scored[0]?.matched === tokens.length) scored = scored.filter((s) => s.matched === tokens.length);
  return scored.map((s) => s.item);
}
