#!/usr/bin/env node
// bridge: let the meeting room answer questions from YOUR knowledge source, safely.
//
//   ROOM_ORIGIN=https://your-room-host \
//   ASK_CMD="/path/to/your-search" \
//   node bridge.mjs
//
// ── WHAT THIS IS FOR ────────────────────────────────────────────────────────────────────
// The room is a static page with no server and no secret. That is deliberate, and it means
// the page cannot reach anything private. This bridge is the deliberate, narrow exception:
// a LOCAL process on the HOST's machine that the room may ask questions of.
//
// ── THE PART PEOPLE GET WRONG ───────────────────────────────────────────────────────────
// 🔴 IT IS THE HOST'S, AND ONLY THE HOST'S. It binds 127.0.0.1, so a guest's browser looks
// for it on THEIR machine and finds nothing. That is not a bug to fix - it is the security
// model. A guest must never be able to query someone else's knowledge base.
//
// So the room shows guests an honest "ask the host to press Present" and gives the HOST a
// Present button, which broadcasts what they are looking at over the meeting's data channel.
// The host chooses what is shared; nobody reaches in.
//
// ── WHY IT IS SHAPED LIKE THIS ──────────────────────────────────────────────────────────
//   1. LOOPBACK ONLY. Never reachable from the network.
//   2. ORIGIN ALLOWLIST. Only the room may call it.
//   3. ONE QUESTION SHAPE. A general "run a command" endpoint on localhost is a
//      remote-code-execution hole with a friendly name.
//   4. execFile WITH AN ARGV ARRAY. The question is an argument, never part of a shell
//      string, so a question mark or a semicolon is just text.
//   5. READ ONLY. There is no write path here at all.
//
// ── THE CONTRACT ────────────────────────────────────────────────────────────────────────
// ASK_CMD is any executable you own. It is called as:
//     ASK_CMD <who> --json -n 4 <question>
// and must print JSON: { "results": [ { "source": "...", "heading": "...", "text": "..." } ] }
//
// `who` is a name the room supplies (the other participant's identity). What that name is
// ALLOWED to see is YOUR command's job, not this bridge's - scope it there, and default to
// refusing an unknown name rather than answering broadly.
//
// CLIENTS_DIR is optional: a folder of <slug>/RESEARCH.md files served to the Client tab.

import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.env.BRIDGE_PORT || 4795);
const ASK_CMD = process.env.ASK_CMD || "";
const CLIENTS_DIR = process.env.CLIENTS_DIR || "";
const ORIGINS = new Set(
  (process.env.ROOM_ORIGIN || "http://localhost:4321")
    .split(",").map((o) => o.trim()).filter(Boolean),
);

const send = (res, code, body, origin) => {
  const h = { "content-type": "application/json" };
  if (origin && ORIGINS.has(origin)) {
    h["access-control-allow-origin"] = origin;
    h["access-control-allow-headers"] = "content-type";
    h["vary"] = "origin";
  }
  res.writeHead(code, h);
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  const origin = req.headers.origin || "";
  if (req.method === "OPTIONS") return send(res, 204, {}, origin);
  if (!ORIGINS.has(origin)) return send(res, 403, { ok: false, message: "origin not allowed" }, origin);

  const isAsk = req.url.startsWith("/ask");
  const isClient = req.url.startsWith("/client");
  if (req.method !== "POST" || (!isAsk && !isClient)) {
    return send(res, 404, { ok: false, message: "POST /ask or /client only" }, origin);
  }

  let raw = "";
  req.on("data", (c) => { raw += c; if (raw.length > 4000) req.destroy(); });
  req.on("end", () => {
    let body;
    try { body = JSON.parse(raw); } catch { return send(res, 400, { ok: false, message: "bad json" }, origin); }

    if (isClient) {
      if (!CLIENTS_DIR) return send(res, 404, { ok: false, message: "CLIENTS_DIR is not set" }, origin);
      const slug = typeof body.client === "string" ? body.client : "";
      // A plain slug ONLY. This is the whole path defence: no dots, no slashes, so it can
      // never walk out of CLIENTS_DIR into the rest of the disk.
      if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(slug)) {
        return send(res, 400, { ok: false, message: "client must be a plain slug" }, origin);
      }
      const md = join(CLIENTS_DIR, slug, "RESEARCH.md");
      if (!existsSync(md)) return send(res, 404, { ok: false, message: `no research for '${slug}'` }, origin);
      return send(res, 200, { ok: true, client: slug, markdown: readFileSync(md, "utf8") }, origin);
    }

    if (!ASK_CMD) return send(res, 404, { ok: false, message: "ASK_CMD is not set" }, origin);
    const who = typeof body.who === "string" ? body.who : "";
    const q = typeof body.q === "string" ? body.q.trim() : "";
    if (!who) return send(res, 400, { ok: false, message: "who is required" }, origin);
    if (!q) return send(res, 400, { ok: false, message: "ask something" }, origin);

    execFile(ASK_CMD, [who, "--json", "-n", "4", q], { timeout: 25000 }, (err, stdout) => {
      if (err) return send(res, 500, { ok: false, message: "the search command failed" }, origin);
      let parsed;
      try { parsed = JSON.parse(stdout); } catch { return send(res, 500, { ok: false, message: "the search command returned nothing usable" }, origin); }
      const results = Array.isArray(parsed.results) ? parsed.results : [];
      send(res, 200, {
        ok: true, who, q, count: results.length,
        results: results.map((r) => ({ source: r.source, heading: r.heading, text: r.text })),
      }, origin);
    });
  });
}).listen(PORT, "127.0.0.1", () => {
  console.log(`bridge on http://127.0.0.1:${PORT}`);
  console.log(`  origins : ${[...ORIGINS].join(", ")}`);
  console.log(`  ask     : ${ASK_CMD || "(ASK_CMD not set - /ask disabled)"}`);
  console.log(`  clients : ${CLIENTS_DIR || "(CLIENTS_DIR not set - /client disabled)"}`);
  console.log(`  loopback only. the HOST's machine only. guests cannot reach this, by design.`);
});
