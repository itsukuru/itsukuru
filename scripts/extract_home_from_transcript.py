"""Extract last Write contents for app/page.tsx from a Cursor agent transcript JSONL."""
from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    transcript = (
        root.parent
        / ".cursor"
        / "projects"
        / "empty-window"
        / "agent-transcripts"
        / "0d0965bf-18e5-4e1e-bca9-8acd47d3473d"
        / "0d0965bf-18e5-4e1e-bca9-8acd47d3473d.jsonl"
    )
    if not transcript.is_file():
        print("MISSING", transcript, file=sys.stderr)
        return 1

    last_write: str | None = None
    with transcript.open(encoding="utf-8") as f:
        for line in f:
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
                if not isinstance(block, dict):
                    continue
                if block.get("type") != "tool_use":
                    continue
                if block.get("name") != "Write":
                    continue
                inp = block.get("input") or {}
                p = inp.get("path", "")
                if not str(p).replace("\\", "/").endswith("app/page.tsx"):
                    continue
                last_write = inp.get("contents")
                if isinstance(last_write, str):
                    pass  # keep

    if not last_write:
        print("NO_WRITE_FOUND", file=sys.stderr)
        return 2

    out = root / "app" / "page.tsx"
    out.write_text(last_write, encoding="utf-8")
    print("WROTE", out, "bytes", len(last_write.encode("utf-8")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
