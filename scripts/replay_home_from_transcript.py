"""
Replay all Write + StrReplace operations on app/page.tsx from a Cursor agent JSONL
transcript, then write the result to stock-benefits-arrival/app/page.tsx.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def norm_path(p: str) -> str:
    return str(p).replace("\\", "/").lower()


def is_home_page(p: str) -> bool:
    return norm_path(p).endswith("/app/page.tsx")


def find_transcript(start: Path) -> Path | None:
    """Walk upward from repo root until ./.cursor/.../agent-transcripts/<id>/<id>.jsonl exists."""
    cur = start.resolve()
    for _ in range(6):
        base = cur / ".cursor" / "projects" / "empty-window" / "agent-transcripts"
        if base.is_dir():
            for d in sorted(base.iterdir()):
                if not d.is_dir():
                    continue
                cand = d / f"{d.name}.jsonl"
                if cand.is_file():
                    return cand
        if cur.parent == cur:
            break
        cur = cur.parent
    return None


def main() -> int:
    # stock-benefits-arrival/scripts/this_file.py -> stock-benefits-arrival
    repo = Path(__file__).resolve().parents[1]
    transcript = find_transcript(repo)
    if not transcript:
        print("TRANSCRIPT_NOT_FOUND from", repo, file=sys.stderr)
        return 1

    text: str | None = None
    ops = 0

    with transcript.open(encoding="utf-8") as f:
        for line_no, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                o = json.loads(line)
            except json.JSONDecodeError:
                continue
            msg = o.get("message") or {}
            content = msg.get("content")
            if not isinstance(content, list):
                continue
            for block in content:
                if not isinstance(block, dict) or block.get("type") != "tool_use":
                    continue
                name = block.get("name")
                inp = block.get("input") or {}
                path = inp.get("path", "")
                if not is_home_page(str(path)):
                    continue
                if name == "Write":
                    c = inp.get("contents")
                    if isinstance(c, str):
                        text = c
                        ops += 1
                elif name == "StrReplace":
                    old = inp.get("old_string")
                    new = inp.get("new_string")
                    if not isinstance(old, str) or not isinstance(new, str):
                        continue
                    if text is None:
                        print("STRREPLACE_BEFORE_WRITE", line_no, file=sys.stderr)
                        continue
                    if old not in text:
                        print("OLD_NOT_FOUND line", line_no, "old_len", len(old), file=sys.stderr)
                        return 2
                    text = text.replace(old, new, 1)
                    ops += 1

    if not text:
        print("NO_HOME_PAGE_IN_TRANSCRIPT", file=sys.stderr)
        return 3

    out = repo / "app" / "page.tsx"
    out.write_text(text, encoding="utf-8")
    print("OK", out, "ops", ops, "chars", len(text))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
