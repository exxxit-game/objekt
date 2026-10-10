# Practice review of the real-room probe (tools/xr-room.html), 11 Oct 2026, night

The owner asked to test, in one go, everything the headset can measure in his real room: walking, the furniture,
the room as the headset's triangles, the next room (docs/board.md). The probe was built and reviewed before he met it;
the review said not ready, so the run waits for these fixes. Read only; the reviewer's sources are named.

1. Going into the next room is unsafe as planned: controllers down, at night, door thresholds. Meta: "Avoid
   encouraging users to move outside of the boundary" (developers.meta.com/horizon/design/boundaryless-best-practices/);
   leaving the room gives no warning, only full passthrough, and avoid unlevel surfaces
   (…/design/mr-health-passthrough/); a dark room can lose 6DoF tracking (meta.com/help/quest/598701621088668). What the
   browser does in immersive-ar outside the boundary was never checked (docs/research/vr/04-mr.md). Fix: drop it, or a
   separate last step with the lights on in both rooms, no lines drawn, controllers in hand.
2. Walking along the walls leaves his boundary while the whole mesh, floor included, is drawn over a night-time view.
   Meta: no large virtual content on the floor that hides trip hazards; lower its opacity while the person moves
   (boundaryless page). Fix: no floor triangles, the lines faded while he walks, the room light on first.
3. The arms-apart measure is never recorded: /wrist/ matches four body joints (left-hand-wrist, left-hand-wrist-twist,
   right-hand-wrist, right-hand-wrist-twist: github.com/immersive-web/body-tracking). Fix: match the two names exactly.
4. With the controllers down no buzz marks a new step. Fix: a sound on every step.
5. The first thing he meets is the browser's request for his space data, which no step mentions
   (developers.meta.com/horizon/documentation/web/webxr-mixed-reality/). Fix: a step before, saying to allow it.
6. Pressing the start button again wipes the first run (window.__room replaced, localStorage overwritten); the old panel stays
   and the raycast list is never cleared. Fix: keep each run apart and clear both.
7. Started by a clicked button over the debug link, the run skips the check that he wears the headset and the review
   gate's VR pattern (tools/quest-look.mjs, tools/review-gate.mjs). Fix: tools/xr-room-run.mjs checks both first.
8. If depth comes as gpu-optimized, three.js draws a real-depth occluder each frame, so lines on real surfaces may
   flicker, and getDepthInformation reads only cpu-optimized depth (unverified in the headset).
9. The panel's distance (0.4-0.8 m) has no source; quest-look say keeps Meta's "never under 0.5 m" and 04-mr.md says
   about 1 m. Fix: the same rule as quest-look.
10. Minor: step 1 may wrap to four lines; the steps speak to him informally while the page itself is formal.

Checked and fine: iterating frame.body, getJointPose for the hands, the hit-test source asked before setSession, the
panel hidden until the first step, the plane and mesh fields.
