# Verification — first browser implementation

Executed on 2 November 2026 (Australia/Adelaide). Local command runtime:
Node.js 24.22.1. Tests need Node.js 20 or later and no installed dependencies.

## Executed automated checks

`node --test tests/*.test.cjs`: **20 passed, 0 failed**.

- Full three-district playthroughs in Merciful and Arcade, including collecting
  nine receipts, serving six actors, all district transitions, defeating the
  final auditor and reaching the victory state. The controller drives normal
  left/right, jump, stun and use inputs. It does not teleport entities, inject
  objective completion, bypass collisions or grant invulnerability. Checkpoint
  retries, when needed, use the same method as the retry button.
- Platform landing, jump-height control, jump buffering and coyote time.
- Agent capture, guarded cages and recovery after a stun.
- Developer carrying, stun/drop, vault delivery and recoverability.
- Receipt collection, one-time consumption, no consumption on empty air and
  no repeat rewards. All nine stored hashes match SHA-256 of the exact payload.
- Checkpoint persistence, full-armour retries, hazard cleanup and frozen
  terminal states. Fatal damage cannot simultaneously clear or collect.
- Objective-gated exits and final boss health.
- Deterministic replay of a 10,000-tick input sequence and bounded projectile,
  particle and event pools.
- Keyboard aliases, native form/button keyboard behaviour, pause propagation,
  concurrent touch pointers and cancellation, gamepad pause/resume with a
  neutral-state gate, denied gamepad access and short taps retained until a
  simulation tick consumes them.

Individual mechanics tests arrange explicit fixtures; the two full-campaign
tests are separately identified and do not mutate the running world.

`node scripts/check.cjs`: passed. Checks runtime JavaScript syntax, existing
relative runtime resources, duplicate DOM IDs, shell DOM references, licence
notices and absence of network-loading APIs in runtime JavaScript.

`node scripts/stage.cjs`: passed. Produces a clean static `_site/` containing
the runtime and licence notices. Tests, documentation and preview settings
are not shipped in the Pages artifact.

## Executed browser checks

Chrome through the managed browser, serving the actual static runtime:

- Desktop title screen, game rendering, HUD, keyboard input, start and pause/
  resume controls, optional sound control and instructions dialog.
- The game scrolls into view when play starts so the lower playfield and
  controls are visible without manually finding them.
- A 390 × 844 iframe viewport exercises the actual responsive page stylesheet,
  title screen, HUD, touch-control toggle and pointer controls. This is a
  browser viewport check, not testing on physical mobile hardware.
- Modal instructions pause the game and retain a deliberate Resume action.

The automated simulation establishes campaign completion. The browser pass is
a visual and input smoke check, not a claimed manual playthrough of all stages.
Physical controllers, mobile Safari, audible musical quality and browser
execution from `file://` have not been independently verified here. Offline
file-open support follows from classic local scripts and relative local assets;
the resource checker checks that structure. No service-worker caching is claimed.

GitHub Actions results and deployment state are reported on the PR and its
subsequent merge run. Local success alone is not a deployed Pages site.

## Structure and boundaries

`js/world.js` owns the fixed 60 Hz simulation and DOM-independent game rules.
`js/render.js` owns original sprites and parallax scenery. `js/input.js` merges
keyboard, pointer and standard gamepad input. `js/audio.js` synthesises bounded
oscillator voices. `js/receipts.js` contains the nine fictional report payloads
and their content hashes. `js/app.js` owns menus, focus, local best scores and
one requestAnimationFrame loop.

Simulation never reads the wall clock or random numbers. Cosmetic animation
uses a separate presentation clock. A long frame is capped at 0.1 seconds;
pausing discards accumulated time and clears held/pending input. A resume cannot
replay time spent away. Best-score storage is guarded and does not store runs.
Scores cannot be farmed by repeatedly stunning the same enemy or re-serving an
actor. Entity lists, particles, active audio voices and projectiles are bounded.
