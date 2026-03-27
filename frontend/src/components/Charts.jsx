import React, { useRef } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, PointElement, LineElement,
  Filler, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip, Legend);

const MONO   = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
const BORDER = '#E2E8F0';
const MUTED  = '#64748B';

const TOOLTIP_BASE = {
  backgroundColor: '#FFFFFF',
  borderColor: '#E2E8F0',
  borderWidth: 1,
  titleColor: '#0F172A',
  bodyColor: '#64748B',
  titleFont: { size: 12, family: MONO, weight: '600' },
  bodyFont:  { size: 12, family: MONO },
  padding: 14,
  cornerRadius: 10,
  displayColors: true,
  boxPadding: 5,
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
};

const LEGEND_BASE = {
  labels: {
    color: MUTED,
    font: { size: 11, family: MONO },
    usePointStyle: true,
    pointStyleWidth: 10,
    padding: 20,
  },
};

const AXES_BASE = {
  x: {
    grid: { display: false },
    border: { display: false },
    ticks: { color: MUTED, font: { size: 12, family: MONO }, padding: 8 },
  },
  y: {
    beginAtZero: true,
    grid: { color: '#E2E8F0', drawBorder: false },
    border: { display: false },
    ticks: { color: MUTED, font: { size: 12, family: MONO }, padding: 8 },
  },
};

/* ── Bar chart (Error Magnitude) ─────────────────────── */
export const ErrorBarChart = ({ results }) => {
  if (!results?.length) return null;
  const labels = results.map(r => `S${String(r.id).padStart(2,'0')}`);

  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: 'AI Error',
            data: results.map(r => r.AIError),
            backgroundColor: '#4F6EF7',
            hoverBackgroundColor: '#3B5BDB',
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Human Error',
            data: results.map(r => r.HumanError),
            backgroundColor: '#F43F5E',
            hoverBackgroundColor: '#E11D48',
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250, easing: 'easeOutQuart' },
        plugins: { legend: LEGEND_BASE, tooltip: TOOLTIP_BASE },
        scales: AXES_BASE,
      }}
    />
  );
};

/* ── Line chart (Predictions vs Actual) ──────────────── */
export const PredictionsLineChart = ({ results }) => {
  const ref = useRef(null);

  if (!results?.length) return null;
  const labels = results.map(r => `S${String(r.id).padStart(2,'0')}`);

  // Subtle gradient fill for AI line
  const getGradient = (ctx, chartArea) => {
    if (!chartArea) return 'rgba(79,110,247,0.06)';
    const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, 'rgba(79,110,247,0.10)');
    g.addColorStop(1, 'rgba(79,110,247,0.00)');
    return g;
  };

  return (
    <Line
      ref={ref}
      data={{
        labels,
        datasets: [
          {
            label: 'Actual',
            data: results.map(r => r.Actual),
            borderColor: '#0F172A',
            backgroundColor: 'transparent',
            pointBackgroundColor: '#0F172A',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.4,
            borderWidth: 2.5,
          },
          {
            label: 'AI Prediction',
            data: results.map(r => r.AIPred),
            borderColor: '#4F6EF7',
            backgroundColor: (ctx) => {
              const chart = ctx.chart;
              const { ctx: c, chartArea } = chart;
              return getGradient(c, chartArea);
            },
            fill: true,
            pointBackgroundColor: '#4F6EF7',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.4,
            borderWidth: 2,
          },
          {
            label: 'Human Prediction',
            data: results.map(r => r.HumanPred),
            borderColor: '#F43F5E',
            backgroundColor: 'transparent',
            pointBackgroundColor: '#F43F5E',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.4,
            borderWidth: 2,
            borderDash: [5, 5],
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 250, easing: 'easeOutQuart' },
        plugins: { legend: LEGEND_BASE, tooltip: TOOLTIP_BASE },
        scales: AXES_BASE,
      }}
    />
  );
};
