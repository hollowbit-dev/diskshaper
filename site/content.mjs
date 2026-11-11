// Everything the Diskshaper website says, in one place (English).
export const UPDATED = '2026-11-11';

export const T = {
  meta: {
    title: 'Diskshaper: free storage cleaner for Mac and Windows',
    desc: 'See what is eating your storage and clean only what is safe. Shader caches, Steam leftovers, Premiere and Resolve caches, old installers and duplicate photos. Free, offline, everything goes to the Trash.',
  },
  hero: {
    eyebrow: 'Free for Mac and Windows',
    h1: 'See what’s eating your storage.',
    sub: 'Diskshaper scans your drive in seconds and sorts what it finds into plain groups: shader caches and game leftovers, editing caches and old renders, installers and duplicate photos. One click moves the safe stuff to the Trash, so you can always undo it.',
    mac: 'Download for Mac',
    win: 'Download for Windows',
    note: 'Free and open source. No account, no ads, nothing uploaded.',
  },
  groups: [
    {
      id: 'gaming', h: 'For gamers', img: 'app-games',
      p: 'Games are the biggest thing on most drives, and they leave a mess when they go. Diskshaper reads Steam, Epic, Heroic and CrossOver directly, so it knows which folders still belong to a game and which were left behind.',
      items: [
        ['Shader caches', 'Graphics data your games and GPU driver rebuild on their own.'],
        ['Leftovers from uninstalled games', 'Folders Steam and Epic left behind after an uninstall.'],
        ['Games you stopped playing', 'With the last time you played and a button to uninstall from the launcher.'],
        ['Empty CrossOver bottles', 'Windows setups on a Mac whose game is long gone.'],
      ],
    },
    {
      id: 'editing', h: 'For video editors', img: 'app-creator-cache',
      p: 'Editing apps quietly keep tens of gigabytes of cache, previews and proxies. Diskshaper finds them in the app folders and next to your projects, and tells you which ones the app will simply make again.',
      items: [
        ['Premiere, After Effects and Resolve caches', 'Media cache, peak files, render cache and proxies.'],
        ['Render previews next to projects', 'The preview folders Premiere and Final Cut save beside your project files.'],
        ['Duplicate footage', 'The same clip copied to three places. The oldest copy is kept.'],
        ['Old exports', 'Big renders untouched for six months, with a thumbnail of each.'],
      ],
    },
    {
      id: 'everyone', h: 'For everyone', img: 'app-photos',
      p: 'The everyday clutter: setup files you ran once, the same photo saved twice, and that 40 GB backup zip from your old laptop.',
      items: [
        ['Old installers', 'DMG, PKG, EXE and MSI files in Downloads that already did their job.'],
        ['Duplicate photos', 'Exact copies, shown side by side with a thumbnail.'],
        ['Huge forgotten files', 'Anything over 1 GB that has not changed in three months.'],
        ['App caches', 'With each app’s real icon, so you know what you are clearing.'],
      ],
    },
  ],
  safe: {
    h: 'Safe means safe.',
    p: 'Most cleaners show a long list and a big button. Diskshaper tells you what each thing is, whether it comes back on its own, and keeps everything undoable.',
    items: [
      ['Plain labels', '“Safe” means the app rebuilds it or you can download it again. “Check first” means only you know, so it is never ticked for you.'],
      ['Always to the Trash', 'Nothing is deleted. Everything goes to the Trash or Recycle Bin, so you can put it back until you empty it.'],
      ['Never system files', 'Diskshaper only looks in your own folders, app caches and game libraries. It does not touch macOS or Windows.'],
      ['Reads only until you click', 'Scanning changes nothing. Only the items you tick are moved, and only when you press the button.'],
    ],
  },
  faq: [
    ['Is Diskshaper really free?', 'Yes. There is no paid version, no trial and no ads. It is open source and made by Hollowbit Studio, who also make Fileshaper and Captionshaper.'],
    ['Will it delete something I need?', 'Not on its own. Only items you tick are touched, and they go to the Trash or Recycle Bin, not straight to deletion. Items marked “Check first” are never ticked for you.'],
    ['Does it upload my files or track me?', 'No. The scan runs on your computer and the app makes no network requests at all. There are no analytics.'],
    ['Why is the space not free yet after cleaning?', 'Because everything goes to the Trash first, so you can undo it. Empty the Trash or Recycle Bin when you are happy and the space comes back.'],
    ['Which computers does it run on?', 'macOS 11 Big Sur or newer (Apple Silicon and Intel), and Windows 10 and 11 (64-bit).'],
  ],
  faqMore: [
    ['How is it different from CleanMyMac, CCleaner or DaisyDisk?', 'Those are good tools, but most of their cleaning sits behind a subscription or licence, and DaisyDisk shows you sizes without telling you what is safe. Diskshaper is free, explains every group in plain words, and knows about games and editing apps, which general cleaners mostly skip.'],
    ['Does cleaning shader caches hurt my games?', 'No. Shader caches are rebuilt the next time you play. You might see a little stutter for the first few minutes while that happens, then it is back to normal.'],
    ['Will removing a game’s leftover folder delete my saves?', 'Most games store saves in your Documents or AppData folder or in Steam Cloud, not in the game folder. Diskshaper only marks a folder as a leftover when Steam or Epic no longer lists the game. If a game kept saves in its own folder, they go to the Trash with it, so you can still get them back.'],
    ['Why does it list games instead of deleting them?', 'Removing a game through its launcher lets the launcher tidy up properly and keeps your library correct. Diskshaper shows you which games you have not played and opens the launcher’s uninstall for you.'],
    ['Why does macOS ask for permission to read my Desktop or Documents?', 'macOS asks before any app looks inside those folders. Diskshaper needs it to find old installers, big videos and duplicate photos there. You can say no and it will still check caches and games.'],
    ['Why does Windows show a SmartScreen warning?', 'Code-signing certificates cost money every year, and Diskshaper is a free project. Click “More info”, then “Run anyway”. The source code is public on GitHub if you want to check it.'],
    ['Can it find duplicate photos without installing anything?', 'Yes. The free duplicate photo finder on this website runs in your browser and never uploads your photos.'],
  ],
  dl: {
    h: 'Download Diskshaper',
    macReq: 'macOS 11 Big Sur or newer. Apple Silicon and Intel builds.',
    winReq: 'Windows 10 or 11, 64-bit.',
    macSteps: ['Open the downloaded .dmg and drag Diskshaper to Applications.', 'The first time, right-click Diskshaper and choose Open, then Open again.', 'Press Scan. If macOS asks to access Desktop, Documents or Downloads, allow it so Diskshaper can find big files there.'],
    winSteps: ['Run the installer.', 'If SmartScreen appears, click “More info”, then “Run anyway”.', 'Open Diskshaper from the Start menu and press Scan.'],
    why: 'The warnings appear because Diskshaper is not signed with a paid certificate. It is free, open source and makes no network requests.',
  },
  changelog: [
    { v: '1.0.0', date: '11 November 2026', name: 'First release', items: [
      'Scans your drive in a few seconds and sorts what it finds into Everyone, Gaming and Video editing.',
      'Gaming: shader caches, Steam and Epic leftovers, unfinished downloads, launcher caches, unplayed games (Steam, Epic, Heroic), CrossOver bottles.',
      'Video editing: Premiere, After Effects, Resolve, Final Cut and CapCut caches, render previews next to projects, old auto-saves, duplicate footage, old exports.',
      'Everyone: app caches with real app icons, developer tool downloads, old installers and zips, duplicate photos, huge forgotten files, old screen recordings.',
      'Plain Safe and Check first labels. Only Safe items are ticked for you.',
      'Everything moves to the Trash or Recycle Bin, never deleted outright.',
      'Live storage bar, game cover art, photo and video thumbnails.',
    ] },
  ],
  about: {
    h1: 'Made by Hollowbit Studio',
    lead: 'Hollowbit is a small studio run by Elvis Zygmanta. We make free desktop tools that do one job well and keep your files on your computer.',
    why: [
      'Storage cleaners are one of the oldest kinds of software, and still one of the most annoying. The good ones charge a yearly fee for what is mostly deleting cache folders. The free ones show you a wall of file paths and leave you to guess what is safe.',
      'Diskshaper is the cleaner we wanted: fast, honest about what each thing is, aware of games and editing apps, and unable to delete anything for good.',
    ],
    rules: [
      ['No ads, no accounts', 'Open it and use it.'],
      ['No tracking', 'The app makes no network requests at all.'],
      ['Undoable', 'Everything goes to the Trash or Recycle Bin.'],
      ['Open source', 'Read the code on GitHub.'],
    ],
  },
  privacy: {
    short: 'Diskshaper scans files on your computer and never sends anything anywhere. The app makes no network requests. This website has no analytics and no cookies.',
    sections: [
      ['What the app reads', 'File names, sizes and dates in your user folders, app caches and game libraries, and the game lists Steam, Epic, Heroic and CrossOver keep. To find duplicates it reads files to compare their contents. All of this stays in memory on your computer and is gone when you close the app.'],
      ['What the app changes', 'Nothing, until you press the clean button. Then it moves the items you ticked to the Trash or Recycle Bin using your system’s own move-to-Trash function.'],
      ['Network', 'The app makes no network requests. There are no updates checks, analytics or crash reports. Buttons like “Uninstall in Steam” open your launcher on your computer.'],
      ['This website', 'Hosted on GitHub Pages, which keeps standard server logs. We add no analytics, cookies or trackers. The duplicate photo finder runs in your browser and never uploads your photos.'],
      ['Contact', 'Questions about privacy: open an issue on GitHub.'],
    ],
  },
};
