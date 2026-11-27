#!/usr/bin/env python3
"""Applique data/relecture.json (exporté par tools/relecture.html) :  python3 tools/apply_relecture.py [--dry]

- position validée  -> statut "valide"
- position corrigée -> nouveau score, statut "valide", motif dans "note"
- position rejetée  -> retirée de positions.json et archivée dans data/positions_rejetees.json
- question à reformuler -> affichée en fin de rapport : à reporter dans tools/build_questions.py (source des questions)

Idempotent : à relancer après chaque exécution de tools/gen.py, qui régénère positions.json."""
import json, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
dry = "--dry" in sys.argv
rel = json.load(open(root / "data/relecture.json", encoding="utf-8"))["questions"]
pf = root / "data/positions.json"
pos = json.load(open(pf, encoding="utf-8"))
rejf = root / "data/positions_rejetees.json"
rej = json.load(open(rejf, encoding="utf-8")) if rejf.exists() else []
rejkeys = {(r["question"], r["candidat"]) for r in rej}
kept, n = [], {"valide": 0, "corrige": 0, "rejete": 0}
for p in pos:
    d = rel.get(p["question"], {}).get("positions", {}).get(p["candidat"])
    if not d: kept.append(p); continue
    if d["statut"] == "rejete":
        n["rejete"] += 1
        if (p["question"], p["candidat"]) not in rejkeys:
            rej.append({**p, "motif": d.get("note", "")})
        continue
    if d["statut"] == "corrige":
        n["corrige"] += 1
        p["score"] = d["score"]
        if d.get("note"): p["note"] = d["note"]
    else:
        n["valide"] += 1
    p["statut"] = "valide"
    kept.append(p)
print(f'positions : {n["valide"]} validées, {n["corrige"]} corrigées, {n["rejete"]} rejetées ; {len(kept)} conservées')
for qid, d in rel.items():
    if d.get("question") == "reformuler":
        print(f'À REFORMULER {qid} : {d.get("enonce") or "(pas de proposition)"}' + (f' — {d["note"]}' if d.get("note") else ""))
if not dry:
    json.dump(kept, open(pf, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if rej: json.dump(rej, open(rejf, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
