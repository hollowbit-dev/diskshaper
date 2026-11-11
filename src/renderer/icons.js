// 24px line icons, drawn for Diskshaper's categories.
const ICON_PATHS = {
  'steam-leftovers': '<path d="M3 7.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M10 11.5l4 4M14 11.5l-4 4"/>',
  'epic-leftovers': '<path d="M3 7.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M10 11.5l4 4M14 11.5l-4 4"/>',
  shader: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
  'steam-downloads': '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19.5h14" stroke-dasharray="2.5 2.5"/>',
  launcher: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 9h16M8 13h5M8 16h8"/>',
  'games-unplayed': '<path d="M7 8h10a4 4 0 0 1 4 4.4l-.4 3.3a2.6 2.6 0 0 1-4.6 1.3L14.5 15h-5L8 17a2.6 2.6 0 0 1-4.6-1.3L3 12.4A4 4 0 0 1 7 8z"/><path d="M8 11v3M6.5 12.5h3"/><circle cx="16" cy="11.5" r=".6" fill="currentColor"/><circle cx="17.5" cy="13.5" r=".6" fill="currentColor"/>',
  'creator-cache': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4"/>',
  'project-previews': '<path d="M4 9h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 9l1.2-4.2 15 4.2M8.5 6l1.6 3.2M13.3 7.3l1.6 3"/>',
  'project-autosave': '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4.5v4h4M12 8v4.5l3 2"/>',
  'dup-footage': '<rect x="7" y="3" width="14" height="11" rx="2"/><path d="M17 17.5V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h.5"/><path d="M12.5 6.5l3.5 2-3.5 2z"/>',
  'old-renders': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5l5 2.5-5 2.5z"/>',
  recordings: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3"/>',
  installers: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5L12 12l8-4.5M12 12v9"/><path d="M8 5.3l8 4.5"/>',
  archives: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M11 3v2h2v2h-2v2h2v2h-2"/><rect x="10" y="13" width="4" height="4" rx="1"/>',
  'dup-photos': '<rect x="7" y="3" width="14" height="14" rx="2"/><path d="M17 17v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1"/><path d="M7 13l3.5-3.5L14 13l2-2 5 5"/>',
  huge: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  'app-cache': '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  'dev-cache': '<path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15"/>',
  'bottles-empty': '<path d="M9 3h6M10 3v4.5L6.5 11a3 3 0 0 0-.9 2.1V19a2 2 0 0 0 2 2h8.8a2 2 0 0 0 2-2v-5.9a3 3 0 0 0-.9-2.1L14 7.5V3"/>',
  bottles: '<path d="M9 3h6M10 3v4.5L6.5 11a3 3 0 0 0-.9 2.1V19a2 2 0 0 0 2 2h8.8a2 2 0 0 0 2-2v-5.9a3 3 0 0 0-.9-2.1L14 7.5V3"/><path d="M5.6 14.5h12.8"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13"/>',
};
function icon(id, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[id] || ICON_PATHS.huge}</svg>`;
}
const UI_ICONS = {
  back: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M10 3.5L5.5 8l4.5 4.5"/></svg>',
  reveal: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 4.5h4l1.5 1.5H14v6.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/></svg>',
  arrow: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 3.5L10.5 8 6 12.5"/></svg>',
  ext: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 3h7v7M13 3L5 11"/></svg>',
};
