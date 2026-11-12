// D7(フォーム内の編集不可の値の見せ方)比較用モック。build.mjs の CSS を流用する(静的 HTML。アプリ本体には触れない)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire('C:/Users/jinhyeonju/workBridge/frontend/package.json');
const { chromium } = require('playwright');

const OUT = join(here, 'png-d7');
const HTML = join(here, 'html-d7');
mkdirSync(OUT, { recursive: true });
mkdirSync(HTML, { recursive: true });

// build.mjs の BASE_CSS をそのまま取り出す
const src = readFileSync(join(here, 'build.mjs'), 'utf8');
const BASE_CSS = src.match(/const BASE_CSS = `([\s\S]*?)`;/)[1];

const svg = (d) =>
  `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  x: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  info: svg('<circle cx="12" cy="12" r="10.5"/><path d="M12 11v5.5M12 7.5v.01"/>'),
  building: svg('<path d="M4 21V4h10v17M14 9h6v12M8 8h2M8 12h2M8 16h2"/><path d="M2 21h20"/>'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  doc: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
  chevDown: svg('<path d="m6 9 6 6 6-6"/>'),
  cal: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
};

// FormTable / 読み取り専用表示用の追加 CSS(FormTable.tsx・form.tsx の値)
const EXTRA_CSS = `
.ft-tbl{overflow:hidden;border-radius:6px;border:1px solid var(--g40)}
.ft-row{display:grid;grid-template-columns:1fr;border-bottom:1px solid var(--g40)}
.ft-row:last-child{border-bottom:0}
.ft-l{background:var(--g30);padding:8px 12px;font-size:14px;line-height:20px;font-weight:500;color:var(--g80)}
.ft-v{background:#fff;padding:12px;min-width:0}
@media (min-width:640px){
  .ft-row{grid-template-columns:10rem 1fr}
  .ft-l{padding:26px 20px 12px}.ft-v{padding:12px 20px}
}
.ro-text{min-height:48px;display:flex;align-items:center;font-size:16px;line-height:24px;color:var(--g100);overflow-wrap:anywhere}
.f.dis{background:var(--g30);color:var(--g80);cursor:not-allowed}
.f.val{color:var(--g100)}
.summary{border-radius:12px;background:var(--g30);padding:16px 20px;display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:14px;line-height:20px}
.summary dt{color:var(--g80)}.summary dd{color:var(--g100);overflow-wrap:anywhere}
.stack{display:flex;flex-direction:column;gap:24px}
.inp.ta .f.val{align-items:flex-start}
.mt{margin-top:0}
/* ①' lg: padding 32 / 題 24 / Header↔Body 24。タイトル左のアイコン + 説明文 */
`;

const req = '<span class="req">*</span>';
const row = (label, isReq, inner) =>
  `<div class="ft-row"><div class="ft-l">${label}${isReq ? req : ''}</div><div class="ft-v">${inner}</div></div>`;
const ro = (text) => `<div class="ro-text">${text}</div>`;
const dis = (text, lead = '') =>
  `<div class="inp ${lead ? 'ic' : ''}">${lead ? `<span class="lead">${lead}</span>` : ''}<div class="f dis" aria-disabled="true">${text}</div></div>`;
const val = (text, lead = '', trail = '') =>
  `<div class="inp ${lead ? 'ic' : ''}">${lead ? `<span class="lead">${lead}</span>` : ''}<div class="f val">${text}</div>${trail ? `<span class="trail">${trail}</span>` : ''}</div>`;
const summary = (pairs) =>
  `<dl class="summary">${pairs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;

// ---- 部署編集(DepartmentFormModal 編集時。部署コードが編集不可) ----
const deptEditable = [
  row('部署名', true, val('開発部', ICON.building)),
  row('部署責任者', false, val('山田 太郎 (E0001)', ICON.user, ICON.chevDown)),
  row(
    '説明',
    false,
    `<div class="inp ic ta"><span class="lead">${ICON.doc}</span><div class="f val">ソフトウェアの開発を担当します。</div></div><p class="cnt">16 / 500</p>`,
  ),
].join('');
const deptNotice = `<div class="notice info">${ICON.info}<div><b>社員は1つの部署にのみ所属します。部署の階層構造は使用しません。</b></div></div>`;
const DEPT = {
  title: '部署の編集',
  desc: '部署情報を編集します。',
  icon: ICON.building,
  footer: [['out', 'キャンセル'], ['pri', '保存する']],
  A: `<div class="stack"><div class="ft-tbl">${row('部署コード', false, ro('DEV'))}${deptEditable}</div>${deptNotice}</div>`,
  B: `<div class="stack"><div class="ft-tbl">${row('部署コード', false, dis('DEV'))}${deptEditable}</div>${deptNotice}</div>`,
  C: `<div class="stack">${summary([['部署コード', 'DEV']])}<div class="ft-tbl">${deptEditable}</div>${deptNotice}</div>`,
};

// ---- 勤怠の修正(AttendanceEditModal。社員名・勤務日が編集不可) ----
const dt = (v) => val(`<span style="font-variant-numeric:tabular-nums">${v}</span>`, '', ICON.cal);
const attEditable = [
  row('出勤時刻', true, dt('2026/11/12 09:00')),
  row('退勤時刻', false, `${dt('2026/11/12 18:00')}<p class="hint">退勤時刻は空欄にできます。</p>`),
].join('');
const ATT = {
  title: '勤怠の修正',
  desc: '出退勤時刻を修正します。',
  icon: ICON.clock,
  footer: [['out', 'キャンセル'], ['pri', '保存']],
  A: `<div class="ft-tbl">${row('社員名', false, ro('山田 太郎'))}${row('勤務日', false, ro('2026/11/12（木）'))}${attEditable}</div>`,
  B: `<div class="ft-tbl">${row('社員名', false, dis('山田 太郎'))}${row('勤務日', false, dis('2026/11/12（木）'))}${attEditable}</div>`,
  C: `<div class="stack">${summary([['社員名', '山田 太郎'], ['勤務日', '2026/11/12（木）']])}<div class="ft-tbl">${attEditable}</div></div>`,
};
const MODALS = { deptedit: DEPT, attedit: ATT };

function render(m, method) {
  const btns = m.footer.map(([k, t]) => `<button class="btn ${k}">${t}</button>`).join('');
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700&display=swap">
<style>${BASE_CSS}${EXTRA_CSS}</style></head><body>
<div class="page"><div class="bar"></div><div class="ttl">部署管理</div><div class="row"><div class="card"></div><div class="card"></div><div class="card"></div></div><div class="card" style="height:260px"></div></div>
<div class="overlay"><div class="dlg A lg" role="dialog">
  <div class="hd"><div class="l"><span class="ico">${m.icon}</span><div style="min-width:0"><h2>${m.title}</h2><div class="desc">${m.desc}</div></div></div><button class="x" aria-label="閉じる">${ICON.x}</button></div>
  <div class="bd">${m[method]}</div>
  <div class="ft"><div class="in">${btns}</div></div>
</div></div></body></html>`;
}

const VP = { desktop: { width: 1440, height: 960 }, mobile: { width: 360, height: 780 } };
const METHODS = ['A', 'B', 'C'];
const LABEL = { A: '方式 A  行内に通常テキスト', B: '方式 B  グレーの無効入力欄', C: '方式 C  上部に読み取り専用サマリー' };

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
      const png = join(OUT, `d7-${key}-${method}-${vpName}.png`);
      // デスクトップはモーダル(幅 640)の左右だけ切り出して 3 枚を並べやすくする(オーバーレイは含む)
      await page.screenshot(vpName === 'desktop' ? { path: png, clip: { x: 340, y: 0, width: 760, height: vp.height } } : { path: png });
      shots[`${key}-${method}-${vpName}`] = png;
      await ctx.close();
    }
  }
}

for (const key of Object.keys(MODALS)) {
  for (const [vpName, vp] of Object.entries(VP)) {
    const w = vpName === 'desktop' ? 760 : vp.width;
    const h = vp.height;
    const labH = vpName === 'mobile' ? 34 : 48;
    const html = `<style>body{margin:0;font-family:'Noto Sans JP',sans-serif}
      .wrap{display:flex;gap:16px;background:#131523}.c{position:relative}
      .c img{display:block;width:${w}px;height:${h}px;margin-top:${labH}px}
      .lab{position:absolute;left:0;right:0;top:0;height:${labH - 6}px;padding:0 12px;display:flex;align-items:center;background:#fff;color:#131523;font-weight:700;font-size:${vpName === 'mobile' ? 12 : 20}px;border-bottom:3px solid #1e5eff}</style>
      <div class="wrap">${METHODS.map((m) => `<div class="c"><div class="lab">${LABEL[m]}</div><img src="${pathToFileURL(shots[`${key}-${m}-${vpName}`]).href}"></div>`).join('')}</div>`;
    const cmp = join(HTML, `compare-d7-${key}-${vpName}.html`);
    writeFileSync(cmp, html);
    const ctx = await browser.newContext({ viewport: { width: w * 3 + 32, height: h + labH } });
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(cmp).href);
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(here, `compare-d7-${key}-${vpName}.png`), fullPage: true });
    await ctx.close();
  }
}
await browser.close();
console.log('done');
