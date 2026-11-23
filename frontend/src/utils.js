// Nom affiché d'un utilisateur : prénom (+ nom) si renseigné, sinon le nom d'utilisateur
export const displayName = (user, { full = false } = {}) => {
  const name = full ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : user.firstName;
  return name || user.username;
};
