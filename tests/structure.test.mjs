// Structure rules that a non-programmer owner cannot check by eye, so the machine
// does. Each rule exists because breaking it hurt before (Cosmogram: one file and
// one notes file grew until nobody could see what was in them).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap(e => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const rel = (f) => path.relative(ROOT, f).replaceAll('\\', '/');
const lines = (f) => fs.readFileSync(f, 'utf8').split('\n').length;
const code = walk(path.join(ROOT, 'src')).filter(f => f.endsWith('.js'));

// 1. No code file grows past 300 lines (CLAUDE.md: files about 300 lines).
const long = code.filter(f => lines(f) > 300).map(f => `${rel(f)} (${lines(f)})`);
assert.deepEqual(long, [], `files over 300 lines: ${long.join(', ')}`);
// and no doc either, so every doc can be read whole in one go: a longer one is split into parts
// that an index names (docs/research/vr/05-wow.md), never left to grow
const docsMd = execFileSync('git', ['ls-files', '*.md'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean).map((f) => path.join(ROOT, f));
const longDocs = docsMd.filter((f) => lines(f) > 300).map((f) => `${rel(f)} (${lines(f)})`);
assert.deepEqual(longDocs, [], `docs over 300 lines (split them, an index names the parts): ${longDocs.join(', ')}`);

// 2. The engine never imports the app or a room; the app never imports a room.
const imports = (f) => [...fs.readFileSync(f, 'utf8').matchAll(/from\s+'([^']+)'|import\('([^']+)'\)|import\s+'([^']+)'/g)]
  .map(m => m[1] || m[2] || m[3]);
for (const f of code) {
  const r = rel(f);
  for (const i of imports(f)) {
    if (r.startsWith('src/engine/')) assert.ok(!/\/(app|rooms)\//.test(i) && !i.includes('../app') , `${r} imports ${i}`);
    if (r.startsWith('src/app/')) assert.ok(!i.includes('rooms/'), `${r} imports ${i}`);
  }
}

// 3. Russian only in the files named here (CLAUDE.md: the language line): anywhere else
// in the repository a Cyrillic letter fails, so none slips in unnoticed. A new file that needs one
// is added here by name, with its reason.
{
  const RUSSIAN = [
    /^src\/(app|app\/lobby|rooms\/[\w-]+)\/texts\.ru\.js$/,          // every word the player reads or hears
    /^(privacy\.html|README\.md|tools\/xr-probe(-input)?\.html|tools\/xr-room\.html)$/,     // pages people read: data, the project, the headset probes
    /^(tests\/(structure|plaque|control-reveal)\.test\.mjs|tools\/(check-voice|make-voice|quest-check|board)\.mjs)$/,   // checks and tools of the Russian texts
    /^(CLAUDE\.md|docs\/audit\/claude-md-proposed\.md|docs\/(state|mistakes|decisions|owner-decisions|board)\.md|docs\/rooms\/01-control\.md|docs\/research\/vr\/06-science\.md|docs\/art\/corridor-plan\.svg)$/, // the owner's words and the player's text, quoted
    /^\.claude\/(agents\/(request-auditor|fact-checker)\.md|skills\/new-room\/SKILL\.md)$/,   // the plan doc's Russian headings and status words, quoted
    /^docs\/cards\/agafonov-2016\.md$/                                       // a Russian paper, cited in its own language
  ];
  const skip = /^(\.git|node_modules|vendor)$|\.(mp3|wav|woff2|jpe?g|png|pdf|ico|webp)$/;
  // the sessions' own checkouts live inside the main folder (.claude/worktrees): each is a whole
  // other copy, checked by its own run, and read from the main folder it failed every test there
  const worktrees = path.join(ROOT, '.claude', 'worktrees');
  const tree = (dir) => fs.readdirSync(dir, { withFileTypes: true }).filter((e) => !skip.test(e.name) && path.join(dir, e.name) !== worktrees)
    .flatMap((e) => (e.isDirectory() ? tree(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  const cyr = tree(ROOT).map(rel).filter((f) => !RUSSIAN.some((r) => r.test(f)) && /[\u0400-\u04FF]/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
  assert.deepEqual(cyr, [], `Russian outside the files allowed to hold it: ${cyr.join(', ')}`);
}

// 4. Every room has the required files.
const REQUIRED = ['room.js', 'scene.js', 'report.js', 'texts.ru.js', 'voice-lines.js', 'sound-list.js'];
for (const room of fs.readdirSync(path.join(ROOT, 'src/rooms'))) {
  for (const file of REQUIRED) {
    assert.ok(fs.existsSync(path.join(ROOT, 'src/rooms', room, file)), `room ${room} has no ${file}`);
  }
  assert.ok(fs.existsSync(path.join(ROOT, 'docs/rooms', `${room}.md`)), `room ${room} has no docs/rooms/${room}.md`);
}

// 5. Notes stay short: the state file is replaced, not appended to.
const STATE_MAX = 80;
assert.ok(lines(path.join(ROOT, 'docs/state.md')) <= STATE_MAX, `docs/state.md over ${STATE_MAX} lines: rewrite it shorter`);
// The rules every message carries stay one page: a long rules file gets lost ("Bloated CLAUDE.md
// files cause Claude to ignore your actual instructions", code.claude.com/docs/en/best-practices);
// a new rule goes in only in place of an old one
const RULES_MAX = 45;
assert.ok(lines(path.join(ROOT, 'CLAUDE.md')) <= RULES_MAX + 1, `CLAUDE.md over ${RULES_MAX} lines: a new rule replaces an old one`);

// 6. No dead code: every module under src/ is imported by another file
// (the shell main.js and room.js files are entry points).
const allText = [...code, ...walk(path.join(ROOT, 'tests')), ...walk(path.join(ROOT, 'tools'))]
  .map(f => fs.readFileSync(f, 'utf8')).join('\n');
const unused = code.filter(f => !/(main|room)\.js$/.test(f))
  .filter(f => (allText.match(new RegExp(`['/]${path.basename(f).replace('.', '\\.')}'`, 'g')) || []).length === 0)
  .map(rel);
assert.deepEqual(unused, [], `modules nobody imports: ${unused.join(', ')}`);

// 7. Docs do not lie about files: every `src/…`, `tests/…`, `tools/…` or `docs/…`
// path written in backticks in a doc must exist (a file still to be built is named without
// backticks, as docs/target-architecture.md does).
const docs = [path.join(ROOT, 'ARCHITECTURE.md'), path.join(ROOT, 'CLAUDE.md'), path.join(ROOT, 'README.md'),
  ...walk(path.join(ROOT, 'docs')).filter(f => f.endsWith('.md'))];
const missing = [];
for (const d of docs) {
  for (const m of fs.readFileSync(d, 'utf8').matchAll(/`((?:src|tests|tools|docs|\.claude|\.github)\/[\w./-]+?)`/g)) {
    if (!m[1].includes("NN-") && !fs.existsSync(path.join(ROOT, m[1]))) missing.push(`${rel(d)} → ${m[1]}`);
  }
}
assert.deepEqual(missing, [], `docs name files that do not exist: ${missing.join(', ')}`);

// 8. The mistakes file: every row names the test that now catches its mistake, as the test's file
// and words that stand in it (an assertion's message or the code that checks): a file name alone
// stayed "guarded" after its check was removed. A row no test catches says so ("unguarded: why").
// A test file is one under tests/ or one GitHub's run starts. One row per line, of any length.
{
  const ci = fs.readFileSync(path.join(ROOT, '.github/workflows/test.yml'), 'utf8');
  const isTest = (p) => p.startsWith('tests/') || ci.includes(`node ${p}`);
  const rows = fs.readFileSync(path.join(ROOT, 'docs/mistakes.md'), 'utf8').split(/\r?\n/).filter((l) => l.startsWith('| ') && !/^\| (Mistake|---)/.test(l));
  for (const row of rows) {
    const guard = row.split('|').slice(2, -1).join('|').trim();
    if (/^unguarded: \S.{9,}/.test(guard)) continue;
    const named = [...guard.matchAll(/`([^`]+)` "([^"]+)"/g)].filter(([, p]) => isTest(p));
    assert.ok(named.length, `mistake without a guard (a test file and its words, or "unguarded: why"): ${row.slice(0, 80)}`);
    for (const [, p, words] of named) {
      const text = fs.existsSync(path.join(ROOT, p)) ? fs.readFileSync(path.join(ROOT, p), 'utf8') : '';
      assert.ok(text.includes(words), `mistake names words its test does not have: ${p} "${words}" (${row.slice(0, 60)})`);
    }
  }
}

// 9. Every script parses: a shell heredoc can change backslashes silently.
const scripts = [...code, ...walk(path.join(ROOT, 'tests')), ...walk(path.join(ROOT, 'tools'))]
  .filter(f => /\.m?js$/.test(f));
for (const f of scripts) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { assert.fail(`syntax error in ${rel(f)}: ${String(e.stderr).split('\n').slice(0, 4).join(' ')}`); }
}

// 10. The experiment catalog is generated from the cards and must be current.
try { execFileSync(process.execPath, [path.join(ROOT, 'tools/build-catalog.mjs'), '--check'], { stdio: 'pipe' }); }
catch (e) { assert.fail(String(e.stderr || e.stdout).trim()); }

// 11. A component never gives its own method the name play() or pause() with arguments:
// A-Frame calls those itself when an entity starts and stops, so such a method runs at the
// wrong time and without its arguments.
const hijacked = code.filter(f => {
  const s = fs.readFileSync(f, 'utf8');
  // play(x), async play(x), play: function (x), play: (x) =>
  return /registerComponent/.test(s) && /^\s+(?:async\s+)?(play|pause)\s*(?::\s*(?:async\s+)?(?:function\s*)?)?\(\s*\w/m.test(s);
}).map(rel);
assert.deepEqual(hijacked, [], `component methods named play/pause: ${hijacked.join(', ')}`);

// 12. Every light a room switches on in its markup carries class room-light: lights pass
// through walls, and the corridor keeps them off until the room's door opens (docs/rooms.md).
for (const dir of fs.readdirSync(path.join(ROOT, 'src/rooms'))) {
  const file = path.join(ROOT, 'src/rooms', dir, 'scene.js');
  if (!fs.existsSync(file)) continue;
  for (const tag of fs.readFileSync(file, 'utf8').match(/<a-entity[^>]*\blight="[^"]*"[^>]*>/g) || []) {
    const on = Number((tag.match(/intensity:\s*([\d.]+)/) || [])[1] ?? 1) > 0;
    if (on) assert.ok(/class="[^"]*\broom-light\b/.test(tag), `room light without class room-light in ${rel(file)}: ${tag.slice(0, 90)}`);
  }
}

// 13. The game's name stays "You are the object" in every language: no player-facing text calls
// it «Объект» (the word "объект" itself may appear in a sentence).
const facing = [path.join(ROOT, 'privacy.html'), path.join(ROOT, 'index.html'), path.join(ROOT, 'README.md'),
  ...code.filter(f => /texts\.ru\.js$/.test(f))];
for (const f of facing) {
  const s = fs.readFileSync(f, 'utf8');
  assert.ok(!/«Объект|Объект ·|в «Объекте»/.test(s), `${rel(f)} translates the game's name`);
}

// 17. Player-facing words are written in full, never cut short ("Комн. 101"): a cut word in a
// place meant to look finished reads as a slip. Where a word does not fit, its place is made to
// fit it (the flyer's strips size their letters to the strip, board.js).
for (const f of facing) {
  const cut = fs.readFileSync(f, 'utf8').match(/(?<![А-Яа-яЁё])[А-Яа-яЁё]{1,5}\.\s?(\d|\$\{)/);
  assert.ok(!cut, `${rel(f)} cuts a word short: ${cut?.[0]}`);
}

// 16. No history in code comments (CLAUDE.md: comments say why): no dates, and no note of who asked or chose
// (a comment says why, never who or when). The pattern is built from parts so it does not match itself.
const who = new RegExp(['owner', '\\s+(said|asked|heard|pointed|chose|wanted|liked)|chosen\\s+by\\s+the\\s+', 'owner'].join(''), 'i');
const when = /\b20\d\d-\d\d-\d\d\b|\b[0-3]\d\.[01]\d\.(19|20)?\d\d\b/;
const commented = [...code, ...fs.readdirSync(path.join(ROOT, 'tools')).filter(f => /\.(m?js|cjs)$/.test(f)).map(f => path.join(ROOT, 'tools', f)),
  ...fs.readdirSync(path.join(ROOT, 'tests')).filter(f => /\.m?js$/.test(f)).map(f => path.join(ROOT, 'tests', f))];
for (const f of new Set(commented)) {
  // split on CRLF too: git on Windows checks files out with CRLF, and a line ending in \r never
  // matched "(.*)$", so on the laptop this guard saw no comment at all (tools/prove-guards.mjs)
  for (const [i, line] of fs.readFileSync(f, 'utf8').split(/\r?\n/).entries()) {
    const comment = line.match(/\/\/(.*)$/)?.[1] || '';
    assert.ok(!who.test(comment) && !when.test(comment), `${rel(f)}:${i + 1} a comment tells history (who or when): ${comment.trim().slice(0, 80)}`);
  }
}

// 18. No control characters in code: a shell heredoc turns a regex's \b into a backspace, and the
// pattern then quietly matches nothing (in the docs it eats a letter).
const written = [path.join(ROOT, 'CLAUDE.md'), ...fs.readdirSync(path.join(ROOT, 'docs')).filter(f => f.endsWith('.md')).map(f => path.join(ROOT, 'docs', f))];
for (const f of new Set([...commented, ...written])) {
  const at = fs.readFileSync(f, 'utf8').search(/[\x00-\x08\x0b\x0c\x0e-\x1f]/);
  assert.ok(at < 0, `${rel(f)}: a control character at ${at} (a \\b lost to the shell?)`);
}

// 19. No secret keys in the repository, which is public: only the database's publishable key
// (sb_publishable_, insert-only by design, src/engine/results.js) may be here; the voice key lives
// in ~/.elevenlabs-key.txt (tools/make-voice.mjs).
const secret = new RegExp(`sk_(?:live|test)_[A-Za-z0-9]{16,}|sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sb_secret_[A-Za-z0-9_-]{10,}|${['service', 'role'].join('_')}|eyJhbGciOi[A-Za-z0-9._-]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY`);
for (const f of new Set([...commented, ...written, path.join(ROOT, 'index.html'), path.join(ROOT, 'privacy.html')])) {
  const hit = fs.readFileSync(f, 'utf8').match(secret);
  assert.ok(!hit, `${rel(f)}: something like a secret key (${hit?.[0].slice(0, 12)}…)`);
}

// 15. Every room marks its inside with class room-interior, which the corridor leaves undrawn
// while the door is shut (src/app/lobby/lobby.js; Meta: fewer than 200 draw calls a frame on
// Quest 3), and the door the corridor sees (#door1) is never part of it.
for (const room of fs.readdirSync(path.join(ROOT, 'src/rooms'))) {
  const { sceneHTML } = await import(new URL(`../src/rooms/${room}/scene.js`, import.meta.url));
  const open = [];
  let marked = 0, doorInside = false;
  for (const m of sceneHTML.matchAll(/<(\/?)(a-[a-z-]+)([^>]*)>/g)) {
    if (m[1]) { open.pop(); continue; }
    const interior = /class="[^"]*\broom-interior\b/.test(m[3]);
    if (interior) marked++;
    if (/id="door1"/.test(m[3]) && open.some(Boolean)) doorInside = true;
    if (!/\/\s*$/.test(m[3])) open.push(interior);
  }
  assert.ok(marked > 0, `${room}: no part of the room is marked room-interior`);
  assert.ok(!doorInside, `${room}: door 1 is inside a room-interior part (the corridor would hide it)`);
}

// 14. Commits name the account's hidden GitHub address, never a personal one: the repository and
// the test copy are public, and every commit shows its author's address to anyone. Where no
// address is set (CI does not commit), there is nothing to check.
let author = '';
try { author = execFileSync('git', ['config', 'user.email'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { /* not set */ }
assert.ok(!author || author.endsWith('@users.noreply.github.com'), `git commits would show the address ${author}: set the hidden GitHub address (git config user.email ID+NAME@users.noreply.github.com)`);

// 20. ARCHITECTURE.md's folder map lists every file of each folder it names, and only real ones,
// and names every folder of the code: a map that drifts from the code misleads every new session
// that reads it first. Recordings (voice/, sound/) are listed as folders.
{
  const arch = fs.readFileSync(path.join(ROOT, 'ARCHITECTURE.md'), 'utf8');
  const from = arch.indexOf('## Folder map'), to = arch.indexOf('\n## ', from + 5);
  const rows = [...arch.slice(from, to < 0 ? undefined : to).matchAll(/^\| `([^`]+\/)` \| (.+) \|$/gm)];
  assert.ok(rows.length >= 6, 'ARCHITECTURE.md: a folder map');
  const mapped = new Set(rows.map((r) => r[1]));
  for (const [, folder, cell] of rows) {
    const listed = new Set(cell.replace(/\([^)]*\)/g, '').match(/[\w.-]+\.(?:m?js|html|css)\b|[\w-]+\//g) || []);
    const real = new Set(fs.readdirSync(path.join(ROOT, folder), { withFileTypes: true }).map((e) => e.isDirectory() ? `${e.name}/` : e.name));
    const missing = [...real].filter((f) => !listed.has(f)), extra = [...listed].filter((f) => !real.has(f));
    assert.deepEqual([missing, extra], [[], []], `ARCHITECTURE.md, ${folder}: missing from the map ${missing.join(', ') || '-'}; not in the folder ${extra.join(', ') || '-'}`);
  }
  const folders = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .filter((e) => e.isDirectory() && !['voice', 'sound'].includes(e.name)).flatMap((e) => [`${dir}${e.name}/`, ...folders(`${dir}${e.name}/`)]);
  for (const f of ['src/', ...folders('src/'), 'css/', 'tests/', 'tools/']) assert.ok(mapped.has(f), `ARCHITECTURE.md: the folder ${f} is not in the map`);
}

// 21. Styles live only in css/ (CLAUDE.md: styles only in css): no <style> block and no style="" attribute in a
// page or in the code that builds markup.
{
  const pages = ['index.html', 'privacy.html', ...fs.readdirSync(path.join(ROOT, 'tools')).filter((f) => f.endsWith('.html')).map((f) => `tools/${f}`)];
  const styled = [...pages.map((p) => path.join(ROOT, p)), ...code].filter((f) => /<style[\s>]|\sstyle="/.test(fs.readFileSync(f, 'utf8'))).map(rel);
  assert.deepEqual(styled, [], `styles outside css/: ${styled.join(', ')}`);
}

// 22. No doc lies forgotten: every doc under docs/ is linked or named from another doc, CLAUDE.md,
// ARCHITECTURE.md or README.md (the experiment cards from their catalog), so a stale one is
// found and kept or deleted, not left to mislead.
{
  const all = [path.join(ROOT, 'CLAUDE.md'), path.join(ROOT, 'ARCHITECTURE.md'), path.join(ROOT, 'README.md'), ...walk(path.join(ROOT, 'docs')).filter((f) => f.endsWith('.md'))];
  const texts = new Map(all.map((f) => [f, fs.readFileSync(f, 'utf8')]));
  const lost = all.filter((f) => /[\\/]docs[\\/]/.test(f)).filter((f) => {
    const r = rel(f), name = path.basename(f);
    return ![...texts].some(([g, t]) => g !== f && (t.includes(r) || t.includes(r.replace(/^docs\//, '')) || (path.dirname(g) === path.dirname(f) && (t.includes(`(${name})`) || t.includes(`\`${name}\``)))));
  }).map(rel);
  assert.deepEqual(lost, [], `docs nothing links to: ${lost.join(', ')}`);
}

// 23. A doc names no constant the code no longer has: an UPPER_SNAKE name in a doc must exist in
// src/, tools/ or tests/ (a removed letter minimum stayed in four docs this way). Names from other
// projects and standards are listed here by name. Snapshots (docs/audit, the other projects'
// notes) and the experiment cards quote code as it was or elsewhere, and are left out.
{
  const OTHERS = ['SETTINGS_PANEL_DISTANCE', 'TURN_THRESHOLD', 'ANSI_HFES_100'];   // IWSDK's code; a standard
  const ours = new Set([...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'tools')), ...walk(path.join(ROOT, 'tests')), path.join(ROOT, 'index.html')]
    .filter((f) => /\.(m?js|html)$/.test(f)).flatMap((f) => fs.readFileSync(f, 'utf8').match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) || []));
  const docsToCheck = [path.join(ROOT, 'CLAUDE.md'), path.join(ROOT, 'ARCHITECTURE.md'), ...walk(path.join(ROOT, 'docs'))]
    .filter((f) => f.endsWith('.md') && !/[\\/]docs[\\/](audit|research[\\/]projects|cards)[\\/]/.test(f));
  const stale = docsToCheck.flatMap((f) => [...new Set(fs.readFileSync(f, 'utf8').match(/\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b/g) || [])]
    .filter((id) => !ours.has(id) && !OTHERS.includes(id)).map((id) => `${rel(f)}: ${id}`));
  assert.deepEqual(stale, [], `docs name constants the code does not have: ${stale.join(', ')}`);
}

// 24. Every ability of the headset has a decision in the game: hands sat in the map as "seen with all
// 25 joints" while no room drew them, and only the owner's memory caught it (docs/owner-decisions.md:
// what matters is kept by checks the machine runs, not by memory). The last cell of each row of
// docs/headset-capabilities.md says used, decide by a stage of the board's road or before a named
// room, not needed, or not available, and why.
{
  const rows = fs.readFileSync(path.join(ROOT, 'docs/headset-capabilities.md'), 'utf8').split(/\r?\n/)
    .filter((l) => l.startsWith('| ') && !/^\| (Capability|---)/.test(l));
  assert.ok(rows.length > 10, 'the headset capability map lost its rows');
  const undecided = rows.filter((l) => !/^(used: |decide by stage [1-6]: |decide before \S|not needed: |not available)/.test(l.split('|').slice(-2, -1)[0].trim()))
    .map((l) => l.split('|')[1].trim());
  assert.deepEqual(undecided, [], `abilities of the headset with no decision in the game (docs/headset-capabilities.md): ${undecided.join('; ')}`);
}
console.log('structure tests: ok');
