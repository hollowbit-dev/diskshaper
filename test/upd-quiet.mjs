// With updates turned off, or a version skipped with "Later", no notice appears.
import { _electron as electron } from 'playwright';
import fs from 'fs';
for (const [label, settings] of [['turned off', { autoUpdate: false }], ['skipped 9.9.9', { autoUpdate: true, skipVersion: '9.9.9' }]]) {
  const ud = fs.mkdtempSync('/private/tmp/claude-501/-Users-elviszygmanta/ce350094-74d5-4e5b-bf3e-9f087123de4c/scratchpad/ud-');
  fs.writeFileSync(`${ud}/settings.json`, JSON.stringify(settings));
  const app = await electron.launch({ args: ['.'], env: { ...process.env, HOLLOWBIT_TEST_UPDATES: 'http://localhost:8765/fake-ds.json', DISKSHAPER_USERDATA: ud } });
  let w; for (let i = 0; i < 100 && !w; i++) { w = app.windows()[0]; if (!w) await new Promise((r) => setTimeout(r, 200)); }
  await w.waitForTimeout(9000);
  console.log(label, '| notice shown:', !!(await w.$('.update-note')), '| toggle checked:', await w.isChecked('#autoUpd'));
  await app.close();
}
