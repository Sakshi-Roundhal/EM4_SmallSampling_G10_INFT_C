import React, { useState } from 'react';

const MONO = { fontFamily: "'JetBrains Mono','Fira Code',ui-monospace,monospace" };

const StepBadge = ({ n }) => (
  <div style={{
    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
    background: 'var(--accent-blue)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color: '#fff' }}>{n}</span>
  </div>
);

const StepCard = ({ n, title, children }) => (
  <div className="card-inner">
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <StepBadge n={n} />
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {title}
      </span>
    </div>
    <div style={{ ...MONO, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.9 }}>
      {children}
    </div>
  </div>
);

const Hi = ({ c = 'var(--accent-blue)', children }) => (
  <span style={{ color: c, fontWeight: 700 }}>{children}</span>
);

const MathPanel = ({ mathProps }) => {
  const [open, setOpen] = useState(false);
  if (!mathProps) return null;

  const f = (v, d) => (v == null) ? '—' : Number(v).toFixed(d);

  try {
    const { differences, mean_diff, std_dev_diff, t_stat, df, cohens_d, ci_lower, ci_upper } = mathProps;
    const n       = differences?.length || 0;
    const diffSum = differences?.reduce((a, b) => a + Number(b), 0) || 0;

    return (
      <div style={{ background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>

        {/* Toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          className="btn-ghost"
          style={{
            width: '100%',
            justifyContent: 'space-between',
            borderRadius: 0,
            border: 'none',
            borderBottom: open ? '1px solid var(--border)' : 'none',
            padding: '16px 24px',
            color: 'var(--text-primary)',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
              Mathematical Derivation
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--accent-teal)' }}>Paired t-Test · Manual</span>
          </div>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)' }}>{open ? '▾ Hide' : '▸ Show'}</span>
        </button>

        {/* Accordion */}
        <div className={`panel ${open ? 'panel-open' : ''}`}>
          <div>
            <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* 2x2 step grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                <StepCard n={1} title="Compute Differences (d = AI Error − Human Error)">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {differences?.map((d, i) => {
                      const pos = d > 0, neg = d < 0;
                      return (
                        <span key={i} style={{
                          padding: '3px 9px', borderRadius: 6, fontSize: 12,
                          border: '1px solid',
                          background: neg ? 'rgba(79,110,247,0.06)' : pos ? 'rgba(244,63,94,0.06)' : '#F8FAFC',
                          borderColor: neg ? 'rgba(79,110,247,0.2)' : pos ? 'rgba(244,63,94,0.2)' : 'var(--border)',
                          color: neg ? 'var(--accent-blue)' : pos ? 'var(--accent-red)' : 'var(--text-muted)',
                        }}>
                          d{i+1} = {d > 0 ? '+' : ''}{f(d, 1)}
                        </span>
                      );
                    })}
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    n = <Hi>{n}</Hi> &nbsp;·&nbsp; df = n−1 = <Hi>{df}</Hi>
                  </span>
                </StepCard>

                <StepCard n={2} title="Mean of Differences (d̄)">
                  d̄ = Σd / n<br/>
                  d̄ = {f(diffSum, 4)} / {n}<br/>
                  d̄ = <Hi c="var(--accent-teal)">{f(mean_diff, 4)}</Hi>
                </StepCard>

                <StepCard n={3} title="Sample Std. Deviation (Sd)">
                  Sd = √[ Σ(d − d̄)² / (n−1) ]<br/>
                  Sd = <Hi c="var(--accent-teal)">{f(std_dev_diff, 4)}</Hi>
                </StepCard>

                <StepCard n={4} title="t-Statistic">
                  t = d̄ / (Sd / √n)<br/>
                  t = {f(mean_diff, 4)} / ({f(std_dev_diff, 4)} / √{n})<br/>
                  t = <Hi c="var(--accent-teal)">{f(t_stat, 4)}</Hi>
                </StepCard>
              </div>

              {/* Final t-stat showcase */}
              <div style={{
                background: '#EFF6FF',
                border: '1.5px solid #BFDBFE',
                borderRadius: 16,
                padding: '32px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Final t-Statistic
                </span>
                <span style={{
                  ...MONO, fontSize: 52, fontWeight: 800, color: 'var(--accent-blue)',
                  letterSpacing: '-0.03em', lineHeight: 1,
                }}>
                  {f(t_stat, 4)}
                </span>
              </div>

              {/* Cohen's d + CI */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="card-inner" style={{ background: '#FFFFFF', boxShadow: 'var(--shadow)' }}>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
                    Cohen's d — Effect Size
                  </p>
                  <p style={{ ...MONO, fontSize: 32, fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 8 }}>{f(cohens_d, 3)}</p>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 10px', borderRadius: 999,
                    background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A',
                    fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
                  }}>
                    {Math.abs(cohens_d) < 0.2 ? 'Negligible' : Math.abs(cohens_d) < 0.5 ? 'Small' : Math.abs(cohens_d) < 0.8 ? 'Medium' : 'Large'} effect
                  </span>
                </div>
                <div className="card-inner" style={{ background: '#FFFFFF', boxShadow: 'var(--shadow)' }}>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
                    95% Confidence Interval
                  </p>
                  <p style={{ ...MONO, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.01em' }}>
                    <span style={{ fontSize: 32, color: 'var(--text-dim)' }}>[</span>
                    {f(ci_lower, 2)},&nbsp;{f(ci_upper, 2)}
                    <span style={{ fontSize: 32, color: 'var(--text-dim)' }}>]</span>
                  </p>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)' }}>Of true mean difference μ_d</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  } catch (e) {
    return (
      <div style={{ background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
        <p style={{ ...MONO, fontSize: 12, color: 'var(--accent-red)' }}>Render error: {e.message}</p>
      </div>
    );
  }
};

export default MathPanel;
