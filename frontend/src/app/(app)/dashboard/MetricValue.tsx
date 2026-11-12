// 「96時間」「12日」を 数字(大)+ 単位(小)で表示する。数字で始まらない文字列はそのまま表示する
export function MetricValue({ value }: { value: string }) {
  const match = /^(\d+(?:\.\d+)?)(.*)$/.exec(value);
  if (!match) return <>{value}</>;
  return (
    <>
      {match[1]}
      <span className="ml-0.5 text-base/6 font-bold sm:text-xl/7">{match[2]}</span>
    </>
  );
}
