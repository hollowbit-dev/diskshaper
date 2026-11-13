// Runs the scanner as if on Windows, against a fake user profile, to check the Windows-only finds.
// Nothing real is touched: every path lives in a temp folder.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { createRequire } from 'node:module';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-win-'));
const HOME = path.join(root, 'Users', 'me'), LOCAL = path.join(HOME, 'AppData', 'Local'), ROAMING = path.join(HOME, 'AppData', 'Roaming'), PDATA = path.join(root, 'ProgramData');
const put = (p, mb) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, Buffer.alloc(mb * 1e6, 1)); };
put(path.join(LOCAL, 'Battle.net', 'Cache', 'a.bin'), 3);
put(path.join(PDATA, 'Blizzard Entertainment', 'Battle.net', 'Cache', 'b.bin'), 4);
put(path.join(LOCAL, 'Riot Games', 'Riot Client', 'Logs', 'c.log'), 2);
put(path.join(LOCAL, 'Riot Games', 'Riot Client', 'Data', 'keep.json'), 2);          // not a cache: must not be found
put(path.join(LOCAL, 'Electronic Arts', 'EA Desktop', 'cache', 'd.bin'), 2);
put(path.join(ROAMING, 'discord', 'Cache', 'Cache_Data', 'e.bin'), 6);
put(path.join(ROAMING, 'discord', 'Local Storage', 'keep.ldb'), 6);                  // not a cache
put(path.join(LOCAL, 'Google', 'Chrome', 'User Data', 'Default', 'Cache', 'f.bin'), 7);
put(path.join(LOCAL, 'Google', 'Chrome', 'User Data', 'Default', 'Bookmarks'), 1);    // never
put(path.join(LOCAL, 'CrashDumps', 'game.dmp'), 3);
put(path.join(LOCAL, 'FortniteGame', 'Saved', 'Crashes', 'x', 'dump.dmp'), 2);
put(path.join(LOCAL, 'FortniteGame', 'Saved', 'SaveGames', 'save.sav'), 2);           // never
put(path.join(PDATA, 'NVIDIA Corporation', 'Downloader', 'old', 'driver.exe'), 25);
Object.assign(process.env, { HOME, USERPROFILE: HOME, LOCALAPPDATA: LOCAL, APPDATA: ROAMING, ProgramData: PDATA, 'ProgramFiles(x86)': path.join(root, 'PF86'), ProgramFiles: path.join(root, 'PF') });
Object.defineProperty(process, 'platform', { value: 'win32' });
const { scan } = createRequire(import.meta.url)('../src/scanner.js');
const r = await scan();
const found = r.cats.flatMap((c) => c.items.map((i) => [c.id, path.relative(root, i.path), i.name]));
for (const f of found) console.log(f.join('  |  '));
const paths = found.map((f) => f[1]).join('\n');
let bad = 0;
for (const must of ['Battle.net/Cache', 'Blizzard Entertainment/Battle.net/Cache', 'Riot Client/Logs', 'EA Desktop/cache', 'discord/Cache', 'Default/Cache', 'CrashDumps', 'Saved/Crashes', 'NVIDIA Corporation/Downloader']) if (!paths.includes(must)) { console.error('MISSING', must); bad++; }
for (const never of ['Data', 'Local Storage', 'Bookmarks', 'SaveGames', 'keep']) if (found.some((f) => f[1].split(path.sep).includes(never))) { console.error('WRONGLY FOUND', never); bad++; }
fs.rmSync(root, { recursive: true, force: true });
console.log(bad ? `FAIL (${bad})` : 'win-paths ok'); process.exitCode = bad ? 1 : 0;
