import { useState, useEffect } from 'react';
import { Upload, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import type { NoteResource } from '../data/mockData';

export default function Contributions() {
  const navigate = useNavigate();
  const { setUploadOpen, refreshKey } = useApp();
  const [myUploads, setMyUploads] = useState<NoteResource[]>([]);

  useEffect(() => {
    Promise.all([
      api.getNotes(),
      api.getUserProfile()
    ]).then(([allNotes, profile]) => {
      const userName = profile?.name || '';
      // Find notes by the authenticated user
      const userNotes = userName
        ? allNotes.filter(n => n.author.toLowerCase() === userName.toLowerCase())
        : [];
      setMyUploads(userNotes.length > 0 ? userNotes : allNotes.slice(0, 4));
    }).catch(console.error);
  }, [refreshKey]);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">My Contributions</h1>
            <p className="page-subtitle">{myUploads.length} resources uploaded</p>
          </div>
          <button className="btn btn-primary" onClick={() => setUploadOpen(true)}>
            <Upload size={16} /> Upload New
          </button>
        </div>
      </div>

      <div className="notes-grid">
        {myUploads.map(note => (
          <div key={note.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/notes/${note.id}`)}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <span className="badge badge-secondary">Published</span>
              </div>
              <h3 style={{ fontSize: 'var(--text-md)', fontFamily: 'var(--font-display)' }}>{note.title}</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <span className="chip">{note.format}</span>
                <span className="chip">{note.pages} pages</span>
                <span className="chip">{note.downloads} downloads</span>
              </div>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="mono text-muted" style={{ fontSize: '11px' }}>Uploaded {note.uploadDate}</span>
              <ArrowRight size={14} style={{ color: 'var(--color-muted)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
