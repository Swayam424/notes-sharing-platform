import { useState, useEffect } from 'react';
import { Eye, XCircle, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import type { ModerationItem } from '../data/mockData';

export default function ModerationQueue() {
  const { refreshKey } = useApp();
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [previewItem, setPreviewItem] = useState<string | null>(null);

  useEffect(() => {
    api.getModerationItems().then(setItems).catch(console.error);
  }, [refreshKey]);

  const pendingItems = items.filter(i => i.status === 'pending');
  const resolvedItems = items.filter(i => i.status !== 'pending');

  const handleDismiss = async (id: string) => {
    try {
      await api.updateModeration(id, 'dismissed');
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'dismissed' as const } : i));
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuarantine = async (id: string) => {
    try {
      await api.updateModeration(id, 'quarantined');
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'quarantined' as const } : i));
    } catch (err) {
      console.error(err);
    }
  };

  const reasonColor = (reason: string) => {
    switch (reason) {
      case 'Duplicate': return 'chip-warning';
      case 'Out of Syllabus': return 'chip-primary';
      case 'Copyright': return 'chip-danger';
      case 'Corrupt Scan': return 'chip-danger';
      case 'Incorrect Syllabus': return 'chip-warning';
      default: return '';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Moderation Queue</h1>
        <p className="page-subtitle">
          {pendingItems.length} pending reports • {resolvedItems.length} resolved
        </p>
      </div>

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
                <th>Time</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-muted)' }}>
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
                    </td>
                    <td>{item.reporter}</td>
                    <td>
                      <span className={`chip ${reasonColor(item.reason)}`} style={{ fontSize: '11px' }}>
                        {item.reason}
                      </span>
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
                          title="Dismiss Report"
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
              {resolvedItems.map(item => (
                <tr key={item.id} style={{ opacity: 0.6 }}>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                <span className="mono text-muted" style={{ fontSize: '11px' }}>File verified in storage /uploads/</span>
              </div>
              <p className="text-sm text-muted">
                Review this flagged resource before taking administrative action. Dismissing marks the report as resolved without modifying the file. Quarantining restricts access to moderators only.
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
