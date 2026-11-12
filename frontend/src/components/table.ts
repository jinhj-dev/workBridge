// 09 §2.3 Table: 見出し行 44(下線 2px)・データ行 52(下線 1px)・セル左右 8。compact は行高 36(出勤簿)
export const thClass =
  'h-11 border-b-2 border-general-40 px-2 text-left text-sm/5 font-medium whitespace-nowrap text-general-80';
export const tdClass = 'h-13 border-b border-general-40 px-2 text-sm/5 text-general-100';
// カード内の表の見出し(淡い灰色の帯)。高さ・左右余白・文字サイズは呼び出し側で指定する
export const cardThClass = 'bg-general-30 text-left font-medium whitespace-nowrap text-general-80';
// 文字色を呼び出し側で決めるセル(日付の色分けなど)は Base を使う
export const compactTdBaseClass = 'h-9 border-b border-general-40 px-2 text-sm/5';
export const compactTdClass = `${compactTdBaseClass} text-general-100`;
// 休暇管理の表(帯見出し: general-30 の帯・角丸 8、行 56・下線 1px)
export const bandThClass =
  'h-11 bg-general-30 px-3 text-left text-sm/5 font-medium whitespace-nowrap text-general-80 first:rounded-l-lg last:rounded-r-lg';
export const bandTdClass = 'h-14 border-b border-general-40 px-3 text-sm/5 text-general-100';
