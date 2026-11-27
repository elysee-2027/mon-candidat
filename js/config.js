// Configuration du site.
// COUNTER_URL : adresse d'un service de comptage (facultatif).
//   GET  -> renvoie {"total": 1234}
//   POST -> incrémente le total et renvoie le même format
// Laisser vide pour masquer le compteur. Aucune réponse de l'utilisateur n'est transmise.
//
// CONTACT_URL : adresse du service qui reçoit le formulaire de contact (facultatif).
//   Avec le serveur NAS : 'https://api.votre-domaine.example/contact'. Le formulaire envoie un POST JSON
//   {objet, question, message, email, page}. Votre adresse électronique n'apparaît jamais dans le site.
//   Laisser vide tant que le serveur n'est pas configuré : le formulaire l'indique.
//
// ISSUES_URL : sans serveur de contact, adresse des tickets du dépôt (ex. 'https://github.com/elysee-2027/mon-candidat/issues').
//   Le formulaire ouvre alors un ticket GitHub prérempli : public, et lié au compte GitHub de la personne. Ignoré si CONTACT_URL est renseigné.
//
// CONTACT_SERVICE : précision affichée dans la page de confidentialité (ex. 'relayé par Cloudflare').
// HOST_INFO : coordonnées de l'hébergeur affichées dans les mentions légales (GitHub par défaut).
// LICENCE : licence du code et de la méthode (ex. 'MIT pour le code, CC BY-SA 4.0 pour les données').
// STATS_URL : adresse de votre serveur (voir tools/nas-server), par exemple 'https://api.votre-domaine.example'. Vide = désactivé :
//   aucune case de consentement n'est alors affichée et rien n'est envoyé.
// STATS_P : part des réponses remplacées au hasard avant envoi (0.25 par défaut).
// TODAY : (tests uniquement) date forcée au format AAAA-MM-JJ pour simuler l'expiration des questions d'actualité.
window.E2027_CONFIG = {
  STATS_URL: '',
  STATS_P: 0.25,
  COUNTER_URL: '',
  CONTACT_URL: '',
  ISSUES_URL: 'https://github.com/elysee-2027/mon-candidat/issues',
  CONTACT_SERVICE: '',
  HOST_INFO: '',
  LICENCE: ''
};
