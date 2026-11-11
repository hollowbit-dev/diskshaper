// Renders the 1200x630 social preview image (site/assets/img/og.png).
import { chromium } from 'playwright';
import fs from 'fs';
const icon = fs.readFileSync('site/assets/img/icon-256.png').toString('base64');
const font = fs.readFileSync('site/assets/fonts/Geist-Variable.woff2').toString('base64');
const segs = [['#5b9dff', 18], ['#4a7fd0', 9], ['#a78bfa', 34], ['#8a70d0', 8], ['#f472b6', 22], ['#c75b93', 9]];
const html = `<html><head><style>
@font-face{font-family:G;src:url(data:font/woff2;base64,${font})}
body{margin:0;width:1200px;height:630px;background:#09090b;font-family:G;color:#f4f4f5;display:flex;flex-direction:column;justify-content:center;padding:0 90px;box-sizing:border-box}
.top{display:flex;align-items:center;gap:22px;margin-bottom:46px}.top img{width:84px;height:84px}.top span{font-size:40px;font-weight:620;letter-spacing:-.03em}
h1{font-size:76px;letter-spacing:-.05em;line-height:1.02;margin:0 0 44px;font-weight:650}
.bar{display:flex;gap:4px;height:46px;padding:5px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1)}
.bar i{border-radius:5px}.bar i:first-child{border-radius:10px 5px 5px 10px}.bar i:last-child{border-radius:5px 10px 10px 5px}
p{color:#a1a1aa;font-size:28px;margin:30px 0 0}
</style></head><body><div class="top"><img src="data:image/png;base64,${icon}"><span>Diskshaper</span></div>
<h1>See what’s eating your storage.</h1>
<div class="bar">${segs.map(([c, w]) => `<i style="background:${c};flex:${w}"></i>`).join('')}</div>
<p>Free storage cleaner for Mac and Windows · Everything goes to the Trash</p></body></html>`;
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(html); await p.waitForTimeout(300);
await p.screenshot({ path: 'site/assets/img/og.png' });
await b.close();
console.log('og.png written');
