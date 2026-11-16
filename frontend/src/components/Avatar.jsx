const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-base',
  lg: 'h-24 w-24 text-3xl',
};

// Avatar à initiales (en attendant l'upload de photos de profil)
export default function Avatar({ user, size = 'md' }) {
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700 ${SIZES[size]}`}
      aria-hidden="true"
    >
      {initials || '?'}
    </span>
  );
}
