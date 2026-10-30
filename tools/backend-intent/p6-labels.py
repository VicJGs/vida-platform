#!/usr/bin/env python3
"""P6 · apply the `frontend` Profile-axis label to the 24 fe-* issues (idempotent, union-preserving).

Mirrors P5.1's `backend` label (session decision: one label per Profile value, NOT a bespoke phase tag).
Ensures the `frontend` label exists (creates it if missing), then adds it to each fe issue without
dropping any existing label (fetch current labelIds → union → issueUpdate).
"""
import json, sys, time
from pathlib import Path
TK = Path.home() / "dev-toolkit"; sys.path.insert(0, str(TK / "scripts"))
from linear_client import LinearClient  # noqa: E402
import tracker_sync as ts  # noqa: E402

REPO = Path.cwd()
MAP = json.loads((REPO / ".claude/archive/tasks/.tracker-map.json").read_text())
ISSUES = MAP["issues"]; TEAM = MAP["team"]["id"]
FE24 = sorted(s.stem for s in (REPO / ".claude/archive/tasks").glob("fe-*.md"))
if len(FE24) != 24:
    sys.exit(f"FAIL: expected 24 fe-*.md, found {len(FE24)}")

env = ts.load_env(); cfg = ts.load_config(); plan = ts.build_plan(REPO, cfg)
c = LinearClient(env[plan["key_env"]])

def retry(fn, *a, tries=4):
    for i in range(tries):
        try:
            return fn(*a)
        except Exception as e:  # noqa: BLE001
            if i == tries - 1:
                raise
            print(f"  … retry {i+1} after {type(e).__name__}", file=sys.stderr); time.sleep(2 * (i + 1))

# 1. ensure the `frontend` label
d = retry(c._gql, "query($t:String!){ team(id:$t){ labels(first:250){ nodes{ id name } } } }", {"t": TEAM})
labs = {n["name"]: n["id"] for n in d["team"]["labels"]["nodes"]}
if "frontend" in labs:
    fid = labs["frontend"]; print(f"= label 'frontend' exists {fid}")
else:
    r = retry(c._gql, "mutation($n:String!,$t:String!){ issueLabelCreate(input:{name:$n,teamId:$t}){ success issueLabel{ id } } }",
              {"n": "frontend", "t": TEAM})
    fid = r["issueLabelCreate"]["issueLabel"]["id"]; print(f"+ label 'frontend' created {fid}")

# 2. apply to each fe issue (union with existing)
added, present = 0, 0
for slug in FE24:
    iid = ISSUES[slug]["id"]
    d = retry(c._gql, "query($i:String!){ issue(id:$i){ labels{ nodes{ id } } } }", {"i": iid})
    cur = {n["id"] for n in d["issue"]["labels"]["nodes"]}
    if fid in cur:
        present += 1; continue
    retry(c._gql, "mutation($i:String!,$l:[String!]){ issueUpdate(id:$i,input:{labelIds:$l}){ success } }",
          {"i": iid, "l": sorted(cur | {fid})})
    print(f"  + frontend → {slug}"); added += 1

print(f"\nlabels: {present} already labeled · {added} added  (24 fe issues)")
if present + added != 24:
    sys.exit(f"FAIL: {present + added} ≠ 24")
print("OK — all 24 fe issues carry the `frontend` label.")
