type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
};

export function Sparkline({ data, width = 72, height = 28, className = "" }: SparklineProps) {
  if (!data.length) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : 0;

  const points = data
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const last = data[data.length - 1] ?? 0;
  const prev = data[data.length - 2] ?? last;
  const trend = last >= prev ? "up" : "down";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`kpi-sparkline kpi-sparkline-${trend} ${className}`.trim()}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
