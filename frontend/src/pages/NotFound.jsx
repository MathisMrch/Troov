import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-sm font-semibold text-indigo-600">404</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Page introuvable</h1>
      <p className="mt-2 text-slate-500">La page que vous cherchez n’existe pas ou a été déplacée.</p>
      <Link to="/" className="btn-primary mt-6">
        Retour à l’accueil
      </Link>
    </div>
  );
}
