// Diskshaper's few settings, saved as JSON in the app's data folder.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const file = () => path.join(app.getPath('userData'), 'settings.json');
let s = { autoUpdate: true };
try { s = { ...s, ...JSON.parse(fs.readFileSync(file(), 'utf8')) }; } catch { /* first run */ }

module.exports = {
  get: () => s,
  set(patch) {
    Object.assign(s, patch);
    try { fs.mkdirSync(path.dirname(file()), { recursive: true }); fs.writeFileSync(file(), JSON.stringify(s)); } catch { /* read-only disk */ }
    return s;
  },
};
