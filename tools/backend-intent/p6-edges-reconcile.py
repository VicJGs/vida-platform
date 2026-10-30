#!/usr/bin/env python3
"""P6 · edge reconciler — verify + create the 55 P6 blocker relations in Linear, idempotently.

Why this exists: `tracker_sync --sync` aborts the whole run on a single network timeout (it happened
mid issue-loop), so it's unreliable for the relations phase. This reconciler is per-edge and resumable:
it reads the EXPECTED edges from the .claude/archive/tasks task files (blocked-by), reads the ACTUAL edges live
from Linear, and creates only the missing ones. Add-only (never deletes). Fail-soft per edge, retry on
timeout. Run repeatedly until it reports 0 missing.

Reads the key + client from the toolkit exactly as tracker_sync does.
"""
import json, re, sys, time
from pathlib import Path

TOOLKIT = Path.home() / "dev-toolkit"
sys.path.insert(0, str(TOOLKIT / "scripts"))
from linear_client import LinearClient, LinearError  # noqa: E402
import tracker_sync as ts  # noqa: E402

REPO = Path.cwd()
T = REPO / ".claude" / "tasks"
MAP = json.loads((T / ".tracker-map.json").read_text())
ISSUES = MAP["issues"]

def iid(slug):
    v = ISSUES.get(slug)
    if not v:
        sys.exit(f"FAIL: slug '{slug}' not in map")
    return v["id"]

# ---- EXPECTED edges (blocked_slug -> [blocker_slug]) read from the task files ----
def parse_blockers(slug):
    p = T / f"{slug}.md"
    if not p.exists():
        sys.exit(f"FAIL: task file missing {slug}")
    out = []
    for line in p.read_text().splitlines():
        m = re.search(r"blocked by `([^`]+)`", line)
        if m:
            out.append(m.group(1))
    return out

FE24 = sorted(s.stem for s in T.glob("fe-*.md"))
if len(FE24) != 24:
    sys.exit(f"FAIL: expected 24 fe-*.md, found {len(FE24)}")

expected = {}  # blocked_slug -> set(blocker_slug)
for fe in FE24:
    expected[fe] = set(parse_blockers(fe))
expected["hard-4-polish"] = set(parse_blockers("hard-4-polish"))

# only the P6-relevant edges: fe issues (all their blockers) + hard-4's fe blockers
EXPECTED_EDGES = set()  # (blocker, blocked)
for fe in FE24:
    for b in expected[fe]:
        EXPECTED_EDGES.add((b, fe))
for b in expected["hard-4-polish"]:
    if b.startswith("fe-"):
        EXPECTED_EDGES.add((b, "hard-4-polish"))

print(f"expected P6 edges: {len(EXPECTED_EDGES)}  (22 twin + 5 shell + 4 integrations + 24 hard-4 = 55)")

# ---- client ----
env = ts.load_env()
cfg = ts.load_config()
plan = ts.build_plan(REPO, cfg)
key = env.get(plan["key_env"])
if not key:
    sys.exit(f"FAIL: {plan['key_env']} not set")
client = LinearClient(key)

def gql_retry(fn, *a, tries=4):
    for i in range(tries):
        try:
            return fn(*a)
        except Exception as e:  # noqa: BLE001  (timeouts are transient)
            if i == tries - 1:
                raise
            print(f"  … retry {i+1}/{tries} after {type(e).__name__}", file=sys.stderr)
            time.sleep(2 * (i + 1))

def current_blockers(blocked_slug):
    """Set of issue-ids that currently BLOCK blocked_slug (its inverse 'blocks' relations)."""
    q = ("query($i:String!){ issue(id:$i){ inverseRelations{ nodes{ type issue{ id } } } } }")
    d = gql_retry(client._gql, q, {"i": iid(blocked_slug)})
    nodes = (d["issue"]["inverseRelations"]["nodes"]) or []
    return {n["issue"]["id"] for n in nodes if n["type"] == "blocks" and n.get("issue")}

# ---- reconcile ----
by_blocked = {}
for (blk, bld) in EXPECTED_EDGES:
    by_blocked.setdefault(bld, set()).add(blk)

created, present, failed = 0, 0, []
for blocked in sorted(by_blocked):
    have = current_blockers(blocked)
    for blocker in sorted(by_blocked[blocked]):
        if iid(blocker) in have:
            present += 1
            continue
        try:
            gql_retry(client.set_blocks, iid(blocker), iid(blocked))
            print(f"  + {blocker} blocks {blocked}")
            created += 1
        except LinearError as e:
            print(f"  ✗ {blocker} blocks {blocked}: {e}", file=sys.stderr)
            failed.append((blocker, blocked, str(e)))

print(f"\nedges: {present} already present · {created} created · {len(failed)} failed  "
      f"(target {len(EXPECTED_EDGES)})")
if failed:
    sys.exit(1)
if present + created != len(EXPECTED_EDGES):
    sys.exit(f"FAIL: reconciled {present + created} ≠ expected {len(EXPECTED_EDGES)}")
print("OK — all 55 P6 edges present in Linear.")
