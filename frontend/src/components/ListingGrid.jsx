import ListingCard from './ListingCard';

export default function ListingGrid({ listings, emptyMessage = 'Aucune annonce pour le moment.' }) {
  if (listings.length === 0) {
    return (
      <p className="card px-6 py-10 text-center text-sm text-slate-500">{emptyMessage}</p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {listings.map((listing) => (
        <ListingCard key={listing._id} listing={listing} />
      ))}
    </div>
  );
}
