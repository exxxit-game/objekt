// The link to the owner's headset, shared by every tool that drives it: adb over the USB cable (or
// Wi-Fi, tools/quest-wifi.mjs), the laptop's server shown to the headset as its own
// localhost:3000 through the cable, and the browser's debug connection (CDP) to a page.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

// MSYS_NO_PATHCONV: Git Bash would otherwise turn adb's device paths into Windows paths
export const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8', env: { ...process.env, MSYS_NO_PATHCONV: '1' } }).trim();

// The laptop's server: the port the app's preview starts it on (.claude/launch.json), else the
// port of `npm run serve`.
export function localPort() {
  try {
    const launch = JSON.parse(fs.readFileSync(new URL('../.claude/launch.json', import.meta.url), 'utf8'));
    return launch.configurations.find((c) => c.name === 'objekt').port;
  } catch (e) { return 3000; }
}
export const HEADSET_URL = 'http://localhost:3000/';
export function serveToHeadset(port = localPort()) {
  adb('reverse', 'tcp:3000', `tcp:${port}`);
  return HEADSET_URL;
}

export function connected() {
  try { return adb('devices').split('\n').slice(1).some((l) => /\tdevice$/.test(l.trim())); } catch (e) { return false; }
}
export const awake = () => /mWakefulness=Awake/.test(adb('shell', 'dumpsys', 'power'));
export function battery() {
  const s = adb('shell', 'dumpsys', 'battery');
  return { level: Number(s.match(/level: (\d+)/)?.[1]), charging: /status: 2\b/.test(s) };
}
// Worn: the proximity sensor is overridden so the headset stays awake on a table; off gives it back.
export const worn = (on) => adb('shell', 'am', 'broadcast', '-a', `com.oculus.vrpowermanager.${on ? 'prox_close' : 'automation_disable'}`);
export function sleepNow() { worn(false); adb('shell', 'input', 'keyevent', 'KEYCODE_SLEEP'); }
// On a person's head: the power service reads the headset as mounted with no override of ours
// (`dumpsys vrpowermanager`: "Virtual proximity state: DISABLED"; our "worn on" reads CLOSE).
// Restarting the browser or the headset then throws the owner out of what he is doing, so those
// wait until he takes it off.
export const onHead = (powerDump) => /State: HEADSET_MOUNTED/.test(powerDump) && /Virtual proximity state: DISABLED/.test(powerDump);
export const wornByPerson = () => onHead(adb('shell', 'dumpsys', 'vrpowermanager'));
// The browser restarted, the game page opened again: a browser that has lost its link to the VR
// system answers every request to enter VR with NotSupportedError, whatever the page asks for.
export function restartBrowser(url) {
  adb('shell', 'am', 'force-stop', 'com.oculus.browser');
  adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url, 'com.oculus.browser');
}
export function openUrl(url) {
  adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
  adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url, 'com.oculus.browser');
}

// The game opened in one tab only: two game tabs play two sets of sounds, so a room's hum from a tab
// left in its room is heard in the other tab's corridor. An open game tab (the test copy's or the
// laptop's) is pointed at the address and every other one closed; with none, the browser opens it.
// Closing them all first left the browser with no window, and the address it was given next did
// not load. A request the browser refuses stops the opening. Returns how many tabs were closed.
const DEVTOOLS = 'http://127.0.0.1:9222/json';
const devtools = async (what) => {
  const r = await fetch(`${DEVTOOLS}/${what}`);
  if (!r.ok) throw new Error(`the headset browser refused ${what}: ${r.status}`);
  return r;
};
export async function openGame(url) {
  adb('forward', 'tcp:9222', 'localabstract:chrome_devtools_remote');
  const game = (await (await devtools('list')).json()).filter((t) => t.type === 'page' && /object-preview\/|localhost:3000/.test(t.url));
  if (!game.length) { openUrl(url); return 0; }
  for (const t of game.slice(1)) await devtools(`close/${t.id}`);
  await devtools(`activate/${game[0].id}`);
  const kept = await page({ test: (u) => u === game[0].url });
  if (!kept) throw new Error('the game tab kept open is gone');
  const r = await kept.send('Page.navigate', { url });
  kept.close();
  if (r.error || r.result?.errorText) throw new Error(`the game tab did not load ${url}: ${JSON.stringify(r.error || r.result)}`);
  return game.length - 1;
}

// A page in the headset's browser whose address matches: { tab, send, run(expression, gesture),
// errors, close }. A call the page never answers (the headset slept, the tab changed) reports so
// instead of leaving the tool waiting.
export async function page(match, { noAnswerMs = 120000 } = {}) {
  adb('forward', 'tcp:9222', 'localabstract:chrome_devtools_remote');
  const tabs = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const tab = tabs.find((t) => t.type === 'page' && match.test(t.url));
  if (!tab) return null;
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map(), errors = [];
  const failAll = (text) => { for (const f of pending.values()) f({ result: { exceptionDetails: { text } } }); pending.clear(); };
  ws.onclose = () => failAll('the connection to the page closed');
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); return; }
    if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map((a) => a.value ?? a.description).join(' '));
  };
  const send = (method, params = {}) => new Promise((r) => {
    const n = ++id;
    const timer = setTimeout(() => { if (pending.has(n)) { pending.delete(n); r({ result: { exceptionDetails: { text: `no answer in ${noAnswerMs / 1000} s` } } }); } }, noAnswerMs);
    pending.set(n, (d) => { clearTimeout(timer); r(d); });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  // gesture: the page treats the call as the user's own press (VR, MR and the microphone need one)
  const run = async (expression, gesture = true) => {
    const r = (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: gesture })).result;
    if (r?.exceptionDetails) return { error: 'page threw: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) };
    return r?.result?.value;
  };
  return { tab, send, run, errors, close: () => ws.close() };
}
