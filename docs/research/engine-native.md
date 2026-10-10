# Engine, native side: Unity and Godot against our web stack (Quest)

The owner's question (10 Oct 2026): is there a better foundation than ours, Meta's IWSDK or Unity? The web side
(A-Frame, IWSDK, three.js, Babylon.js) is in [engine-and-tools.md](engine-and-tools.md) and
[engine-and-tools-2.md](engine-and-tools-2.md), not redone here. Since then multiview runs on our A-Frame 1.8.0 (one
lost line put back, tests/vendor.test.mjs) in the owner's Quest 3 at 90 Hz (docs/board.md). Marks: **[read]** the page
was opened and the quote is in it; **[code]** read in source, a CLI or an API; **[unverified]** not confirmed.
Meta pages through `metavr docs fetch` (metavr 1.8.0.17.10), all read 10 Oct 2026.

## The parts (each answered below or marked "not found")

1. Unity on Quest: budgets, multiview, baked light, Russian text, store and in-app purchases, Platform SDK, mixed
   reality, testing without a headset, CI tests and licence, build times, editor on our laptop, price; what we lose.
2. Godot 4 on Quest: OpenXR, Meta toolkit, store path, maturity, web export with WebXR.
3. An AI assistant in each: scene files; official AI tooling and MCP servers.
4. Meta's guidance on choosing WebXR vs Unity for a new Store title; changes since July 2026.
5. Verdict table (cost, gain, risk, future tasks) and the one fact that would change it.
6. Future tasks (caller's addition): live players, own live experiments, mixed reality, speech, ~90 rooms, paid packs,
   languages: built-in, a known library, or ours.

## Part 1. Unity on Quest

- **Draw calls** [read] — Meta, "Unity performance" (2024-10-30), https://developers.meta.com/horizon/documentation/unity/unity-perf/ —
  draw calls "you can execute per frame": Quest 2 "80-200 | Busy Simulation", "200-300 | Medium", "400-600 | Light
  Simulation" (= "escape room games, puzzle games", our class); Quest 3/3S up to "700-1000". Meta's WebXR pages give no
  number; we hold "< 100" a frame on Quest 2 (Meta's engine-generic device page, engine-and-tools.md Part 1). Meta's IWSDK
  skill: "JavaScript overhead per draw call is higher than native" [a helper, not a page]. So on Meta's numbers Unity has
  4-6 times our room per frame on Quest 2. Our count today: corridor 94, room 144 a frame with each eye drawn on its own
  (board, IWER); multiview in the headset roughly halves it [arithmetic; unverified on a Quest 2].
- **Multiview** [read] — Meta, "Using Single Pass Stereo Rendering" (undated),
  https://developers.meta.com/horizon/documentation/unity/unity-single-pass/ — "Multiview is the default stereo rendering
  mode for OpenXR on Meta Quest". A setting, not a patched vendor file.
- **Setup** [read] — Meta, "Unity project setup" (2026-10-07), https://developers.meta.com/horizon/documentation/unity/unity-project-setup/ —
  "Windows 10+ (64-bit)"; "Unity Editor 6000.0.66f2 or later (6.1 or later recommended)"; a "Unity ID"; "Android Build
  Support"; template "Universal 3D"; the Platform SDK gives "entitlement checks ... matchmaking, in-app purchases".
- **In-app purchases** [read] — Meta, "Add-ons Integration" (Unity, 2026-09-24), https://developers.meta.com/horizon/documentation/unity/ps-iap/ —
  subscriptions (virtual SKUs "WEEKLY ... ANNUAL") and downloadable content by "AssetBundles"; "You must have at least one
  version of your APK uploaded". The web path: durables, "Subscriptions are not currently supported" (revision-1-store.md §5).
- **Without a headset** [read] — Meta, "Meta XR Simulator Overview" (2026-09-04), https://developers.meta.com/horizon/documentation/unity/xrsim-intro/ —
  "a lightweight OpenXR runtime that runs on your computer"; profiles "Meta Quest 2", "Meta Quest 3"; synthetic rooms
  ("Walls, floors, ceilings, furniture"); "Record a simulator session to a VRS file, then replay it"; several clients
  for multiplayer. A headless CI run: **not found** on the page. Our IWER already does this job in CI.
- **Camera pixels** [read] — Meta, "Passthrough Camera API Overview" (2026-10-07), https://developers.meta.com/horizon/documentation/unity/unity-pca-overview/ —
  "the forward-facing cameras on Meta Quest 3 and Meta Quest 3S", behind Android's camera permission or Meta's
  headset-camera permission. Web: no camera pixels inside WebXR (revision-3-live-voice-mr.md §3).
- **Baked light** [read] — Unity Manual 6000.0, https://docs.unity3d.com/6000.0/Documentation/Manual/progressive-lightmapper.html —
  "To generate baked lightmaps and Light Probes": GPU backend (default) or CPU. Built in; we bake in Blender (board item 3).
- **Russian text** [read] — Unity 6000.0, `AtlasPopulationMode.Dynamic`,
  https://docs.unity3d.com/6000.0/Documentation/ScriptReference/TextCore.Text.AtlasPopulationMode.Dynamic.html — "Dynamic
  font assets can be populated at runtime, but incur a higher performance overhead". Cyrillic comes from the font file;
  a Unity 6 page naming Cyrillic: **not found**. Our canvas panels already draw any script the font holds.
- **Price** [read] — Unity, https://unity.com/products/pricing-updates (announced 2025-11-10) — Runtime Fee: "As of September
  12, 2024, we decided to cancel it"; Personal "up to $200,000 in revenue and funding"; "Splash screen optional with
  Unity 6"; Pro "$2,310/yr per seat". For us: free until $200,000 a year.
- **Our laptop** [read + measured] — Unity Manual 6000.2, https://docs.unity3d.com/6000.2/Documentation/Manual/system-requirements.html —
  "Windows 10 version 21H1 (build 19043) or newer", "a minimum of 8 GB RAM", no disk figure. The laptop (PowerShell,
  10 Oct): Windows 10 22H2, Core i3-7130U (2 cores), 11.9 GB RAM, GeForce MX110, **C: 24.1 GB free**, F: 322 GB free.
  Install size [read, a user report]: https://discussions.unity.com/t/unity-hub-feature-request-optimise-installation-of-editor/1690858
  (2025-10-17), Editor 6.2: "in total it required 8.49 GB" but "installation process requires ±30 GB", failing on 22 GB
  free. On C: it would likely fail; on F: it fits [unverified until tried]. Android modules come on top.
- **CI tests** [read] — GameCI, https://game.ci/docs/github/activation — the free licence needs three GitHub secrets: the
  licence file, the account email and "the password for your Unity account". https://game.ci/docs/github/test-runner —
  "run both `playmode` and `editmode` tests", on `ubuntu-latest`. Works, but every run logs in as the owner; our CI
  needs no account. Unity Quest build times: **not found** (no Unity or Meta figure).

### What a move to a native engine loses [read, code]

- **The site, desktop play, no-install links.** Meta, "Progressive Web Apps" (2026-07-22),
  https://developers.meta.com/horizon/documentation/web/pwa-overview/ — "A web app can remain available through its website
  without a PWA package". A native Quest build is an APK; the site and desktop version become second builds (Unity's web
  player with WebXR: **not found**, not searched further).
- **Updates: a smaller loss than assumed.** Meta, "Updating a Published App" (2024-08-19),
  https://developers.meta.com/horizon/resources/publish-content-updating/ — a new build, "If it passes the upload validator,
  it is automatically deployed to all users"; "Occasionally, we will re-review". No review either way; native costs a
  build, an upload and each player's download, the web one push (revision-1-store.md §11).
- **Our code and tests** [code] — 74 game files, 6,012 lines (architecture audit, 10.10) and 27 test suites, many reading
  the page and A-Frame (smoke, smoke-vr on IWER, draw-calls): rewritten in C# or GDScript. Room 01's protocol, report and
  reveal are engine-free JS with pure tests: they port by translation [our reading].

## Part 2. Godot 4 on Quest

- **Version** [code, GitHub API] — godotengine/godot: MIT, 118,232 stars, release 4.7.2-stable (2026-08-18). Free, no account.
- **Quest** [read] — Godot 4.7, "Deploying to Android", https://docs.godotengine.org/en/stable/tutorials/xr/deploying_to_android.html —
  "OpenJDK 17", "Android Studio", a Gradle build; "It is highly advisable to use the compatibility renderer (OpenGL) for
  the time being when targeting Android based XR devices"; the vendors plugin "may be required to release on app stores"
  (GodotVR/godot_openxr_vendors: MIT, 195 stars, 5.1.0-stable 2026-05-19 [code]). Multiview on Quest: **not found** on
  Godot's OpenXR settings page (https://docs.godotengine.org/en/stable/tutorials/xr/openxr_settings.html).
- **Store services** [read] — Godot blog, Feb 2025, https://godotengine.org/article/godot-xr-update-feb-2025/ — the Meta Toolkit
  "exposes Meta's Platform SDK": "In-App Purchases (IAP)", "Downloadable Content (DLC)". Its repo [code]: 50 stars, last
  release 1.0.3-stable of 2025-07-29 ("Update for Meta Platform SDK v77"), last push 2026-03-04.
- **Web export with WebXR** [read] — https://docs.godotengine.org/en/stable/classes/class_webxrinterface.html — "only
  available when running in Web exports"; https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html —
  "Godot 4 can only target WebGL 2.0"; "Projects written in C# using Godot 4 currently cannot be exported to the web";
  threads need "complete cross-origin isolation". One engine for APK and site is possible (GDScript only).
- **Shipped titles** — a paid Horizon Store title made with Godot: **not found** (two searches: jam and itch.io games only;
  Meta's Godot post is of 2019). Unity [read], https://unity.com/solutions/xr/games — "60% of Meta Quest 3 mixed reality
  enhanced titles are made with Unity" (Meta's list "published on Oct 9th 2023"); names Gorilla Tag.

## Part 3. An AI assistant in each

- **Unity** [read] — official MCP, beta: blog 2026-05-11, https://unity.com/blog/unity-ai-mcp-how-to-get-started —
  "Unity's AI tools are currently in open beta"; needs "An active trial or subscription to Unity's AI tools beta".
  https://unity.com/features/ai — "MCP server is free, with no concurrency limits"; the in-editor Assistant "requires
  credits"; Personal trial "converts to a $10/month subscription". Manual 2.0.0-pre.1,
  https://docs.unity3d.com/Packages/com.unity.ai.assistant@2.0/manual/unity-mcp-get-started.html — "An MCP-compatible AI
  client such as Claude Code"; tools `Unity_ManageScene`, `Unity_ManageGameObject`, `Unity_ReadConsole`. Scenes as text:
  https://docs.unity3d.com/6000.0/Documentation/Manual/TextSceneFormat.html — "a text-based format for scene data, in
  addition to the default binary format". The assistant works through a running editor (on a 2-core laptop).
- **Godot** [read] — https://docs.godotengine.org/en/stable/engine_details/file_formats/tscn.html — TSCN files are "mostly
  human-readable and easy for version control systems to manage"; scripts are text. MCP: community only, Coding-Solo/godot-mcp
  (5,999 stars, last push 2026-04-16 [code]); official: **not found**.
- **Web (now)**: every scene, rule and test is plain text the assistant edits and tests without an editor running.
- Published evidence comparing AI-assistant work across engines: **not found**.

## Part 4. Meta's guidance on choosing

- **A Meta page weighing WebXR against Unity for a new Store title: not found.** https://developers.meta.com/horizon/develop
  lists Unity, Unreal, Native, Web and Spatial SDK side by side, recommending none ("with the right technology").
- **Within the web** [read] — "WebXR overview" (2026-07-21, unchanged on 10 Oct), https://developers.meta.com/horizon/documentation/web/webxr-overview/ —
  "Use the Immersive Web SDK (IWSDK) as the primary path". The Store path is engine-free (engine-and-tools-2.md Part 3).
- **Since July 2026** [read] — IWSDK 1.0.0 (2026-09-24). "Meta VR Glasses" (Connect): Unity, 2026-09-24,
  https://unity.com/news/unity-delivers-day-one-support-for-meta-vr-glasses — "Existing Quest apps run on VR Glasses";
  "Unity 6.6 or higher"; "retail launch in spring 2027". Meta's simulator lists the profile. Whether the glasses run the
  Quest Browser and WebXR: **not found**. The one new fact that could favour native; to read again nearer spring 2027.

## Part 6. Future tasks, engine by engine (revision-1..5 findings cited, not redone)

- **Live players** (Mori & Arai: turns, spoken; economic games: sealed choices, revision-3 §1d). A-Frame: ours, Supabase
  Realtime with Postgres functions as referee (revision-3 §1b, already paid). IWSDK: ours (packages cli, core, create,
  locomotor, scene-composition, xr-input...; no networking; 0 issues on "multiplayer" [code, GitHub API]). Unity:
  **built-in blocks** [read] — Meta, "Multiplayer Building Blocks" (2026-04-22),
  https://developers.meta.com/horizon/documentation/unity/bb-multiplayer-blocks/ — "Unity Netcode for Game Objects and
  Photon Fusion"; matchmaking by room code, friends, nearby players. Godot: **built-in** [read],
  https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html — "ENet", "WebRTC", "WebSocket".
  In every engine the referee holding sealed choices is our server (revision-3 §1f) [our reading].
- **Voice between players.** Web: WebRTC plus a relay, ours (revision-3 §1g). Unity: "Player Voice Chat" block, "exclusive
  to Photon Fusion" (same page; Photon free only at 20 CCU for development, revision-3). Godot: WebRTC built in, voice ours.
- **Speech recognition.** Web: on-device Whisper (ONNX), a known library; WebGPU "Experimental" in the Quest Browser
  (revision-3 §2c). Unity: Meta's Voice SDK [read], https://developers.meta.com/horizon/documentation/unity/voice-sdk-overview/ —
  "powered by Wit.ai and will process voice data on your behalf" (cloud: against "Only numbers leave it"); on-device,
  Unity's Whisper-tiny "in Unity 6 with Inference Engine" (huggingface.co/unity/inference-engine-whisper-tiny, Apache-2.0)
  [read]. Godot: appsinacup/godot-whisper, 131 stars, push 2026-07-20 [code]. Quest 2 speed anywhere: **unverified**.
- **Mixed reality.** Web: passthrough, planes, anchors, hit test, mesh and depth on Quest 3 (revision-3 §3). Unity: MRUK
  [read], https://developers.meta.com/horizon/documentation/unity/unity-mr-utility-kit-overview/ (2026-10-07) — "Scene
  queries", "Graphical helpers", "prefab rooms"; plus camera pixels. Godot: the vendors plugin holds Meta's passthrough,
  scene, anchors, environment depth, mesh, colocation [code: file names in its `extensions` folder]. Richest: Unity.
- **~90 rooms.** Web: a room module loaded at its door ("mount(door) and unmount()", architecture audit), ours, small.
  Unity: additive scenes, DLC by AssetBundles. Godot: scenes and packs [not read in detail].
- **Paid packs.** Web: durables only. Unity: add-ons, subscriptions, DLC. Godot: Meta Toolkit IAP and DLC (older SDK).
- **Languages.** Web: ours (a texts file per language). Unity: **built-in package** [read],
  https://docs.unity3d.com/Packages/com.unity.localization@1.5/manual/index.html — "String localization", "Smart Strings
  ... plurals", "Asset localization". Godot: **built-in** [read], https://docs.godotengine.org/en/stable/tutorials/i18n/internationalizing_games.html.

## Part 5. Verdict

| | A-Frame 1.8 (now) | IWSDK 1.0 | Unity 6 | Godot 4.7 |
|---|---|---|---|---|
| Cost to move | none | Vite build, ECS rewrite of about 24 components (19 registered directly, 5 through src/engine/shapes.js; the 19 of engine-and-tools-2 was counted before), tests | full rewrite in C#, tests via GameCI with his account; editor ~30 GB to install (C: has 24); Unity ID | full rewrite in GDScript; Android Studio, JDK |
| Gain | one code for site, desktop and Quest; plain text; IWER in CI; multiview working | Meta's "primary path"; locomotion, UI kit, multiview by default | 400-600 draw calls on Quest 2 (Meta); multiview, lightmapper, simulator with a Quest 2 profile; 60 % of Quest 3 MR titles (Unity's claim) | free, MIT, text scenes; APK and WebXR site from one engine |
| Risk | patched vendor file; tight budget (< 100) | 1.0 is 16 days old; no shipped title found | site and desktop lost or doubled; assistant works through an editor on a 2-core laptop; MCP in beta | compatibility renderer advised; Meta toolkit 50 stars, SDK v77; no Store title found |
| Future tasks | live play, voice, languages ours; MR good on Quest 3; durables only | as A-Frame; no networking package | built-in: multiplayer blocks, MRUK and camera, localization, subscriptions and DLC, VR Glasses | built-in: networking, translations; Meta services thinner |

**Verdict.** Stay on A-Frame. Meta names no engine for the Store; the old trigger for IWSDK (broken multiview) is gone.
Unity is the strongest native option and wins on the future list, but the move costs the site and desktop play, the
code and tests, and a 30 GB editor on a 2-core laptop. Godot is cheaper but thin on Quest (no Store title found).

**What would change it.** (1) The board's measurement: CPU-bound and still over budget on a Quest 2 after merging and
multiview means the draw-call ceiling, Unity's one large gain; GPU-bound means no engine change helps much (same
GPU; baking is possible in both). (2) A corridor-plus-room run on a real Quest 2. (3) Whether Meta VR Glasses run
WebXR (spring 2027). (4) A first live room needing matchmaking, voice and MR at once: Unity's blocks save most there.

## Unverified, said plainly

Unity editor install size on Windows (a user report, macOS or Windows not stated); build and bake times on this laptop;
Unity's web player with WebXR; Godot multiview on Quest; Whisper speed on Quest 2; WebXR on Meta VR Glasses; the Unity
AI pages differ (the blog asks for a subscription, the features page calls MCP free).

## Hands (11 Oct 2026, the owner: a press with his own hand feels unlike a controller)

| | Hands drawn | A finger press on a button | Grab with the hand |
|---|---|---|---|
| A-Frame 1.8.0 | `hand-tracking-controls` (a mesh or dots at the joints) [read] | not found: only pinch events [read] | `hand-tracking-grab-controls` with `grabbable`, by pinch [read] |
| IWSDK 1.0 | drawn by its input manager (AnimatedHand) [read] | `PokeInteractable`, a touch pointer in each hand [read]; what it emits: unverified | one-hand, two-hand and distance grab components [read]; bare hands with the first two: unverified |
| Unity, Meta Interaction SDK | yes [read]; the hand prefab's name unverified | `PokeInteractor` and `PokeInteractable`, hands and controllers [read] | `HandGrabInteractor` and `HandGrabInteractable` [read, search summary] |

Sources: https://aframe.io/docs/1.8.0/components/hand-tracking-controls.html,
https://aframe.io/docs/1.8.0/components/hand-tracking-grab-controls.html,
https://developers.meta.com/horizon/documentation/iwsdk/guides/06-built-in-interactions/,
https://developers.meta.com/vr/documentation/iwsdk/concepts/xr-input/pointers/,
https://developers.meta.com/horizon/documentation/iwsdk/concepts/xr-input/input-visuals/,
https://developers.meta.com/horizon/documentation/unity/unity-isdk-poke-interaction/. A button for a finger, Meta's
touch best practices (https://developers.meta.com/horizon/design/touch_bp/): a minimum target of 22 × 22 mm, at least
12 mm apart, with clear visual and sound feedback on a press [read]. So in A-Frame a finger press is ours to build;
IWSDK and Unity have it. The look of the hands is the owner's choice from several options (docs/board.md).

## Measured in the owner's Quest 3 (11 Oct 2026)

What the verdict waited for: CPU- or GPU-bound. The local game in the headset, in VR, both eyes in one pass
(multiview on), 90 Hz; ten seconds a sample while he stood or turned a full circle, as the steps inside the headset
told him (tools/quest-look.mjs say). CPU: the game's own time a frame on the main thread (A-Frame's tick and the draw
calls handed to the GPU), timed around the scene's animation loop; the browser's own GPU process is not in it. GPU:
the headset's "GPU % Utilization" each second (ovrgpuprofiler, part of its system) [code, our run].

| Where | fps | game's time a frame, average (90th percentile) of 11.1 ms | GPU busy | draw calls a frame (both eyes) |
|---|---|---|---|---|
| corridor, looking along it | 90 | 2.41 (2.8) | not caught | 36 |
| corridor, a full turn | 90 | 2.68 (3.2) | 45-51 % | 40 |
| room 101, facing its door | 90 | 2.87 (3.3) | 50-58 % | 49 |
| room 101, a full turn | 90 | 2.95 (3.4) | 56-61 % | 53 |

Neither is at its limit on Quest 3; the GPU is nearer (about half busy) than the game's own time (about a quarter of
the frame). Meta's device page puts the Quest 3 GPU at "~2.5x Quest 2 GPU" (engine-and-tools.md, Part 1), so on a
Quest 2 the same scenes would most likely meet the GPU's limit first [mine; no Quest 2 here]. By Part 5's own rule a
GPU limit is not one an engine change cures: lighting, shading and resolution are (baked light, fewer lights, fixed
foveation; revision-4-graphics.md), in any engine. The verdict stands. Also measured: in the headset with multiview the
room's views drew 49-53 calls a frame, where the emulator, drawing each eye on its own, counts 144 at its worst view (tests/draw-calls.mjs).
