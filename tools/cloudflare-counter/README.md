# Compteur global sans serveur (Cloudflare Worker + D1)

Alternative au serveur NAS : le Worker est servi sur `api.elysee-2027.win` (domaine géré par Cloudflare), sans adresse `*.workers.dev`, donc sans sous-domaine de compte visible. Il ne fait qu'une chose : compter les simulations (`GET /counter` → `{"total": n}`, `POST /counter` → +1). Aucune réponse, aucun identifiant, aucune adresse IP stockée. L'incrément est atomique (une seule requête SQL), contrairement à KV.

Si le site est servi sur un autre domaine que ceux de `ALLOWED_ORIGIN`, ajoutez-le dans `wrangler.toml`.

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

`wrangler deploy` crée l'enregistrement DNS `api.elysee-2027.win` et le certificat (le domaine doit être sur le même compte Cloudflare). Compter une à deux minutes avant que l'adresse réponde.

Vérification :

```bash
curl https://api.elysee-2027.win/counter
```

Doit répondre `{"total":0}`.

## Branchement sur le site

Dans `js/config.js` :

```js
COUNTER_URL: 'https://api.elysee-2027.win/counter',
```

puis republier. Le pied de page affiche « N simulations ». Pour la copie publique : `COUNTER=https://api.elysee-2027.win/counter NOGIT=1 tools/make-clean-copy.sh …` renseigne uniquement `COUNTER_URL` (sans activer statistiques ni contact).

## Remettre à zéro (tests avant lancement)

```bash
npx wrangler d1 execute elysee-compteur --remote --command "UPDATE counter SET n = 0"
```

## Limites

- Le nombre compte des graphes affichés (une fois par appareil), pas des personnes distinctes ; la limite de débit (10/min/adresse) n'empêche pas un script de gonfler le chiffre. Ne le présentez pas comme un nombre d'utilisateurs.
- Cloudflare traite les requêtes (adresse IP incluse, dans ses journaux) : à mentionner dans les mentions légales comme pour tout hébergeur.
