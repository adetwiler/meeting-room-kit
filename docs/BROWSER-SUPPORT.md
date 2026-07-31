# Browsers, and what the transcript can honestly promise

Read this before anyone relies on the transcript. The video call works nearly everywhere; the
**transcript does not**, and one browser fails in a way that looks like success.

## Short version

| Browser | Call | Transcript | Speaker picker |
|---|---|---|---|
| Chrome | ✅ | ✅ | ✅ |
| Edge | ✅ | ✅ | ✅ |
| Safari | ✅ | partial | ❌ |
| Firefox | ✅ | ❌ | ❌ |
| **Brave** | ✅ | ❌ **and it used to lie about it** | ✅ |

---

## 🔴 Brave: the API exists, and it never returns anything

**Brave ships the Web Speech API surface but does not back it with a working service.**
`webkitSpeechRecognition` is present, feature detection passes, `start()` succeeds, and **no
result is ever delivered.**

That is the worst possible failure mode for a capture feature, because it looks like it is
working. In a two-person call it presents as *"the transcript is labelling everyone as the other
person"* - which is not a labelling bug at all. The other person's browser is transcribing
correctly; yours is capturing nothing, so every line in the transcript genuinely is theirs.

This is [open upstream since 2019](https://github.com/brave/brave-browser/issues/2802) and the
newer on-device path is [also broken](https://github.com/brave/brave-browser/issues/55414):
`SpeechRecognition.available()` reports `"downloading"` and never completes, because Brave
disables the component that hosts the speech model while leaving the JavaScript API visible.

**What this room does about it:** it detects Brave via `navigator.brave.isBrave()` and says
**"not supported in this browser"** rather than "listening". A watchdog also catches any other
browser that pretends: if recognition starts with a live microphone and produces neither an
`onstart` nor a result within 8 seconds, it downgrades to the same honest message.

**If you are on Brave and want a transcript, use Chrome or Edge for the call.** Everything else
in the room works fine in Brave.

---

## ⚠️ Even where it works, words get dropped. This is structural.

The Web Speech API is a **dictation** API, not a meeting transcription engine.

- Sessions **end themselves after a few seconds of silence**, even with `continuous = true`.
  Widely reported at 3 to 4 seconds, and believed to be a bandwidth measure, since by default
  audio is sent to a server-side recognition engine rather than processed locally.
- The standard workaround is to restart in `onend`, which this room does. **That restart is
  lossy:** anything spoken while the session is tearing down and re-initializing belongs to no
  session and is simply gone.
- `onend` **is not dependable** either. Chromium has a long-standing report of it never firing in
  continuous mode, leaving recognition hung. A watchdog is required alongside it, not instead.
- MDN classes the interface as **limited availability**, explicitly not Baseline.

**So: treat the browser transcript as a LIVE PREVIEW, not a record.** It is genuinely useful for
following along and for catching decisions in the moment. It is not something to hand to someone
who missed the meeting and call complete, and it should never be the basis of a compliance record.

### If you need an accurate transcript

Capture audio in parallel (`MediaRecorder`) and stream it to a dedicated speech-to-text service,
using the browser API only for the low-latency preview. That means a backend, a cost per minute,
and audio at rest - which is exactly the recording question this room deliberately leaves to
whoever owns the compliance posture. See [ENTRA-SETUP.md](ENTRA-SETUP.md).

---

## Everything else

- **HTTPS is required** in every browser. No camera or microphone on plain HTTP.
- **Device names are hidden until permission is granted.** Before you turn on a mic, the pickers
  can only show generic entries. That is the browser, not the page.
- **Speaker selection** uses `setSinkId`, which Safari and Firefox do not implement. The row
  hides itself there rather than offering a control that does nothing.
- **"Share this tab instead"** is a Chrome and Edge feature, and it only fast-switches **tabs**.
  Sharing a whole window or the full screen will not offer it.

**Sources:** [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API) ·
[continuous property](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/continuous) ·
[Chromium onend issue](https://issues.chromium.org/issues/40324711) ·
[W3C continuous-listening discussion](https://github.com/WebAudio/web-speech-api/issues/99)
