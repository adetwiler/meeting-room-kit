# Modules: the contract

> **Status: DESIGNED, NOT BUILT.** Decided by grill 2026-07-31. Written before any code so the
> two products that will adopt it cannot drift apart, which is the failure this whole shape
> exists to avoid.

## What changed, and why the README promise is going

The kit shipped as *"no server, no database, no accounts, and no credentials in the thing you
deploy."* That was a real differentiator and it is being **replaced on purpose**, by the owner,
while nobody is depending on it yet:

> *"So no one is using it yet, we should change the promise to configurable for your needs, and
> make it to where we have the add-ons sort of like we do for the Attention Hub, so people can
> make their own modules, and we can give them a sample server with some basic functionality."*

The new promise is **configurable for your needs**: run the page alone, run it with the sample
server, or run it with your own modules. The zero-config path does not go away, it stops being
the only path.

## ⚠️ Before you build a "server feature", check whether it is already in the client

This is the first rule because it was nearly the first mistake. The vendored **LiveKit client
1.8.0 already contains** most of what a meeting server is usually asked for:

| Want | Already in the bundle | Wired? |
|---|---|---|
| File sharing | `sendFile` + `registerByteStreamHandler` | no |
| Streamed text responses | `sendText` + `registerTextStreamHandler` | no |
| Profile pictures, presence detail | `setAttributes` / `setMetadata` | no |
| Connection quality | `ConnectionQualityChanged` | yes, but painted for the LOCAL participant only |
| **Who is muted** | `TrackMuted` / `TrackUnmuted` + the roster | **already built.** Click the people chip |

**None of those need a server.** A module that adds file sharing is a CLIENT module. Reach for
the server only when the browser genuinely cannot do the thing.

## The two kinds

### Client module (the default)

A JS file the page loads. It receives the LiveKit `Room` and a small host API, and it can add a
panel, a control, or a track handler. **No server, no build step, no account.** Someone can write
and share one with nothing but a text editor, which is the point.

### Server module (opt-in)

For the things a browser cannot do, and only those:

- **accounts and admission** (a waiting room, real identities)
- **persistence** (a file that outlives the call, an avatar that survives a reload)
- **egress and transcription filing** (recording, then attributing and storing it)

A deployment with no server runs client modules and simply does not offer the rest. That is a
smaller product, not a broken one, and the UI says which.

## The rules both products hold

1. **`userDir` IS SACRED. An update never touches anything under it.** Lifted from the Attention
   Hub's `config.ts`, which already carries this obligation for whoever builds this.
2. **Existing config shapes GROW, never get replaced.** The hub's warning applies here verbatim:
   a release that gives someone modules and quietly stops reading the config they wrote on their
   first day breaks them on the update meant to help them.
3. **Enabled modules are a list in config.** Empty means core defaults.
4. **A module declares which kind it is.** A client module that quietly needs a server is the
   failure mode that makes the whole system untrustworthy.
5. **A missing module is honest, never silent.** The surface says it is not installed.

## Accounts are ASYMMETRIC, and that is the whole design

Decided 2026-08-01. The instinct with "add accounts" is to make everyone sign in. For a meeting
room that is backwards, and expensively so.

**Guests never register.** A client is in one room, once. Asking them to make an account is
friction at the worst possible moment in the relationship, and it buys nothing: you can see them
on video, and their name is already on their tile and in the transcript.

**Hosts sign in, by MAGIC LINK.** A host is the one who needs real identity, because a host mints
rooms, admits people, and owns the recording and the transcript. Email a one-time link, set a
signed cookie, done. No passwords to store and no OAuth app to register and get reviewed, which
matters more than it sounds: a week was lost this month to one provider's app review.

**The shape follows the usage:** many one-off guests, a handful of repeat hosts. Anything that
taxes the many to identify the few is the wrong trade.

This is a **server module** by the split above, since it needs to send mail, sign cookies and keep
state. A deployment without it still runs: everyone is a guest, links are the access control, and
the UI says so rather than pretending.

## Identity, and why it is smaller than it looks

Speaker attribution needs **no diarization and no voice fingerprinting.** Every participant in a
WebRTC call publishes their own audio track, and LiveKit's **Participant Egress / Track Egress**
write one file per speaker (RoomComposite and Web egress MIX them, which is the trap). So:

```
name at join -> participant identity -> per-track egress -> transcribe per file -> "Alex said X"
```

Exact rather than inferred. **The only missing link is the name**, because identity defaults to
`guest-<random>`. A join-screen name prompt is therefore not cosmetic: it is what makes an
attributed transcript possible at all, and it is the cheapest piece in the chain.

Assured identity is a separate question from a display name, and this kit does not pretend
otherwise. A name is ASSERTED. Verifying it needs accounts, which is a server module.

## Adoption

Designed here, adopted by both this kit and the Attention Hub. The hub's `ModulesConfig` is
currently a placeholder (`{ enabled: string[] }`) with no implementation, so nothing has to be
unpicked there, and the two must not be written months apart by different sessions.
