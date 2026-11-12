// D8(キャンセルボタンの様式)比較用モック。build.mjs の CSS を流用する(静的 HTML。アプリ本体には触れない)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire('C:/Users/jinhyeonju/workBridge/frontend/package.json');
const { chromium } = require('playwright');

const OUT = join(here, 'png-d8');
const HTML = join(here, 'html-d8');
mkdirSync(OUT, { recursive: true });
mkdirSync(HTML, { recursive: true });

const src = readFileSync(join(here, 'build.mjs'), 'utf8');
const BASE_CSS = src.match(/const BASE_CSS = `([\s\S]*?)`;/)[1];
// FormTable 部分は D7 と同じ値
const d7 = readFileSync(join(here, 'build-d7.mjs'), 'utf8');
const D7_CSS = d7.match(/const EXTRA_CSS = `([\s\S]*?)`;/)[1];

const svg = (d) =>
  `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  x: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  info: svg('<circle cx="12" cy="12" r="10.5"/><path d="M12 11v5.5M12 7.5v.01"/>'),
  warn: svg('<path d="M12 4 3 19.5h18L12 4Z"/><path d="M12 10v4.5M12 17.5v.01"/>'),
  building: svg('<path d="M4 21V4h10v17M14 9h6v12M8 8h2M8 12h2M8 16h2"/><path d="M2 21h20"/>'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  doc: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
  chevDown: svg('<path d="m6 9 6 6 6-6"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
};

// 取消ボタンの 3 方式(高さ 40・文字 14/20 は共通)
const BTN_CSS = `
.btn.fill{background:var(--g30);border:1px solid var(--g50);color:var(--g100)}
.btn.txt{background:none;border:0;color:var(--primary-100);font-weight:500}
`;

const req = '<span class="req">*</span>';
const row = (label, isReq, inner) =>
  `<div class="ft-row"><div class="ft-l">${label}${isReq ? req : ''}</div><div class="ft-v">${inner}</div></div>`;
const ph = (text, lead = '', trail = '') =>
  `<div class="inp ${lead ? 'ic' : ''}">${lead ? `<span class="lead">${lead}</span>` : ''}<div class="f ph">${text}</div>${trail ? `<span class="trail">${trail}</span>` : ''}</div>`;

const MODALS = {
  form: {
    size: 'lg',
    title: '部署登録',
    desc: '新しい部署情報を登録します。',
    icon: ICON.building,
    primary: ['pri', '登録'],
    body: `<div class="stack"><div class="ft-tbl">
      ${row('部署コード', true, `${ph('例: DEV')}<p class="hint">半角英数字とハイフン、20文字以内</p>`)}
      ${row('部署名', true, ph('部署名を入力してください', ICON.building))}
      ${row('部署責任者', false, ph('部署責任者を選択してください', ICON.user, ICON.chevDown))}
      ${row('説明', false, `<div class="inp ic ta"><span class="lead">${ICON.doc}</span><div class="f ph">部署の役割や業務内容などを入力してください（任意）</div></div><p class="cnt">0 / 500</p>`)}
    </div><div class="notice info">${ICON.info}<div><b>社員は1つの部署にのみ所属します。部署の階層構造は使用しません。</b></div></div></div>`,
  },
  delete: {
    size: 'md',
    title: '部署の削除',
    icon: ICON.trash,
    primary: ['dng', '削除する'],
    body: `<div class="cfm-wrap"><p class="cfm">部署「開発部」を削除しますか？</p>
      <div class="notice warn">${ICON.warn}<div><b>無効の社員 2 名は「未所属」部署に移動されます。</b></div></div></div>`,
  },
};

function render(m, method) {
  const cancelCls = { X: 'out', Y: 'fill', Z: 'txt' }[method];
  const btns = `<button class="btn ${cancelCls}">キャンセル</button><button class="btn ${m.primary[0]}">${m.primary[1]}</button>`;
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700&display=swap">
<style>${BASE_CSS}${D7_CSS}${BTN_CSS}</style></head><body>
<div class="page"><div class="bar"></div><div class="ttl">部署管理</div><div class="row"><div class="card"></div><div class="card"></div><div class="card"></div></div><div class="card" style="height:260px"></div></div>
<div class="overlay"><div class="dlg A ${m.size}" role="dialog">
  <div class="hd"><div class="l"><span class="ico">${m.icon}</span><div style="min-width:0"><h2>${m.title}</h2>${m.desc ? `<div class="desc">${m.desc}</div>` : ''}</div></div><button class="x" aria-label="閉じる">${ICON.x}</button></div>
  <div class="bd">${m.body}</div>
  <div class="ft"><div class="in">${btns}</div></div>
</div></div></body></html>`;
}

const VP = { desktop: { width: 1440, height: 960 }, mobile: { width: 360, height: 780 } };
const METHODS = ['X', 'Y', 'Z'];
const LABEL = { X: '方式 X  アウトライン', Y: '方式 Y  グレー塗り', Z: '方式 Z  テキストボタン' };
// デスクトップはモーダル周辺だけ切り出す(オーバーレイ含む)。md は幅 420 なので狭く切る
const CLIP_W = { form: 760, delete: 560 };

const browser = await chromium.launch();
const shots = {};
for (const [key, m] of Object.entries(MODALS)) {
  for (const method of METHODS) {
    const file = join(HTML, `${key}-${method}.html`);
    writeFileSync(file, render(m, method));
    for (const [vpName, vp] of Object.entries(VP)) {
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: vpName === 'mobile' ? 2 : 1 });
      const page = await ctx.newPage();
      await page.goto(pathToFileURL(file).href, { waitUntil: 'load' }).catch(() => {});
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      await page.waitForTimeout(400);
      const png = join(OUT, `d8-${key}-${method}-${vpName}.png`);
      const cw = CLIP_W[key];
      await page.screenshot(
        vpName === 'desktop'
          ? { path: png, clip: { x: (1440 - cw) / 2, y: 0, width: cw, height: vp.height } }
          : { path: png },
      );
      shots[`${key}-${method}-${vpName}`] = png;
      await ctx.close();
    }
  }
}

for (const key of Object.keys(MODALS)) {
  for (const [vpName, vp] of Object.entries(VP)) {
    const w = vpName === 'desktop' ? CLIP_W[key] : vp.width;
    const h = vp.height;
    const labH = vpName === 'mobile' ? 34 : 48;
    const html = `<style>body{margin:0;font-family:'Noto Sans JP',sans-serif}
      .wrap{display:flex;gap:16px;background:#131523}.c{position:relative}
      .c img{display:block;width:${w}px;height:${h}px;margin-top:${labH}px}
      .lab{position:absolute;left:0;right:0;top:0;height:${labH - 6}px;padding:0 12px;display:flex;align-items:center;background:#fff;color:#131523;font-weight:700;font-size:${vpName === 'mobile' ? 12 : 20}px;border-bottom:3px solid #1e5eff}</style>
      <div class="wrap">${METHODS.map((m) => `<div class="c"><div class="lab">${LABEL[m]}</div><img src="${pathToFileURL(shots[`${key}-${m}-${vpName}`]).href}"></div>`).join('')}</div>`;
    const cmp = join(HTML, `compare-d8-${key}-${vpName}.html`);
    writeFileSync(cmp, html);
    const ctx = await browser.newContext({ viewport: { width: w * 3 + 32, height: h + labH } });
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(cmp).href);
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(here, `compare-d8-${key}-${vpName}.png`), fullPage: true });
    await ctx.close();
  }
}
await browser.close();
console.log('done');
