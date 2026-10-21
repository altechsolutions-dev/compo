export function authErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "Adresse e-mail ou mot de passe incorrect.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirmez votre adresse e-mail avant de vous connecter.";
  }
  if (normalized.includes("user already registered")) {
    return "Un compte existe déjà avec ces informations. Connectez-vous.";
  }
  if (normalized.includes("password should be at least")) {
    return "Choisissez un mot de passe plus long.";
  }
  if (
    normalized.includes("email provider is not enabled") ||
    normalized.includes("email provider is disabled")
  ) {
    return "La connexion par e-mail n’est pas activée dans Supabase.";
  }
  if (normalized.includes("error sending confirmation email")) {
    return "Supabase n’a pas pu envoyer l’e-mail de confirmation. Vérifiez la configuration SMTP du projet.";
  }
  if (normalized.includes("invalid email")) {
    return "Cette adresse e-mail n’est pas valide.";
  }
  if (
    normalized.includes("invalid otp") ||
    normalized.includes("otp expired") ||
    normalized.includes("token has expired")
  ) {
    return "Ce code a expiré ou est incorrect. Demandez un nouveau code puis réessayez.";
  }
  if (
    normalized.includes("email rate limit") ||
    normalized.includes("too many requests")
  ) {
    return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
  }
  if (normalized.includes("failed to fetch")) {
    return "Impossible de joindre le service de compte. Vérifiez votre connexion puis réessayez.";
  }
  if (normalized.includes("user not found")) {
    return "Aucun compte ne correspond à cette adresse e-mail.";
  }
  return message
    ? `Le service de compte a renvoyé cette erreur : ${message}`
    : "L’opération a échoué. Vérifiez vos informations et réessayez.";
}
