#!/usr/bin/env bash
# Prépare une copie propre du projet pour un nouveau dépôt, SANS historique ni trace d'identité.
#
# Usage :
#   [EMAIL=<id>+<pseudo>@users.noreply.github.com] tools/make-clean-copy.sh <dossier-destination> <pseudonyme-github> <url-du-site> [url-api]
# Exemple :
#   tools/make-clean-copy.sh ~/mon-candidat elysee-2027 https://elysee-2027.github.io/mon-candidat https://api.mon-domaine.fr
#
# Le script :
#   - exporte l'état validé du dépôt (git archive) : pas d'historique, pas de fichier non suivi ;
#   - remplace l'adresse du site dans les balises de partage et, si fournie, l'adresse de l'API ;
#   - crée un dépôt Git neuf, avec un seul commit signé du pseudonyme (adresse « noreply » GitHub) ;
#   - ne pousse rien : vous poussez vous-même, depuis votre compte dédié.
#   - COUNTER=<url> : renseigne seulement COUNTER_URL (compteur global) ;
#   - NOGIT=1 : n'écrit que les fichiers (pour mettre à jour un dépôt public existant, sans réécrire son historique).
set -euo pipefail

if [ $# -lt 3 ]; then sed -n "2,13p" "$0"; exit 1; fi
DEST="$1"; PSEUDO="$2"; SITE="${3%/}"; API="${4:-}"
EMAIL="${EMAIL:-${PSEUDO}@users.noreply.github.com}"   # adresse « noreply » de GitHub (Settings > Emails), de la forme 12345+pseudo@users.noreply.github.com
SRC="$(cd "$(dirname "$0")/.." && pwd)"

REPO="${REPO:-$(basename "$DEST")}"   # nom du dépôt GitHub (pour le lien des tickets quand aucune API n'est fournie)
if [ -e "$DEST" ] && [ -n "$(ls -A "$DEST" 2>/dev/null)" ]; then echo "Le dossier $DEST n'est pas vide." >&2; exit 1; fi
mkdir -p "$DEST"
git -C "$SRC" archive HEAD | tar -x -C "$DEST"

# adresse du site dans les balises de partage
python3 - "$DEST" "$SITE" "$API" "$PSEUDO" "$REPO" <<'PY'
import re, sys, pathlib, os
dest, site, api, pseudo, repo = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]
p = dest / 'index.html'; s = p.read_text(encoding='utf-8')
s = re.sub(r'https://[^"\s]*?/identite/4-image-partage/partage-1200x630\.png', site + '/identite/4-image-partage/partage-1200x630.png', s)
p.write_text(s, encoding='utf-8')
if api:
    p = dest / 'js' / 'config.js'; s = p.read_text(encoding='utf-8')
    s = re.sub(r"STATS_URL: '[^']*'", "STATS_URL: '" + api + "'", s)
    s = re.sub(r"CONTACT_URL: '[^']*'", "CONTACT_URL: '" + api + "/contact'", s)
    s = re.sub(r"COUNTER_URL: '[^']*'", "COUNTER_URL: '" + api + "/counter'", s)
    s = re.sub(r"CONTACT_SERVICE: '[^']*'", "CONTACT_SERVICE: 'relayé par Cloudflare'", s)
    p.write_text(s, encoding='utf-8')
else:
    # sans serveur : le formulaire de contact ouvre un ticket GitHub prérempli
    p = dest / 'js' / 'config.js'; s = p.read_text(encoding='utf-8')
    s = re.sub(r"ISSUES_URL: '[^']*'", "ISSUES_URL: 'https://github.com/" + pseudo + "/" + repo + "/issues'", s)
    p.write_text(s, encoding='utf-8')
# COUNTER=<url> : active seulement le compteur global (ex. Worker Cloudflare), sans statistiques ni contact
if os.environ.get('COUNTER'):
    p = dest / 'js' / 'config.js'; s = p.read_text(encoding='utf-8')
    s = re.sub(r"COUNTER_URL: '[^']*'", "COUNTER_URL: '" + os.environ['COUNTER'] + "'", s)
    p.write_text(s, encoding='utf-8')
# adresse du dépôt public : lien « Code source » (AGPL, section 13)
p = dest / 'js' / 'config.js'; s = p.read_text(encoding='utf-8')
s = re.sub(r"SOURCE_URL: '[^']*'", "SOURCE_URL: 'https://github.com/" + pseudo + "/" + repo + "'", s)
p.write_text(s, encoding='utf-8')
PY

# NOGIT=1 : mise à jour d'un dépôt public existant. On produit seulement les fichiers, à copier dans le clone local du dépôt
# public (en gardant son dossier .git), puis à valider avec GitHub Desktop sous l'identité du compte anonyme.
if [ "${NOGIT:-0}" = "1" ]; then
  echo
  echo "Fichiers prêts dans : $DEST (sans dépôt Git)"
  echo "Dans le clone du dépôt public : supprimer tout sauf .git, copier ces fichiers, puis valider et pousser."
  exit 0
fi

cd "$DEST"
git init -q -b main
git config user.name "$PSEUDO"
git config user.email "$EMAIL"
git add -A
GIT_AUTHOR_NAME="$PSEUDO" GIT_AUTHOR_EMAIL="$EMAIL" \
GIT_COMMITTER_NAME="$PSEUDO" GIT_COMMITTER_EMAIL="$EMAIL" \
  git commit -q -m "Première publication"

echo
echo "Copie propre prête dans : $DEST"
echo "Auteur du seul commit    : $PSEUDO <$EMAIL>"
echo
echo "Pour publier (depuis votre compte dédié) :"
echo "  cd $DEST"
echo "  git remote add origin https://github.com/${PSEUDO}/<nom-du-depot>.git"
echo "  git push -u origin main"
echo
echo "Ensuite, sur GitHub : Settings > Pages > Deploy from a branch > main > / (root)."
echo "Vérifiez l'anonymat avant de publier :  git log --format='%an <%ae>'  (un seul auteur)  et  grep -ri <votre-ancien-pseudo> ."
