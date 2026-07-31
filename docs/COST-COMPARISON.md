# What meetings and meeting notes cost, and where this fits

**Purpose:** give anyone evaluating this enough numbers to make a build-versus-buy call without
having to go collect them. It is a cost model, not an argument. There are good reasons to buy a
product instead of running this, and they are listed too.

⚠️ **Read the caveats before quoting any number here.** All figures are **public list prices**
captured **30 July 2026**. Vendors change tiers often, most quote **annual** billing (monthly
runs roughly 20 to 40 percent higher), and **list price is rarely what an organisation actually
pays** - it mainly anchors a negotiation. **Verify on each vendor's own pricing page before it
goes in front of a procurement decision.**

---

## The two things being priced

These get conflated and they should not be:

1. **The meeting itself** - carrying video, audio and screen share.
2. **The notes** - transcription and AI summaries on top.

Most organisations already pay for (1) as part of an existing productivity suite. The question
is usually really about (2).

---

## Per-seat list prices (30 July 2026)

### Standalone AI note-takers

| Product | Free tier | Paid | Top tier |
|---|---|---|---|
| Granola | limited | **$14** /user/mo (Business) | **$35** /user/mo (Enterprise: SSO, audit logging, admin controls) |
| Otter | 300 min/mo | ~**$20** /user/mo (Business, annual) | |
| Fireflies | limited | **$19** /user/mo (Business, annual) | $29 monthly billing |
| Fathom | limited | ~**$19** /user/mo (Team) | |

Business tiers cluster at roughly **$19 to $30 per user per month**.

### Platform-native

| Product | List |
|---|---|
| Zoom Workplace incl. AI Companion | ~**$13 to $22** /user/mo, AI included on paid tiers |
| Zoom cross-platform notes add-on | **+$12** /user/mo (joins as a visible bot) |
| Microsoft 365 (Business Basic → E5) | **$6 to $57.75** /user/mo |
| Microsoft 365 Copilot | **+$30** /user/mo on top |

🔴 **The single most important line in this document:** if your organisation already pays for a
suite that includes meetings and transcription, **the marginal cost of using it is zero.** Any
tool you add is an *additional* line item, not a replacement, unless it lets you drop something.

---

## What a per-seat price actually costs at scale

Per-user-per-month numbers feel small and multiply fast. At list:

| Seats | $14/user/mo | $19/user/mo | $30/user/mo | $35/user/mo |
|---|---|---|---|---|
| 25 | $4,200/yr | $5,700/yr | $9,000/yr | $10,500/yr |
| 50 | $8,400/yr | $11,400/yr | $18,000/yr | $21,000/yr |
| 100 | $16,800/yr | $22,800/yr | $36,000/yr | $42,000/yr |
| 250 | $42,000/yr | $57,000/yr | $90,000/yr | $105,000/yr |

Two structural notes:

- **Enterprise tiers usually exist to sell SSO and audit logging**, not better notes. If those
  are mandatory in your environment, the entry tier is not actually available to you and the
  real comparison starts at the top tier.
- **Seats are usually billed for everyone with access**, not everyone who used it that month.

---

## What this room costs

It is **usage-priced, not per-seat**, which is the whole difference.

| | |
|---|---|
| Hosting | **$0** - one static HTML file and a vendored library, under 1 MB, on any static host |
| Media (LiveKit free tier) | **$0** - 5,000 participant-minutes/mo, 50 GB, 100 max participants |
| Media (next tier) | **$50/mo** - 150,000 participant-minutes, 1,000 participants |
| Transcription | **$0** - each browser transcribes its own microphone locally |
| Per-seat cost | **none** |

**Minutes are per participant**, so a two-person call spends 2 minutes per minute of wall clock.

| Plan | Participant-minutes | Roughly |
|---|---|---|
| Free | 5,000 | ~41 hours of 1:1, ~20 hours of 4-person |
| $50/mo | 150,000 | ~1,250 hours of 1:1 |

⚠️ **One number to confirm, not assume:** LiveKit's pricing page says overage on the free tier
bills at standard rates, while their documentation elsewhere describes the free tier as not
permitting overage. Those statements conflict. Pin it down before depending on it.

**So the shape of the comparison is:** per-seat products scale with *headcount*; this scales with
*minutes actually spent in meetings*. Which is cheaper depends entirely on how many people have
access versus how much they meet.

---

## Where a bought product is genuinely the better answer

This is not a pitch. Buy instead of running this when:

- **You need SSO, audit logs, retention policy, eDiscovery or compliance attestations.** These
  are the actual product in enterprise tiers, and reproducing them is not a weekend.
- **Recording matters.** This room deliberately does not record. In a regulated environment that
  is the first question, not a later feature.
- **You need it to work in every browser.** Local transcription relies on a speech API present in
  Chrome and Edge, partial in Safari, absent in Firefox.
- **Someone must own support.** A vendor has a support contract. This has whoever last touched
  the repo.
- **You already pay for a suite that does it.** Then the marginal cost of using what you own is
  zero and nothing here beats zero.

**Where this one wins:** small or occasional usage where per-seat pricing is mostly buying access
for people who rarely meet; embedding a room inside your own product; meeting people outside your
tenant; or wanting no third party holding your audio at all.

---

## Method

Prices were read from vendor pricing pages and public comparisons on **30 July 2026**. Several
widely-cited comparison articles are **published by vendors themselves or are affiliate-linked**,
so they are marketing rather than neutral benchmarking; treat any single-source figure sceptically
and re-verify. Nothing in this document describes any particular organisation, contract, or
negotiated rate.
