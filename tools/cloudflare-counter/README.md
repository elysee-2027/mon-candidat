# Compteur global sans serveur (Cloudflare Worker + D1)

Alternative au serveur NAS quand on n'a pas de nom de domaine : le Worker est servi sur une adresse `*.workers.dev` gratuite. Il ne fait qu'une chose : compter les simulations (`GET /counter` → `{"total": n}`, `POST /counter` → +1). Aucune réponse, aucun identifiant, aucune adresse IP stockée. L'incrément est atomique (une seule requête SQL), contrairement à KV.

Offre gratuite : largement suffisante (100 000 requêtes/jour pour le Worker, 100 000 écritures/jour pour D1).

## Mise en place

Prérequis : un compte Cloudflare (gratuit) et Node.js.

```bash
cd tools/cloudflare-counter
npx wrangler login
npx wrangler d1 create elysee-compteur
```

Recopiez le `database_id` affiché dans `wrangler.toml`, vérifiez `ALLOWED_ORIGIN` (adresse du site, sans chemin ni `/` final), puis :

```bash
npx wrangler d1 execute elysee-compteur --remote --file=schema.sql
npx wrangler deploy
```

`wrangler deploy` affiche l'adresse du Worker, du type `https://elysee-compteur.<votre-sous-domaine>.workers.dev`.

Vérification :

```bash
curl https://elysee-compteur.<sous-domaine>.workers.dev/counter
```

Doit répondre `{"total":0}`.

## Branchement sur le site

Dans `js/config.js` :

```js
COUNTER_URL: 'https://elysee-compteur.<sous-domaine>.workers.dev/counter',
```

puis republier. Le pied de page affiche « N simulations ». Pour la copie publique, `tools/make-clean-copy.sh` ne renseigne `COUNTER_URL` que pour l'API du NAS : ajoutez la ligne à la main dans la copie.

## Remettre à zéro (tests avant lancement)

```bash
npx wrangler d1 execute elysee-compteur --remote --command "UPDATE counter SET n = 0"
```

## Limites

- Le nombre compte des graphes affichés (une fois par appareil), pas des personnes distinctes ; la limite de débit (10/min/adresse) n'empêche pas un script de gonfler le chiffre. Ne le présentez pas comme un nombre d'utilisateurs.
- Cloudflare traite les requêtes (adresse IP incluse, dans ses journaux) : à mentionner dans les mentions légales comme pour tout hébergeur.
