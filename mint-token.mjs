#!/usr/bin/env node
// mint-token: make a join link for the static meeting room.
//
//   LIVEKIT_URL=wss://your-project.livekit.cloud \
//   LIVEKIT_API_KEY=... LIVEKIT_API_SECRET=... \
//   node mint-token.mjs --room standup --identity sam --hours 4 --base https://your-room-host
//
// WHY THIS IS A SEPARATE SCRIPT and not part of the page: the API SECRET must never reach a
// browser. It signs a short-lived token here; the browser only ever receives that token,
// scoped to ONE room, with an expiry. So the room can be hosted on a plain static host with
// no server and no credentials, and a leaked link expires on its own.
//
// No dependencies: an access token is just an HS256 JWT, and node ships the crypto for it.

import { createHmac } from "node:crypto";

const args = process.argv.slice(2);
const flag = (n, d = null) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };

const url = process.env.LIVEKIT_URL || flag("--url");
const key = process.env.LIVEKIT_API_KEY || flag("--key");
const secret = process.env.LIVEKIT_API_SECRET || flag("--secret");
const room = flag("--room");
const identity = flag("--identity");
const base = flag("--base", "");
const hours = Number(flag("--hours", "4"));

const missing = [["LIVEKIT_URL", url], ["LIVEKIT_API_KEY", key], ["LIVEKIT_API_SECRET", secret],
                 ["--room", room], ["--identity", identity]].filter(([, v]) => !v).map(([n]) => n);
if (missing.length) {
  console.error(`mint-token: missing ${missing.join(", ")}\n` +
    `  LIVEKIT_URL=wss://... LIVEKIT_API_KEY=... LIVEKIT_API_SECRET=... \\\n` +
    `    node mint-token.mjs --room standup --identity sam [--hours 4] [--base https://your-room-host]`);
  process.exit(1);
}

const b64 = (b) => Buffer.from(b).toString("base64url");
const now = Math.floor(Date.now() / 1000);
// Clamped: 0 expires instantly (a link that looks fine and is not), and an unbounded token is
// a permanent credential sitting in a URL.
const ttl = Math.min(24, Math.max(1, Number.isFinite(hours) ? hours : 4)) * 3600;

const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const payload = b64(JSON.stringify({
  iss: key, sub: identity, name: identity, nbf: now - 10, exp: now + ttl,
  // `hidden` is deliberately never set. An invisible participant is the opposite of the
  // room's promise that nobody is heard without it showing on their tile.
  video: { room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true },
}));
const token = `${header}.${payload}.${createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url")}`;

const link = `${base.replace(/\/$/, "")}/?liveKitUrl=${encodeURIComponent(url)}&token=${token}`;
console.log(`\n  room:     ${room}`);
console.log(`  identity: ${identity}`);
console.log(`  expires:  ${new Date((now + ttl) * 1000).toISOString()}`);
console.log(`\n${base ? link : token}\n`);
if (!base) console.log("  (no --base given, so that is the raw token)\n");
