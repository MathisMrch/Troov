import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              T.
            </span>
            <span className="text-lg font-semibold text-slate-900">Troov</span>
          </Link>
          <NavLink to="/" end className={(state) => `${navLinkClass(state)} hidden sm:inline`}>
            Accueil
          </NavLink>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              to={`/profil/${user._id}`}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100"
            >
              <Avatar user={user} size="sm" />
              <span className="hidden text-sm font-medium text-slate-700 sm:inline">
                {user.firstName}
              </span>
            </Link>
            <button type="button" onClick={handleLogout} className="btn-secondary">
              Déconnexion
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/connexion" className="btn text-slate-700 hover:bg-slate-100">
              Connexion
            </Link>
            <Link to="/inscription" className="btn-primary">
              S’inscrire
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
