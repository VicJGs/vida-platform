#!/bin/bash
INPUT=$(cat)
EXIT_CODE=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    result = data.get('tool_response', {})
    code = result.get('exit_code', result.get('returncode', 0))
    print(int(code))
except:
    print(0)
" 2>/dev/null)

OUTPUT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    result = data.get('tool_response', {})
    print(result.get('stdout', '') + result.get('stderr', ''))
except:
    print('')
" 2>/dev/null)

HAS_ERROR=false
if [ "$EXIT_CODE" != "0" ] && [ -n "$EXIT_CODE" ]; then HAS_ERROR=true; fi
if echo "$OUTPUT" | grep -qiE "error:|failed|exception|cannot find|not found|undefined"; then HAS_ERROR=true; fi

if [ "$HAS_ERROR" = "true" ]; then
cat << 'TRIAGE'
⚠️  AUTO-TRIAGE — DO NOT SKIP

An error was detected. Before any fix:
1. CLASSIFY: Isolated (one file, one cause) or Structural (cascade risk)?
2. ROOT CAUSE: "The error is caused by [X], not [symptom]."
3. BLAST RADIUS: What else breaks if root cause is not fixed?
4. VERDICT: ISOLATED → fix directly | STRUCTURAL → plan first

Run /triage for the full protocol.
TRIAGE
fi
