# Serveur NAS : statistiques anonymes et formulaire de contact

Petit service (Node, SQLite, aucune dépendance) à héberger sur votre NAS dans un conteneur Docker, relié à Internet par un **tunnel sortant Cloudflare**. Le site (statique) reste sur GitHub Pages ; seuls les envois de statistiques (facultatifs) et le formulaire de contact atteignent votre NAS.

```
Visiteur ──► site GitHub Pages (statique)
   │
   └─ statistiques / formulaire ──► https://api.votre-domaine ──► Cloudflare ──(tunnel sortant)──► NAS : conteneur api (SQLite)
```

L'adresse IP de votre domicile n'est jamais exposée : le NAS n'ouvre aucun port, c'est lui qui se connecte à Cloudflare.

## Ce que le service conserve, et ne conserve pas

- **Conservé :** compteurs (question × réponse, série atteinte, envois par jour) ; messages du formulaire, supprimés automatiquement après `RETENTION_DAYS` jours (365 par défaut).
- **Jamais conservé :** adresses IP, identifiants, en-têtes, journaux de requêtes. Le conteneur `api` n'écrit aucun journal (`logging: none`), le système de fichiers est en lecture seule hors `./data`.
- **Limitation des abus :** une empreinte salée de l'adresse est gardée en mémoire vive (jamais sur disque), vidée toutes les heures, sel renouvelé chaque jour.
- **Réponses brouillées :** le navigateur remplace au hasard une partie des réponses (`STATS_P`, 25 % par défaut) ; le tableau de bord redresse les totaux.

Cloudflare voit les requêtes en transit (comme tout intermédiaire). Ne pas activer de journaux Logpush ni d'analyse web sur ce domaine.

## Prérequis

1. Un **nom de domaine** (avec protection des données personnelles « WHOIS privacy »), ajouté à un compte **Cloudflare** dédié (gratuit).
2. Un **NAS Synology DS720+** sous DSM 7.2 ou plus, avec le paquet **Container Manager** (Centre de paquets). Le DS720+ est un processeur Intel x86-64 : l'image `node:22-alpine` et `cloudflare/cloudflared` fonctionnent sans adaptation.
3. Un second compte e-mail **anonyme** (facultatif) pour recevoir des notifications.

## Installation sur le Synology

1. **Dossier du projet.** Dans File Station, créez `docker/elysee2027`. Copiez-y le contenu de `tools/nas-server` (`server.js`, `Dockerfile`, `docker-compose.yml`, `.env.example`). Créez un sous-dossier `data`.
2. **Identifiants de l'utilisateur.** Activez SSH (Panneau de configuration > Terminal), connectez-vous et lancez `id` : notez `uid` et `gid`. Donnez à cet utilisateur les droits d'écriture sur `docker/elysee2027/data` (clic droit > Propriétés > Permissions). Désactivez ensuite SSH si vous n'en avez plus besoin.
3. **Configuration.** Copiez `.env.example` en `.env` (par File Station ou SSH) et renseignez :
   - `ALLOWED_ORIGIN` : l'adresse de votre site (`https://elysee-2027.github.io`, sans chemin) ;
   - `ADMIN_TOKEN` : 32 caractères aléatoires ou plus (`openssl rand -hex 24`) ;
   - `PUID` / `PGID` : les valeurs relevées à l'étape 2.
4. **Tunnel Cloudflare.** Dans le tableau de bord Cloudflare : *Zero Trust > Réseaux > Tunnels > Créer un tunnel > Cloudflared*. Choisissez l'installation **Docker**, copiez uniquement le **jeton** (la longue chaîne après `--token`) dans `TUNNEL_TOKEN` du fichier `.env`. Dans l'onglet *Nom d'hôte public* du tunnel, ajoutez `api.votre-domaine` → type **HTTP**, URL **`api:8080`**.
5. **Démarrage.** Dans Container Manager : *Projet > Créer* ; nom `elysee2027`, chemin `docker/elysee2027`, source « utiliser le fichier docker-compose.yml existant ». Cochez le démarrage. Les deux conteneurs `api` et `tunnel` doivent passer à l'état « en cours d'exécution » (l'API « sain »).
6. **Vérification.** Depuis n'importe quel navigateur : `https://api.votre-domaine/health` doit afficher `ok`.
7. **Site.** Dans la copie du site (`js/config.js`), renseignez `STATS_URL: 'https://api.votre-domaine'` et `CONTACT_URL: 'https://api.votre-domaine/contact'`, puis republiez. Le script `tools/make-clean-copy.sh` le fait pour vous.

## Règles de sécurité à appliquer sur Cloudflare

- *Sécurité > WAF > Règles de limitation de débit* : par exemple 30 requêtes par minute et par adresse sur `api.votre-domaine/*`. Cloudflare applique la limite sans que votre serveur ne stocke d'adresse.
- *SSL/TLS* : mode **Complet** (le tunnel chiffre déjà la liaison).
- Ne pas activer *Web Analytics* ni de journaux sur ce domaine.
- Optionnel : *Zero Trust > Access* devant `/admin/*` pour exiger une authentification supplémentaire avant même le jeton.

## Sur le NAS

- Mettez DSM et Container Manager à jour. Activez la double authentification sur le compte administrateur.
- L'image `cloudflared` étant publique et fréquemment mise à jour, relancez le projet de temps en temps (« Reconstruire ») pour récupérer les correctifs.
- **Sauvegarde :** copiez régulièrement `data/elysee.db` (Hyper Backup, chiffré). Elle contient les messages du formulaire.
- Si le NAS est éteint ou hors ligne : le site continue de fonctionner ; le formulaire affiche « L'envoi a échoué, réessayez plus tard » et les statistiques de cette période sont perdues.

## Lire les résultats et les messages

Servez le dépôt en local (`python3 -m http.server` à la racine) et ouvrez `/tools/nas-server/dashboard.html` : renseignez `https://api.votre-domaine`, le jeton et la valeur de `STATS_P` du site. Le tableau affiche les statistiques redressées, les questions à reformuler, l'abandon par série et les messages (marquer comme lu, supprimer). Le jeton reste en mémoire dans la page.

Notifications (facultatif) : renseignez `NTFY_URL` avec un canal [ntfy](https://ntfy.sh) au nom long et aléatoire. Le serveur n'envoie que « Nouveau message : <objet> », jamais le contenu ni l'adresse.

## Règles d'usage (à ne pas contourner)

1. **Ne jamais publier ni transmettre** les statistiques (réseaux sociaux, presse, clients, employeur) : un résultat diffusé relèverait de la loi sur les sondages et de vos engagements publics.
2. **Ne jamais croiser** ces compteurs avec d'autres données.
3. **Répondre aux messages** depuis une adresse dédiée ; supprimer les messages traités.
4. Si vous modifiez ce dispositif, mettre à jour avant l'activation la page « Mentions légales et confidentialité » et l'avertissement.
5. Pour des données d'opinion, une relecture par un spécialiste du RGPD est recommandée avant l'ouverture au public.

## Tests

```bash
node --disable-warning=ExperimentalWarning tools/nas-server/test.mjs
```

Les tests couvrent la validation, la limitation des abus, l'absence d'adresse IP dans la base, la suppression automatique des messages, l'administration protégée par jeton et l'exactitude du redressement. L'image Docker elle-même n'a pas pu être construite dans l'environnement de développement (pas de démon Docker) : le premier démarrage sur le NAS est le premier test réel du conteneur.
