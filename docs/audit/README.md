# The corridor audit: one list by cause

The corridor is what every room is built from, so its mistakes were listed once, by cause, and each
cause gets a guard so it cannot come back. The detail is in the reports, each a snapshot of the code
when it was written (their file:line may have moved since):

- `scene.md`, `paper.md`, `flow.md`: three reviewers on the corridor (scene and objects; the paper and
  its buttons; the flow, the engine and the guards), about 90 findings.
- `inventory.md`: every tool, agent, doc, branch and setting, kept, updated, removed or to start using.
- `architecture.md`: the code and docs against ARCHITECTURE.md and the target architecture.
- `architecture-2026-10-10.md`: the same after the large change of 10.10 (A-Frame 1.8, multiview, the VR smoke run): verdict and three changes.
- `plan-check.md`: the plan doc checked twice by the fact-checker, claim by claim, and the causes.
- `premortem.md`: the plan assumed failed in October 2027 and asked why, by two analysts on two lenses; each cause names where its guard goes.
- `process-rebuild.md`: the whole process audited at once (rules, machinery, knowledge, connectors, the owner's pain) and rebuilt by one plan; it replaced the earlier rules review and CLAUDE.md draft.
- `numbers.md`: cause 8's inventory, every number the three reports found without a source and every patch, looked up again in the code: its class (needs a source, a headset measure, a patch) and what settles it.

| # | Cause | Fix | Guard | State |
|---|---|---|---|---|
| 1 | Checks done by hand; tools rot (a headset check on the set-aside room at 60 fps, ports 3000 and 3100, the headset link written three times) | `tools/headset.mjs` is the one link; quest-check plays the corridor at 72 fps | the health check at every session start reports the headset's link through adb; `tools/quest-check.mjs` plays the corridor and measures its frame rate when run by hand | done |
| 2 | Docs say what is no longer true | eleven docs corrected; a decision for signing by hand | `tests/structure.test.mjs` rule 23: a doc names no constant the code lacks; the architecture auditor before every "done" | done |
| 3 | The same number or code in two places (letter floors in the tests, line wrapping, paper size and colour, the sign's place) | one source each | the tests import the constants | done |
| 4 | Guards that read what the code declares, not what is drawn; a 10 s test that checks a constant; the walking test on the old corridor; the play/pause rule | measure what the player sees; run the rule with a fake clock | each guard fails when its mistake is put back | done (the sound levels stay a manual headset check) |
| 5 | Printed things sized from the paper | the large-print rule (`docs/decisions.md`); the seal and the answer buttons; hook pages set for the distance they are read from; the paper white as measured at Meta's light limit; notices on Letter; the clipboard stays a large-print form (2.59 times a real page), shown to the owner as such | `tests/smoke.mjs` letter checks, hook pages from the player's eyes; `tests/sheet.test.mjs` colours in Meta's limits; `tests/standards.test.mjs` Letter | done |
| 6 | Measures off the standard | the room number's capitals and the ceiling grid's 15/16 in face (done); the lights on the grid go with the lighting (plan step 4, item 5), whose source sets their spacing | `tests/masonry.test.mjs`, `tests/tiles.test.mjs` | done but the lights |
| 7 | Behaviour (double click from hand and laser, first or repeat marked early, the sign starting before VR, sound before the first press, a sheet without a hook popping up, placement by a timer) | fix each at its cause | a test per fix | in progress: done the sign only in VR, the first/repeat comments, one rule for sounds before the first press (`tests/voice.test.mjs`), no sheet shown without its hook (an error the smoke test fails on), placement by the first tracked head pose (`tests/recenter.test.mjs`; to see in the headset on the owner's next session); the double click goes with room 01 (plan step 4a) |
| 8 | Numbers without a source, and patches | a source or a headset measurement for each | the source written next to it | in progress: the inventory (`numbers.md`, 77 rows; 9 Oct: 14 fixed, 11 sourced, 5 gone; 25 need a source, done in batches; the 17 a headset measure settles go to plan step 4.3; 5 patches go with their items: 1 the sitting-or-standing setting, 7 and 8 the lighting, 9 the sounds evened with the 4.3 levels, 51 room 01 in step 4a); the flicker ones guarded by a scan in the smoke test (`tests/near-faces.mjs`) |
| 9 | Promises dropped, auditors not run | the plan doc table, the morning check's reminder | unguarded since the morning check was removed: nothing warns when the code is newer than the last audit; the auditors run on demand (docs/tools.md) | fix done, reminder unguarded |
| 10 | Work only on the laptop; stale branches | ten branches removed, two parked ones kept as tags, the main folder brought up | the stop hook: no turn ends with this branch unsaved or not on GitHub; other branches kept only on the laptop are no longer listed (unguarded) | done, partly guarded |
| 11 | Commits with the owner's own email; keys never checked; the test copy pushed past the check; main guarded by care alone | history searched: no key ever left; the owner judged the old email acceptable; the test copy checked before its push | `tools/secrets.mjs` before every push (`tools/hooks/pre-push`, `tools/publish-preview.mjs`) and in the morning check; pre-push stops main without the owner's word; pre-commit stops a commit while `npm test` fails; `tests/secrets.test.mjs` | done |
| 12 | Nothing caught my own wrong claims (a number from memory, "checked" with no proof) before the owner did | every claim in the plan and docs checked against its evidence | the `fact-checker` agent, twice, before the plan or a doc is relied on (CLAUDE.md rule 22i) | in progress: the plan checked twice and fixed (plan-check.md); a re-check of the fixes before step 4.1 is called done |

## What waits, and where it is written

Nothing found here is left for "later" without a place in the plan's queue:

- causes 5, 7 and 8 above: plan step 4.1, now;
- the double click from hand and laser: plan step 4a, when room 01 moves to the experimenter;
- the lights on the ceiling grid: plan step 4, item 5 (lighting);
- the sign's 10 s wait measured inside VR, and the headset checks again without power saving:
  the plan's list of what waits for the owner (they need him in the headset);
- the best solution for every part of the project, the data from entering the game to the yearly
  report, and the protection of the repository, the site, the server and the data: plan step 4.2;
- what the headset and the owner's gear can do: plan step 4.3.
- [room-probe-review.md](room-probe-review.md): the real-room probe reviewed before the owner met it; its run waits for these fixes (11.10).
