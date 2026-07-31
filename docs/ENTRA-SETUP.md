# Wiring this room to Microsoft Entra ID

**Read this if you want real identities, one shared meeting link, a waiting room, or transcripts
filed automatically.** All four need the same small backend, and this is how to build it.

If you only need a room where each person gets their own link, you do **not** need any of this.
The static page works as-is with no server and no secret. Stop here.

---

## Why a backend is needed at all

This is not an architectural preference, it is forced by one rule:

> **A LiveKit participant identity must be unique within a room. If a second connection uses an
> identity that is already present, the server DISCONNECTS the first one** with reason
> `DUPLICATE_IDENTITY`.

Identity comes from the `sub` claim of a signed token, so a browser cannot change it. Therefore
**one shared link carrying one fixed token means every joiner evicts the previous one.** It does
not error; it looks like a random disconnect bug.

So a shared link requires something that mints a *fresh identity per visitor*. That something
holds the API secret, and it is the same place you attach login, admission and filing.

⚠️ **Never auto-reconnect on `DUPLICATE_IDENTITY`.** Two tabs will evict each other forever.

---

## What you are building

```
browser ──► /api/token  ──► validates the user's Entra ID token
                          ──► mints a LiveKit token with a VERIFIED identity
                          ◄── returns only that LiveKit token
```

The browser never sees the LiveKit API secret and never chooses its own identity.

---

## 1. Register the application in Entra

Microsoft Entra admin center → **Identity → Applications → App registrations → New
registration**.

1. Name it whatever the room is called.
2. **Supported account types:** single tenant, unless you genuinely need guests from other
   tenants.
3. **Redirect URI:** platform **Web**, value `https://<your-room-host>/auth/callback`.

Then, and this is the step people miss:

4. Go to **Authentication → Implicit grant and hybrid flows** and tick **ID tokens**.
   **ID tokens are not issued by default.** Without this you will get a working login that
   returns nothing you can identify a person with.

5. **Certificates & secrets → New client secret.** The value is **shown once**. Put it straight
   into **Azure Key Vault**, never into the repo, and never into a `.env` that gets committed.

6. **API permissions:** the default Microsoft Graph `User.Read` is enough for basic identity. Add
   group claims only if you intend to derive room permissions from group membership.

Record three values: **Tenant ID**, **Client ID**, **Client secret**.

---

## 2. Sign the user in

Use **authorization code flow with PKCE**. Do not hand-roll it.

> Microsoft's own guidance is explicit: do not craft your own library or raw HTTP calls for
> authentication flows. Use **MSAL** (`@azure/msal-node`, `@azure/msal-browser`) or
> **Microsoft.Identity.Web** for .NET.

⚠️ **Token lifetime gotcha.** Entra sets **different lifetimes** on ID tokens and access tokens,
and **MSAL does not automatically renew ID tokens**. You can pull an expired ID token out of the
MSAL cache while the access token is still perfectly valid. Validate `exp` yourself before you
trust an ID token, and re-acquire rather than assuming the cache is current.

---

## 3. Validate before you mint anything

This is the security boundary. Everything downstream trusts it.

- Fetch the signing keys from the tenant's **OpenID configuration document**
  (`https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration`). Do not
  hardcode keys; they rotate.
- Verify the **signature**.
- Verify **`aud`** equals your Client ID.
- Verify **`iss`** is exactly `https://login.microsoftonline.com/{tid}/v2.0`, where `{tid}` is
  the token's own `tid` claim. For multi-tenant, substitute the placeholder from metadata and
  compare exactly. **Never do a loose or prefix match on the issuer.**
- Verify **`exp`** and **`nbf`**.

If any check fails, return 401 and mint nothing.

---

## 4. Map Entra claims onto the LiveKit token

| LiveKit field | Entra claim | Why |
|---|---|---|
| `identity` (`sub` of the LiveKit token) | **`oid`** | Immutable per user per tenant. Email addresses change; `oid` does not. |
| `name` (display) | `name` or `preferred_username` | What appears on tiles and in the transcript. |
| grants (`roomJoin`, `canPublish`, …) | derived from **group / role claims** | |

🔴 **Derive every grant server-side.** Nothing about permissions may come from the request body.
A client that can ask for `roomAdmin` will.

Because `identity` is now the verified `oid`, two consequences fall out for free:

- **The attendee list is real.** Nobody types their own name.
- **Transcript speaker labels are as trustworthy as the work login.**

⚠️ **One person on two devices** will collide on `oid` and evict themselves. Append a device or
session suffix (`{oid}#laptop`) and keep the display `name` clean.

---

## 5. Waiting room (optional)

**LiveKit has no built-in lobby.** The supported pattern is permission promotion:

1. **Mint the guest token with `canPublish: false`** (and `canSubscribe: true`). They connect and
   can see and hear, but cannot be seen or heard.
   Optionally set **`hidden: true`** so they do not appear in the roster while waiting.
2. **The guest knocks** over a data message (`canPublishData: true`), and the host UI shows it.
3. **The host's admit button calls YOUR backend**, which verifies the caller really is the host,
   then calls `UpdateParticipant` with `permission: { canPublish: true, ... }`.
4. The guest's client listens for **`ParticipantPermissionChanged`** and enables their devices.

Gotchas, all of them real:

- **`canPublishSources` supersedes `canPublish`.** If sources are set, granting `canPublish`
  alone will not be enough.
- **Revoking `canPublish` unpublishes their tracks automatically.** For a hard removal use
  **`RemoveParticipant`**.
- **On LiveKit Cloud, updating permissions revokes the current token** and a new one is issued
  automatically. Expect a brief renegotiation.
- **Do not carry admission state in metadata.** There is an open upstream issue where flipping
  roles via `updateParticipant` metadata caused `ParticipantMetadataChanged` to fire
  continuously and oscillate. Use **permissions or attributes**.
- **Test on iOS** if you target it; there is an open Swift SDK issue about admitted participants
  not receiving new permissions.
- A cleaner alternative at scale: keep waiters in a **separate lobby room** and use
  **`MoveParticipant`** to bring them across.

🔴 **A client-side waiting room is not security.** Anything the browser enforces, the browser can
skip. If waiting matters, the permission must be withheld by the token and granted by the server.

---

## 6. Filing the transcript when the meeting ends

The room compiles a transcript in the browser. To file it instead of downloading it, POST it from
the client to your backend at meeting end, and have the backend commit it to your repo (GitHub
API, or Azure DevOps if that is where your repos live).

Two things to decide before you build it, not after:

- **Consent.** Everyone in the room should know the transcript is being kept and where it goes.
  The room states its capture state permanently in the header for this reason.
- **Retention.** A transcript in a repo is forever by default. Decide the deletion story first.

---

## 7. Teams

If your organization runs on Microsoft Teams, the honest question is whether you should be
building this at all. Teams already has identity, lobby, recording and transcription, and it is
already approved by whoever approves things.

This room is worth running when you want something small you fully control, embedded in your own
product, or usable by people who are not in your tenant. If it is only internal meetings between
colleagues who all have Teams, Teams wins, and that is not a defeat.

If you do want both, the sane integration is a **Teams message extension or a tab** that links
into a room, rather than trying to reimplement Teams.

---

## Checklist

- [ ] App registered, **ID tokens ticked**
- [ ] Client secret in Key Vault
- [ ] Token endpoint validates signature, `aud`, `iss` + `tid`, `exp`
- [ ] `identity` = `oid` (+ device suffix), display name = `name`
- [ ] Grants derived server-side only
- [ ] LiveKit API secret only in the backend environment
- [ ] Decided: waiting room yes/no
- [ ] Decided: transcript retention and consent

---

**Sources:** [Entra OIDC](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc) ·
[access-token validation](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens) ·
[LiveKit participant management](https://docs.livekit.io/intro/basics/rooms-participants-tracks/participants/)
