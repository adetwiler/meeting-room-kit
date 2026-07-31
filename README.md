# Meeting room kit

A **static** web page that hosts a real video meeting: camera, microphone, screen share, text
chat, and a live transcript. **No server, no database, no accounts, and no credentials in the
thing you deploy.**

Drop `public/` on any static host and it works.

> ⚠️ **[docs/BROWSER-SUPPORT.md](docs/BROWSER-SUPPORT.md)** - READ THIS BEFORE TRUSTING THE
> TRANSCRIPT. The call works nearly everywhere; the transcript does not, **Brave fails while
> looking like it works**, and even where it works the API drops words by design.
> 📄 **[GUIDE.html](GUIDE.html)** - open it in a browser. How it works, what it costs, how to set
> it up, and the things that will bite you.
> 🪤 **[docs/GOTCHAS.md](docs/GOTCHAS.md)** - two ways this stack fails while looking
> like a limit on your account: LiveKit token claim shapes, and serving the room privately
> over a mesh VPN.
> 🏢 **[docs/ENTRA-SETUP.md](docs/ENTRA-SETUP.md)** - real identities from Microsoft Entra, one
> shared link, a waiting room, transcripts filed automatically. All four need the same small
> backend; this is the build order and the traps.
> 💷 **[docs/COST-COMPARISON.md](docs/COST-COMPARISON.md)** - public list prices, what per-seat
> costs at 25 to 250 people, what this costs instead, and when buying a product is the better
> answer.

## Quick start

```bash
LIVEKIT_URL=wss://your-project.example \
LIVEKIT_API_KEY=... LIVEKIT_API_SECRET=... \
node mint-token.mjs --room standup --identity sam --hours 4 --base https://your-room-host
```

Host `public/` anywhere static. **HTTPS is required** - browsers refuse camera and microphone
access on plain HTTP. Send each person **their own** link: identity lives in the token, so two
people on one link collide and the server evicts one of them.

## The memory panels (optional, and host-only by design)

Ask, Brief and Client answer questions from a knowledge source **on the host's machine**, via
`bridge.mjs`. It binds loopback, so a guest's browser cannot reach it - that is the security
model, not a bug. Guests are told plainly, and the host gets a **Present** button that
broadcasts what they are looking at over the data channel.

Guests can still ASK: the question is relayed, the host's browser answers it **scoped to the
asker's own identity**, and the result comes back. Nobody but the host ever touches the
knowledge source.

```
ROOM_ORIGIN=https://your-room-host ASK_CMD=/path/to/your-search node bridge.mjs
```

`ASK_CMD` is any executable you own, called as `ASK_CMD <who> --json -n 4 <question>`. What a
given `who` may see is **your command's** job - scope it there, and refuse unknown names.

## Meeting policy

Some rooms must not transcribe, or must not reach a knowledge source at all:

```
?notx=1     nothing is transcribed, and the room says so
?nomem=1    Ask / Brief / Client are absent for everyone
```

Announced on the pre-join screen, before anyone is in the room. ⚠️ **This is a policy, not a
wall** - the flags ride in the URL. It stops the room doing something by default and tells
everyone what it is for; it does not defend against the person you invited.

## What it does

- Video, audio, screen share, text chat, live transcript
- **Joins with mic and camera OFF.** You choose before entering, so opening a link costs nothing
  and grants nothing - the browser only asks for permission if you opt in.
- **Mute is mechanical.** Muting *unpublishes* the track: nothing is transmitted, and the local
  transcriber is aborted rather than stopped, so buffered audio is discarded instead of flushed.
- Microphone, camera and speaker pickers, before and during the call, remembered between visits
- Who is here, connection quality, reconnecting state, copy-invite
- Screen share asks Chrome for its native *"Share this tab instead"* button

## What it deliberately does not do

**Recording.** In any regulated setting that is the first question, not a later feature: consent,
retention, who may read it afterwards, and whether it may exist at all. That belongs to whoever
owns the compliance posture. The room states its capture state permanently in the header, because
the useful signal is the explicit negative rather than silence.

## Contributing

Pull requests welcome. Run `.githooks/install.sh` once per clone - it sets `core.hooksPath` so
the pre-commit gates run.

## License

MIT (see [LICENSE](LICENSE)).

`public/vendor/livekit-client.umd.js` is the **LiveKit JavaScript client SDK**, Apache-2.0,
vendored unmodified so the page has no CDN dependency and works offline. Its copyright and
license are the upstream project's.

Everything else is a thin wrapper: one HTML page and one token script, plain standard-library
code, no dependencies, no proprietary logic.
