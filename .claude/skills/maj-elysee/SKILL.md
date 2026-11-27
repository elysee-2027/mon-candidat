---
name: maj-elysee
description: Met à jour Élysée 2027 (candidats, positions citées, questions, questions d'actualité) à partir des nouvelles déclarations de candidature, des programmes publiés ou modifiés et de l'actualité qui fait réagir les candidats. À utiliser pour une veille périodique ou quand l'utilisateur demande de mettre à jour les candidats, programmes ou questions.
---

# Mise à jour d'Élysée 2027

Rôle : l'IA **propose**, l'humain **valide**. Tout ajout arrive avec `statut: "propose"` et passe par `tools/relecture.html`. Ne jamais pousser sur `main`, ne jamais ouvrir de PR sans demande explicite, ne rien publier ailleurs que sur la branche de développement.

Langue : français, ton neutre, sans formule d'IA ni flatterie. Aucun candidat n'est mis en avant : mêmes règles, mêmes types de sources pour tous.

## Règles non négociables

1. **Candidats** : uniquement ceux clairement déclarés, avec une source de déclaration (média ou site officiel). Candidature seulement évoquée, annoncée « pour plus tard » ou dépendant d'une primaire : `data/candidats_en_attente.json` et liste `EXCLUS` de `tools/gen.py`, pas dans `candidats.json`. Un candidat qui renonce : le retirer de `candidats.json` et le consigner dans `candidats_en_attente.json` avec la raison et la date.
2. **Positions** : une citation exacte, mot pour mot, extraite d'une source consultée, avec URL et date de consultation. Sans citation trouvée : pas de position (le site affiche « aucune position identifiée »). Ne jamais inférer, paraphraser ni compléter une citation. Une position non vérifiée par `gen.py` n'entre pas.
2bis. **Positions déduites du silence.** Chaque question a une `nature` (`tools/build_questions.py`, ensemble `ACTUEL`) : **établi** (déjà en place : IVG, peine de mort, euro, OTAN…) ou **actuel** (récent ou en débat : règle d'or, actualité…). Pour un sujet établi, un candidat de la liste `COMPLETS` de `tools/gen.py` (programme complet, décision humaine) dont le corpus ne mentionne jamais le sujet reçoit `niveau: "silence"`, `statut: "deduit"` et le score `statuquo` de la question : −1 « ne le propose pas » si l'affirmation demande un changement, +1 « ne le remet pas en cause » si elle défend l'existant (jamais ±2). Pour un sujet actuel : aucune déduction, se taire n'est pas un avis. Règles dans `tools/silence_propositions.json` (question, termes de recherche, thème de couverture et seuil `couverture_min`, `score`). Si le sujet apparaît dans le corpus, `gen.py` affiche « À EXAMINER » et n'invente rien ; si le thème est à peine couvert, « CORPUS INSUFFISANT ». Prévisualiser sans rien écrire : `python3 tools/silence_dryrun.py <corpus>`. Ne jamais ajouter à `COMPLETS` un candidat dont on n'a qu'une brochure, un tract ou un programme thématique. Rafraîchir le corpus avant de régénérer. Attention au biais : les candidats hors `COMPLETS` (Le Pen, Zemmour, Tondelier…) ne reçoivent aucune déduction et sont donc favorisés ; compléter leur corpus avant d'élargir. Écartées pour l'instant : q54 et q82 (termes trop étroits).
3. **Hiérarchie des sources** : `programme` (3) > `candidat` (2, déclaration du candidat ou de son équipe de campagne) > `proche` (1). Quand le programme manque ou ne tranche pas, chercher les déclarations du candidat ou de son équipe et citer **toutes** les sources utilisées. Presse : mettre `media` (titre, date) dans le 7ᵉ champ du tuple.
4. **Équité** : avant de clore une mise à jour, vérifier que chaque candidat a été cherché sur les mêmes questions avec la même méthode. Ne pas multiplier les citations d'un camp seulement parce qu'elles sont faciles à trouver. Asselineau : attendre son programme 2027 (ne pas utiliser les anciens).
5. **Neutralité des questions** : énoncé affirmatif, une seule idée, sans vocabulaire d'un camp ni chiffre contesté, contexte factuel de 1 à 2 phrases. L'option « Neutre » existe déjà. Pour les sujets de fond très clivants (peine de mort, sortie de l'UE, fin de vie, immigration, laïcité, statut de la Corse…), poser la question **même si moins de 3 candidats se sont prononcés** : marquer `clivant` dans `CLIVANT` de `tools/build_questions.py` pour qu'elle ne soit pas reléguée en fin de thème, et noter dans le compte rendu le nombre de positions. Cette exception ne vaut pas pour les questions d'actualité, qui gardent leurs critères (au moins 3 positions, 2 camps).
6. **Aucune donnée personnelle** de l'utilisateur ni de son identité dans les sources, commits ou textes publiés.

## Fichiers à connaître

- `data/candidats.json`, `candidats_en_attente.json`, `questions.json`, `positions.json`, `version.json`, `axes.json` (9 axes).
- `tools/gen.py` : source des positions (tuples `(question, candidat, score -2..+2, citation, niveau, note[, media])`) ; vérifie chaque citation dans `corpus/<candidat>/*.txt` puis écrit `positions.json` (tous en `propose`, date de consultation fixée par la constante dans le script : à mettre à jour avec le corpus).
- `tools/build_questions.py` : source des questions (liste `new`, `HORS`, `AXE_V11`, dictionnaire `ACTU`, `waves`) ; écrit `data/questions.json`.
- `tools/check_actualite.py` : contrôle des questions d'actualité.
- `tools/relecture.html` + `tools/apply_relecture.py` : validation humaine.
- `tools/crawl.py`, `press.py`, `txt.py`, `c.py`, `scan.py` : collecte et recherche dans le corpus (`corpus/` n'est pas versionné).

Les scripts utilisent des chemins relatifs (`corpus/`, `bin/txt.py`) et écrivent dans le dossier courant. Travailler dans un dossier temporaire (le *scratchpad*) contenant `bin/` (copie de `tools/`) et `corpus/`, lancer `python3 -I bin/gen.py`, puis recopier `positions.json` dans `data/` et `bin/gen.py` dans `tools/`. Le corpus est à reconstituer à chaque session : télécharger de nouveau les pages concernées.

## Procédure

### 1. État des lieux
- Lire `data/version.json`, `candidats.json`, `candidats_en_attente.json`, lancer `python3 tools/check_actualite.py`.
- Noter la date du jour et la date de la dernière mise à jour : la veille couvre cet intervalle.

### 2. Veille : déclarations de candidature
- Rechercher (WebSearch) les nouvelles candidatures déclarées, renonciations, ralliements, et les candidatures en attente qui se sont confirmées. Recouper au moins deux sources dont une média reconnu ou le site officiel.
- Pour chaque entrée : id, nom, parti, couleur (code habituel du parti, uniquement dans les données), `declaration` (« Déclarée le … »), `sourceDeclaration`, `programme` (titre + URL, si publié).
- Candidature citoyenne ou sans parti : couleur neutre distincte des autres.
- En cas de doute sur le caractère « clairement déclaré » : ne pas ajouter, le signaler dans le compte rendu.

### 3. Veille : programmes et déclarations
- Pour chaque candidat, vérifier si le programme a changé (nouvelle version, nouveaux chapitres, page « en cours d'actualisation »). Re-télécharger avec `crawl.py` ; si une page est bloquée (403, Cloudflare), ne pas contourner par des moyens détournés : utiliser la presse et demander le document à l'utilisateur.
- Un changement de position modifie le tuple correspondant, avec la nouvelle citation et la nouvelle date. Garder la trace dans l'historique de version (qui a changé, sur quoi).
- Pour les questions sans position d'un candidat : chercher d'abord le programme (`c.py`, `scan.py`), puis ses déclarations et celles de son équipe (`press.py`), en notant `niveau` `candidat` ou `proche`.
- Citations : pas de guillemets typographiques ni de signes `+` à l'intérieur si cela gêne la vérification ; copier le texte exact.

### 4. Veille : actualité et questions d'actualité
- Rechercher les sujets des 2 à 4 dernières semaines qui ont fait réagir publiquement **au moins deux candidats de camps différents** (presse nationale, dépêches AFP, médias parlementaires).
- Une question d'actualité : hors graphe (`axe: null`, `theme: "Actualité"`), formulation neutre, dans `build_questions.py` avec `ACTU[id] = {depuis, jusqu_au, evenement, source{titre,url}}`. `jusqu_au` : 4 à 8 semaines après `depuis`, au plus tard la veille du scrutin.
- Ajouter ses positions dans `gen.py` (au moins 3 positions, au moins 2 camps) en citant la source de presse.
- Garder **au moins 3 questions d'actualité actives** en permanence. Retirer ou laisser expirer les questions dont le sujet a disparu ; leurs positions restent dans `positions.json`.
- Sujets à ne pas retenir : faits divers, polémiques de personnes, rumeurs, sujets sur lesquels un seul candidat s'est exprimé.

### 5. Questions de fond
- Ajouter ou reformuler une question de fond seulement si une réponse manque pour un axe, si un thème nouveau s'impose dans les programmes, ou si la relecture l'a demandé. Modifier une question change la comparabilité des résultats précédents : incrémenter la version et le dire dans l'historique.
- Rappel des conventions : `sens` (+1 : un accord pousse vers le pôle B de l'axe), séries d'une question par axe plus une hors graphe, laïcité hors graphe, moins de questions sur certains axes acceptable.

### 6. Génération et vérification
```bash
python3 -I bin/gen.py              # doit afficher 0 introuvable
python3 tools/build_questions.py
python3 tools/check_actualite.py
```
- Corriger chaque « INTROUVABLE » : citation recopiée exactement ou position abandonnée.
- Copier les résultats dans `data/` et `tools/`, puis rejouer `python3 tools/apply_relecture.py` si `data/relecture.json` existe (réapplique les décisions déjà prises).
- Après avoir incrémenté `data/version.json`, lancer `python3 tools/set_asset_version.py` (cache-busting des scripts et styles).
- Incrémenter `data/version.json` (version, date, résumé : candidats ajoutés/retirés, programmes mis à jour, questions ajoutées/retirées, positions modifiées).

### 7. Tests
Serveur local `python3 -m http.server 8765` puis tests Playwright à 360 px : parcours complet (nombre de questions attendu, pas de débordement horizontal, pas d'erreur JS), contact, statistiques, présence et expiration des questions d'actualité. Réparer un test cassé plutôt que de l'ignorer.

### 8. Commit et compte rendu
- Commit sur la branche de développement, message en français décrivant la mise à jour, puis push de cette branche seulement.
- Compte rendu à l'utilisateur : candidats ajoutés/retirés (avec sources), programmes mis à jour, positions ajoutées/modifiées (nombre par candidat), questions ajoutées/retirées/expirées, ce qui n'a pas pu être trouvé ou vérifié, points d'équité à surveiller. Rappeler que tout reste `propose` jusqu'à la relecture et proposer d'ouvrir `tools/relecture.html`.

## Calendrier et limites légales

- Liste officielle des candidats : Conseil constitutionnel, au plus tard le 26 mars 2027. À ce moment, aligner `candidats.json` sur cette liste.
- Ne publier aucune mise à jour la veille ni le jour du scrutin.
- Ne jamais publier de statistiques agrégées issues du dispositif de stats (loi sur les sondages de 1977).
- Fréquence conseillée : une veille hebdomadaire en campagne, mensuelle avant ; vérification de `check_actualite.py` avant chaque publication.
