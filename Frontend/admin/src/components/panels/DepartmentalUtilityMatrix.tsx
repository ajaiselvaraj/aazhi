import React, { useState, useEffect } from 'react'

/* ─── Demo Data ─── */
const demoRequests = [
  { id: 'REQ-8902', name: 'Rajesh Kumar', type: 'New Connection', date: 'Oct 12, 2023', status: 'Pending', address: 'Plot 42, Vasant Vihar\nNew Delhi, 110057', requestType: 'New Connection (Domestic)' },
  { id: 'REQ-8895', name: 'Anita Sharma', type: 'Load Enhancement', date: 'Oct 11, 2023', status: 'Approved', address: 'Flat 7, MG Road\nBangalore, 560001', requestType: 'Load Enhancement' },
  { id: 'REQ-8871', name: 'Vikram Singh', type: 'Meter Replacement', date: 'Oct 10, 2023', status: 'Rejected', address: '22, Sector 15\nNoida, 201301', requestType: 'Meter Replacement' },
  { id: 'REQ-8860', name: 'Priya Patel', type: 'Name Transfer', date: 'Oct 09, 2023', status: 'Pending', address: '105, Park Avenue\nMumbai, 400001', requestType: 'Name Transfer' },
]

const anomalies = [
  { id: 'ACC-9921', label: 'High Spike', desc: 'Usage 400% above average in S...', color: 'var(--error)', bg: 'rgba(186,26,26,.08)' },
  { id: 'ACC-4410', label: 'Zero Read', desc: 'Consecutive zero readings for 3 ...', color: 'var(--secondary)', bg: 'rgba(0,101,145,.08)' },
  { id: 'ACC-8832', label: 'Missed Cycle', desc: 'Meter unreadable due to locked ...', color: 'var(--outline)', bg: 'var(--surface-variant)' },
]

const serviceTabs = [
  { id: 'electricity', label: 'Electricity Utility', icon: 'electric_bolt' },
  { id: 'municipal',   label: 'Municipal Operations', icon: 'location_city' },
  { id: 'gas',         label: 'LPG Gas Distribution', icon: 'local_fire_department' },
]

const subTabs = ['New service applications', 'Dispute tickets']

const statusColor: Record<string, { bg: string; text: string; dot: string }> = {
  Pending:  { bg: 'rgba(0,101,145,.12)', text: 'var(--secondary)', dot: 'var(--secondary)' },
  Approved: { bg: 'rgba(16,185,129,.1)',  text: '#059669', dot: '#10b981' },
  Rejected: { bg: 'rgba(186,26,26,.1)',   text: 'var(--error)', dot: 'var(--error)' },
}

export default function DepartmentalUtilityMatrix() {
  const [activeService, setActiveService] = useState('electricity')
  const [activeSubTab, setActiveSubTab] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedReq, setSelectedReq] = useState(demoRequests[0])

  const openDrawer = (req: typeof demoRequests[0]) => {
    setSelectedReq(req)
    setDrawerOpen(true)
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 8 }}>
            Departmental Utility Matrix
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
            Monitor and process citizen utility requests across departments.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => alert('Filter applied.')} className="btn-ghost btn" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>filter_list</span>
            Filter
          </button>
          <button onClick={() => alert('New request modal opened.')} className="btn btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            New Request
          </button>
        </div>
      </div>

      {/* ─── Service Tabs ─── */}
      <div style={{ marginBottom: 32 }}>
        <div className="glass-card" style={{ display: 'inline-flex', padding: 8, gap: 8, borderRadius: 'var(--radius-xl)', marginBottom: 16 }}>
          {serviceTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveService(tab.id)}
              style={{
                padding: '8px 24px', borderRadius: 'var(--radius-md)', border: 'none',
                background: activeService === tab.id ? 'rgba(0,51,153,.08)' : 'transparent',
                color: activeService === tab.id ? 'var(--primary)' : 'var(--on-surface-variant)',
                fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                letterSpacing: '.05em', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all .2s',
                boxShadow: activeService === tab.id ? '0 0 15px rgba(14,165,233,.3)' : 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--surface-variant)', paddingLeft: 8 }}>
          {subTabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(i)}
              style={{
                paddingBottom: 8, border: 'none', background: 'transparent',
                borderBottom: activeSubTab === i ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeSubTab === i ? 'var(--primary)' : 'var(--on-surface-variant)',
                fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                letterSpacing: '.05em', cursor: 'pointer', transition: 'all .2s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Bento Grid ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--card-gap)' }}>

        {/* Left: Connections Queue */}
        <div className="glass-card" style={{ padding: 'var(--container-padding)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 500, color: 'var(--on-surface)' }}>Connections Queue</h3>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)', padding: 8 }}>
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Citizen Name</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {demoRequests.map(req => {
                  const sc = statusColor[req.status] || statusColor.Pending
                  return (
                    <tr key={req.id} className="table-row-zebra">
                      <td style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em' }}>{req.id}</td>
                      <td style={{ fontWeight: 500 }}>{req.name}</td>
                      <td style={{ color: 'var(--on-surface-variant)' }}>{req.type}</td>
                      <td style={{ color: 'var(--on-surface-variant)' }}>{req.date}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '4px 10px', borderRadius: 'var(--radius-full)',
                          background: sc.bg, color: sc.text,
                          fontSize: 12, fontWeight: 600, letterSpacing: '.05em',
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} />
                          {req.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => openDrawer(req)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: req.status === 'Pending' ? 'var(--primary)' : 'var(--on-surface-variant)',
                            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                            letterSpacing: '.05em', transition: 'color .2s',
                          }}
                        >
                          {req.status === 'Pending' ? 'Review' : 'View'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--on-surface-variant)', fontSize: 14 }}>
            <span>Showing 1-4 of 124 requests</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_left</span>
              </button>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Stats + Anomalies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
          {/* Pending Approvals */}
          <div className="glass-card" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -16, top: -16, width: 96, height: 96, borderRadius: '50%', background: 'rgba(0,32,104,.04)', filter: 'blur(12px)' }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Pending Approvals</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 700, color: 'var(--primary)', lineHeight: 1.1 }}>42</span>
              <span style={{ fontSize: 14, color: 'var(--error)', display: 'flex', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_upward</span> 12%
              </span>
            </div>
          </div>

          {/* Recent Anomalies */}
          <div className="glass-card" style={{ padding: 24, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 500 }}>Recent Anomalies</h3>
              <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)' }}>receipt_long</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {anomalies.map(a => (
                <div key={a.id} style={{
                  padding: 12, borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--surface-variant)',
                  cursor: 'pointer', transition: 'all .2s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em' }}>{a.id}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: a.color, background: a.bg, padding: '2px 8px', borderRadius: 4 }}>{a.label}</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.desc}</p>
                </div>
              ))}
            </div>
            <button onClick={() => alert('Navigating to full logs view.')} style={{
              width: '100%', marginTop: 16, padding: '8px 0',
              background: 'none', border: '1px solid transparent',
              color: 'var(--primary)', fontSize: 12, fontWeight: 600,
              letterSpacing: '.05em', borderRadius: 'var(--radius-md)',
              cursor: 'pointer', transition: 'all .2s',
            }}>
              View All Logs
            </button>
          </div>
        </div>
      </div>

      {/* ─── Sliding Drawer (Document Verification) ─── */}
      {drawerOpen && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(45,49,51,.4)', backdropFilter: 'blur(4px)',
              zIndex: 200, transition: 'opacity .3s',
            }}
          />
          {/* Drawer */}
          <div style={{
            position: 'fixed', top: 0, right: 0,
            height: '100%', width: '100%', maxWidth: 640,
            background: 'var(--surface)', borderLeft: '1px solid rgba(255,255,255,.5)',
            boxShadow: 'var(--shadow-lg)', zIndex: 201,
            display: 'flex', flexDirection: 'column',
            animation: 'slideInRight .3s ease',
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid var(--surface-variant)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(255,255,255,.8)', backdropFilter: 'blur(12px)',
            }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 500 }}>Dynamic Document Verification</h2>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--on-surface-variant)', fontWeight: 500 }}>{selectedReq.id}</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: '50%', color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Drawer Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', gap: 24 }}>
              {/* Left: Applicant + Documents */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Applicant Info */}
                <div style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-xl)', padding: 16, border: '1px solid rgba(196,197,213,.3)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Applicant Details</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--on-surface-variant)' }}>Name:</span>
                      <span style={{ fontWeight: 500 }}>{selectedReq.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--on-surface-variant)' }}>Address:</span>
                      <span style={{ textAlign: 'right', whiteSpace: 'pre-line' }}>{selectedReq.address}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--on-surface-variant)' }}>Request Type:</span>
                      <span>{selectedReq.requestType}</span>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Submitted Documents</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: 12, border: '1px solid rgba(0,32,104,.3)', borderRadius: 'var(--radius-md)',
                      background: 'rgba(0,32,104,.03)', cursor: 'pointer',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'rgba(0,32,104,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                          <span className="material-symbols-outlined">badge</span>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--primary)' }}>Aadhar Card</p>
                          <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', fontWeight: 600 }}>Identity Proof • PDF</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>visibility</span>
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: 12, border: '1px solid rgba(196,197,213,.5)', borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-container-lowest)', cursor: 'pointer',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'rgba(0,101,145,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)' }}>
                          <span className="material-symbols-outlined">home_work</span>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 500 }}>Property Tax Receipt</p>
                          <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', fontWeight: 600 }}>Address Proof • Image</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)' }}>visibility</span>
                    </div>
                  </div>
                </div>

                {/* Internal Notes */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Internal Notes</div>
                  <textarea
                    placeholder="Add remarks for approval or rejection..."
                    rows={3}
                    style={{
                      width: '100%', borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(196,197,213,.5)',
                      background: 'var(--surface-container-lowest)',
                      padding: 12, fontFamily: 'var(--font-body)', fontSize: 14,
                      resize: 'vertical', outline: 'none',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,.04)',
                    }}
                  />
                </div>
              </div>

              {/* Right: Document Preview */}
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                background: 'var(--surface-container-lowest)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid rgba(196,197,213,.3)',
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: 12, borderBottom: '1px solid var(--surface-variant)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--surface-container-low)',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Document Preview</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--on-surface-variant)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>zoom_in</span>
                    </button>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--on-surface-variant)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
                    </button>
                  </div>
                </div>
                <div style={{
                  flex: 1, background: 'var(--surface-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
                }}>
                  <div style={{
                    width: '100%', height: '100%', minHeight: 200,
                    border: '2px dashed rgba(196,197,213,.5)', borderRadius: 'var(--radius-md)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--on-surface-variant)', background: 'var(--surface-container-lowest)',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 8, color: 'var(--outline)' }}>description</span>
                    <span style={{ fontSize: 14 }}>Aadhar_Card_{selectedReq.name.split(' ')[0]}.pdf</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div style={{
              padding: 24, borderTop: '1px solid var(--surface-variant)',
              background: 'var(--surface-container-lowest)',
              display: 'flex', gap: 12,
            }}>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{
                  flex: 1, padding: 12, borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--error)', background: 'none',
                  color: 'var(--error)', fontSize: 12, fontWeight: 600,
                  letterSpacing: '.05em', cursor: 'pointer',
                  transition: 'all .2s',
                }}
              >
                Reject Request
              </button>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{
                  flex: 1, padding: 12, borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  border: 'none', color: '#fff',
                  fontSize: 12, fontWeight: 600, letterSpacing: '.05em',
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,32,104,.25)',
                  transition: 'all .2s',
                }}
              >
                Approve Request
              </button>
            </div>
          </div>
          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); }
              to   { transform: translateX(0); }
            }
          `}</style>
        </>
      )}
    </div>
  )
}
