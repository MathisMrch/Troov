import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCategories } from '../api/categories';
import { searchListings } from '../api/listings';
import Filter from '../components/Filter';
import ListingGrid from '../components/ListingGrid';
import Spinner from '../components/Spinner';

const FILTER_KEYS = ['category', 'minPrice', 'maxPrice', 'sort'];

// Page /recherche : l'état de la recherche vit dans l'URL (?q=&category=&minPrice=&maxPrice=&sort=)
export default function Search() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const q = params.get('q') ?? '';
  const filters = {
    category: params.get('category') ?? '',
    minPrice: params.get('minPrice') ?? '',
    maxPrice: params.get('maxPrice') ?? '',
    sort: params.get('sort') ?? 'relevance',
  };
  const key = params.toString();

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let cancelled = false; // ignore la réponse d'une recherche déjà remplacée par une autre
    setResults(null);
    setError('');
    searchListings({ q, ...filters })
      .then((items) => !cancelled && setResults(items))
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setResults([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const updateFilters = useCallback(
    (changes) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(changes)) {
            if (v === '' || v === undefined || (k === 'sort' && v === 'relevance')) next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const resetFilters = () =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      FILTER_KEYS.forEach((k) => next.delete(k));
      return next;
    });

  const categoryName = categories.find((c) => String(c.id) === filters.category)?.name;
  const title = q ? `Résultats pour « ${q} »` : categoryName ?? 'Toutes les annonces';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {results && (
          <p className="text-sm text-slate-500">
            {results.length} annonce{results.length > 1 ? 's' : ''}
            {q && categoryName && ` dans ${categoryName}`}
          </p>
        )}
      </div>

      <Filter categories={categories} value={filters} onChange={updateFilters} onReset={resetFilters} />

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {results ? (
        <ListingGrid
          listings={results}
          emptyMessage="Aucune annonce ne correspond à votre recherche. Essayez d’autres mots ou retirez des filtres."
        />
      ) : (
        <Spinner />
      )}
    </div>
  );
}
