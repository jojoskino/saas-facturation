/** Graphique en barres — axes, grille, barres neutres, libellés colorés. */
function buildTicks(max) {
  if (max <= 0) return [0];
  if (max <= 4) {
    return Array.from({ length: max + 1 }, (_, i) => i);
  }
  const step = max <= 10 ? 2 : max <= 25 ? 5 : Math.ceil(max / 4);
  const ticks = [0];
  for (let v = step; v < max; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== max) ticks.push(max);
  return ticks;
}

export default function StatusBarChart({ items, max, emptyLabel = "—", yAxisLabel = "Nombre" }) {
  const barMax = Math.max(max || 0, ...(items || []).map((i) => i.value), 1);
  const ticks = buildTicks(barMax);

  if (!items?.length) {
    return <p className="stat-bar-chart-empty">{emptyLabel}</p>;
  }

  const chartLeft = 36;
  const chartRight = 12;
  const chartTop = 16;
  const chartBottom = 52;
  const barAreaHeight = 140;
  const minBarWidth = 56;
  const chartWidth = Math.max(280, items.length * minBarWidth + chartLeft + chartRight);
  const chartHeight = chartTop + barAreaHeight + chartBottom;
  const plotWidth = chartWidth - chartLeft - chartRight;
  const barGap = 12;
  const barWidth = Math.min(48, (plotWidth - barGap * (items.length - 1)) / items.length);

  function barHeight(value) {
    return Math.max(4, (value / barMax) * barAreaHeight);
  }

  function yPos(value) {
    return chartTop + barAreaHeight - (value / barMax) * barAreaHeight;
  }

  const baselineY = chartTop + barAreaHeight;

  return (
    <>
      <style>{`
        .stat-bar-chart-empty {
          margin: 0;
          font-size: 13px;
          color: var(--color-text-muted);
        }
        .stat-bar-chart-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 2px;
        }
        .stat-bar-chart-svg {
          display: block;
          height: auto;
          min-width: 100%;
        }
        .stat-bar-chart-axis-title {
          font-size: 9px;
          fill: #94a3b8;
          font-weight: 600;
        }
        .stat-bar-chart-grid {
          stroke: #e8edf3;
          stroke-width: 1;
        }
        .stat-bar-chart-axis-line {
          stroke: #cbd5e1;
          stroke-width: 1;
        }
        .stat-bar-chart-tick {
          font-size: 10px;
          fill: #64748b;
        }
        .stat-bar-chart-bar {
          fill: #cbd5e1;
        }
        .stat-bar-chart-value {
          font-size: 11px;
          font-weight: 700;
          fill: #14213d;
        }
        .stat-bar-chart-label {
          font-size: 10px;
          font-weight: 600;
        }
      `}</style>
      <div className="stat-bar-chart-wrap">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="stat-bar-chart-svg"
          role="img"
          aria-label={yAxisLabel}
        >
          <text
            x={8}
            y={chartTop + barAreaHeight / 2}
            className="stat-bar-chart-axis-title"
            transform={`rotate(-90, 8, ${chartTop + barAreaHeight / 2})`}
            textAnchor="middle"
          >
            {yAxisLabel}
          </text>

          {ticks.map((tick) => {
            const y = yPos(tick);
            return (
              <g key={`tick-${tick}`}>
                <line x1={chartLeft} y1={y} x2={chartWidth - chartRight} y2={y} className="stat-bar-chart-grid" />
                <text x={chartLeft - 6} y={y + 3} textAnchor="end" className="stat-bar-chart-tick">
                  {tick}
                </text>
              </g>
            );
          })}

          <line
            x1={chartLeft}
            y1={baselineY}
            x2={chartWidth - chartRight}
            y2={baselineY}
            className="stat-bar-chart-axis-line"
          />

          {items.map((item, index) => {
            const x = chartLeft + index * (barWidth + barGap) + (plotWidth - items.length * barWidth - barGap * (items.length - 1)) / 2;
            const h = barHeight(item.value);
            const y = baselineY - h;
            const labelX = x + barWidth / 2;

            return (
              <g key={item.key}>
                <title>{`${item.label}: ${item.value}`}</title>
                {item.value > 0 ? (
                  <text x={labelX} y={y - 6} textAnchor="middle" className="stat-bar-chart-value">
                    {item.value}
                  </text>
                ) : null}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  rx={4}
                  className="stat-bar-chart-bar"
                />
                <text
                  x={labelX}
                  y={baselineY + 16}
                  textAnchor="middle"
                  className="stat-bar-chart-label"
                  fill={item.color}
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}
