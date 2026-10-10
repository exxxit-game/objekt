# Architecture

Browser VR game. Static files, GitHub Pages, no build step.
Desktop: mouse and keyboard. Headset: WebXR via A-Frame, laser pointers and hands.
Read [docs/state.md](docs/state.md) first: decisions, lessons, where the work is.

## Layers

| Layer | Folder | Job | Details |
|---|---|---|---|
| Shell | `index.html`, `src/main.js` | Load A-Frame and the game's face, pick the room from `?room=` (default `01-control`) | — |
| App | `src/app/` | What every room shares: the arrival corridor (`lobby/`: sign, clipboard, board, doors), consent (the two-page form and the lab's seal, `seal.js`), session (first/repeat, sending, test speed), the studio's mark and the sign family (`brand.js`, the font's capital height `CAP`), shared texts, playtest and issue reports | [docs/decisions.md](docs/decisions.md) |
| Engine | `src/engine/` | Reusable parts: text panels, the clipboard sheet, answer buttons, rating scale, voice, sound, event log, VR recenter, moving, surfaces, doors, the light box | [docs/engine.md](docs/engine.md) |
| Rooms | `src/rooms/NN-name/` | One experiment each: protocol, scene, flow, report, reveal, texts, recordings | [docs/rooms.md](docs/rooms.md) |
| Styles | `css/` | Page chrome (the hint, the privacy page) and the game's face, Inter (`fonts.css`, files in `vendor/fonts/`). The 3D world has no CSS | — |
| Server | `supabase/migrations/`, `supabase/schemas/` | Anonymous results: insert-only functions; each room version's report checked against its JSON Schema | — |
| Tests | `tests/` | Pure tests (`npm test`), structure rules, one headless run of the game in CI | [docs/testing.md](docs/testing.md) |
| Tools | `tools/` | Voice and sound making, the headset checks, the test copy | [docs/testing.md](docs/testing.md) |

Imports go one way: room → app → engine. `tests/structure.test.mjs` enforces it.

## Data flow in a room
```
consent (clipboard) → instructions (voice + the room's screen) → experiment (engine logs events)
        → questions → analyse(log) → reveal (what you did, the truth, the original,
          the replication, how this room differs) → result sent only with consent
```
The event log is the single source of truth for the reveal.

## Folder map

Every file of these folders, and nothing else: `tests/structure.test.mjs` fails when a file is
added, renamed or removed without this table. `voice/` and `sound/` hold recordings.

| Folder | Files |
|---|---|
| `src/` | main.js (shell) · app/ · engine/ · rooms/ |
| `src/app/` | brand.js (the game's colours, the sign family) · consent.js · hint.js (desktop hint) · issue-report.js · left-early.js · logo.js (the studio's mark) · playtest.js · playtest-report.js · seal.js (the lab's seal) · session.js · texts.ru.js · lobby/ |
| `src/app/lobby/` | lobby.js (the corridor's flow) · scene.js · plan.js (the corridor to its end) · opening.js · sign.js · board.js · exit.js (the poster: leave the game) · stairs-sign.js · extinguisher.js · extinguisher-label.js · texts.ru.js · voice-lines.js · sound-list.js · voice/ · sound/ |
| `src/engine/` | panel.js (canvas text) · audio.js · voice.js · sfx.js · log.js · results.js · fader.js · recenter.js · recenter-math.js · locomotion.js · locomotion-math.js · vignette.js · grab-press.js · haptics.js · blob-shadow.js · room-bounds.js · away-meter.js · surface.js · tile-math.js · lightbox.js · glide.js · merge-static.js · controller-batch.js (a controller drawn as one mesh) · shapes.js · cable.js · mirror.js · door.js (every doorway) · decal.js (thin things drawn over their surface) · reflect-env.js (mirrored surroundings) · moulding.js (a picture frame from its profile) · ui/ |
| `src/engine/ui/` | choice.js (answer buttons) · scale.js · sheet.js (the clipboard) · sheet-page.js (its page: text, buttons, fields) · ink.js (writing by hand on a form) · sheet-math.js |
| `src/rooms/` | 01-control/ (one folder per room, docs/rooms.md) |
| `src/rooms/01-control/` | illusion of control (Alloy & Abramson 1979): protocol.js (every number, with paper pages) · original.js (results in the reveal) · schedule.js · trials.js · questions.js · report.js (log → measures) · reveal.js · scene.js · chair.js · room.js · texts.ru.js · voice-lines.js · sound-list.js · voice/ · sound/ |
| `css/` | base.css · hint.css · privacy.css · fonts.css · xr-probe.css (the headset probe page) |
| `tests/` | names.test.mjs · library.test.mjs (the papers library index matches its records and the cards) · voice.test.mjs · sound.test.mjs · recenter.test.mjs · tiles.test.mjs · sheet.test.mjs · fonts.test.mjs · standards.test.mjs · glow.test.mjs · logo.test.mjs · locomotion.test.mjs · plaque.test.mjs · masonry.test.mjs · structure.test.mjs · control-protocol.test.mjs · control-schedule.test.mjs · control-report.test.mjs · control-reveal.test.mjs · playtest.test.mjs · results.test.mjs · issues.test.mjs · secrets.test.mjs (the secret check and the git hooks) · guard.test.mjs (the guard on the assistant's commands, both ways) · review-gate.test.mjs (the owner's automatic stop before VR and the test copy, both ways) · health.test.mjs (the laptop's health check on fixtures) · smoke.mjs (CI) · near-faces.mjs (the smoke test's scan for faces that flicker) · vendor.test.mjs (the A-Frame build is 1.8.0 with multiview's lost line put back) · smoke-vr.mjs (the same game in VR on Meta's emulated headset, IWER: the trigger on the clipboard, both eyes' draw calls) · draw-calls.mjs (the worst view against the weakest headset's draw-call budget, both eyes) · sql.mjs (what the server accepts, read from the migrations, for the tests that pin the game to it) · static-server.mjs |
| `tools/` | build-library.mjs (builds docs/library.md and its section files from docs/library/papers.json) · health.mjs (the laptop's health in plain words at every session start: programs, PATH, the papers and their backup, every agent loads, the research agents' tools, the live guards) · health-setup.mjs (the setup around the code read from the laptop: git's address and hooks, main protected, the memory index, the decided plugins, the app's Claude Code version) · headset.mjs (the link to the headset every headset tool shares) · board.mjs (the owner's one-page board, docs/board.md: the start shows it, a turn cannot end without a row for today saying what he will see, two sessions without his yes stop side work) · review-gate.mjs (the owner's automatic stop: no VR in the headset and no test copy until the practice reviewer saw the files a person meets; the record is written by the subagent hooks of claude-guard.mjs) · owner-links.mjs (pages only the owner can open, left by research, must reach him: the stop hook reads the session record) · secrets.mjs (nothing private goes out: run before every push by hooks/pre-push, and by publish-preview.mjs on its copy) · hooks/ (pre-commit: no commit while the quick tests fail; pre-push: main only on the owner's word, then secrets.mjs) · coderabbit.mjs (the outside reviewer's open remarks on the pull request from room-polish into the branch reviewed, the last state it read, shown at every session start; its settings: .coderabbit.yaml) · advance-reviewed.mjs (run on GitHub by .github/workflows/reviewed.yml, never in a session: moves the branch reviewed up past the commits CodeRabbit read once none of its remarks is open, one short of the head so the pull request stays open) · prove-guards.mjs (plants each guard's mistake in a clone and checks it goes red) · claude-guard.mjs (Claude Code's hooks on the assistant, .claude/settings.json: no skipping the git hooks, no browser on the laptop, the live database read only, no turn ends with work unsaved or unpushed; his decisions (imported by CLAUDE.md) and the board come back at start and after every compaction; a practice reviewer's run is recorded; every owner message logged outside the repository) · one-window.mjs (one window at a time: the one the owner last wrote in works, the others only read) · make-voice.mjs · check-voice.mjs · make-sounds.mjs · publish-preview.mjs (the test copy) · quest-look.mjs (look and measure in the headset) · quest-check.mjs (the corridor and room played in the headset) · quest-wifi.mjs · xr-probe.html · xr-probe-input.html (controllers, hands and body asked one task at a time in the headset) · xr-room.html (his real room in mixed reality: its mesh as triangles, planes, his walk, hands, body, depth and boundary recorded) · xr-probe-run.mjs · build-catalog.mjs · check-cards.mjs |

## Docs

- [docs/state.md](docs/state.md): read first. [docs/decisions.md](docs/decisions.md): why things are as they are. [docs/mistakes.md](docs/mistakes.md): mistakes and the guards that catch them.
- [docs/engine.md](docs/engine.md), [docs/rooms.md](docs/rooms.md) (the room contract), [docs/testing.md](docs/testing.md).
- [docs/building-standards.md](docs/building-standards.md): the trade standards the corridor is built to. [docs/sources.md](docs/sources.md): the source of every fact shown to the player.
- [docs/target-architecture.md](docs/target-architecture.md): where the game ends up, and what is still to build. [docs/roadmap.md](docs/roadmap.md): the long view.
- [docs/rooms/01-control.md](docs/rooms/01-control.md): room 01 against its paper. [docs/vr-checklist.md](docs/vr-checklist.md): what every scene is checked for.
- [docs/research/vr/README.md](docs/research/vr/README.md): VR and MR norms read from their sources (Meta, W3C, papers), the base of every scene and UI decision.
