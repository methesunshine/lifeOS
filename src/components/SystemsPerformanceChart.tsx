'use client';

interface AreaScore {
    area: string;
    icon: string;
    score: number;
    color: string;
}

export default function SystemsPerformanceChart({ areaScores }: { areaScores: AreaScore[] }) {
    const hasData = areaScores.some(d => d.score > 0);

    return (
        <div style={{ width: '100%' }}>
            {/* Top info */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                <span style={{ opacity: 0.8 }}>Current Area Snapshot (%)</span>
            </div>

            {!hasData ? (
                <div style={{
                    height: 180,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    border: '1px dashed var(--border)', borderRadius: '0.75rem',
                    color: 'var(--text-muted)'
                }}>
                    <span style={{ fontSize: '1.5rem' }}>📊</span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>No performance data found</p>
                    <p style={{ fontSize: '0.72rem', opacity: 0.7 }}>Log activities to populate your life area scores</p>
                </div>
            ) : (
                <>
                    {/* Bars row */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, padding: '0 0.25rem', gap: '0.5rem' }}>
                        {areaScores.map((item, i) => {
                            const isEmpty = item.score === 0;
                            return (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                                    <div
                                        title={`${item.area}: ${item.score}%`}
                                        style={{
                                            width: '24px',
                                            borderRadius: '4px 4px 0 0',
                                            height: isEmpty ? '3px' : `${Math.max(4, item.score * 1.4)}px`,
                                            background: item.color || 'var(--primary)',
                                            transition: 'height 0.4s ease',
                                            opacity: isEmpty ? 0.15 : 1,
                                            boxShadow: isEmpty ? 'none' : `0 0 10px ${item.color}33`
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Separator */}
                    <div style={{ borderTop: '1px solid var(--border)', margin: '0.5rem 0.25rem' }} />

                    {/* Labels row — icon + area name */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0.25rem', gap: '0.5rem' }}>
                        {areaScores.map((item, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <div style={{ fontSize: '1rem', marginBottom: 2 }}>{item.icon}</div>
                                <div style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    textAlign: 'center',
                                    lineHeight: 1.1
                                }}>
                                    {item.area}
                                </div>
                                <div style={{
                                    fontSize: '0.6rem',
                                    fontWeight: 800,
                                    color: item.color,
                                    background: `${item.color}11`,
                                    padding: '1px 4px',
                                    borderRadius: '4px',
                                    marginTop: '2px'
                                }}>
                                    {item.score}%
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer description */}
                    <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        Snapshot of your current progress across all 8 life systems.
                    </div>
                </>
            )}
        </div>
    );
}
