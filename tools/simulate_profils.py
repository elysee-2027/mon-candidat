#!/usr/bin/env python3
"""Simule le classement de proximité pour quelques profils types, avant et après les positions déduites du silence.

    python3 tools/simulate_profils.py

Trois scénarios :
  A  sans positions déduites (positions citées seulement) ;
  B  état actuel (pilote : sortie de l'UE) ;
  C  PLAFOND d'une extension : « ne le propose pas » (-1) pour chaque candidat à programme complet sur chaque question
     de changement où il n'a pas de position. Surestime l'effet réel, car l'extension ne s'appliquerait qu'aux silences
     vérifiés dans le texte des programmes.
Un profil se définit par une préférence de -2 (pôle A) à +2 (pôle B) sur chacun des 9 axes ; les questions hors graphe
ne sont pas répondues. Même calcul que l'application (js/app.js : posFor, proximity, countsInProximity, MIN_COMMON)."""
import json, re, pathlib, copy
root = pathlib.Path(__file__).resolve().parent.parent
Q = json.load(open(root / "data/questions.json", encoding="utf-8"))
P0 = json.load(open(root / "data/positions.json", encoding="utf-8"))
C = {c["id"]: c for c in json.load(open(root / "data/candidats.json", encoding="utf-8"))}
NIVEAU = {"programme": 3, "candidat": 2, "proche": 1, "silence": 0.5}
MIN_COMMON, MIN_CONTRASTE_N = 6, 3
COMPLETS = {"nda", "branco", "philippot", "retailleau", "melenchon", "roussel", "lisnard", "attal", "philippe", "glucksmann", "mikolajczak"}

PROFILS = {
    "Gauche sociale et écologiste": dict(eco=-2, social=-2, ecologie=-2, europe=-1, defense=1, immigration=-2, securite=-2, societe=-2, institutions=-2),
    "Libéral et européen": dict(eco=2, social=2, ecologie=1, europe=-2, defense=2, immigration=0, securite=1, societe=-1, institutions=1),
    "Souverainiste et sécuritaire": dict(eco=0, social=0, ecologie=2, europe=2, defense=-2, immigration=2, securite=2, societe=2, institutions=-1),
    "Eurosceptique de gauche": dict(eco=-2, social=-2, ecologie=-2, europe=2, defense=-2, immigration=-1, securite=-1, societe=-2, institutions=-2),
    "Centriste modéré": dict(eco=1, social=0, ecologie=0, europe=-1, defense=1, immigration=1, securite=1, societe=0, institutions=1),
}

CH = re.compile(r"supprim|interdi|rétabl|quitter|sortir|abaiss|abroger|dénonc|privatis|nationalis|légalis|instaur|durci|restreind|suspend|limiter|réduire|relever|porté", re.I)
NOT = re.compile(r"maintenir|maintenue|poursuivre|continuer|rester|renforcer", re.I)

def scenario(kind):
    """kind : A (sans déduit), B (actuel), puis variantes d'extension :
    C plafond (poids 1) · C50 (poids 0,5) · CAP (au plus 5 silences par candidat, sur les questions où il y a le plus de
    positions explicites) · INFO (seulement les questions où au moins 4 des 9 candidats à programme complet ont une position) · INFO50 (INFO avec poids 0,5)."""
    P = [dict(p) for p in P0 if kind != "A" or p["niveau"] != "silence"]
    if kind in ("A", "B"): return P
    have = {(p["question"], p["candidat"]) for p in P}
    explicit = {}
    for p in P:
        if p["niveau"] != "silence": explicit.setdefault(p["question"], set()).add(p["candidat"])
    qs = [q for q in Q if not q.get("actualite") and CH.search(q["enonce"]) and not NOT.search(q["enonce"])]
    if kind in ("INFO", "INFO50"):
        qs = [q for q in qs if len(explicit.get(q["id"], set()) & COMPLETS) >= 4]
    w = 0.5 if kind in ("C50", "INFO50") else 1
    for c in sorted(COMPLETS):
        cand = [q for q in qs if (q["id"], c) not in have]
        if kind == "CAP":
            cand = sorted(cand, key=lambda q: -len(explicit.get(q["id"], set())))[:5]
        for q in cand:
            P.append({"question": q["id"], "candidat": c, "score": -1, "niveau": "silence", "w": w})
    return P

def classement(P, prefs):
    by = {}
    for p in P: by.setdefault((p["question"], p["candidat"]), []).append(p)
    def pos(q, c):
        l = by.get((q, c));
        if not l: return None
        top = max(NIVEAU[x["niveau"]] for x in l); best = [x for x in l if NIVEAU[x["niveau"]] == top]
        return sum(x["score"] for x in best) / len(best), min(x.get("w", 1) for x in best)
    cq = {}
    for p in P: cq.setdefault(p["question"], []).append(p)
    def counts(qid):
        sc = cq.get(qid, [])
        return (any(x["score"] >= 1 for x in sc) and any(x["score"] <= -1 for x in sc)) or len({x["candidat"] for x in sc}) >= MIN_CONTRASTE_N
    # réponse d'un profil à une question d'axe : sens × préférence (-2 pôle A … +2 pôle B)
    ans = {q["id"]: max(-2, min(2, round(q["sens"] * prefs[q["axe"]]))) for q in Q if q["axe"]}
    cands = {p["candidat"] for p in P}; res = []
    for c in cands:
        num = den = n = 0
        for qid, v in ans.items():
            if not counts(qid): continue
            r = pos(qid, c)
            if r is None: continue
            s, w = r
            num += w * (1 - abs(v - s) / 4); den += w; n += 1
        if n >= MIN_COMMON: res.append((round(100 * num / den), n, c))
    return sorted(res, reverse=True)

def pct(rk): return {c: p for p, n, c in rk}

if __name__ == "__main__":
    import statistics as st
    noms = lambda c: C[c]["nom"].split()[-1] if c in C else c
    kinds = ["A", "B", "C", "C50", "CAP", "INFO", "INFO50"]
    sc = {k: scenario(k) for k in kinds}
    nimp = {k: sum(1 for p in sc[k] if p["niveau"] == "silence") for k in kinds}
    rk = {(k, pn): classement(sc[k], pr) for k in kinds for pn, pr in PROFILS.items()}
    print("Positions déduites imputées :", ", ".join(f"{k} {nimp[k]}" for k in kinds))
    print("\nPar variante, par rapport à A (sans déduit), moyenne sur les 5 profils :")
    print(f"{'variante':8}{'Δ pts, prog. complet':>22}{'Δ pts, autres':>16}{'écart':>8}{'top5 changés':>14}{'rang max déplacé (top10)':>26}")
    for k in kinds[1:]:
        dc, do, ch, mx = [], [], 0, 0
        for pn in PROFILS:
            a, b = pct(rk[("A", pn)]), pct(rk[(k, pn)])
            for c in b:
                if c in a: (dc if c in COMPLETS else do).append(b[c] - a[c])
            ra = [c for _, _, c in rk[("A", pn)]]; rb = [c for _, _, c in rk[(k, pn)]]
            ch += len(set(ra[:5]) ^ set(rb[:5])) // 2
            for c in rb[:10]:
                if c in ra: mx = max(mx, abs(ra.index(c) - rb.index(c)))
        print(f"{k:8}{st.mean(dc):>22.1f}{st.mean(do):>16.1f}{st.mean(do) - st.mean(dc):>8.1f}{ch:>14}{mx:>26}")
    print("\nTop 5 par profil et par variante :")
    for pn in PROFILS:
        print("==", pn)
        for k in kinds:
            print(f"  {k:5}", " · ".join(f"{noms(c)} {p}" for p, n, c in rk[(k, pn)][:5]))
