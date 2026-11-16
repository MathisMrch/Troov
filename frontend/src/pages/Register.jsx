import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../constants';
import { useAuth } from '../context/AuthContext';
import AuthCard, { FormError } from '../components/AuthCard';

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  interests: [],
};

function validate(form) {
  if (!/^[a-z0-9_]{3,20}$/.test(form.username)) {
    return 'Le nom d’utilisateur doit contenir 3 à 20 caractères (minuscules, chiffres, _).';
  }
  if (form.password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (form.password !== form.confirmPassword) return 'Les mots de passe ne correspondent pas.';
  return '';
}

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const toggleInterest = (category) =>
    setForm({
      ...form,
      interests: form.interests.includes(category)
        ? form.interests.filter((c) => c !== category)
        : [...form.interests, category],
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const { confirmPassword: _confirm, ...payload } = form;
      const newUser = await register(payload);
      navigate(`/profil/${newUser._id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Créer un compte"
      subtitle="Rejoignez la communauté Troov."
      footer={
        <>
          Déjà inscrit ?{' '}
          <Link to="/connexion" className="font-medium text-indigo-600 hover:underline">
            Connectez-vous
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError message={error} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="label">Prénom</label>
            <input id="firstName" name="firstName" required value={form.firstName} onChange={handleChange} className="input" autoComplete="given-name" />
          </div>
          <div>
            <label htmlFor="lastName" className="label">Nom</label>
            <input id="lastName" name="lastName" required value={form.lastName} onChange={handleChange} className="input" autoComplete="family-name" />
          </div>
        </div>

        <div>
          <label htmlFor="username" className="label">Nom d’utilisateur</label>
          <input id="username" name="username" required value={form.username} onChange={handleChange} className="input" placeholder="ex. jean_dupont" autoComplete="username" />
        </div>

        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} className="input" placeholder="vous@exemple.fr" autoComplete="email" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="label">Mot de passe</label>
            <input id="password" name="password" type="password" required value={form.password} onChange={handleChange} className="input" autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="label">Confirmation</label>
            <input id="confirmPassword" name="confirmPassword" type="password" required value={form.confirmPassword} onChange={handleChange} className="input" autoComplete="new-password" />
          </div>
        </div>

        {/* Centres d'intérêt -> relations INTERESTED_IN dans Neo4j */}
        <fieldset>
          <legend className="label">Centres d’intérêt <span className="font-normal text-slate-400">(facultatif)</span></legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => {
              const selected = form.interests.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleInterest(category)}
                  aria-pressed={selected}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    selected
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
    </AuthCard>
  );
}
