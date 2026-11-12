export interface DonutSegment {
  value: number;
  // 線の色(text-* クラス。stroke は currentColor)
  colorClass: string;
  label: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  // 中央に表示する小さな見出しと値
  centerLabel: string;
  centerValue: string;
  // 読み上げ用(内訳を含む文)
  ariaLabel: string;
}

const RADIUS = 42;
const STROKE_WIDTH = 17;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// 09 §5-4 の例外: 静的 SVG のドーナツ(ライブラリなし)。割合を円周の長さで描く
export function DonutChart({ segments, centerLabel, centerValue, ariaLabel }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  // 値のある区間だけを、円周上の開始位置つきで並べる
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s, index, visible) => ({
      ...s,
      length: (s.value / total) * CIRCUMFERENCE,
      start: visible.slice(0, index).reduce((sum, v) => sum + (v.value / total) * CIRCUMFERENCE, 0),
    }));

  return (
    <div role="img" aria-label={ariaLabel} className="relative size-28 shrink-0 sm:size-32">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE_WIDTH}
          className="stroke-general-40"
        />
        {arcs.map((arc) => (
          <circle
            key={arc.label}
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${arc.length} ${CIRCUMFERENCE - arc.length}`}
            strokeDashoffset={-arc.start}
            className={arc.colorClass}
          />
        ))}
      </svg>
      <div
        aria-hidden="true"
        className="absolute inset-0 flex flex-col items-center justify-center gap-0.5"
      >
        <span className="text-xs/4 font-medium text-general-100">{centerLabel}</span>
        <span className="text-h5 font-bold text-general-100 tabular-nums">{centerValue}</span>
      </div>
    </div>
  );
}
