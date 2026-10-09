import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  Eye, XCircle, Trash2, CheckCircle, AlertTriangle,
  Flag, FileText, ExternalLink, Info, Clock, CheckCircle2,
  AlertCircle, BookOpen
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import type { ModerationItem } from '../data/mockData';

export default function ModerationQueue() {
  const { user, refreshKey } = useApp();
  const navigate = useNavigate();

  const isModerator = user?.role === 'moderator' || user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'my_reports' | 'moderation_queue'>(isModerator ? 'moderation_queue' : 'my_reports');

  const [items, setItems] = useState<ModerationItem[]>([]);
  const [userReports, setUserReports] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    if (isModerator) {
      Promise.all([
        api.getModerationItems().catch(() => []),
        api.getUserReports().catch(() => [])
      ]).then(([all, mine]) => {
        setItems(all);
        setUserReports(mine);
        setLoading(false);
      });
    } else {
      api.getUserReports().then(mine => {
        setUserReports(mine);
        setLoading(false);
      }).catch(err => {
        console.error('Failed to load user reports:', err);
        setLoading(false);
      });
    }
  }, [refreshKey, isModerator]);

  const pendingItems = items.filter(i => i.status === 'pending');
  const resolvedItems = items.filter(i => i.status !== 'pending');

  const handleDismiss = async (id: string) => {
    try {
      await api.updateModeration(id, 'dismissed');
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'dismissed' as const } : i));
      setUserReports(prev => prev.map(i => i.id === id ? { ...i, status: 'dismissed' as const } : i));
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuarantine = async (id: string) => {
    try {
      await api.updateModeration(id, 'quarantined');
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'quarantined' as const } : i));
      setUserReports(prev => prev.map(i => i.id === id ? { ...i, status: 'quarantined' as const } : i));
    } catch (err) {
      console.error(err);
    }
  };

  const reasonColor = (reason: string) => {
    const r = (reason || '').toLowerCase();
    if (r.includes('incorrect') || r.includes('error')) return 'chip-warning';
    if (r.includes('syllabus') || r.includes('topic')) return 'chip-primary';
    if (r.includes('duplicate')) return 'chip-warning';
    if (r.includes('inappropriate') || r.includes('offensive')) return 'chip-danger';
    if (r.includes('spam')) return 'chip-danger';
    if (r.includes('copyright')) return 'chip-danger';
    return '';
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 className="page-title">
            {isModerator && activeTab === 'moderation_queue' ? 'Moderation Queue' : 'My Reports & Quality'}
          </h1>
          <p className="page-subtitle">
            {isModerator && activeTab === 'moderation_queue'
              ? `${pendingItems.length} pending reports awaiting review • ${resolvedItems.length} resolved`
              : `${userReports.length} ${userReports.length === 1 ? 'report' : 'reports'} submitted by you`}
          </p>
        </div>

        {/* Moderator Tab Switcher */}
        {isModerator && (
          <div style={{ display: 'flex', gap: '4px', background: 'var(--color-surface)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <button
              className={`btn btn-sm ${activeTab === 'moderation_queue' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('moderation_queue')}
            >
              <AlertTriangle size={14} />
              Review Queue ({pendingItems.length})
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'my_reports' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('my_reports')}
            >
              <Flag size={14} />
              My Reports ({userReports.length})
            </button>
          </div>
        )}
      </div>

      {/* Non-destructive assurance banner */}
      <div className="report-assurance-box" style={{ marginBottom: 'var(--space-6)' }}>
        <Info size={16} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Non-Destructive Flagging:</strong> Reports create an audit record for evaluation. Filing a report <strong>does NOT automatically hide or remove notes</strong> to prevent disruption to students actively studying.
        </div>
      </div>

      {/* VIEW 1: STUDENT "MY REPORTS" */}
      {(!isModerator || activeTab === 'my_reports') && (
        <div className="card" id="student-my-reports">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Flag size={16} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontSize: 'var(--text-md)' }}>My Submitted Reports ({userReports.length})</h3>
            </div>
            <Link to="/notes" className="btn btn-ghost btn-sm">
              <BookOpen size={14} />
              Browse Notes
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="moderation-table">
              <thead>
                <tr>
                  <th>Note Resource</th>
                  <th>Reason Category</th>
                  <th>Details / Explanation</th>
                  <th>Submitted At</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-muted)' }}>
                      Loading report history...
                    </td>
                  </tr>
                ) : userReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', maxWidth: '440px', margin: '0 auto' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)' }}>
                          <CheckCircle2 size={24} />
                        </div>
                        <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-md)', color: 'var(--color-deep)' }}>
                          No Active Reports Filed
                        </div>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', lineHeight: '1.5' }}>
                          You haven't reported any notes yet. If you spot incorrect equations, out-of-syllabus notes, or duplicate resources while studying, click the <strong>Report</strong> button in the note viewer to help keep the library accurate.
                        </p>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ marginTop: 'var(--space-3)' }}
                          onClick={() => navigate('/notes')}
                        >
                          Explore Notes Discovery
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  userReports.map(item => (
                    <tr key={item.id}>
                      <td style={{ minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={15} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                          <div>
                            {item.noteId ? (
                              <Link
                                to={`/notes/${item.noteId}`}
                                style={{ fontWeight: 'var(--weight-medium)', color: 'var(--color-deep)', textDecoration: 'none' }}
                                className="hover:underline"
                                title="Open Note"
                              >
                                {item.resourceName}
                              </Link>
                            ) : (
                              <span style={{ fontWeight: 'var(--weight-medium)', color: 'var(--color-deep)' }}>
                                {item.resourceName}
                              </span>
                            )}
                            {item.primaryTopic && (
                              <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                                {item.primaryTopic}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`chip ${reasonColor(item.reason)}`} style={{ fontSize: '11px' }}>
                          {item.reason}
                        </span>
                      </td>
                      <td style={{ maxWidth: '240px' }}>
                        {item.details ? (
                          <span style={{ fontSize: '11.5px', color: 'var(--color-deep)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={item.details}>
                            {item.details}
                          </span>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '11.5px', fontStyle: 'italic' }}>None provided</span>
                        )}
                      </td>
                      <td className="mono text-muted" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {item.timestamp}
                      </td>
                      <td>
                        {item.status === 'pending' && (
                          <span className="report-status-badge report-status-pending" title="Report is in queue for review">
                            <Clock size={11} />
                            Pending Review
                          </span>
                        )}
                        {item.status === 'dismissed' && (
                          <span className="report-status-badge report-status-dismissed" title="Moderator verified resource content">
                            <CheckCircle size={11} />
                            Reviewed & Kept
                          </span>
                        )}
                        {item.status === 'quarantined' && (
                          <span className="report-status-badge report-status-quarantined" title="Resource restricted following audit">
                            <AlertCircle size={11} />
                            Action Taken
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {item.noteId && (
                          <Link
                            to={`/notes/${item.noteId}`}
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '11.5px', padding: '4px 8px' }}
                          >
                            <ExternalLink size={12} />
                            View Note
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: MODERATOR QUEUE */}
      {isModerator && activeTab === 'moderation_queue' && (
        <>
          {/* Pending Reports */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }} id="moderation-pending">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <AlertTriangle size={16} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontSize: 'var(--text-md)' }}>Pending Reports ({pendingItems.length})</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="moderation-table">
                <thead>
                  <tr>
                    <th>Resource</th>
                    <th>Reporter</th>
                    <th>Reason</th>
                    <th>Details</th>
                    <th>Time</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-muted)' }}>
                        No pending items in queue. All reports have been resolved.
                      </td>
                    </tr>
                  ) : (
                    pendingItems.map(item => (
                      <tr key={item.id}>
                        <td>
                          <span style={{ fontWeight: 'var(--weight-medium)', color: 'var(--color-deep)' }}>
                            {item.resourceName}
                          </span>
                          {item.primaryTopic && (
                            <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                              Topic: {item.primaryTopic}
                            </div>
                          )}
                        </td>
                        <td>{item.reporter}</td>
                        <td>
                          <span className={`chip ${reasonColor(item.reason)}`} style={{ fontSize: '11px' }}>
                            {item.reason}
                          </span>
                        </td>
                        <td style={{ maxWidth: '200px', fontSize: '11px', color: 'var(--color-muted)' }}>
                          {item.details || '—'}
                        </td>
                        <td className="mono text-muted" style={{ fontSize: '11px' }}>{item.timestamp}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              title="Preview Resource"
                              onClick={() => setPreviewItem(item.resourceName)}
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              style={{ color: 'var(--color-secondary)' }}
                              title="Dismiss Report (Keep resource active)"
                              onClick={() => handleDismiss(item.id)}
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              style={{ color: 'var(--color-danger)' }}
                              title="Quarantine Resource"
                              onClick={() => handleQuarantine(item.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resolved Reports */}
          <div className="card" id="moderation-resolved">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <CheckCircle size={16} style={{ color: 'var(--color-secondary)' }} />
              <h3 style={{ fontSize: 'var(--text-md)' }}>Resolved Reports ({resolvedItems.length})</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="moderation-table">
                <thead>
                  <tr>
                    <th>Resource</th>
                    <th>Reporter</th>
                    <th>Reason</th>
                    <th>Resolution</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-muted)' }}>
                        No resolved reports recorded yet.
                      </td>
                    </tr>
                  ) : (
                    resolvedItems.map(item => (
                      <tr key={item.id} style={{ opacity: 0.7 }}>
                        <td>{item.resourceName}</td>
                        <td>{item.reporter}</td>
                        <td>
                          <span className="chip" style={{ fontSize: '11px' }}>{item.reason}</span>
                        </td>
                        <td>
                          <span className={`chip ${item.status === 'dismissed' ? 'chip-secondary' : 'chip-danger'}`} style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                            {item.status}
                          </span>
                        </td>
                        <td className="mono text-muted" style={{ fontSize: '11px' }}>{item.timestamp}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="modal-overlay" onClick={() => setPreviewItem(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>Audit Preview</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setPreviewItem(null)}>
                <XCircle size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{
                background: 'var(--color-muted-bg)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-6)',
                textAlign: 'center',
                marginBottom: 'var(--space-4)',
              }}>
                <div style={{ fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-2)' }}>{previewItem}</div>
                <span className="mono text-muted" style={{ fontSize: '11px' }}>File verified in active notes repository</span>
              </div>
              <p className="text-sm text-muted">
                Review this flagged resource before taking administrative action. Dismissing marks the report as reviewed without modifying the file. Quarantining restricts access to moderators only.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setPreviewItem(null)}>Close Preview</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

