#!/usr/bin/env python3
"""Simule, sans rien écrire, l'application des règles de silence de tools/silence_propositions.json.

    python3 tools/silence_dryrun.py <dossier-corpus>

Pour chaque question : candidats à programme complet SANS position explicite, répartis entre
  - « silence » : aucune occurrence du sujet dans tout leur corpus → position « ne le propose pas » (-1) ;
  - « à examiner » : le sujet est mentionné → aucune position inventée, il faut une vraie citation ;
  - « corpus insuffisant » : le thème général est à peine abordé dans le corpus (moins de `couverture_min` occurrences de
    `couverture`) → le silence ne prouve rien, il manque probablement des pages du programme."""
import json, re, sys, glob, os, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
corpus = sys.argv[1] if len(sys.argv) > 1 else "corpus"
COMPLETS = {"nda", "branco", "philippot", "retailleau", "melenchon", "roussel", "lisnard", "attal", "philippe", "glucksmann", "mikolajczak"}
P = json.load(open(root / "data/positions.json", encoding="utf-8"))
Q = {q["id"]: q for q in json.load(open(root / "data/questions.json", encoding="utf-8"))}
explicit = {}
for p in P:
    if p["niveau"] != "silence": explicit.setdefault(p["question"], set()).add(p["candidat"])
texts = {}
for c in COMPLETS:
    t = []
    for f in glob.glob(f"{corpus}/{c}/*.txt"):
        t.append(re.sub(r"\s+", " ", open(f, encoding="utf-8", errors="replace").read()))
    texts[c] = " ".join(t)
tot_sil = tot_exam = 0
for r in json.load(open(root / "tools/silence_propositions.json", encoding="utf-8")):
    rx = re.compile(r["regex"], re.I); sil, exam = [], []
    cv = re.compile(r["couverture"], re.I); trop = []
    for c in sorted(COMPLETS - explicit.get(r["question"], set())):
        n = len(rx.findall(texts[c]))
        if n: exam.append(f"{c}({n})")
        elif len(cv.findall(texts[c])) < r["couverture_min"]: trop.append(c)
        else: sil.append(c)
    tot_sil += len(sil); tot_exam += len(exam); tot_gap = globals().get('tot_gap', 0) + len(trop); globals()['tot_gap'] = tot_gap
    print(f'{r["question"]} {Q[r["question"]]["enonce"][:70]}\n    silence ({len(sil)}) : {", ".join(sil) or "-"}\n    à examiner ({len(exam)}) : {", ".join(exam) or "-"}\n    corpus insuffisant sur le thème ({len(trop)}) : {", ".join(trop) or "-"}')
print(f"\nTotal : {tot_sil} positions « ne le propose pas » possibles, {tot_exam} cas à examiner, {globals().get('tot_gap', 0)} corpus insuffisants (aucune position automatique pour ces deux cas).")
