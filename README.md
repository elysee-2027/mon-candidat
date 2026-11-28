# Élysée 2027

Outil de positionnement face aux candidats déclarés à la présidentielle de 2027. Site statique, sans serveur ni compte : les réponses restent dans le navigateur.

## Lancer en local

```bash
python3 -m http.server 8765
```

Puis ouvrir http://localhost:8765. Un serveur est nécessaire, car les données sont chargées par `fetch`.

## Données (`data/`)

| Fichier | Contenu |
|---|---|
| `axes.json` | 9 axes (thèmes) et leurs deux pôles |
| `questions.json` | affirmations neutres ; `sens` indique vers quel pôle pousse un accord (+1 : second pôle). `axe: null` + `theme` = question hors graphe (comptée dans la proximité, sans effet sur les pistes) ; l'ordre de présentation est calculé par l'application |
| `candidats.json` | candidats clairement déclarés, parti, couleur, date et source de déclaration |
| `candidats_en_attente.json` | personnes retirées tant que leur candidature n'est pas clairement déclarée (leurs positions restent dans `tools/gen.py`, liste `EXCLUS`) |
| `positions.json` | une citation sourcée par couple question/candidat, avec note de -2 à +2, niveau de source et statut |
| `version.json` | version publiée et historique |

Règles de pondération des sources : `programme` > `candidat` > `proche`.

## Mise à jour

1. Une veille (manuelle ou par IA) propose des ajouts : nouvelles déclarations, programmes, candidats.
2. `tools/crawl.py` télécharge les pages d'un programme dans `corpus/<candidat>/` ; `tools/c.py` recherche des passages ; `tools/gen.py` vérifie chaque citation mot pour mot dans le corpus avant d'écrire `positions.json`.
3. Un humain relit les propositions avec `tools/relecture.html`, puis `tools/apply_relecture.py` passe leur `statut` de `propose` à `valide` (voir « Relecture des positions »).
4. Incrémenter `data/version.json` (version, date, historique) : modifier les questions change la comparabilité des résultats. Puis lancer `python3 tools/set_asset_version.py` : GitHub Pages garde js/ et css/ en cache 10 minutes, ce script force le rechargement.

Le dossier `corpus/` n'est pas versionné.

## Compteur de simulations

`js/config.js` : renseigner `COUNTER_URL` avec un service qui répond `{"total": n}` en GET et incrémente en POST. Vide, le compteur est masqué. Aucune réponse n'est transmise.

## Questions d'actualité

Quelques questions hors graphe portent sur un sujet récent qui a fait réagir des candidats de camps différents. Chacune a une date `jusqu_au` dans `tools/build_questions.py` (dictionnaire `ACTU`) : passée cette date, le site ne la pose plus. Avant chaque mise à jour, lancer `python3 tools/check_actualite.py` : il signale les questions échues ou proches de l'échéance, moins de trois questions actives, ou des positions trop peu nombreuses / d'un seul camp. Remplacer une question = l'ajouter dans `build_questions.py` et `gen.py` (positions citées et vérifiées), puis relancer les deux scripts.

## Relecture des positions

Ouvrir `tools/relecture.html` (serveur local : `python3 -m http.server`, puis `/tools/relecture.html`). La page présente les questions une à une : énoncé et contexte à valider ou reformuler, puis chaque position citée (citation, niveau de source, lien) à valider, corriger (nouveau score) ou rejeter. Les décisions restent dans le navigateur ; « Exporter » produit `relecture.json`, à placer dans `data/`. Ensuite : `python3 tools/apply_relecture.py` (option `--dry` pour simuler) passe les positions en `valide`, applique les corrections, archive les rejets dans `data/positions_rejetees.json` et liste les questions à reformuler (à reporter dans `tools/build_questions.py`). Le script est idempotent : le relancer après tout `tools/gen.py`.

## Contact sans serveur (phase A)

Tant que `CONTACT_URL` est vide, renseigner `ISSUES_URL` dans `js/config.js` (par exemple `https://github.com/elysee-2027/mon-candidat/issues`) : le formulaire ouvre alors un ticket GitHub prérempli. Le ticket est public et lié au compte GitHub de la personne, ce que le formulaire et la page de confidentialité indiquent.

## Positions déduites du silence

Chaque question a une `nature` : `etabli` (sujet déjà en place) ou `actuel` (récent ou en débat, liste `ACTUEL` dans `tools/build_questions.py`). Pour un sujet établi, `tools/gen.py` attribue aux candidats de `COMPLETS` dont le programme complet ne mentionne jamais le sujet une position déduite (niveau `silence`, statut `deduit`) : −1 « ne le propose pas » si l'affirmation demande un changement, +1 « ne le remet pas en cause » si elle défend l'existant (champ `statuquo`). Pour un sujet actuel, rien n'est déduit. Les règles (termes de recherche, thème de couverture, seuil `couverture_min`) sont dans `tools/silence_propositions.json` ; si le sujet est mentionné, `gen.py` signale « À EXAMINER » et n'ajoute rien. `python3 tools/silence_dryrun.py <corpus>` simule sans écrire ; `python3 tools/simulate_profils.py` compare le classement avant/après sur cinq profils types.

## Licences

Code : GNU AGPL-3.0 (`LICENSE`). Données : CC BY-SA 4.0 (`LICENSE-DATA.md`). Identité visuelle : tous droits réservés (`identite/LICENSE.md`). Polices Inter : OFL. Citations : propriété de leurs auteurs. Détail dans `NOTICE.md`. Titulaire : le pseudonyme du compte éditeur.
