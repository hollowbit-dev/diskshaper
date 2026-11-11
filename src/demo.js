// Made-up scan results for screenshots and the website, so no real file names get published.
// Used when DISKSHAPER_DEMO=1.
const os = require('os');
const path = require('path');
const HOME = os.homedir();
const DAY = 864e5;
const now = Date.now();
const S = 'Library/Application Support/Steam/steamapps';

let n = 0;
const it = (p, gb, daysAgo, extra = {}) => ({ path: path.join(HOME, p), name: extra.name || path.basename(p), bytes: Math.round(gb * 1e9), files: 1, modified: now - daysAgo * DAY, used: now - daysAgo * DAY, demo: n++, ...extra });

function cats() {
  return [
    { id: 'shader', group: 'gamers', safety: 'safe', title: 'Shader caches',
      why: 'Pre-built graphics data. Games and your GPU driver rebuild it the next time you play. The first few minutes may stutter a little.',
      items: [it(`${S}/shadercache/1091500`, 3.1, 40), it(`${S}/shadercache/1245620`, 2.2, 12), it(`${S}/shadercache/730`, 1.4, 3), it(`${S}/shadercache/1172470`, 0.9, 90)] },
    { id: 'steam-leftovers', group: 'gamers', safety: 'safe', title: 'Leftovers from uninstalled games',
      why: 'Folders Steam left behind after you uninstalled a game. Steam no longer lists them, so nothing uses them. Saves synced with Steam Cloud are not stored here.',
      items: [it(`${S}/common/Starfall Tactics`, 4.6, 210, { note: 'Steam no longer lists this game as installed' }), it(`${S}/common/Neon Drift`, 1.2, 400, { note: 'Steam no longer lists this game as installed' }), it(`${S}/common/Hollow Pines`, 0.3, 160, { note: 'Steam no longer lists this game as installed' })] },
    { id: 'games-unplayed', group: 'gamers', safety: 'check', title: 'Games you have not played in 3 months', action: 'uninstall-game',
      why: 'Installed games you have not opened lately. Uninstall them from their launcher so it can tidy up properly; you can reinstall any time and your cloud saves stay.',
      items: [it(`${S}/common/Iron Meridian`, 68.4, 0, { name: 'Iron Meridian', lastPlayed: now - 230 * DAY, store: 'steam', appid: '1', art: 'demo:art:0' }), it(`${S}/common/Skyline Racers`, 41.2, 0, { name: 'Skyline Racers', lastPlayed: now - 140 * DAY, store: 'steam', appid: '2', art: 'demo:art:1' }), it('Games/Epic/Last Lantern', 23.5, 0, { name: 'Last Lantern', lastPlayed: now - 400 * DAY, store: 'epic', art: 'demo:art:2' })] },
    { id: 'launcher', group: 'gamers', safety: 'safe', title: 'Launcher caches and logs',
      why: 'Store pages, images and log files saved by Steam and the Epic Games Launcher. They come back on their own.',
      items: [it('Library/Application Support/Steam/appcache/httpcache', 0.62, 1), it('Library/Application Support/Epic/EpicGamesLauncher/Saved/webcache', 0.41, 2), it('Library/Application Support/Steam/logs', 0.08, 1)] },

    { id: 'creator-cache', group: 'creators', safety: 'safe', title: 'Video editing caches',
      why: 'Media cache, audio waveforms, render cache and proxies made by Premiere, After Effects, DaVinci Resolve, Final Cut and CapCut. The apps rebuild them when you open a project.',
      items: [it('Library/Application Support/Adobe/Common/Media Cache Files', 18.3, 2, { app: 'Adobe' }), it('Movies/CacheClip', 11.7, 6, { app: 'DaVinci Resolve' }), it('Library/Caches/Adobe/After Effects', 6.2, 20), it('Library/Application Support/Adobe/Common/Peak Files', 0.9, 2)] },
    { id: 'project-previews', group: 'creators', safety: 'safe', title: 'Render previews in project folders',
      why: 'Preview renders Premiere, Resolve and Final Cut save next to your projects. They are made again when you render the timeline.',
      items: [it('Movies/Client - Spring Promo/Adobe Premiere Pro Video Previews', 9.4, 70, { note: 'Premiere render previews · ~/Movies/Client - Spring Promo' }), it('Movies/Wedding Edit/Adobe Premiere Pro Video Previews', 5.1, 150, { note: 'Premiere render previews · ~/Movies/Wedding Edit' })] },
    { id: 'dup-footage', group: 'creators', safety: 'check', title: 'Duplicate footage',
      why: 'Videos that are exact copies of another video on this computer. The oldest copy is kept and the others are listed.',
      items: [it('Desktop/footage copy/A001_C014.mov', 7.8, 60, { note: 'Same as ~/Movies/Wedding Edit/Footage/A001_C014.mov', thumb: 'demo:vid:0' }), it('Downloads/A001_C009.mov', 4.2, 61, { note: 'Same as ~/Movies/Wedding Edit/Footage/A001_C009.mov', thumb: 'demo:vid:1' }), it('Desktop/drone_beach.mp4', 2.6, 30, { note: 'Same as ~/Movies/Travel/drone_beach.mp4', thumb: 'demo:vid:2' })] },
    { id: 'old-renders', group: 'creators', safety: 'check', title: 'Big videos untouched for 6 months',
      why: 'Large video files, often old exports and renders. Check you have a copy you want before you remove one.',
      items: [it('Movies/Exports/promo_v3_FINAL_final.mov', 12.4, 260, { thumb: 'demo:vid:3' }), it('Movies/Exports/promo_v2.mov', 11.9, 270, { thumb: 'demo:vid:4' }), it('Movies/Exports/vlog_ep12_master.mov', 6.3, 300, { thumb: 'demo:vid:5' })] },

    { id: 'app-cache', group: 'everyone', safety: 'safe', title: 'App caches',
      why: 'Temporary files apps keep to load faster. Apps rebuild them as needed. Close an app before cleaning its cache.',
      items: [it('Library/Caches/Google', 2.4, 0), it('Library/Caches/com.spotify.client', 1.6, 0), it('Library/Caches/com.hnc.Discord', 0.7, 1), it('Library/Caches/Firefox', 0.5, 3)] },
    { id: 'installers', group: 'everyone', safety: 'safe', title: 'Old installers in Downloads',
      why: 'Setup files (.dmg, .pkg, .exe, .msi) you already used. You can download them again from the maker if you ever need them.',
      items: [it('Downloads/Xcode_26.1.xip', 3.4, 80), it('Downloads/Blender-5.2-macos-arm64.dmg', 0.35, 40), it('Downloads/Zoom.pkg', 0.12, 120), it('Downloads/Discord.dmg', 0.11, 200)] },
    { id: 'dup-photos', group: 'everyone', safety: 'check', title: 'Duplicate photos',
      why: 'Exact copies of the same photo in different places. The oldest copy is kept.',
      items: Array.from({ length: 6 }, (_, i) => it(`Desktop/Photos to sort/IMG_${4210 + i} 2.HEIC`, 0.0031 + i * 0.0004, 20 + i, { note: `Same as ~/Pictures/Lisbon trip/IMG_${4210 + i}.HEIC`, thumb: `demo:img:${i}` })) },
    { id: 'huge', group: 'everyone', safety: 'check', title: 'Huge files you forgot about',
      why: 'Files over 1 GB that have not changed in 3 months.',
      items: [it('Documents/old-macbook-backup.zip', 38.2, 500), it('Downloads/ubuntu-24.04-desktop.iso', 6.1, 330)] },
  ].map((c) => ({ ...c, bytes: c.items.reduce((s, i) => s + i.bytes, 0) }));
}

async function scan(onProgress = () => {}) {
  const list = cats();
  const labels = ['Checking Steam', 'Checking Epic Games and Heroic', 'Checking editing app caches', 'Looking through your folders', 'Comparing photos', 'Checking app caches'];
  for (let i = 0; i < list.length; i++) {
    onProgress({ label: labels[Math.min(labels.length - 1, Math.floor(i / 2))], path: '~/Movies/Wedding Edit/Footage' });
    await new Promise((r) => setTimeout(r, 140));
    onProgress({ cat: list[i] });
  }
  return { cats: list, disk: { total: 494.38e9, free: 21.4e9 }, filesSeen: 412306, platform: process.platform, home: HOME, at: now };
}

// Gradient stand-ins for cover art and photo thumbnails.
const HUES = [[262, 18], [205, 330], [24, 300], [160, 220], [340, 40], [190, 260], [45, 15], [120, 190]];
function picture(key) {
  const [, kind, i] = key.split(':');
  const [a, b] = HUES[Number(i) % HUES.length];
  const w = kind === 'art' ? 460 : 160, h = kind === 'art' ? 215 : 160;
  const deco = kind === 'art'
    ? `<circle cx="${w * 0.78}" cy="${h * 0.3}" r="${h * 0.42}" fill="hsl(${b} 90% 70% / .35)"/><path d="M0 ${h * 0.8} L${w * 0.35} ${h * 0.45} L${w * 0.6} ${h * 0.7} L${w} ${h * 0.35} V${h} H0Z" fill="hsl(${a} 60% 18% / .8)"/>`
    : kind === 'vid'
      ? `<path d="M0 ${h * 0.72} Q${w * 0.5} ${h * 0.5} ${w} ${h * 0.7} V${h} H0Z" fill="hsl(${a} 50% 20% / .7)"/><circle cx="${w * 0.7}" cy="${h * 0.3}" r="${h * 0.14}" fill="hsl(${b} 100% 85% / .8)"/>`
      : `<circle cx="${w * 0.3}" cy="${h * 0.35}" r="${h * 0.16}" fill="hsl(${b} 100% 88% / .85)"/><path d="M0 ${h * 0.75} L${w * 0.4} ${h * 0.5} L${w * 0.7} ${h * 0.68} L${w} ${h * 0.55} V${h} H0Z" fill="hsl(${a} 55% 22% / .75)"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${a} 80% 55%)"/><stop offset="1" stop-color="hsl(${b} 75% 40%)"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${deco}</svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

module.exports = { scan, picture };
