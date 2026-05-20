import fs from "node:fs";
import readline from "node:readline";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(repoRoot, "..");
/** 初期の巨大 Write より前の page.tsx 操作はベースラインが異なるため無視する */
const MIN_LINE = 181;
/** SEO 用のサーバー page.tsx 分割より後は無視 */
const MAX_LINE = 3758;
const jsonl = path.join(
  workspaceRoot,
  ".cursor/projects/empty-window/agent-transcripts/0d0965bf-18e5-4e1e-bca9-8acd47d3473d/0d0965bf-18e5-4e1e-bca9-8acd47d3473d.jsonl"
);
const outFile = path.join(repoRoot, "app", "page.tsx");

const isHome = (p) =>
  String(p || "")
    .replace(/\\/g, "/")
    .toLowerCase()
    .endsWith("/app/page.tsx");

function skipServerSplitWrite(contents) {
  const t = String(contents || "");
  if (t.includes("HomePageClient")) return true;
  if (t.includes('import type { Metadata } from "next"') && !t.includes('"use client"'))
    return true;
  return false;
}

function applyPatchToFile(patchText) {
  const m = patchText.match(/\*\*\* Update File:\s*(.+?)\r?\n/);
  if (!m) return false;
  const p = m[1].trim();
  if (!isHome(p)) return false;

  const lines = patchText.split(/\r?\n/);
  let cur = fs.readFileSync(outFile, "utf8");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith("@@")) continue;

    const removed = [];
    const added = [];
    let j = i + 1;
    while (j < lines.length && !lines[j].startsWith("@@") && lines[j] !== "*** End Patch") {
      const L = lines[j];
      if (L.startsWith("-") && !L.startsWith("---")) removed.push(L.slice(1));
      else if (L.startsWith("+") && !L.startsWith("+++")) added.push(L.slice(1));
      else if (L.startsWith(" ") || L === "") {
        removed.push(L.startsWith(" ") ? L.slice(1) : L);
        added.push(L.startsWith(" ") ? L.slice(1) : L);
      } else if (L.startsWith("\\")) {
        /* no newline marker */
      } else {
        removed.push(L);
        added.push(L);
      }
      j += 1;
    }
    i = j - 1;

    const oldBlock = removed.join("\n");
    const newBlock = added.join("\n");
    if (!cur.includes(oldBlock)) {
      console.error("PATCH_OLD_NOT_FOUND", { oldLen: oldBlock.length });
      process.exit(2);
    }
    cur = cur.replace(oldBlock, newBlock);
  }

  fs.writeFileSync(outFile, cur, "utf8");
  return true;
}

let buf = null;
let lineNo = 0;

const rl = readline.createInterface({
  input: fs.createReadStream(jsonl, { encoding: "utf8" }),
  crlfDelay: Infinity,
});

for await (const line of rl) {
  lineNo += 1;
  if (lineNo < MIN_LINE) continue;
  if (lineNo > MAX_LINE) break;
  if (!line.trim()) continue;
  let o;
  try {
    o = JSON.parse(line);
  } catch {
    continue;
  }
  const content = o?.message?.content;
  if (!Array.isArray(content)) continue;
  for (const block of content) {
    if (!block || block.type !== "tool_use") continue;
    const name = block.name;
    const inp = block.input || {};

    if (name === "Write" && isHome(inp.path)) {
      const c = inp.contents;
      if (typeof c !== "string") continue;
      if (skipServerSplitWrite(c)) continue;
      buf = c;
      fs.writeFileSync(outFile, buf, "utf8");
      continue;
    }

    if (name === "StrReplace" && isHome(inp.path)) {
      if (buf === null) {
        buf = fs.readFileSync(outFile, "utf8");
      }
      const oldS = inp.old_string;
      const newS = inp.new_string;
      if (typeof oldS !== "string" || typeof newS !== "string") continue;
      const cur = fs.readFileSync(outFile, "utf8");
      if (!cur.includes(oldS)) {
        console.error("STRREPLACE_FAIL line", lineNo, "old_len", oldS.length);
        process.exit(3);
      }
      const next = cur.replace(oldS, newS);
      fs.writeFileSync(outFile, next, "utf8");
      buf = next;
      continue;
    }

    if (name === "ApplyPatch") {
      const patchText = typeof inp === "string" ? inp : inp?.patch ?? inp?.diff ?? "";
      if (!patchText.includes("app/page.tsx")) continue;
      if (!fs.existsSync(outFile)) {
        console.error("NO_FILE_BEFORE_PATCH");
        process.exit(4);
      }
      applyPatchToFile(patchText);
      buf = fs.readFileSync(outFile, "utf8");
    }
  }
}

console.log("DONE", outFile, "bytes", fs.statSync(outFile).size);
