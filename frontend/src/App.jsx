import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { RefreshCw, CheckCircle2, AlertTriangle, Bot, User } from 'lucide-react';
import MathPanel from './components/MathPanel';
import TDistChart from './components/TDistChart';
import { ErrorBarChart, PredictionsLineChart } from './components/Charts';

const API  = 'http://localhost:8000';
const MONO = { fontFamily: "'JetBrains Mono','Fira Code',ui-monospace,monospace" };

/* ── α configuration ─────────────────────────────────── */
const ALPHA_OPTS = [0.01, 0.05, 0.10];
const CRIT_T     = { 0.01: 2.797, 0.05: 2.064, 0.10: 1.711 };

/* ── Client-side t-test math (mirrors backend/math_utils.py) ── */
function approxPValue(tStat, df) {
  if (df <= 0) return 1.0;
  const z    = tStat * (1.0 - 1.0 / (4.0 * df));
  const zAbs = Math.abs(z);
  const b1=0.319381530, b2=-0.356563782, b3=1.781477937, b4=-1.821255978, b5=1.330274429;
  const pC=0.2316419, c=0.39894228;
  const tv  = 1.0 / (1.0 + pC * zAbs);
  const cdf = 1.0 - c * Math.exp(-zAbs * zAbs / 2.0) * tv *
              (b1 + tv * (b2 + tv * (b3 + tv * (b4 + tv * b5))));
  return Math.max(0, Math.min(1, 2.0 * (1.0 - cdf)));
}

function computeAnalysis(students, preds) {
  if (!students.length) return { results: null, math: null };
  const n = students.length;

  const rows = students.map(s => {
    const raw      = parseFloat(preds[s.id]);
    const humanPred = isNaN(raw) ? 0 : Math.max(0, Math.min(100, raw));
    const aiError   = Math.abs(s.Actual - s.AIPred);
    const humanError = Math.abs(s.Actual - humanPred);
    return { id: s.id, Actual: s.Actual, AIPred: s.AIPred, HumanPred: humanPred,
             AIError: aiError, HumanError: humanError };
  });

  const diffs    = rows.map(r => r.AIError - r.HumanError);
  const meanDiff = diffs.reduce((a, b) => a + b, 0) / n;
  const variance = diffs.reduce((a, d) => a + (d - meanDiff) ** 2, 0) / (n - 1);
  const stdDev   = Math.sqrt(variance);
  const tStat    = stdDev === 0 ? 0 : meanDiff / (stdDev / Math.sqrt(n));
  const df       = n - 1;
  const pValue   = approxPValue(tStat, df);
  const cohensD  = stdDev === 0 ? 0 : meanDiff / stdDev;
  const tCrit95  = 2.064; // fixed CI uses 95% (df=24)
  const margin   = stdDev === 0 ? 0 : tCrit95 * (stdDev / Math.sqrt(n));

  return {
    results: rows,
    math: {
      differences: diffs, mean_diff: meanDiff, std_dev_diff: stdDev,
      t_stat: tStat, p_value: pValue, df,
      cohens_d: cohensD, ci_lower: meanDiff - margin, ci_upper: meanDiff + margin,
    },
  };
}

/* ── Metric card ─────────────────────────────────────── */
const MetricCard = ({ label, value, sub, accentColor, valueColor, badge }) => (
  <div className="card-sm" style={{ display: 'flex', flexDirection: 'column' }}>
    <div style={{ width: 40, height: 4, borderRadius: 9999, background: accentColor, opacity: 0.8, marginBottom: 14 }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {label}
      </span>
      {badge && (
        <span className="pill pill-sig">
          {badge.label}
        </span>
      )}
    </div>
    <p style={{ ...MONO, fontSize: 40, fontWeight: 800, lineHeight: 1, color: valueColor,
                letterSpacing: '-0.02em', marginBottom: 6, transition: 'color 0.2s ease' }}>
      {value ?? '—'}
    </p>
    {sub && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{sub}</p>}
  </div>
);

/* ── Alpha selector ──────────────────────────────────── */
const AlphaSelector = ({ alpha, setAlpha }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em',
                   textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
      Significance Level (α)
    </span>
    <div style={{ display: 'flex', gap: 6 }}>
      {ALPHA_OPTS.map(a => (
        <button
          key={a}
          onClick={() => setAlpha(a)}
          style={{
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
            padding: '5px 16px', borderRadius: 9999, cursor: 'pointer',
            border: alpha === a ? 'none' : '1px solid var(--border)',
            background: alpha === a ? 'var(--accent-blue)' : '#FFFFFF',
            color: alpha === a ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}
        >
          {a}
        </button>
      ))}
    </div>
    <span style={{ ...MONO, fontSize: 13, color: 'var(--text-muted)' }}>
      Critical t-value (df=24): <span style={{ color: 'var(--text-muted)' }}>±{CRIT_T[alpha].toFixed(3)}</span>
    </span>
  </div>
);

/* ── Navbar ──────────────────────────────────────────── */
const Navbar = () => (
  <nav style={{
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
    boxShadow: '0 4px 32px -12px rgba(0, 0, 0, 0.1)',
    padding: '14px 56px',
    display: 'flex',
    justifyContent: 'center',
    gap: 32,
    transition: 'all 0.3s ease'
  }}>
    {[
      { label: 'Dataset', href: '#dataset' },
      { label: 'T-Distribution', href: '#tdist' },
      { label: 'Comparison Matrix', href: '#matrix' },
      { label: 'Graphs', href: '#graphs' },
      { label: 'Mathematical Derivation', href: '#math' }
    ].map(link => (
      <a
        key={link.href}
        href={link.href}
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)',
          textDecoration: 'none',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          padding: '8px 16px',
          borderRadius: 8,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(79, 110, 247, 0.08)';
          e.currentTarget.style.color = 'var(--accent-blue)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
      >
        {link.label}
      </a>
    ))}
  </nav>
);

/* ── App ─────────────────────────────────────────────── */
export default function App() {
  const [students, setStudents] = useState([]);
  const [preds,    setPreds]    = useState({});
  const [alpha,    setAlpha]    = useState(0.05);
  const [fetching, setFetching] = useState(false);
  const [err,      setErr]      = useState('');

  /* Live computation — runs on every keystroke, no button needed */
  const { results, math } = useMemo(
    () => computeAnalysis(students, preds),
    [students, preds]
  );

  const load = async () => {
    setFetching(true); setErr('');
    setPreds({}); 
    try {
      const { data } = await axios.get(`${API}/generate-sample?n=25`);
      setStudents(data.students);
      const blank = {};
      data.students.forEach(s => { blank[s.id] = '0'; });
      setPreds(blank);
    } catch { setErr('Cannot reach backend. Is uvicorn running on port 8000?'); }
    setFetching(false);
  };

  useEffect(() => { load(); }, []);
  const change = (id, v) => setPreds(p => ({ ...p, [id]: v }));

  /* Derived values */
  const meanAI    = results ? (results.reduce((a, r) => a + r.AIError,    0) / results.length).toFixed(2) : null;
  const meanHuman = results ? (results.reduce((a, r) => a + r.HumanError, 0) / results.length).toFixed(2) : null;
  const aiWins    = results ? +meanAI <= +meanHuman : null;
  const critT     = CRIT_T[alpha];
  const sigDiff   = math && math.p_value < alpha;

  /* Input validity: highlight empties as invalid */
  const isInvalid = id => {
    const v = preds[id];
    return v !== '' && v !== undefined && isNaN(parseFloat(v));
  };

  const page = { maxWidth: 1280, margin: '0 auto', padding: '0 56px', paddingTop: 44, paddingBottom: 80 };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* ── NAVBAR ── */}
      <Navbar />

      {/* ── HEADER ── */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'transparent' }}>
        <div style={{ ...page, paddingTop: 0, paddingBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 15, paddingBottom: 15 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                AI vs Human — Paired t-Test
              </h1>
              
            </div>
            <button className="btn-ghost" onClick={load} disabled={fetching}>
              <RefreshCw size={14} style={fetching ? { animation: 'spin 1s linear infinite' } : {}} />
              {fetching ? 'Loading…' : 'New Sample'}
            </button>
          </div>
        </div>
      </div>

      <div style={page}>

        {err && (
          <div style={{ marginBottom: 24, borderLeft: '4px solid var(--accent-red)', background: '#FFF5F7', borderRadius: '0 8px 8px 0', padding: '12px 16px', display: 'flex', gap: 10 }}>
            <AlertTriangle size={14} color="var(--accent-red)" style={{ flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--accent-red)' }}>{err}</span>
          </div>
        )}

        {/* ── ROW 1: Dataset + Inputs ── */}
        <div id="dataset" style={{ scrollMarginTop: 85, marginBottom: 24, display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 16 }}>

          {/* Dataset card */}
          <div className="card fade-up">
            <div className="card-label teal">Student Dataset Sample</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              25 randomly generated students · EndSem hidden · AI predictions pre-computed
            </p>
            <table className="data-table">
              <thead>
                  <tr>
                    {['#', 'Mid-1', 'Mid-2', 'Internal', 'Attend.', 'Study h', 'Sleep h', 'AI Pred'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0
                    ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>{fetching ? 'Generating…' : 'No data'}</td></tr>
                    : students.map(s => (
                      <tr key={s.id}>
                        <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>S{String(s.id).padStart(2,'0')}</td>
                        <td>{s.Mid1}</td><td>{s.Mid2}</td><td>{s.Internal}</td>
                        <td>{s.Attendance}</td><td>{s.StudyHours}</td><td>{s.SleepHours}</td>
                        <td style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{s.AIPred ?? '—'}</td>
                      </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Prediction card — live, no button */}
          <div className="card fade-up d1" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Label with live pulse dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div className="card-label blue" style={{ marginBottom: 0 }}>Human Predictions</div>
              <span className="pulse-dot" title="Live calculation active" />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18, marginTop: 6 }}>
              Type to update results instantly — no button required.
            </p>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: 16, rowGap: 8, alignContent: 'space-between', marginBottom: 16 }}>
              {students.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
                                textTransform: 'uppercase', color: 'var(--text-muted)', width: 26, flexShrink: 0 }}>
                    S{String(s.id).padStart(2,'0')}
                  </div>
                  <input
                    type="number"
                    className="input input-sm"
                    placeholder="—"
                    min={0} max={100}
                    value={preds[s.id] ?? ''}
                    onChange={e => change(s.id, e.target.value)}
                    style={{ flex: 1, ...(isInvalid(s.id) ? { borderColor: 'var(--accent-red)' } : {}) }}
                  />
                </div>
              ))}
            </div>
            {/* Live status indicator */}
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#F0F4FF', borderRadius: 8,
                          border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Current t-statistic</span>
              <span style={{ ...MONO, fontSize: 14, fontWeight: 700,
                             color: 'var(--accent-blue)',
                             transition: 'color 0.2s ease' }}>
                {math ? math.t_stat.toFixed(3) : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* ── RESULTS (always visible once students loaded) ── */}
        {results && (
          <div>
            {/* ── METRICS & T-DIST ── */}
            <div id="tdist" style={{ scrollMarginTop: 85 }}>
              <div style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
              <MetricCard label="Mean AI Error"    value={meanAI}    accentColor="var(--accent-green)" valueColor="var(--accent-green)" sub={aiWins ? 'AI outperformed human' : 'AI underperformed'} />
              <MetricCard label="Mean Human Error" value={meanHuman} accentColor="var(--accent-red)"   valueColor="var(--accent-red)"   sub={!aiWins ? 'Human outperformed AI' : 'Human underperformed'} />
              <MetricCard label="t-Statistic"      value={math?.t_stat?.toFixed(3)}  accentColor="var(--accent-teal)" valueColor="var(--text-primary)" sub={`df = ${math?.df} · two-tailed`} />
              <MetricCard label="p-Value"          value={math?.p_value?.toFixed(4)} accentColor="var(--accent-blue)" valueColor="var(--accent-blue)"  sub={`α = ${alpha} threshold`}
                badge={{ sig: sigDiff, label: sigDiff ? '✓ Significant' : '✗ Not sig.' }} />
            </div>

            {/* ── α selector ── */}
            <div style={{ marginBottom: 16, padding: '14px 18px', background: '#F8FAFC',
                          border: '1px solid var(--border)', borderRadius: 10 }}>
              <AlphaSelector alpha={alpha} setAlpha={setAlpha} />
            </div>

            {/* Verdict banner */}
            <div style={{
              marginBottom: 24,
              background: sigDiff ? '#F0FDF4' : '#FFF7ED',
              borderLeft: `4px solid ${sigDiff ? '#10B981' : '#F97316'}`,
              borderRadius: '0 12px 12px 0',
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
              transition: 'border-color 0.3s ease, background 0.3s ease',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: sigDiff ? 'rgba(16,185,129,0.18)' : 'rgba(249,115,22,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {sigDiff
                  ? <CheckCircle2 size={16} color="#059669" />
                  : <AlertTriangle size={16} color="#F97316" />}
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
                            color: sigDiff ? '#065F46' : '#9A3412', marginBottom: 4,
                            transition: 'color 0.2s ease' }}>
                  {sigDiff ? 'Reject H₀ — Statistically significant difference detected' : 'Fail to Reject H₀ — No significant difference found'}
                </p>
                <p style={{ ...MONO, fontSize: 12, color: 'var(--text-muted)' }}>
                  H₀: μ_d = 0 &nbsp;·&nbsp; H₁: μ_d ≠ 0 &nbsp;·&nbsp; p = {math?.p_value?.toFixed(4)} &nbsp;·&nbsp; α = {alpha}
                </p>
              </div>
            </div>

            {/* ── t-Distribution curve card (Feature 3) ── */}
            <div style={{
              marginBottom: 24,
              background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 16, padding: 24,
              boxShadow: 'var(--shadow)',
            }}>
              <div className="card-label teal" style={{ marginBottom: 18 }}>
                T-Distribution · df = 24
              </div>
              <TDistChart tStat={math?.t_stat ?? null} critVal={critT} />
              </div>
            </div>

            {/* Prediction comparison matrix */}
            <div id="matrix" style={{ scrollMarginTop: 85, marginBottom: 24, background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                <div className="card-label green" style={{ marginBottom: 0 }}>Prediction Comparison Matrix</div>
              </div>
              <table className="data-table">
                <thead>
                    <tr>
                      {['Student','Actual','AI Pred','Human Pred','AI Error','Human Error','Superior'].map((h, i) => (
                        <th key={i} style={{ paddingLeft: i === 0 ? 24 : 14 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => {
                      const aiBetter = r.AIError < r.HumanError;
                      const tie      = r.AIError === r.HumanError;
                      return (
                        <tr key={r.id}>
                          <td style={{ color: 'var(--text-muted)', paddingLeft: 24, fontWeight: 500 }}>S{String(r.id).padStart(2,'00')}</td>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.Actual}</td>
                          <td style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{r.AIPred}</td>
                          <td style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{r.HumanPred}</td>
                          <td style={{ color: 'var(--accent-blue)' }}>{r.AIError}</td>
                          <td style={{ color: !aiBetter && !tie ? 'var(--accent-red)' : 'var(--text-muted)' }}>{r.HumanError}</td>
                          <td>
                            {tie
                              ? <span className="pill pill-muted">Tie</span>
                              : aiBetter
                                ? <span className="pill pill-blue"><Bot size={10}/> AI</span>
                                : <span className="pill pill-green"><User size={10}/> Human</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} style={{ paddingLeft: 24, color: 'var(--text-muted)', fontSize: 13, textAlign: 'right' }}>
                        Aggregate mean errors →
                      </td>
                      <td style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{meanAI}</td>
                      <td style={{ color: 'var(--accent-red)', fontWeight: 700 }}>{meanHuman}</td>
                      <td />
                  </tr>
                </tfoot>
              </table>

              {/* ── Winner Summary Banner ── */}
              {(() => {
                const aiWinsCount    = results.filter(r => r.AIError < r.HumanError).length;
                const humanWinsCount = results.filter(r => r.HumanError < r.AIError).length;
                const tiesCount      = results.filter(r => r.AIError === r.HumanError).length;
                const overallWinner  = +meanAI < +meanHuman ? 'AI' : +meanHuman < +meanAI ? 'Human' : 'Tie';
                const winnerColor    = overallWinner === 'AI' ? 'var(--accent-blue)' : overallWinner === 'Human' ? '#10B981' : 'var(--text-muted)';
                const winnerBg       = overallWinner === 'AI' ? 'rgba(79,110,247,0.06)' : overallWinner === 'Human' ? 'rgba(16,185,129,0.06)' : '#F8FAFC';
                const winnerBorder   = overallWinner === 'AI' ? 'rgba(79,110,247,0.25)' : overallWinner === 'Human' ? 'rgba(16,185,129,0.25)' : 'var(--border)';
                return (
                  <div style={{
                    margin: '0 0 0 0',
                    padding: '16px 24px',
                    borderTop: '2px solid var(--border)',
                    background: winnerBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
                  }}>
                    {/* Win count pills */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: 4 }}>
                        Round Wins
                      </span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 12px', borderRadius: 9999, fontSize: 13, fontWeight: 700,
                        background: 'rgba(79,110,247,0.10)', color: 'var(--accent-blue)', border: '1px solid rgba(79,110,247,0.2)',
                      }}>
                        <Bot size={12}/> AI — {aiWinsCount}
                      </span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 12px', borderRadius: 9999, fontSize: 13, fontWeight: 700,
                        background: 'rgba(16,185,129,0.10)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)',
                      }}>
                        <User size={12}/> Human — {humanWinsCount}
                      </span>
                      {tiesCount > 0 && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 12px', borderRadius: 9999, fontSize: 13, fontWeight: 700,
                          background: '#F1F5F9', color: 'var(--text-muted)', border: '1px solid var(--border)',
                        }}>
                          Ties — {tiesCount}
                        </span>
                      )}
                    </div>

                    {/* Overall Winner */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 20px', borderRadius: 10,
                      border: `1.5px solid ${winnerBorder}`,
                      background: '#fff',
                    }}>
                      <span style={{ fontSize: 20 }}>🏆</span>
                      <div>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>
                          Overall Winner
                        </p>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 800, color: winnerColor, letterSpacing: '-0.01em' }}>
                          {overallWinner === 'AI' ? 'AI Model' : overallWinner === 'Human' ? 'Human' : 'It\'s a Tie'}
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>
                            (lower mean error: {overallWinner === 'AI' ? meanAI : overallWinner === 'Human' ? meanHuman : `${meanAI} = ${meanHuman}`})
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Charts */}
            <div id="graphs" style={{ scrollMarginTop: 85, marginBottom: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card" style={{ height: 380, display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
                <div className="card-label blue" style={{ marginBottom: 12 }}>Error Magnitude Comparison</div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <ErrorBarChart results={results} />
                </div>
              </div>
              <div className="card" style={{ height: 380, display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
                <div className="card-label teal" style={{ marginBottom: 12 }}>Prediction vs Actual Scores</div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <PredictionsLineChart results={results} />
                </div>
              </div>
            </div>

            {/* Math derivation */}
            <div id="math" style={{ scrollMarginTop: 85 }}>
              <MathPanel mathProps={math} />
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
