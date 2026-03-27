import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const DF   = 9;
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

// t-distribution PDF constant for df=9
// C = Γ(5) / (sqrt(9π) · Γ(4.5)) = 24 / (sqrt(9π) · 11.6317285)
const PDF_C = 24 / (Math.sqrt(9 * Math.PI) * 11.63172839);
const tPDF  = x => PDF_C * Math.pow(1 + (x * x) / DF, -5);

// Pre-compute x points once (-5 → +5, step 0.05)
const X_POINTS = Array.from({ length: 201 }, (_, i) =>
  parseFloat((-5 + i * 0.05).toFixed(2))
);

/* ── Custom Canvas plugin ─────────────────────────────── */
const tDistPlugin = {
  id: 'tDistShading',

  // Draw shaded fill regions BEFORE the curve line is drawn
  beforeDatasetsDraw(chart) {
    const opts = chart.options.plugins?.tDistShading;
    if (!opts?.critVal) return;

    const { ctx, chartArea: { top, bottom }, scales: { x: xS, y: yS } } = chart;
    const data = chart.data.datasets[0]?.data || [];
    if (!data.length) return;

    const xPx = v => xS.getPixelForValue(v);
    const yPx = v => yS.getPixelForValue(v);
    const y0  = yPx(0);
    const { critVal } = opts;

    // Helper: fill polygon under the curve between xMin and xMax
    const fillBand = (xMin, xMax, color) => {
      const pts = data.filter(d => d.x >= xMin - 0.001 && d.x <= xMax + 0.001);
      if (!pts.length) return;
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(xPx(pts[0].x), y0);
      pts.forEach(d => ctx.lineTo(xPx(d.x), yPx(d.y)));
      ctx.lineTo(xPx(pts[pts.length - 1].x), y0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    fillBand(-5,      -critVal, 'rgba(244,63,94,0.10)');   // left rejection (red)
    fillBand( critVal,  5,      'rgba(244,63,94,0.10)');   // right rejection (red)
    fillBand(-critVal,  critVal, 'rgba(79,110,247,0.08)'); // acceptance (blue)
  },

  // Draw vertical lines AFTER the curve (on top)
  afterDatasetsDraw(chart) {
    const opts = chart.options.plugins?.tDistShading;
    if (!opts?.critVal) return;

    const { ctx, chartArea: { top, bottom }, scales: { x: xS } } = chart;
    const { critVal, tStat } = opts;

    const drawVLine = (val, color, dash, width = 1.5) => {
      if (val < xS.min || val > xS.max) return;
      const px = xS.getPixelForValue(val);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.lineTo(px, bottom);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.stroke();
      ctx.restore();
    };

    // Critical value dashed red lines
    drawVLine(-critVal, 'rgba(244,63,94,0.55)', [4, 4]);
    drawVLine( critVal, 'rgba(244,63,94,0.55)', [4, 4]);

    // t-stat teal dashed line + label
    if (tStat != null && tStat >= xS.min && tStat <= xS.max) {
      drawVLine(tStat, '#0EA5E9', [6, 4], 2);
      const px    = xS.getPixelForValue(tStat);
      const align = tStat >= 0 ? 'left' : 'right';
      const offX  = tStat >= 0 ? 6 : -6;
      ctx.save();
      ctx.font      = `bold 11px ${MONO}`;
      ctx.fillStyle = '#0EA5E9';
      ctx.textAlign = align;
      ctx.fillText(`t = ${tStat.toFixed(3)}`, px + offX, top + 16);
      ctx.restore();
    }
  },
};

/* ── Component ────────────────────────────────────────── */
export default function TDistChart({ tStat, critVal }) {
  const curveData = useMemo(
    () => X_POINTS.map(x => ({ x, y: tPDF(x) })),
    [] // static — never changes
  );

  const inRejection = tStat != null && Math.abs(tStat) > critVal;

  return (
    <div>
      <div style={{ height: 180, position: 'relative' }}>
        <Line
          plugins={[tDistPlugin]}
          data={{
            datasets: [{
              data: curveData,
              borderColor: '#4F6EF7',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.4,
              fill: false,
            }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,    // instant for live updates
            parsing: false,      // data is pre-formatted {x,y}
            plugins: {
              legend:  { display: false },
              tooltip: { enabled: false },
              tDistShading: { tStat, critVal },
            },
            scales: {
              x: {
                type: 'linear',
                min: -5,
                max:  5,
                grid:   { color: '#E2E8F0' },
                border: { display: false },
                ticks: {
                  color: '#64748B',
                  font:  { size: 12, family: MONO },
                  stepSize: 1,
                  callback: v => v > 0 ? `+${v}` : `${v}`,
                },
              },
              y: {
                display: false,
                beginAtZero: true,
              },
            },
          }}
        />
      </div>

      {/* Text summary line */}
      <p style={{
        marginTop: 12,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 14,
        color: '#64748B',
        fontWeight: 400,
        lineHeight: 1.6,
      }}>
        Your t-statistic of{' '}
        <span style={{ ...{ fontFamily: MONO }, color: '#0EA5E9', fontWeight: 600 }}>
          {tStat != null ? tStat.toFixed(3) : '—'}
        </span>{' '}
        falls in the{' '}
        <span style={{ ...{ fontFamily: MONO }, color: inRejection ? '#10B981' : '#F43F5E', fontWeight: 700 }}>
          {inRejection ? 'rejection' : 'acceptance'}
        </span>{' '}
        region (critical value: ±{critVal.toFixed(3)})
      </p>
    </div>
  );
}
