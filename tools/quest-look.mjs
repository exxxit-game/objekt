// Looks at the game in the owner's headset without the owner: the headset stays on the laptop's
// USB cable (or is linked over Wi-Fi, tools/quest-wifi.mjs). Works on the game tab of the test
// copy (exxxit-game.github.io/object-preview) or of the local server. The laptop charges the
// headset only slowly: wake it for a check, and end every check with "sleep".
// Usage:
//   node tools/quest-look.mjs open             open the test copy in the headset browser
//   node tools/quest-look.mjs open local [p]   open the laptop's server (the preview's port, or p)
//                                              in the headset as its own localhost:3000
//   node tools/quest-look.mjs sleep            give the proximity sensor back and put it to sleep
//   node tools/quest-look.mjs reload           reload it, skipping every cache (after publish-preview)
//   node tools/quest-look.mjs vr               enter VR, as if the VR button were pressed; only while
//                                              the owner wears the headset (headset.mjs, onHead)
//   node tools/quest-look.mjs frame out.jpg    save what the left eye sees right now (in VR)
//   node tools/quest-look.mjs eval "<js>"      run JavaScript in the game page, print the result
//   node tools/quest-look.mjs worn on|off      make the headset act as worn (on) or normal (off):
//                                              worn, it stays awake while I check; a headset left
//                                              alone falls asleep, its Wi-Fi with it, and only its
//                                              power button wakes it (a wake key press opens the
//                                              quick menu and lets it sleep again)
//   node tools/quest-look.mjs restart-browser  the browser restarted on the test copy: the cure when
//                                              every VR request fails with NotSupportedError
//   node tools/quest-look.mjs reboot           restart the headset; both refuse while it is on the
//                                              owner's head (headset.mjs, wornByPerson)
//   node tools/quest-look.mjs levels           play each corridor sound at its game volume and the
//                                              voice, measure what reaches the headset's output and
//                                              check the mix (LEVELS below); exits 1 when it is off
//   node tools/quest-look.mjs say "<step>" ["<small line>"]   show the owner his next step inside the
//                                              headset ("say off" takes it away)
//   node tools/quest-look.mjs perf             five seconds of frames: rate, slow frames, draw calls,
//                                              triangles; exits 1 over Meta's Quest 2 budget
// Screenshots taken by the headset itself show the room through its cameras while it lies on
// a table, so "frame" reads the picture the game draws instead. The game draws only while
// its VR session is visible: a headset that fell asleep or shows its cameras draws nothing,
// and "frame" says so; a headset put down a moment ago keeps drawing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adb, serveToHeadset, localPort, worn, sleepNow, openUrl, page, wornByPerson, restartBrowser, openGame } from './headset.mjs';
import { requireReview } from './review-gate.mjs';

const PREVIEW = 'https://exxxit-game.github.io/object-preview/';
// The mix, heard where the player stands when the sign plays (the arrival spot, at the designed
// eye height of src/engine/recenter.js), against the voice measured at the same output. An event (click, relay, breaker) is
// heard but never louder than speech: at most 12 dB under the voice's peak, never above it
// (a sound louder than the voice startles). The hum is a bed: at least 15 dB under the voice,
// the speech-to-noise margin ANSI/ASA S12.60 sets for understanding speech, and no more than
// 30 dB under it, or it is gone in a quiet room. Volumes set by ear on a laptop come out wrong
// in the headset (docs/mistakes.md).
const LEVELS = { eventUnderVoicePeak: [0, 12], humUnderVoiceRms: [15, 30], eye: 1.6 };
const [cmd, arg] = process.argv.slice(2);

if (cmd === 'open') {
  // local: the laptop's server, seen by the headset through the cable as its own localhost:3000
  const url = arg === 'local' ? serveToHeadset(Number(process.argv[4]) || localPort()) : PREVIEW;
  const closed = await openGame(url);
  console.log('opened', url, closed ? `(${closed} other game tab${closed > 1 ? 's' : ''} closed)` : '');
  process.exit(0);
}
if (cmd === 'sleep') {
  sleepNow();
  console.log('asleep');
  process.exit(0);
}
if (cmd === 'worn') {
  worn(arg === 'on');
  console.log('worn', arg === 'on' ? 'on' : 'off');
  process.exit(0);
}
if (cmd === 'restart-browser' || cmd === 'reboot') {
  if (wornByPerson()) { console.log('not now: the owner is wearing the headset; this would throw him out'); process.exit(1); }
  if (cmd === 'reboot') adb('reboot'); else restartBrowser(PREVIEW);
  console.log(cmd === 'reboot' ? 'rebooting' : 'browser restarted on the test copy');
  process.exit(0);
}

// the owner's automatic stop: no VR in the headset until the practice reviewer saw these files, or
// saw them before a fix of only the files its report named (tools/review-gate.mjs lookOf)
if (cmd === 'vr' || (cmd === 'eval' && /enterVR|requestSession/.test(arg || ''))) requireReview(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'VR in the headset', { look: true });
const game = await page(/object-preview\/|localhost:3000/);
if (!game) { console.log('no game tab: run "node tools/quest-look.mjs open" first'); process.exit(1); }
const { tab, send, run } = game;

if (cmd === 'reload') {
  await send('Network.enable');
  await send('Network.clearBrowserCache');
  await send('Page.reload', { ignoreCache: true });
  console.log('reloaded', tab.url);
} else if (cmd === 'vr') {
  // Only on the owner's head. On a table the boundary window holds the request, and once the
  // headset sleeps under it the browser answers every later VR request with NotSupportedError until
  // it restarts: twice the owner could not get in. No wake key either: it opens the quick menu over
  // the browser.
  if (!wornByPerson()) { console.log('not now: VR only while the owner wears the headset'); process.exit(1); }
  console.log(await run("document.querySelector('a-scene').enterVR().then(() => 'in VR', (e) => 'failed: ' + e.message)"));
} else if (cmd === 'levels') {
  // every connection to the speakers is also fed to an analyser for the time of the check
  const v = await run(`(async () => {
    const at = (f) => new URL(f, document.baseURI).href;
    const audio = await import(at('src/engine/audio.js'));
    audio.unlock();
    const ctx = audio.getContext();
    if (!ctx) return { error: 'no audio in this browser' };
    await ctx.resume();
    const sfx = await import(at('src/engine/sfx.js')), voice = await import(at('src/engine/voice.js'));
    const { SOUND_GAIN } = await import(at('src/app/lobby/sound-list.js'));
    const { SIGN_AT } = await import(at('src/app/lobby/sign.js'));
    const { LOBBY_T } = await import(at('src/app/lobby/texts.ru.js'));
    const { SPOT } = await import(at('src/app/lobby/plan.js'));
    // the ears follow the head every frame; hold them at the spot, facing the door, while measuring
    const ears = document.querySelector('a-scene').components['sound-listener'];
    if (!ears) return { error: 'the scene has no sound-listener: sounds are not heard from the head' };
    const out = {};
    const an = ctx.createAnalyser(); an.fftSize = 2048; const buf = new Float32Array(an.fftSize);
    const orig = AudioNode.prototype.connect;
    ears.pause();
    try {
      const l = ctx.listener;
      [l.positionX.value, l.positionY.value, l.positionZ.value] = [SPOT.x, ${LEVELS.eye}, SPOT.z];
      [l.forwardX.value, l.forwardY.value, l.forwardZ.value, l.upX.value, l.upY.value, l.upZ.value] = [0, 0, -1, 0, 1, 0];
      AudioNode.prototype.connect = function (dst, ...r) { if (dst === ctx.destination) orig.call(this, an); return orig.call(this, dst, ...r); };
      // the headset's audio stops for a moment while its own menu or another app is in front:
      // a window in which the audio clock did not keep up with real time is measured again
      const listen = async (ms) => {
        let p = 0, sum = 0, n = 0; const t0 = performance.now(), c0 = ctx.currentTime, end = t0 + ms;
        while (performance.now() < end) {
          an.getFloatTimeDomainData(buf); let s = 0;
          for (const x of buf) { s += x * x; p = Math.max(p, Math.abs(x)); }
          sum += s / buf.length; n++; await new Promise(r => setTimeout(r, 20));
        }
        const stalled = (ctx.currentTime - c0) * 1000 < 0.9 * (performance.now() - t0);
        return { peakDb: +(20 * Math.log10(p || 1e-9)).toFixed(1), rmsDb: +(10 * Math.log10(sum / n || 1e-12)).toFixed(1), stalled };
      };
      const measure = async (start, ms) => {
        for (let tries = 0; tries < 3; tries++) {
          const h = start(); const m = await listen(ms); h.stop(); await listen(300);
          if (!m.stalled) { delete m.stalled; return m; }
        }
        return { error: 'the audio kept stopping: is a menu or another app in front of the game?' };
      };
      for (const name of Object.keys(SOUND_GAIN)) sfx.playSound(name, SIGN_AT, 0);   // decode first
      await listen(1500);
      for (const name of Object.keys(SOUND_GAIN)) {
        out[name] = await measure(() => sfx.playSound(name, SIGN_AT, SOUND_GAIN[name], name === 'sign-hum'), name === 'sign-hum' ? 2000 : 1500);
      }
      out.voice = await measure(() => { voice.speak(LOBBY_T.takeSheet); return { stop() {} }; }, 3500);
    } finally { AudioNode.prototype.connect = orig; ears.play(); }
    return out;
  })()`);
  if (!v || v.error) { console.log(v ? v.error : 'no answer from the page'); process.exit(1); }
  console.log('measured (dB at the output):', JSON.stringify(v));
  const failed = Object.entries(v).filter(([, m]) => m.error || m.peakDb < -90);
  if (failed.length) { for (const [name, m] of failed) console.log('OFF ', name, m.error || 'nothing reached the output'); process.exit(1); }
  let ok = true;
  const check = (name, under, [lo, hi]) => {
    const good = under >= lo && under <= hi;
    if (!good) ok = false;
    console.log(`${good ? 'ok  ' : 'OFF '} ${name.padEnd(14)} ${under.toFixed(1)} dB under the voice (allowed ${lo}..${hi})`);
  };
  for (const [name, m] of Object.entries(v)) {
    if (name === 'voice') continue;
    if (name === 'sign-hum') check(name, v.voice.rmsDb - m.rmsDb, LEVELS.humUnderVoiceRms);
    else check(name, v.voice.peakDb - m.peakDb, LEVELS.eventUnderVoicePeak);
  }
  if (!ok) process.exitCode = 1;
} else if (cmd === 'eval') {
  console.log(JSON.stringify(await run(arg), null, 1));
} else if (cmd === 'say') {
  // The owner's next step, inside the headset, so he does not take it off to read the chat (his
  // practice, docs/owner-decisions.md). The input probe's panel and type as they were reviewed
  // (tools/xr-probe-input.html, docs/audit/probe-review.md), cut to its two lines, and placed as Meta
  // places captions: below the view he is looking at, not over it ("at the top or bottom of their
  // 40-degree field of view", developers.meta.com/horizon/design/accessibility), here 15 degrees under
  // the horizon; 1 m away, or nearer when a wall is closer, never under 0.5 m (Meta, design/display),
  // scaled with its distance so the text keeps its size to the eye. Every new step buzzes both
  // controllers, as the probe does, so he knows one came ("Provide sounds and haptic feedback").
  // "say off" takes it away.
  const [main, small] = [String(arg || ''), process.argv[4] || ''];
  const v = await run(`new Promise((resolve) => {
    const s = document.querySelector('a-scene'), main = ${JSON.stringify(main)}, small = ${JSON.stringify(small)};
    let p = document.getElementById('ownerNote');
    if (main === 'off') { if (p) p.object3D.visible = false; resolve({ hidden: true }); return; }
    if (!p) {
      p = document.createElement('a-entity');
      p.id = 'ownerNote';
      p.setAttribute('panel', 'w: 1; h: 0.34; px: 1432; ref: 1024; bg: #1c1c1c');
      s.appendChild(p);
    }
    const show = () => {
      p.components.panel.write([
        { t: main, size: 54, weight: 500, color: '#dadada' },
        ...(small ? [{ t: small, size: 34, color: '#9a9a9a', gap: 30 }] : [])
      ]);
      const at = new THREE.Vector3(), dir = new THREE.Vector3();
      s.camera.getWorldPosition(at); s.camera.getWorldDirection(dir);
      dir.y = 0;
      if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1);
      dir.normalize().multiplyScalar(Math.cos(Math.PI / 12)).setY(-Math.sin(Math.PI / 12));
      p.object3D.visible = false;
      const near = new THREE.Raycaster(at, dir, 0.05, 1.1).intersectObjects(s.object3D.children, true)
        .find((h) => h.object.isMesh && (() => { for (let o = h.object; o; o = o.parent) if (!o.visible) return false; return true; })());
      const d = Math.max(0.5, Math.min(1, near ? near.distance - 0.1 : 1));
      p.object3D.position.copy(at).addScaledVector(dir, d);
      p.object3D.scale.setScalar(d);
      p.object3D.lookAt(at);
      p.object3D.visible = true;
      for (const src of (s.xrSession && s.xrSession.inputSources) || []) {
        const h = src.gamepad && src.gamepad.hapticActuators && src.gamepad.hapticActuators[0];
        if (h && h.pulse) h.pulse(0.6, 120);
      }
      resolve({ shown: main, vr: s.is('vr-mode'), metres: +d.toFixed(2) });
    };
    // a new entity's panel draws once A-Frame has run its init (its canvas exists), a frame or two later
    const ready = (n) => (p.components.panel && p.components.panel.c ? show() : n > 0 ? setTimeout(() => ready(n - 1), 50) : resolve({ error: 'the panel did not start' }));
    ready(60);
  })`);
  console.log(JSON.stringify(v));
} else if (cmd === 'frame') {
  // read the left half of the frame the game has just drawn for both eyes
  const v = await run(`new Promise((resolve) => {
    const sc = document.querySelector('a-scene'), r = sc.renderer, gl = r.getContext(), draw = r.render.bind(r);
    if (!sc.is('vr-mode')) { resolve({ error: 'not in VR: run "vr" first' }); return; }
    setTimeout(() => { r.render = draw; resolve({ error: 'no frame drawn in 3 s: is the headset asleep?' }); }, 3000);
    r.render = (s, c) => {
      draw(s, c);
      r.render = draw;
      const t = r.getRenderTarget(), w = Math.floor(t.width / 2), h = t.height;
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const full = document.createElement('canvas'); full.width = w; full.height = h;
      const img = full.getContext('2d').createImageData(w, h);
      for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
      full.getContext('2d').putImageData(img, 0, 0);
      const small = document.createElement('canvas'); small.width = 900; small.height = Math.round(900 * h / w);
      small.getContext('2d').drawImage(full, 0, 0, small.width, small.height);
      resolve({ data: small.toDataURL('image/jpeg', 0.85) });
    };
  })`);
  if (!v || !v.data) { console.log(v ? v.error : 'no frame'); process.exit(1); }
  fs.writeFileSync(arg || 'frame.jpg', Buffer.from(v.data.split(',')[1], 'base64'));
  console.log('saved', arg || 'frame.jpg');
} else if (cmd === 'perf') {
  // five seconds of the frames the game draws (in VR: the session's own frames): the rate, the
  // frames slower than 72 Hz, and what one frame costs. Meta: 72 Hz at least (90 recommended); fewer
  // than 100 draw calls and 750,000 triangles a frame on Quest 2, 200 and 1.5 million on Quest 3
  // (device optimization comparison, docs/research/vr/01-meta.md). The bar is Quest 2's, the weakest
  // headset, since beauty stays within its budget (docs/owner-decisions.md); over it, exit 1. Whether
  // both eyes were drawn in one pass (multiview: the browser's OCULUS_multiview) is said too.
  const v = await run(`new Promise((resolve) => {
    const s = document.querySelector('a-scene'), vr = s.is('vr-mode') && s.xrSession;
    const raf = (f) => vr ? s.xrSession.requestAnimationFrame(f) : requestAnimationFrame(f);
    let n = 0, slow = 0, worst = 0, last = performance.now();
    const t0 = last;
    const f = () => {
      const now = performance.now(), dt = now - last; last = now;
      if (n) { if (dt > 1000 / 72 + 2) slow++; worst = Math.max(worst, dt); }
      n++;
      if (now - t0 < 5000) raf(f);
      else resolve({ vr: !!vr, fps: Math.round((n - 1) / ((now - t0) / 1000)), slow, worstMs: Math.round(worst), calls: s.renderer.info.render.calls, triangles: s.renderer.info.render.triangles, multiview: !!s.renderer.xr.isMultiview });
    };
    raf(f);
  })`);
  if (!v || v.error) { console.log(v ? v.error : 'no answer'); process.exit(1); }
  const ok = v.fps >= 72 && v.calls < 100 && v.triangles < 750000;
  console.log(`${ok ? 'ok  ' : 'OVER'} ${v.vr ? 'VR' : '2D'}: ${v.fps} fps, ${v.slow} frames slower than 72 Hz (worst ${v.worstMs} ms), ${v.calls} draw calls, ${v.triangles} triangles${v.vr ? `, multiview ${v.multiview ? 'on' : 'off'}` : ''}`);
  if (!ok) process.exitCode = 1;
} else {
  console.log('usage: node tools/quest-look.mjs open [local port] | sleep | reload | vr | frame out.jpg | eval "<js>" | say "<step>" | worn on|off | restart-browser | reboot | levels | perf');
}
game.close();
