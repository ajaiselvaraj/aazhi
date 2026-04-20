import React, { useState, useEffect } from 'react'
import {
  Heart, RefreshCw, AlertTriangle, Inbox, Sparkles, Clock,
  TrendingUp, Frown, Smile, Meh, Angry
} from 'lucide-react'
import { adminApi } from '../../services/adminApi'

interface PulseData {
  sentiment_distribution: Record<string, number>
  urgency_histogram: Record<string, number>
  avg_urgency: number
  trending_phrases: { phrase: string; count: number }[]
  top_angry_phrases: { phrase: string; count: number }[]
  department_mood: Record<string, { mood_score: number; avg_urgency: number; dominant_sentiment: string; total: number }>
  total_analyzed: number
  processing_time_ms: number
  ml_method: string
}

const SENTIMENT_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; emoji: string }> = {
  Angry: { color: '#FF4D4F', bg: '#fff1f0', icon: <Angry size={16} />, emoji: '😡' },
  Frustrated: { color: '#FFA940', bg: '#fff7e6', icon: <Frown size={16} />, emoji: '😤' },
  Neutral: { color: '#2F6BFF', bg: '#f0f5ff', icon: <Meh size={16} />, emoji: '😐' },
  Positive: { color: '#2ECC71', bg: '#eafaf1', icon: <Smile size={16} />, emoji: '😊' },
}

export default function SentimentPulsePanel() {
  const [data, setData] = useState<PulseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadPulse() }, [])

  async function loadPulse() {
    setLoading(true)
    setError(null)
    try {
      const result = await adminApi.getMLSentimentPulse()
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Failed to load sentiment pulse')
    } finally {
      setLoading(false)
    }
  }

  const moodLabel = (score: number) => {
    if (score >= 75) return { label: 'Happy', color: '#2ECC71' }
    if (score >= 55) return { label: 'Calm', color: '#2F6BFF' }
    if (score >= 35) return { label: 'Tense', color: '#FFA940' }
    return { label: 'Critical', color: '#FF4D4F' }
  }

  return (
    <div className="section-gap" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ═══ Header Banner ═══ */}
      <div style={{
        background: 'linear-gradient(135deg, #1a0a28 0%, #2a1540 50%, #1a1040 100%)',
        borderRadius: 16, padding: '1.5rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem',
        border: '1px solid rgba(255,105,180,.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #ff6b9d, #c44569)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(255,105,180,.4)',
          }}>
            <Heart size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>
              🎯 Citizen Sentiment Pulse
            </div>
            <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.45)', marginTop: '.15rem' }}>
              ML-powered batch sentiment analysis • Real-time citizen mood dashboard
            </div>
          </div>
        </div>
        {data && (
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {[
              { label: 'Analyzed', val: data.total_analyzed, color: '#ff6b9d' },
              { label: 'Avg Urgency', val: `${data.avg_urgency}/5`, color: '#FFA940' },
              { label: 'Speed', val: `${data.processing_time_ms}ms`, color: '#2F6BFF' },
            ].map((m, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: m.color }}>{m.val}</div>
                <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.35)' }}>{m.label}</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={loadPulse} className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,.15)', color: '#fff' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
          <p>Analyzing citizen sentiment across all complaints...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#FF4D4F', background: '#fff1f0', border: '1px solid #FF4D4F' }}>
          <AlertTriangle size={24} style={{ margin: '0 auto .5rem' }} />
          <p><strong>Error:</strong> {error}</p>
        </div>
      ) : !data ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Inbox size={40} style={{ color: 'var(--border)', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600 }}>No Data</p>
        </div>
      ) : (
        <>
          {/* ML Method */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.5rem 1rem',
            background: 'rgba(255,105,180,.08)', borderRadius: 10, border: '1px solid rgba(255,105,180,.15)',
            fontSize: '.78rem', color: '#c44569', fontWeight: 600,
          }}>
            <Sparkles size={14} /> ML Method: {data.ml_method}
          </div>

          {/* ═══ Sentiment Distribution ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>

            {/* Donut-like sentiment cards */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: '1.25rem' }}>Sentiment Distribution</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {Object.entries(data.sentiment_distribution)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([sentiment, count]) => {
                    const config = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.Neutral
                    const pct = data.total_analyzed > 0 ? Math.round(((count as number) / data.total_analyzed) * 100) : 0
                    return (
                      <div key={sentiment} style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, background: config.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.2rem', flexShrink: 0,
                        }}>
                          {config.emoji}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.2rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '.82rem', color: config.color }}>{sentiment}</span>
                            <span style={{ fontWeight: 700, fontSize: '.82rem' }}>{count as number} ({pct}%)</span>
                          </div>
                          <div style={{ width: '100%', height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`, height: '100%', background: config.color,
                              borderRadius: 4, transition: 'width .6s ease',
                            }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Urgency Histogram */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: '1.25rem' }}>Urgency Level Distribution</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '.5rem', height: 120 }}>
                {Object.entries(data.urgency_histogram).map(([level, count]) => {
                  const max = Math.max(...Object.values(data.urgency_histogram), 1)
                  const h = Math.max(((count as number) / max) * 100, 4)
                  const colors = ['#2ECC71', '#2F6BFF', '#FFA940', '#FF6B6B', '#FF4D4F']
                  const color = colors[parseInt(level) - 1] || '#999'
                  return (
                    <div key={level} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem' }}>
                      <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-primary)' }}>{count as number}</div>
                      <div style={{
                        width: '70%', height: h, borderRadius: '4px 4px 0 0',
                        background: `linear-gradient(180deg, ${color}, ${color}dd)`,
                      }} />
                      <div style={{ fontSize: '.7rem', fontWeight: 600, color }}>
                        {'🔴'.repeat(parseInt(level))}
                      </div>
                      <div style={{ fontSize: '.65rem', color: 'var(--text-muted)' }}>Lvl {level}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ textAlign: 'center', marginTop: '.75rem', fontSize: '.8rem', color: 'var(--text-secondary)' }}>
                Average Urgency: <strong style={{ color: data.avg_urgency >= 3 ? '#FF4D4F' : '#2F6BFF' }}>{data.avg_urgency}/5</strong>
              </div>
            </div>
          </div>

          {/* ═══ Department Mood ═══ */}
          {Object.keys(data.department_mood).length > 0 && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: '1.25rem' }}>
                🏢 Department Mood Scores
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '.75rem' }}>
                {Object.entries(data.department_mood)
                  .sort(([, a], [, b]) => (a as any).mood_score - (b as any).mood_score)
                  .map(([dept, info]: [string, any]) => {
                    const mood = moodLabel(info.mood_score)
                    const sentConfig = SENTIMENT_CONFIG[info.dominant_sentiment] || SENTIMENT_CONFIG.Neutral
                    return (
                      <div key={dept} style={{
                        padding: '1rem', borderRadius: 12, border: '1px solid var(--border)',
                        background: 'var(--bg)',
                      }}>
                        <div style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--text-primary)', marginBottom: '.5rem' }}>
                          {dept}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem' }}>
                          <div style={{
                            width: '100%', height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${info.mood_score}%`, height: '100%', borderRadius: 4,
                              background: `linear-gradient(90deg, ${mood.color}88, ${mood.color})`,
                              transition: 'width .6s ease',
                            }} />
                          </div>
                          <span style={{ fontSize: '.75rem', fontWeight: 700, color: mood.color, whiteSpace: 'nowrap' }}>{info.mood_score}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: 'var(--text-muted)' }}>
                          <span style={{
                            padding: '.1rem .4rem', borderRadius: 4, fontWeight: 600,
                            background: sentConfig.bg, color: sentConfig.color,
                          }}>
                            {sentConfig.emoji} {info.dominant_sentiment}
                          </span>
                          <span>Urgency: {info.avg_urgency}/5 • {info.total} total</span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* ═══ Trending & Angry Phrases ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>

            {/* Trending Phrases */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
                <TrendingUp size={18} color="#2F6BFF" />
                <span style={{ fontWeight: 700, fontSize: '.95rem' }}>Trending Complaint Topics</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
                {data.trending_phrases.map((tp, i) => (
                  <span key={tp.phrase} style={{
                    padding: '.3rem .65rem', borderRadius: 100, fontWeight: 600,
                    fontSize: Math.max(0.68, Math.min(0.92, 0.68 + (data.trending_phrases.length - i) * 0.015)) + 'rem',
                    background: i < 3 ? 'rgba(47,107,255,.1)' : i < 8 ? 'rgba(155,89,182,.08)' : 'var(--bg)',
                    color: i < 3 ? '#2F6BFF' : i < 8 ? '#9b59b6' : 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}>
                    {tp.phrase} <strong>({tp.count})</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* Angry Phrases */}
            {data.top_angry_phrases.length > 0 && (
              <div className="card" style={{ padding: '1.25rem', border: '1px solid rgba(255,77,79,.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
                  <Angry size={18} color="#FF4D4F" />
                  <span style={{ fontWeight: 700, fontSize: '.95rem', color: '#c0392b' }}>Top Anger/Frustration Words</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
                  {data.top_angry_phrases.map((ap) => (
                    <span key={ap.phrase} style={{
                      padding: '.3rem .65rem', borderRadius: 100, fontWeight: 600,
                      fontSize: '.78rem', background: '#fff1f0', color: '#FF4D4F',
                      border: '1px solid rgba(255,77,79,.2)',
                    }}>
                      😤 {ap.phrase} <strong>({ap.count})</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Footer */}
      {data && (
        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', padding: '0 .5rem' }}>
          <span>🧠 Powered by ML sentiment analysis + urgency scoring</span>
          <span><Clock size={10} /> Analyzed {data.total_analyzed} complaints in {data.processing_time_ms}ms</span>
        </div>
      )}
    </div>
  )
}
