import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecentListings, getRecommendations } from '../api/listings';
import ListingGrid from '../components/ListingGrid';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';

function Section({ title, subtitle, children }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Hero() {
  return (
    <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-12 text-white sm:px-12">
      <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl">
        Achetez et vendez entre personnes de confiance
      </h1>
      <p className="mt-3 max-w-xl text-indigo-100">
        Suivez des vendeurs, enregistrez vos annonces favorites et recevez des recommandations
        basées sur vos centres d’intérêt et votre réseau.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/inscription" className="btn bg-white text-indigo-700 hover:bg-indigo-50">
          Créer un compte
        </Link>
        <Link to="/connexion" className="btn border border-white/40 text-white hover:bg-white/10">
          Se connecter
        </Link>
      </div>
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [recent, setRecent] = useState(null);
  const [recommended, setRecommended] = useState(null);

  useEffect(() => {
    getRecentListings().then(setRecent).catch(() => setRecent([]));
  }, []);

  useEffect(() => {
    if (!user) {
      setRecommended(null);
      return;
    }
    getRecommendations().then(setRecommended).catch(() => setRecommended([]));
  }, [user]);

  return (
    <div className="space-y-12">
      {user ? (
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bonjour {user.firstName} 👋</h1>
          <p className="text-slate-500">Voici ce qui pourrait vous intéresser aujourd’hui.</p>
        </div>
      ) : (
        <Hero />
      )}

      {user && (
        <Section
          title="Recommandé pour vous"
          subtitle="D’après vos centres d’intérêt et les vendeurs que vous suivez"
        >
          {recommended ? (
            <ListingGrid
              listings={recommended}
              emptyMessage="Suivez des vendeurs ou ajoutez des centres d’intérêt pour recevoir des recommandations."
            />
          ) : (
            <Spinner />
          )}
        </Section>
      )}

      <Section title="Annonces récentes">
        {recent ? <ListingGrid listings={recent} /> : <Spinner />}
      </Section>
    </div>
  );
}
