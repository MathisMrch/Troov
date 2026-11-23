import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

// Barre de recherche de la navigation : envoie vers /recherche?q=...
// Sur la page de recherche, les filtres déjà choisis (catégorie, prix, tri) sont conservés.
export default function SearchBar({ className = '' }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const onSearchPage = pathname === '/recherche';
  const [value, setValue] = useState(onSearchPage ? params.get('q') ?? '' : '');

  // Garde le champ synchronisé avec l'URL (retour arrière, lien partagé…)
  useEffect(() => {
    setValue(onSearchPage ? params.get('q') ?? '' : '');
  }, [onSearchPage, params]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(onSearchPage ? params : undefined);
    if (value.trim()) next.set('q', value.trim());
    else next.delete('q');
    navigate(`/recherche?${next}`);
  };

  return (
    <form role="search" onSubmit={handleSubmit} className={`relative ${className}`}>
      <svg
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.45 4.39l3.08 3.08a.75.75 0 1 1-1.06 1.06l-3.08-3.08A7 7 0 0 1 2 9Z"
          clipRule="evenodd"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Rechercher une robe, des baskets Nike…"
        aria-label="Rechercher des annonces"
        className="input pl-9"
      />
    </form>
  );
}
