#!/usr/bin/env python3
"""
G4 coverage gate — verify every frontend CAPABILITY has >=2 independent reachable paths.

The ≥2-paths rule (Quality Bar §2.4, ratified at G4): a capability reachable only ONE way is one
most users never find → it FAILS the coverage gate (hard floor). Above the floor, more paths = a
soft signal (richer discoverability), not a block.

Reads capabilities.json ({paths:[valid path-types], capabilities:[{id,label,paths:[...]}]}),
checks each capability's distinct path count, and reports PASS/FAIL + the set-cover spread.
Exit 0 = PASS (all ≥2), 1 = REVISE (some <2).
"""
import json, os, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
data = json.load(open(os.path.join(HERE, "capabilities.json")))
valid = set(data["paths"])
caps = data["capabilities"]

fails, warns, ok = [], [], 0
for c in caps:
    paths = sorted(set(c["paths"]))
    unknown = [p for p in paths if p not in valid]
    if unknown:
        warns.append((c["id"], "unknown path-type(s): " + ",".join(unknown)))
    if len(paths) < 2:
        fails.append((c["id"], c["label"], paths))
    else:
        ok += 1

spread = Counter(p for c in caps for p in set(c["paths"]))

print("# G4 Coverage — ≥2 reachable paths per capability\n")
print(f"capabilities: {len(caps)}  ·  PASS (≥2): {ok}  ·  FAIL (<2): {len(fails)}\n")
print("## Path-type usage (set-cover spread)")
for p, n in spread.most_common():
    flag = "" if p in valid else "  (UNKNOWN)"
    print(f"  {p:16} {n}{flag}")
if fails:
    print("\n## FAIL — under-covered capabilities (add a 2nd path: register ⌘K or a nav entry)")
    for i, l, p in fails:
        print(f"  ✗ {i:28} {l}  — paths: {p or '(none)'}")
if warns:
    print("\n## WARN")
    for i, m in warns:
        print(f"  ⚠ {i}: {m}")
print("\nVERDICT:", "PASS — ≥2 paths for every capability" if not fails
      else f"REVISE — {len(fails)} under-covered capability(ies)")
sys.exit(0 if not fails else 1)
