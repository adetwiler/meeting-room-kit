// Regression tests for the two things that only break on a phone, and that a resized desktop
// window will never reproduce: the footer sliding under the iOS toolbar, and inbound audio
// being blocked with nothing on screen to unblock it.
//
// Every assertion reads public/index.html itself. A copy of the logic pasted in here would
// keep passing after someone changed the page, which is the one failure this file exists to
// catch.
//
//   node --test scripts/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const PAGE = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'index.html')
const html = readFileSync(PAGE, 'utf8')

// ---------------------------------------------------------------- the viewport half

test('the viewport opts into the full screen, which is what makes env() non-zero', () => {
  const meta = html.match(/<meta name="viewport"[^>]*>/)
  assert.ok(meta, 'no viewport meta tag')
  assert.match(meta[0], /viewport-fit=cover/)
})

test('height is 100dvh with the 100% fallback declared ABOVE it, never below', () => {
  const pct = html.indexOf('html,body{height:100%}')
  const dvh = html.indexOf('html,body{height:100dvh}')
  assert.ok(pct !== -1, 'the 100% fallback line is gone')
  assert.ok(dvh !== -1, 'the 100dvh line is gone, so iOS is back to the tallest viewport')
  // Order is the whole point of two lines. A browser that cannot parse dvh drops that
  // declaration and keeps whatever came before, so putting the fallback second would
  // overwrite the fix everywhere instead of backstopping it.
  assert.ok(pct < dvh, '100% must come first or it overrides the dvh fix')
})

test('both bars inset themselves on all four sides, not just the bottom', () => {
  // Landscape is the case that gets missed: the notch moves to the side, so a bottom-only
  // inset still puts Leave under hardware once the phone turns.
  for (const [bar, sides] of [['header', ['top', 'left', 'right']], ['footer', ['bottom', 'left', 'right']]]) {
    const rule = html.match(new RegExp(`\\n  ${bar}\\{padding-[\\s\\S]*?\\}`))
    assert.ok(rule, `no safe-area rule for ${bar}`)
    for (const side of sides) {
      assert.match(rule[0], new RegExp(`env\\(safe-area-inset-${side},0px\\)`), `${bar} ignores the ${side} inset`)
    }
  }
})

// ---------------------------------------------------------------- the blocked-audio half

test('the button and its styles are both present, and it starts hidden', () => {
  assert.match(html, /<button id="unblock">/)
  assert.match(html, /Tap to hear everyone/)
  assert.match(html, /#unblock\{display:none;width:100%/, 'the gate must start hidden and be full width')
  assert.match(html, /#unblock\.on\{display:inline-flex\}/)
})

test('the LiveKit event is wired to the painter', () => {
  assert.match(html, /\.on\(LK\.RoomEvent\.AudioPlaybackStatusChanged, \(\) => paintAudioGate\(\)\)/)
})

// The gate is lifted out of the page and executed, so these are the shipped bytes running.
const GATE = html.match(/ {2}const unblockBtn = [\s\S]*?unblockBtn\.onclick = [^\n]*\n/)
test('the gate block is still findable in the page', () => {
  assert.ok(GATE, 'the audio gate was renamed or removed')
})

/** Minimal stand-ins for the two globals the gate closes over. */
function harness (canPlaybackAudio, startAudio) {
  const on = new Set()
  const button = {
    onclick: null,
    classList: { toggle: (name, want) => { want ? on.add(name) : on.delete(name) } }
  }
  const document = { getElementById: (id) => (id === 'unblock' ? button : null) }
  const room = { canPlaybackAudio, startAudio: startAudio || (() => Promise.resolve()) }
  const build = new Function('document', 'room', GATE[0] + '\nreturn { paintAudioGate }')
  return { ...build(document, room), button, shown: () => on.has('on') }
}

test('blocked audio shows the button, and unblocking hides it again', () => {
  const blocked = harness(false)
  blocked.paintAudioGate()
  assert.equal(blocked.shown(), true, 'audio is blocked and nothing offers a way out')

  const fine = harness(true)
  fine.paintAudioGate()
  assert.equal(fine.shown(), false, 'the gate is permanent chrome for people who never hit it')
})

test('the tap calls startAudio SYNCHRONOUSLY, because a gesture does not survive an await', () => {
  let calledAt = null
  let ticks = 0
  const h = harness(false, () => { calledAt = ticks; return Promise.resolve() })
  h.button.onclick()
  ticks++
  assert.equal(calledAt, 0, 'startAudio was deferred, so the user gesture is already spent')
  // Belt and braces: an await anywhere in the handler is the exact regression above, and it
  // is easy to reintroduce while "tidying up" the callback into an async function.
  assert.ok(!/unblockBtn\.onclick = async/.test(GATE[0]), 'the handler went async')
  assert.ok(!/await/.test(GATE[0].split('onclick')[1]), 'the handler awaits before startAudio')
})

test('a rejected startAudio is swallowed, not thrown at the page', () => {
  const h = harness(false, () => Promise.reject(new Error('still blocked')))
  assert.doesNotThrow(() => h.button.onclick())
})
