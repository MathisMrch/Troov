import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { followUser, getUser, getUserFavorites, getUserListings, unfollowUser } from '../api/users';
import Avatar from '../components/Avatar';
import ListingGrid from '../components/ListingGrid';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import NotFound from './NotFound';

const TABS = [
  { key: 'listings', label: 'Annonces' },
  { key: 'favorites', label: 'Favoris' },
];

function Stat({ value, label }) {
  return (
    <div className="text-center sm:text-left">
      <div className="text-lg font-semibold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

export default function Profile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState({ listings: null, favorites: null });
  const [tab, setTab] = useState('listings');
  const [notFound, setNotFound] = useState(false);
  const [followPending, setFollowPending] = useState(false);

  const isMe = me?._id === id;

  useEffect(() => {
    setProfile(null);
    setNotFound(false);
    setTab('listings');
    setListings({ listings: null, favorites: null });

    getUser(id)
      .then(setProfile)
      .catch((err) => err.status === 404 && setNotFound(true));
    Promise.all([getUserListings(id), getUserFavorites(id)]).then(([own, favorites]) =>
      setListings({ listings: own, favorites }),
    );
  }, [id]);

  const toggleFollow = async () => {
    setFollowPending(true);
    try {
      if (profile.isFollowing) await unfollowUser(id);
      else await followUser(id);
      setProfile(await getUser(id));
    } finally {
      setFollowPending(false);
    }
  };

  if (notFound) return <NotFound />;
  if (!profile) return <Spinner />;

  const memberSince = new Date(profile.createdAt).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-8">
      <section className="card p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <Avatar user={profile} size="lg" />

          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {profile.firstName} {profile.lastName}
                </h1>
                <p className="text-sm text-slate-500">
                  @{profile.username}
                  {profile.city && ` · ${profile.city}`} · Membre depuis {memberSince}
                </p>
              </div>

              {isMe ? (
                <button type="button" className="btn-secondary" disabled title="Bientôt disponible">
                  Modifier le profil
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleFollow}
                  disabled={followPending}
                  className={profile.isFollowing ? 'btn-secondary' : 'btn-primary'}
                >
                  {profile.isFollowing ? 'Abonné' : 'Suivre'}
                </button>
              )}
            </div>

            {profile.bio && <p className="text-slate-700">{profile.bio}</p>}

            {profile.interests?.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                {profile.interests.map((interest) => (
                  <span key={interest} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {interest}
                  </span>
                ))}
              </div>
            )}

            <div className="flex justify-center gap-8 pt-2 sm:justify-start">
              <Stat value={profile.listingsCount} label="Annonces" />
              <Stat value={profile.followersCount} label="Abonnés" />
              <Stat value={profile.followingCount} label="Abonnements" />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex gap-6 border-b border-slate-200">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`-mb-px cursor-pointer border-b-2 pb-3 text-sm font-medium transition-colors ${
                tab === key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
              {listings[key] && <span className="ml-1 text-slate-400">({listings[key].length})</span>}
            </button>
          ))}
        </div>

        {listings[tab] ? (
          <ListingGrid
            listings={listings[tab]}
            emptyMessage={tab === 'listings' ? 'Aucune annonce publiée.' : 'Aucun favori pour le moment.'}
          />
        ) : (
          <Spinner />
        )}
      </section>
    </div>
  );
}
