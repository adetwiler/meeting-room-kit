# Gotchas

Things that cost real time, written down so they cost you none. Both of these fail in the
same nasty way: **they look like a limit on your account when they are a mistake in your
own code.**

## 1. A LiveKit 401 usually means your token is wrong, not your plan

Every server API call is authorized by a JWT you sign yourself. When the claims are wrong,
LiveKit answers:

```json
{"code":"unauthenticated","msg":"permissions denied"}
```

That is the **exact same response** you would get if the capability were genuinely
unavailable. The API cannot tell you which it is, so it is easy to conclude "recording is not
on my plan" and design around a wall that is not there.

### The claim shapes are not uniform

This is the part that catches people. Room and egress grants live **inside** `video`. The SIP
grant is a **sibling** of `video`, at the top level:

```js
// rooms
{ video: { roomList: true } }

// recording. Needs roomRecord, and it is easy to omit because the name does not
// obviously map to "list the recordings".
{ video: { roomAdmin: true, roomRecord: true } }

// SIP. NOT nested under video. Nesting it here fails identically to a plan restriction.
{ sip: { admin: true, call: true } }
```

### The rule

**Before you conclude a capability is unavailable, vary the claim shape and probe again.**
Only a failure that survives every plausible shape tells you anything about your account.

A quick probe beats reading the dashboard, because a dashboard shows what you are *entitled*
to while a probe shows what your *credentials can actually do*. Those differ more often than
you would like.

> Written after making this mistake twice in ten minutes, the second time inside a tool
> written specifically to avoid it, which shipped with a comment warning about the trap and
> then reported SIP as blocked anyway. Encoding a lesson in a tool does not make the tool
> obey it.

## 2. Serving the room privately over a WireGuard-style mesh (Tailscale)

You do not have to put a meeting room on the public internet. A mesh VPN gives every device a
stable name, and the room can be reachable only to those devices. Three things bite.

### HTTPS is mandatory, and not for the reason you think

`getUserMedia` requires a **secure context**. Plain HTTP means no camera and no microphone, so
the room is not merely insecure, it is non functional. The same restriction blocks service
workers, "Add to Home Screen", and Web Push, so HTTPS also decides whether the room can behave
like an installed app on a phone.

Tailscale issues real certificates for machine names, so this is free. Use it.

### There are only three HTTPS ports, and one is often taken

`tailscale serve` accepts `--https` on **443, 8443, and 10000** only. If something else already
holds 443 on that machine, serve will **accept your configuration and silently never bind**.
The symptom is a TLS handshake that succeeds while presenting a certificate for a completely
different hostname, which reads like a certificate problem and is not.

Check what answers before you assume the config is wrong:

```sh
echo | openssl s_client -connect <machine-ip>:443 -servername <machine>.<tailnet>.ts.net 2>/dev/null \
  | openssl x509 -noout -subject
```

If the subject is not your machine, something else owns that port. Move to 8443 or 10000, or
serve under a path.

### Serve cannot proxy to the machine's own mesh IP

This is the one that will eat an hour. If your app binds to the machine's mesh IP and you point
`tailscale serve` at that same address, the request **loops**. What you observe is a clean TLS
handshake, the request sent, and then nothing at all until it times out. It looks exactly like a
dead backend.

The proxy target has to be `127.0.0.1`. If your app deliberately binds to the mesh IP so mesh
devices can reach it directly, run **two listeners over one handler**:

```js
const handler = (req, res) => { /* ... */ }

// what mesh devices reach directly, and what any existing links already point at
createServer(handler).listen(PORT, MESH_IP)

// what the HTTPS proxy talks to. 127.0.0.1 and not 0.0.0.0, so this adds a proxy
// path without adding an exposure.
createServer(handler).listen(PORT, '127.0.0.1')
```

Bind `127.0.0.1` rather than `0.0.0.0`. Localhost is not reachable from any other machine, so
you gain the proxy without widening what is exposed. Keeping the original listener also means
links people have already saved keep working.

## 3. Do not trust an exit code as evidence of anything

A theme connects all of the above, and it is worth stating on its own.

A handshake that succeeds is not a response. A `200` is not the content you wanted. A process
that exits `0` did not necessarily do the thing. Check the artifact: the row in the database,
the bytes on disk, the transcript that actually contains words.

Every failure in this document presents as success at the layer most people check.
