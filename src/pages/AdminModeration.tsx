import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  ShieldAlert, ShieldCheck, CheckCircle2, AlertCircle,
  Clock, FileText, RefreshCw, Search,
  BookOpen, X, Lock, Eye, Ban, ArrowUpRight
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import type { ModerationItem } from '../data/mockData';

export default function AdminModeration() {
  const { user } = useApp();
  const navigate = useNavigate();

  const isAuthorized = user && (user.role?.toLowerCase() === 'moderator' || user.role?.toLowerCase() === 'admin');

  // Queue and filter state
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'under_review' | 'quarantined' | 'dismissed' | 'all'>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Decision Modal state
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionAction, setDecisionAction] = useState<'dismiss' | 'quarantine' | 'under_review' | 'restore' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchQueue = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const data = await api.getAdminModerationItems();
      setItems(data);
      if (data.length > 0 && !selectedReportId) {
        setSelectedReportId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load admin moderation queue:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, selectedReportId]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Compute counts
  const stats = useMemo(() => {
    return {
      total: items.length,
      pending: items.filter(i => i.status === 'pending').length,
      underReview: items.filter(i => i.status === 'under_review').length,
      quarantined: items.filter(i => i.status === 'quarantined').length,
      dismissed: items.filter(i => i.status === 'dismissed').length,
    };
  }, [items]);

  // Filtered queue items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (item.resourceName || '').toLowerCase().includes(q);
        const matchReporter = (item.reporter || '').toLowerCase().includes(q);
        const matchId = (item.id || '').toLowerCase().includes(q);
        const matchReason = (item.reason || '').toLowerCase().includes(q);
        if (!matchTitle && !matchReporter && !matchId && !matchReason) return false;
      }
      return true;
    });
  }, [items, statusFilter, categoryFilter, searchQuery]);

  // Active selected report
  const selectedReport = useMemo(() => {
    return items.find(i => i.id === selectedReportId) || (filteredItems.length > 0 ? filteredItems[0] : null);
  }, [items, selectedReportId, filteredItems]);

  const openDecisionModal = (action: 'dismiss' | 'quarantine' | 'under_review' | 'restore') => {
    setDecisionAction(action);
    setAdminNotes('');
    setDecisionModalOpen(true);
  };

  const handleDecisionSubmit = async () => {
    if (!selectedReport || !decisionAction) return;
    setSubmitting(true);
    try {
      const res = await api.submitModerationDecision(selectedReport.id, {
        action: decisionAction,
        adminNotes: adminNotes.trim()
      });

      // Update local state
      setItems(prev => prev.map(i => i.id === selectedReport.id ? {
        ...i,
        status: res.report.status,
        adminNotes: res.report.adminNotes,
        reviewedBy: res.report.reviewedBy,
        reviewedAt: res.report.reviewedAt,
        actionTaken: res.report.actionTaken,
        noteStatus: decisionAction === 'quarantine' ? 'quarantined' : decisionAction === 'restore' ? 'published' : i.noteStatus
      } : i));

      setDecisionModalOpen(false);
      showToast(res.message || 'Moderation decision recorded successfully.');
    } catch (err: any) {
      console.error('Decision error:', err);
      alert(err.message || 'Failed to record moderation decision.');
    } finally {
      setSubmitting(false);
    }
  };

  const getReasonColor = (reason: string) => {
    const r = (reason || '').toLowerCase();
    if (r.includes('incorrect') || r.includes('error')) return 'chip-warning';
    if (r.includes('syllabus') || r.includes('topic')) return 'chip-primary';
    if (r.includes('duplicate')) return 'chip-warning';
    if (r.includes('inappropriate') || r.includes('offensive')) return 'chip-danger';
    if (r.includes('spam')) return 'chip-danger';
    if (r.includes('copyright')) return 'chip-danger';
    return '';
  };

  // -------------------------------------------------------------
  // Role Guard: Access Restricted
  // -------------------------------------------------------------
  if (!isAuthorized) {
    return (
      <div style={{ maxWidth: '640px', margin: 'var(--space-12) auto', padding: 'var(--space-6)', textAlign: 'center' }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.12)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-4)'
        }}>
          <Lock size={28} />
        </div>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', color: 'var(--color-deep)', marginBottom: 'var(--space-2)' }}>
          Administrative Access Required
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 'var(--text-sm)', lineHeight: '1.6', marginBottom: 'var(--space-6)' }}>
          The Moderation Console is restricted to appointed academic moderators and platform administrators to inspect evidence, resolve flagged resources, and enforce syllabus standards.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => navigate('/moderation')}>
            View My Filed Reports
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Toast message */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          background: 'var(--color-deep)',
          color: '#fff',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'slideUp 0.25s ease'
        }}>
          <CheckCircle2 size={16} style={{ color: 'var(--color-secondary)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Administrator Console
            </span>
          </div>
          <h1 className="page-title">Moderation Workspace</h1>
          <p className="page-subtitle">
            Review reported notes, inspect academic evidence, and apply authoritative verdicts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost btn-sm" onClick={fetchQueue} disabled={loading} title="Reload reports from database">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Queue
          </button>
          <Link to="/moderation" className="btn btn-ghost btn-sm">
            Student Reports View
          </Link>
        </div>
      </div>

      {/* Status Summary Stats Bar */}
      <div className="admin-mod-stats">
        <div
          className={`admin-mod-stat-pill ${statusFilter === 'pending' ? 'selected' : ''}`}
          onClick={() => setStatusFilter('pending')}
          style={{ cursor: 'pointer', border: statusFilter === 'pending' ? '1.5px solid #fbbf24' : undefined }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24' }} />
          <div>
            <span style={{ display: 'block', fontSize: '11px' }}>Pending Review</span>
            <strong>{stats.pending}</strong>
          </div>
        </div>

        <div
          className={`admin-mod-stat-pill ${statusFilter === 'under_review' ? 'selected' : ''}`}
          onClick={() => setStatusFilter('under_review')}
          style={{ cursor: 'pointer', border: statusFilter === 'under_review' ? '1.5px solid #60a5fa' : undefined }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa' }} />
          <div>
            <span style={{ display: 'block', fontSize: '11px' }}>Under Review</span>
            <strong>{stats.underReview}</strong>
          </div>
        </div>

        <div
          className={`admin-mod-stat-pill ${statusFilter === 'quarantined' ? 'selected' : ''}`}
          onClick={() => setStatusFilter('quarantined')}
          style={{ cursor: 'pointer', border: statusFilter === 'quarantined' ? '1.5px solid #f87171' : undefined }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171' }} />
          <div>
            <span style={{ display: 'block', fontSize: '11px' }}>Quarantined</span>
            <strong>{stats.quarantined}</strong>
          </div>
        </div>

        <div
          className={`admin-mod-stat-pill ${statusFilter === 'dismissed' ? 'selected' : ''}`}
          onClick={() => setStatusFilter('dismissed')}
          style={{ cursor: 'pointer', border: statusFilter === 'dismissed' ? '1.5px solid #34d399' : undefined }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399' }} />
          <div>
            <span style={{ display: 'block', fontSize: '11px' }}>Dismissed / Kept</span>
            <strong>{stats.dismissed}</strong>
          </div>
        </div>

        <div
          className={`admin-mod-stat-pill ${statusFilter === 'all' ? 'selected' : ''}`}
          onClick={() => setStatusFilter('all')}
          style={{ cursor: 'pointer', border: statusFilter === 'all' ? '1.5px solid var(--color-primary)' : undefined }}
        >
          <div>
            <span style={{ display: 'block', fontSize: '11px' }}>Total Reports</span>
            <strong>{stats.total}</strong>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: '36px', width: '100%', fontSize: 'var(--text-xs)' }}
            placeholder="Search by note title, reporter, or reference ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="input"
          style={{ width: 'auto', minWidth: '200px', fontSize: 'var(--text-xs)' }}
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          aria-label="Filter by reason category"
        >
          <option value="all">All Issue Categories</option>
          <option value="incorrect_info">Incorrect Information</option>
          <option value="syllabus_mismatch">Doesn't Match Topic / Syllabus</option>
          <option value="duplicate">Duplicate Resource</option>
          <option value="inappropriate">Inappropriate Content</option>
          <option value="spam">Spam or Promotional</option>
          <option value="copyright">Copyright / Ownership</option>
        </select>
      </div>

      {/* Main Two-Column Moderation Grid */}
      <div className="admin-mod-grid">
        {/* LEFT COLUMN: Queue List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Queue ({filteredItems.length})
            </span>
            {statusFilter !== 'all' && (
              <span className="badge" style={{ fontSize: '10.5px' }}>
                Filtered: {statusFilter.replace('_', ' ')}
              </span>
            )}
          </div>

          <div className="admin-mod-list">
            {filteredItems.length === 0 ? (
              <div style={{
                padding: 'var(--space-8) var(--space-4)',
                textAlign: 'center',
                background: 'var(--color-surface)',
                border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)'
              }}>
                <ShieldCheck size={28} style={{ color: 'var(--color-secondary)', margin: '0 auto var(--space-2)' }} />
                <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-deep)' }}>
                  No Reports in this View
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', marginTop: '4px' }}>
                  All reports matching the selected filters have been resolved.
                </p>
              </div>
            ) : (
              filteredItems.map(item => {
                const isSelected = selectedReport?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`admin-mod-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedReportId(item.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                      <span className={`chip ${getReasonColor(item.reason)}`} style={{ fontSize: '10.5px', padding: '2px 6px' }}>
                        {item.reason}
                      </span>
                      {item.status === 'pending' && (
                        <span className="report-status-badge report-status-pending" style={{ fontSize: '10px' }}>
                          Pending
                        </span>
                      )}
                      {item.status === 'under_review' && (
                        <span className="report-status-badge report-status-under-review" style={{ fontSize: '10px' }}>
                          Under Review
                        </span>
                      )}
                      {item.status === 'quarantined' && (
                        <span className="report-status-badge report-status-quarantined" style={{ fontSize: '10px' }}>
                          Quarantined
                        </span>
                      )}
                      {item.status === 'dismissed' && (
                        <span className="report-status-badge report-status-dismissed" style={{ fontSize: '10px' }}>
                          Dismissed
                        </span>
                      )}
                    </div>

                    <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-deep)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.resourceName}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--color-muted)' }}>
                      <span>Reported by <strong>{item.reporter}</strong></span>
                      <span className="mono">{item.timestamp}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Evidence & Decision Workspace */}
        <div>
          {selectedReport ? (
            <div>
              {/* Evidence Panel Header */}
              <div className="admin-detail-card" style={{ borderTop: '3px solid var(--color-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <span className="mono text-muted" style={{ fontSize: '11.5px', display: 'block', marginBottom: '2px' }}>
                      Report #{selectedReport.id}
                    </span>
                    <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--color-deep)' }}>
                      {selectedReport.resourceName}
                    </h2>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedReport.status === 'pending' && (
                      <span className="report-status-badge report-status-pending">
                        <Clock size={12} /> Pending Investigation
                      </span>
                    )}
                    {selectedReport.status === 'under_review' && (
                      <span className="report-status-badge report-status-under-review">
                        <AlertCircle size={12} /> Active Administrative Review
                      </span>
                    )}
                    {selectedReport.status === 'quarantined' && (
                      <span className="report-status-badge report-status-quarantined">
                        <Ban size={12} /> Quarantined / Restricted
                      </span>
                    )}
                    {selectedReport.status === 'dismissed' && (
                      <span className="report-status-badge report-status-dismissed">
                        <CheckCircle2 size={12} /> Dismissed & Compliant
                      </span>
                    )}
                  </div>
                </div>

                {/* Section 1: Report Evidence */}
                <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <ShieldAlert size={16} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', color: 'var(--color-deep)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Report Evidence & Student Claim
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', fontSize: 'var(--text-xs)', marginBottom: '8px' }}>
                    <span className="text-muted">Issue Reason:</span>
                    <strong style={{ color: 'var(--color-deep)' }}>{selectedReport.reason}</strong>

                    <span className="text-muted">Reporter Identity:</span>
                    <span>{selectedReport.reporter} {selectedReport.reporterEmail ? `(${selectedReport.reporterEmail})` : ''}</span>

                    <span className="text-muted">Filed At:</span>
                    <span className="mono">{selectedReport.timestamp}</span>
                  </div>

                  <span className="text-muted" style={{ fontSize: '11px', display: 'block', marginTop: '10px' }}>
                    Reporter Explanation / Discrepancy Details:
                  </span>
                  <div className="admin-evidence-box">
                    {selectedReport.details ? `“${selectedReport.details}”` : <em className="text-muted">No additional text notes provided by reporter.</em>}
                  </div>
                </div>

                {/* Section 2: Resource & Contributor Metadata */}
                <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} style={{ color: 'var(--color-primary)' }} />
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', color: 'var(--color-deep)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Note Resource Context
                      </span>
                    </div>

                    {selectedReport.noteId && (
                      <Link
                        to={`/notes/${selectedReport.noteId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '11px', gap: '4px' }}
                      >
                        <Eye size={13} />
                        Inspect in Note Viewer
                        <ArrowUpRight size={11} />
                      </Link>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: 'var(--text-xs)' }}>
                    <div>
                      <span className="text-muted" style={{ display: 'block', fontSize: '11px' }}>Subject & Code</span>
                      <strong>{selectedReport.subjectName || '—'} {selectedReport.subjectCode ? `(${selectedReport.subjectCode})` : ''}</strong>
                    </div>
                    <div>
                      <span className="text-muted" style={{ display: 'block', fontSize: '11px' }}>Primary Topic</span>
                      <strong>{selectedReport.primaryTopic || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-muted" style={{ display: 'block', fontSize: '11px' }}>Uploader / Contributor</span>
                      <strong>{selectedReport.uploaderName || 'Student Contributor'}</strong>
                    </div>
                    <div>
                      <span className="text-muted" style={{ display: 'block', fontSize: '11px' }}>Format & Pages</span>
                      <span>{(selectedReport.format || 'PDF').toUpperCase()} • {selectedReport.pages || '—'} pages</span>
                    </div>
                    <div>
                      <span className="text-muted" style={{ display: 'block', fontSize: '11px' }}>Upload Date</span>
                      <span className="mono">{selectedReport.uploadDate || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted" style={{ display: 'block', fontSize: '11px' }}>Resource Public Status</span>
                      <span className={`badge ${selectedReport.noteStatus === 'quarantined' ? 'badge-danger' : 'badge-secondary'}`}>
                        {selectedReport.noteStatus || 'published'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Audit Trail & Previous Decisions */}
                {(selectedReport.reviewedBy || selectedReport.adminNotes) && (
                  <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'var(--weight-semibold)', color: 'var(--color-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Audit History
                    </span>
                    <div style={{ fontSize: 'var(--text-xs)' }}>
                      <div>Reviewed by: <strong>{selectedReport.reviewedBy}</strong> on <span className="mono">{selectedReport.reviewedAt}</span></div>
                      {selectedReport.adminNotes && (
                        <div style={{ marginTop: '4px', color: 'var(--color-deep)' }}>
                          Resolution rationale: <em>“{selectedReport.adminNotes}”</em>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section 4: Authoritative Moderation Action Controls */}
                <div>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', color: 'var(--color-deep)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Authoritative Decision Actions
                  </span>
                  <p style={{ fontSize: '11.5px', color: 'var(--color-muted)', margin: '2px 0 12px' }}>
                    Reports are evidence for administrative audit. Choosing an action records your verdict and updates resource availability.
                  </p>

                  <div className="admin-decision-actions">
                    {/* Action 1: Under Review */}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openDecisionModal('under_review')}
                      disabled={selectedReport.status === 'under_review'}
                    >
                      <Clock size={14} style={{ color: '#60a5fa' }} />
                      Mark Under Review
                    </button>

                    {/* Action 2: Dismiss */}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openDecisionModal('dismiss')}
                      style={{ color: 'var(--color-secondary)' }}
                      disabled={selectedReport.status === 'dismissed'}
                    >
                      <CheckCircle2 size={14} />
                      Dismiss (Confirm Safe)
                    </button>

                    {/* Action 3: Quarantine / Restrict */}
                    {selectedReport.noteStatus !== 'quarantined' ? (
                      <button
                        className="btn btn-sm"
                        onClick={() => openDecisionModal('quarantine')}
                        style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: '#fff' }}
                      >
                        <Ban size={14} />
                        Restrict / Quarantine Resource
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => openDecisionModal('restore')}
                      >
                        <ShieldCheck size={14} />
                        Restore & Republish Note
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              padding: 'var(--space-12) var(--space-4)',
              textAlign: 'center',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)'
            }}>
              <BookOpen size={36} style={{ color: 'var(--color-muted)', margin: '0 auto var(--space-3)' }} />
              <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-md)', color: 'var(--color-deep)' }}>
                Select a Report to Moderate
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', maxWidth: '360px', margin: '6px auto 0' }}>
                Select any flagged resource from the queue on the left to examine reporter claims, verify syllabus alignment, and execute decisions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Decision Modal Dialog */}
      {decisionModalOpen && selectedReport && (
        <div className="modal-overlay" onClick={() => !submitting && setDecisionModalOpen(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {decisionAction === 'dismiss' && <CheckCircle2 size={18} style={{ color: 'var(--color-secondary)' }} />}
                {decisionAction === 'quarantine' && <Ban size={18} style={{ color: 'var(--color-danger)' }} />}
                {decisionAction === 'under_review' && <Clock size={18} style={{ color: '#60a5fa' }} />}
                {decisionAction === 'restore' && <ShieldCheck size={18} style={{ color: 'var(--color-primary)' }} />}
                <h3>
                  {decisionAction === 'dismiss' && 'Dismiss Report'}
                  {decisionAction === 'quarantine' && 'Quarantine / Restrict Note'}
                  {decisionAction === 'under_review' && 'Mark Under Active Review'}
                  {decisionAction === 'restore' && 'Restore Quarantined Note'}
                </h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setDecisionModalOpen(false)} disabled={submitting}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-3)' }}>
                Target Resource: <strong>“{selectedReport.resourceName}”</strong>
              </p>

              {decisionAction === 'dismiss' && (
                <div className="report-assurance-box">
                  <CheckCircle2 size={16} style={{ color: 'var(--color-secondary)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Dismissing Report:</strong> Declares the note compliant. The resource remains published and available in public search. Reporter will see status updated to <em>Reviewed & Kept</em>.
                  </div>
                </div>
              )}

              {decisionAction === 'quarantine' && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.28)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-danger)',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  marginBottom: 'var(--space-3)'
                }}>
                  <strong>Restricting Resource:</strong> The note will be removed from public discovery and search immediately. Contributor will see the quarantine status in their uploads dashboard.
                </div>
              )}

              {decisionAction === 'under_review' && (
                <div className="report-assurance-box">
                  <Clock size={16} style={{ color: '#60a5fa', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Under Review:</strong> Flags the report as actively being investigated. The note remains accessible to avoid interrupting student studying.
                  </div>
                </div>
              )}

              {decisionAction === 'restore' && (
                <div className="report-assurance-box">
                  <ShieldCheck size={16} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Restoring Resource:</strong> Reinstates the note to active publication status and makes it discoverable again in the library.
                  </div>
                </div>
              )}

              <div style={{ marginTop: 'var(--space-3)' }}>
                <label className="text-xs text-muted" style={{ fontWeight: 'var(--weight-semibold)', display: 'block', marginBottom: '4px' }}>
                  Admin Rationale & Audit Notes {decisionAction === 'quarantine' ? <span style={{ color: 'var(--color-danger)' }}>*</span> : '(Optional)'}
                </label>
                <textarea
                  className="input"
                  rows={3}
                  style={{ width: '100%', resize: 'vertical', fontSize: 'var(--text-xs)' }}
                  placeholder={
                    decisionAction === 'dismiss'
                      ? 'e.g. Formula verified against syllabus; no copyright issue found...'
                      : decisionAction === 'quarantine'
                      ? 'e.g. Confirmed unauthorized proprietary content / inaccurate solution on page 4...'
                      : 'e.g. Contacted contributor to verify source materials...'
                  }
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setDecisionModalOpen(false)} disabled={submitting}>
                Cancel
              </button>
              <button
                className="btn"
                style={decisionAction === 'quarantine' ? { background: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: '#fff' } : { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' }}
                onClick={handleDecisionSubmit}
                disabled={submitting || (decisionAction === 'quarantine' && !adminNotes.trim())}
              >
                {submitting ? 'Applying Verdict...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
