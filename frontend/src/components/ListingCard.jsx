import { Link } from 'react-router-dom';

const CATEGORY_STYLES = {
  Informatique: 'from-sky-100 to-indigo-100 text-indigo-700',
  Maison: 'from-amber-50 to-orange-100 text-orange-700',
  Sport: 'from-emerald-50 to-green-100 text-green-700',
  Mode: 'from-pink-50 to-rose-100 text-rose-700',
  Livres: 'from-stone-100 to-yellow-100 text-yellow-800',
  Musique: 'from-violet-50 to-purple-100 text-purple-700',
};

const formatPrice = (price) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);

export default function ListingCard({ listing }) {
  const style = CATEGORY_STYLES[listing.category] ?? 'from-slate-100 to-slate-200 text-slate-600';

  return (
    <article className="card flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      {/* Emplacement de l'image, remplacée plus tard par listing.images[0] */}
      <div className={`flex h-36 items-center justify-center bg-gradient-to-br ${style}`}>
        <span className="text-sm font-semibold tracking-wide uppercase">{listing.category}</span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-slate-900">{listing.title}</h3>
          <span className="shrink-0 font-semibold text-indigo-600">{formatPrice(listing.price)}</span>
        </div>
        <p className="line-clamp-2 text-sm text-slate-600">{listing.description}</p>

        {listing.reason && (
          <p className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
            {listing.reason}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-slate-500">
          <span>{listing.condition}{listing.city && ` · ${listing.city}`}</span>
          {listing.seller && (
            <Link to={`/profil/${listing.seller._id}`} className="font-medium hover:text-indigo-600">
              @{listing.seller.username}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
