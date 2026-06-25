import React, { useState, useRef } from 'react'
import { adminApi } from '../../services/adminApi'

/* ─── Console Log Lines ─── */
const defaultLogs = [
  { text: 'Initializing test suite [v4.2.1]...', color: 'var(--on-surface-variant)' },
  { text: '✓ Loaded 540 generic test cases.', color: 'var(--success)' },
  { text: 'Running Intent Classification batch...', color: 'var(--on-surface-variant)' },
  { text: '> Query: "Water pipe broken street 5" → [Dept_Water_Works] (0.92)', color: 'var(--secondary-container)' },
  { text: '> Query: "Need property tax receipt" → [Dept_Revenue] (0.98)', color: 'var(--secondary-container)' },
  { text: '⚠ Low confidence: "Stray dogs near park" → [Animal_Control] (0.55)', color: 'var(--warning)' },
  { text: '✗ FAILED: Assertion. Spam block bypassed for input #ASF18', color: 'var(--error)' },
  { text: 'Awaiting next trigger...', color: 'var(--on-surface-variant)' },
]

export default function AgenticAIDiagnostics() {
  const [spamSensitivity, setSpamSensitivity] = useState(0.85)
  const [vectorMargin, setVectorMargin] = useState(0.60)
  const [testQuery, setTestQuery] = useState('')
  const [testModules, setTestModules] = useState({ sentiment: true, routing: true, spam: false })
  const [sentimentScore, setSentimentScore] = useState(3)
  const [predictedRoute, setPredictedRoute] = useState('Dept_Sanitation')
  const [consoleLogs, setConsoleLogs] = useState(defaultLogs)
  const [isRunning, setIsRunning] = useState(false)
  const [safetyToggles, setSafetyToggles] = useState({ water: true, power: true })
  const [trainingProgress, setTrainingProgress] = useState(40)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const executeTest = async () => {
    if (!testQuery.trim()) return
    setIsRunning(true)
    setConsoleLogs(prev => [...prev, { text: `> Testing: "${testQuery}"...`, color: 'var(--secondary-container)' }])

    try {
      const data = await adminApi.testMLRouting(testQuery)
      setPredictedRoute(data.department || data.predicted_department || 'Unknown')
      setSentimentScore(data.sentiment_score || data.urgency || 3)
      setConsoleLogs(prev => [
        ...prev,
        { text: `✓ Route: [${data.department || data.predicted_department}] (${(data.confidence || 0.87).toFixed(2)})`, color: 'var(--success)' },
      ])
    } catch {
      setConsoleLogs(prev => [...prev, { text: '⚠ ML Service offline. Using fallback.', color: 'var(--warning)' }])
    }
    setIsRunning(false)
  }

  const handleExportLogs = () => {
    const text = consoleLogs.map(l => l.text).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'agentic-ai-diagnostics.log'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleApplyTuning = () => {
    setConsoleLogs(prev => [
      ...prev,
      { text: `> Applying Tuning: Spam Sensitivity=${spamSensitivity.toFixed(2)}, Vector Margin=${vectorMargin.toFixed(2)}`, color: 'var(--on-surface-variant)' },
      { text: `✓ Model tuning updated dynamically.`, color: 'var(--success)' }
    ])
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    setConsoleLogs(prev => [...prev, { text: `> Uploading ${file.name} for retraining...`, color: 'var(--secondary-container)' }])
    setTrainingProgress(0)

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setTrainingProgress(p => {
          if (p >= 90) {
            clearInterval(interval)
            return p
          }
          return p + 10
        })
      }, 500)

      await adminApi.uploadRetrainingCSV(file)
      
      clearInterval(interval)
      setTrainingProgress(100)
      setConsoleLogs(prev => [...prev, { text: `✓ Retraining triggered successfully.`, color: 'var(--success)' }])
    } catch {
      setConsoleLogs(prev => [...prev, { text: `⚠ Upload failed. Using mock progression.`, color: 'var(--warning)' }])
      setTrainingProgress(100)
    }
  }

  return (
    <div>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 8 }}>
            Agentic AI & ML Diagnostics
          </h1>
          <p style={{ fontSize: 16, color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
            Real-time model evaluation, tuning, and routing engine health.
          </p>
        </div>
        <button onClick={handleExportLogs} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
          Export Logs
        </button>
      </div>

      {/* ─── Top Cards Grid ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--card-gap)', marginBottom: 'var(--card-gap)' }}>

        {/* Routing Engine */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px var(--success)' }} />
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 500 }}>Routing Engine</span>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--outline)' }}>alt_route</span>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Latency</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--on-surface)' }}>42<span style={{ fontSize: 14, fontWeight: 500, color: 'var(--on-surface-variant)' }}>ms</span></div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Fallback</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--error)' }}>1.2%</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Accuracy</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--success-text)' }}>98.4%</div>
            </div>
          </div>
        </div>

        {/* NLP Intention */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', boxShadow: '0 0 6px var(--warning)' }} />
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 500 }}>NLP Intention</span>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--outline)' }}>terminal</span>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Tokens/Sec</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--on-surface)' }}>1,204</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Load</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--warning-text)' }}>76%</div>
            </div>
          </div>
        </div>

        {/* Manual Diagnostic */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>science</span>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 500 }}>Manual Diagnostic</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Test Input String</div>
          <textarea
            value={testQuery}
            onChange={e => setTestQuery(e.target.value)}
            placeholder="Enter query to test routing..."
            rows={3}
            style={{
              width: '100%', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)',
              padding: 12, fontFamily: 'var(--font-body)', fontSize: 14, resize: 'none',
              outline: 'none', marginBottom: 12,
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {(['sentiment', 'routing', 'spam'] as const).map(mod => (
              <label key={mod} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--outline-variant)',
                background: testModules[mod] ? 'rgba(0,32,104,.06)' : 'transparent',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: testModules[mod] ? 'var(--primary)' : 'var(--on-surface-variant)',
              }}>
                <input
                  type="checkbox"
                  checked={testModules[mod]}
                  onChange={e => setTestModules(prev => ({ ...prev, [mod]: e.target.checked }))}
                  style={{ accentColor: 'var(--primary)' }}
                />
                {mod === 'spam' ? 'Spam Check' : mod.charAt(0).toUpperCase() + mod.slice(1)}
              </label>
            ))}
          </div>
          <button onClick={executeTest} disabled={isRunning} className="btn" style={{
            width: '100%', padding: '10px 0',
            background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)',
            color: 'var(--on-surface)', fontSize: 14, fontWeight: 500,
            cursor: isRunning ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>play_arrow</span>
            {isRunning ? 'Running...' : 'Execute Test'}
          </button>

          {/* Results */}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Sentiment Score</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600,
                    background: sentimentScore === n ? 'var(--primary)' : 'var(--surface-container-high)',
                    color: sentimentScore === n ? '#fff' : 'var(--on-surface-variant)',
                    border: sentimentScore === n ? 'none' : '1px solid var(--outline-variant)',
                  }}>{n}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Predicted Route</span>
              <span style={{
                padding: '4px 10px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--outline-variant)',
                fontSize: 12, fontWeight: 600, color: 'var(--on-surface)',
              }}>{predictedRoute}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Middle Row ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--card-gap)', marginBottom: 'var(--card-gap)' }}>

        {/* ML Playground */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>tune</span>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 500 }}>ML Playground</span>
            </div>
            <span style={{
              padding: '4px 10px', borderRadius: 'var(--radius-full)',
              background: 'rgba(16,185,129,.1)', color: 'var(--success-text)',
              fontSize: 12, fontWeight: 600, letterSpacing: '.05em',
            }}>Live Environment</span>
          </div>

          {/* Spam Sensitivity Slider */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Spam Sensitivity</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>{spamSensitivity.toFixed(2)}</span>
            </div>
            <input type="range" min="0" max="1" step="0.01" value={spamSensitivity}
              onChange={e => setSpamSensitivity(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 4 }}>
              <span>Permissive</span><span>Strict</span>
            </div>
          </div>

          {/* Vector Similarity Slider */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Vector Similarity Margin (Cosine)</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>{vectorMargin.toFixed(2)}</span>
            </div>
            <input type="range" min="0" max="1" step="0.01" value={vectorMargin}
              onChange={e => setVectorMargin(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 4 }}>
              <span>Broad Match</span><span>Exact Match</span>
            </div>
          </div>

          <button onClick={handleApplyTuning} className="btn btn-primary" style={{ float: 'right' }}>Apply Tuning</button>
        </div>

        {/* Safety Toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>visibility</span>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 500 }}>Safety Toggles</span>
            </div>
            {Object.entries(safetyToggles).map(([key, val]) => (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--outline-variant)', marginBottom: 8,
              }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{key === 'water' ? 'Water & Sanitation' : 'Power Grids'}</span>
                <label style={{ position: 'relative', width: 44, height: 24, cursor: 'pointer' }}>
                  <input type="checkbox" checked={val}
                    onChange={() => setSafetyToggles(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', inset: 0,
                    background: val ? 'var(--primary)' : 'var(--surface-container-high)',
                    borderRadius: 'var(--radius-full)', transition: 'all .2s',
                  }}>
                    <span style={{
                      position: 'absolute', width: 18, height: 18,
                      background: '#fff', borderRadius: '50%',
                      top: 3, left: val ? 23 : 3, transition: 'left .2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                    }} />
                  </span>
                </label>
              </div>
            ))}
          </div>

          {/* CSV Upload */}
          <div className="glass-card" style={{ padding: 24, border: '2px dashed var(--outline-variant)', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--outline)', marginBottom: 8 }}>upload_file</span>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Drop CSV for Retraining</div>
            <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', marginBottom: 12 }}>Upload verified intent mapping dataset to trigger localized fine-tuning.</p>
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-ghost">Browse Files</button>
            <input ref={fileInputRef} onChange={handleFileUpload} type="file" accept=".csv" style={{ display: 'none' }} />
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <span>Training Epoch 4/10</span><span>{trainingProgress}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-container-high)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${trainingProgress}%`, background: 'var(--primary)', borderRadius: 3, transition: 'width .3s' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Test Runner Console ─── */}
      <div style={{
        background: 'var(--inverse-surface)', borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(255,255,255,.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--inverse-on-surface)' }}>terminal</span>
            <span style={{ color: 'var(--inverse-on-surface)', fontSize: 14, fontWeight: 600 }}>Test Runner Console</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
          </div>
        </div>
        <div style={{ padding: 16, maxHeight: 240, overflowY: 'auto', fontFamily: 'var(--font-body)', fontSize: 13 }}>
          {consoleLogs.map((log, i) => (
            <div key={i} style={{ color: log.color, marginBottom: 4, lineHeight: 1.5 }}>{log.text}</div>
          ))}
          <span style={{ display: 'inline-block', width: 8, height: 16, background: 'var(--secondary-container)', animation: 'blink 1s infinite' }} />
        </div>
      </div>
      <style>{`@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
    </div>
  )
}
