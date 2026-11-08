// ログイン後の戻り先(redirect クエリ)として使ってよい内部パスだけを返す(08 §7 SCR-001)。
// 外部サイトへの誘導(//example.com、/\example.com、/\t/example.com など)とログイン画面自身は無視する
export function safeRedirect(redirect: string | null): string | null {
  if (!redirect || !redirect.startsWith('/')) return null;
  // タブ・改行などの制御文字は URL 解析時に除去され外部 URL に化けうるため拒否する
  if ([...redirect].some((c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f)) return null;

  // 文字列の前方一致ではなく、実際にブラウザが解釈する URL で同一オリジンか判定する
  let url: URL;
  try {
    url = new URL(redirect, window.location.origin);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  if (url.pathname === '/login' || url.pathname.startsWith('/login/')) return null;
  return url.pathname + url.search + url.hash;
}
