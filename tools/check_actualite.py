#!/usr/bin/env python3
"""Vérifie les questions d'actualité : python3 tools/check_actualite.py [AAAA-MM-JJ]

Signale : questions échues, bientôt échues (< 14 jours), moins de 3 questions actives,
questions sans au moins 3 positions de 2 camps (famille politique approximative par candidat)."""
import json, sys, datetime, pathlib, collections
root = pathlib.Path(__file__).resolve().parent.parent
today = sys.argv[1] if len(sys.argv) > 1 else datetime.date.today().isoformat()
q = json.load(open(root / "data/questions.json", encoding="utf-8"))
pos = json.load(open(root / "data/positions.json", encoding="utf-8"))
cands = {c["id"]: c for c in json.load(open(root / "data/candidats.json", encoding="utf-8"))}
bloc = {  # regroupement indicatif, uniquement pour vérifier la diversité des réactions
    "gauche": {"arthaud", "kazib", "labib", "melenchon", "roussel", "tondelier", "batho", "glucksmann", "bouamrane", "branco"},
    "centre": {"attal", "philippe", "becht", "egger", "mikolajczak"},
    "droite": {"retailleau", "lisnard", "platret"},
    "extreme_droite": {"lepen", "zemmour", "nda", "philippot"},
}
actifs, problemes = [], []
for x in q:
    a = x.get("actualite")
    if not a: continue
    jours = (datetime.date.fromisoformat(a["jusqu_au"]) - datetime.date.fromisoformat(today)).days
    ps = [p for p in pos if p["question"] == x["id"]]
    camps = {b for p in ps for b, ids in bloc.items() if p["candidat"] in ids}
    etat = "ÉCHUE" if jours < 0 else f"{jours} j restants"
    print(f'{x["id"]}  {etat:>14}  {len(ps)} positions, camps : {", ".join(sorted(camps)) or "-"}  | {x["enonce"][:70]}')
    if jours >= 0: actifs.append(x["id"])
    if jours < 0: problemes.append(f'{x["id"]} est échue : à retirer ou à remplacer')
    elif jours < 14: problemes.append(f'{x["id"]} échoit dans {jours} jours')
    if len(ps) < 3 or len(camps) < 2: problemes.append(f'{x["id"]} : moins de 3 positions ou un seul camp représenté')
if len(actifs) < 3: problemes.append(f"seulement {len(actifs)} question(s) d'actualité active(s) : il en faut au moins 3")
print()
print("\n".join("À FAIRE : " + p for p in problemes) if problemes else "Tout est en ordre.")
sys.exit(1 if problemes else 0)
