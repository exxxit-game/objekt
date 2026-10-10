// Runs the real-room session in the owner's headset: opens tools/xr-room.html in the game's tab,
// starts it, shows each step for its time, logs battery and heat meanwhile, saves the summary.
// Usage: node tools/xr-room-run.mjs [folder]   the game tab open on localhost:3000 in the headset; the
// result goes to <folder>/room-result.json, or is printed. Not to be run before the fixes listed in
// docs/audit/room-probe-review.md, the wearer and gate checks among them.
import fs from 'node:fs';
import path from 'node:path';
import { adb, serveToHeadset, page } from './headset.mjs';

const here = process.argv[2] || null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

serveToHeadset(3100);
const url = 'http://localhost:3000/tools/xr-room.html';
let tab = await page({ test: (u) => u.startsWith('http://localhost:3000/') });
if (!tab) throw new Error('no tab on localhost:3000 in the headset');
await tab.send('Page.navigate', { url });
tab.close();
await sleep(4000);
const room = await page({ test: (u) => u.includes('xr-room') });
if (!room) throw new Error('the room page did not open');
log('page', await room.run("({ three: !!window.THREE, say: typeof window.__say })"));
// what he is to do, each for its time, kept with the page's words (tools/xr-room.html)
const STEPS = await room.run('window.__steps');
log('start', await room.run("document.getElementById('start').click(), 'clicked'", true));
await sleep(3000);

const heat = [];
const readHeat = () => {
  try {
    const b = adb('shell', 'dumpsys', 'battery');
    const t = adb('shell', 'dumpsys', 'thermalservice');
    const cpu = [...t.matchAll(/mValue=([\d.]+)[^}]*mName=cpu-[^,]*/g)].map((m) => +m[1]);
    heat.push({ at: new Date().toISOString().slice(11, 19), level: +(b.match(/level: (\d+)/) || [])[1], counter: +(b.match(/Charge counter: (\d+)/) || [])[1],
      batteryC: +(b.match(/temperature: (\d+)/) || [])[1] / 10, cpuMaxC: cpu.length ? Math.max(...cpu) : null });
  } catch (e) { heat.push({ error: String(e).slice(0, 80) }); }
};
for (const [i, s] of STEPS.entries()) {
  log('step', i + 1, await room.run(`window.__say(${JSON.stringify(s.main)}, ${JSON.stringify(s.small)})`));
  const t0 = Date.now();
  while (Date.now() - t0 < s.secs * 1000) {
    readHeat();
    await sleep(Math.min(10000, s.secs * 1000 - (Date.now() - t0)));
  }
}
const summary = await room.run('window.__roomSummary()');
const result = JSON.stringify({ summary, heat }, null, 1);
if (here) { fs.writeFileSync(path.join(here, 'room-result.json'), result); log('saved', path.join(here, 'room-result.json')); } else console.log(result);
room.close();
