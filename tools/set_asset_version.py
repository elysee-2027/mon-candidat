#!/usr/bin/env python3
"""Aligne les paramètres ?v= des scripts et feuilles de style de index.html sur data/version.json.

GitHub Pages sert js/ et css/ avec un cache de 10 minutes : sans ce paramètre, les visiteurs (et vous) peuvent
voir une ancienne version après une publication. À lancer après chaque changement de data/version.json."""
import json, re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
v = json.load(open(root / "data/version.json", encoding="utf-8"))["version"]
p = root / "index.html"; s = p.read_text(encoding="utf-8")
s2 = re.sub(r'((?:href|src)="(?:css|js)/[a-z-]+\.(?:css|js))(?:\?v=[^"]*)?"', lambda m: f'{m.group(1)}?v={v}"', s)
if s2 != s: p.write_text(s2, encoding="utf-8")
print("index.html : ressources en ?v=" + v, "(modifié)" if s2 != s else "(inchangé)")
