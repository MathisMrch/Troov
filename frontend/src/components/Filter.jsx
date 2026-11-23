import { useEffect, useState } from 'react';

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Pertinence' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'recent', label: 'Plus récentes' },
];

// Filtres de la recherche : catégorie, fourchette de prix, tri.
// value = { category, minPrice, maxPrice, sort } (chaînes, comme dans l'URL)
export default function Filter({ categories, value, onChange, onReset }) {
  // Les prix sont appliqués après une courte pause pour ne pas relancer la recherche à chaque touche
  const [prices, setPrices] = useState({ minPrice: value.minPrice, maxPrice: value.maxPrice });

  useEffect(() => {
    setPrices({ minPrice: value.minPrice, maxPrice: value.maxPrice });
  }, [value.minPrice, value.maxPrice]);

  useEffect(() => {
    if (prices.minPrice === value.minPrice && prices.maxPrice === value.maxPrice) return undefined;
    const timer = setTimeout(() => onChange(prices), 400);
    return () => clearTimeout(timer);
  }, [prices, value.minPrice, value.maxPrice, onChange]);

  const hasFilters = value.category || value.minPrice || value.maxPrice || value.sort !== 'relevance';

  return (
    <div className="card flex flex-wrap items-end gap-4 p-4">
      <div className="min-w-40 flex-1">
        <label htmlFor="filter-category" className="label">Catégorie</label>
        <select
          id="filter-category"
          value={value.category}
          onChange={(e) => onChange({ category: e.target.value })}
          className="input"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <fieldset className="flex items-end gap-2">
        <legend className="label">Prix (€)</legend>
        <input
          type="number"
          min="0"
          inputMode="decimal"
          aria-label="Prix minimum"
          placeholder="Min"
          value={prices.minPrice}
          onChange={(e) => setPrices({ ...prices, minPrice: e.target.value })}
          className="input w-24"
        />
        <span className="pb-2 text-slate-400">–</span>
        <input
          type="number"
          min="0"
          inputMode="decimal"
          aria-label="Prix maximum"
          placeholder="Max"
          value={prices.maxPrice}
          onChange={(e) => setPrices({ ...prices, maxPrice: e.target.value })}
          className="input w-24"
        />
      </fieldset>

      <div className="min-w-40">
        <label htmlFor="filter-sort" className="label">Trier par</label>
        <select
          id="filter-sort"
          value={value.sort}
          onChange={(e) => onChange({ sort: e.target.value })}
          className="input"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button type="button" onClick={onReset} className="btn text-slate-600 hover:bg-slate-100">
          Réinitialiser
        </button>
      )}
    </div>
  );
}
