import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { db, initDatabase, uploadsDir } from './database.js';
import { seedDatabase } from './seed.js';
import { hashPassword, verifyPassword, generateToken } from './auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize & seed DB on startup
initDatabase();
seedDatabase();

app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Multer storage configuration for real file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `${uniqueSuffix}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Helper: Calculate subject coverage dynamically based on topic statuses
function calculateCoverage(subjectId) {
  const allTopics = db.prepare(`
    SELECT t.status
    FROM topics t
    JOIN units u ON t.unit_id = u.id
    WHERE u.subject_id = ?
  `).all(subjectId);

  if (allTopics.length === 0) return 0;
  const covered = allTopics.filter(t => t.status === 'covered').length;
  return Math.round((covered / allTopics.length) * 100);
}

// Helper: Extract authenticated user from Authorization Bearer token header
function getUserFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const session = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token);
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  const user = db.prepare('SELECT id, email, name, initials, role, college, department, semester, created_at FROM users WHERE id = ?').get(session.user_id);
  return user || null;
}

// -------------------------------------------------------------
// 1. Subjects & Syllabus API
// -------------------------------------------------------------
app.get('/api/subjects', (_req, res) => {
  try {
    const subjects = db.prepare('SELECT * FROM subjects ORDER BY code ASC').all();
    
    // Attach units and topics to each subject
    for (const sub of subjects) {
      sub.coverage = calculateCoverage(sub.id);
      const units = db.prepare('SELECT * FROM units WHERE subject_id = ? ORDER BY order_index ASC').all(sub.id);
      for (const u of units) {
        const topics = db.prepare('SELECT * FROM topics WHERE unit_id = ?').all(u.id);
        u.topics = topics.map(t => ({
          ...t,
          noteCount: t.note_count,
          pyqCount: t.pyq_count,
          pyqYears: JSON.parse(t.pyq_years || '[]'),
          pyqQuestions: JSON.parse(t.pyq_questions || '[]')
        }));
      }
      sub.units = units;
    }

    res.json({ success: true, subjects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/subjects/:id', (req, res) => {
  try {
    const sub = db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id);
    if (!sub) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    sub.coverage = calculateCoverage(sub.id);
    const units = db.prepare('SELECT * FROM units WHERE subject_id = ? ORDER BY order_index ASC').all(sub.id);
    for (const u of units) {
      const topics = db.prepare('SELECT * FROM topics WHERE unit_id = ?').all(u.id);
      u.topics = topics.map(t => ({
        ...t,
        noteCount: t.note_count,
        pyqCount: t.pyq_count,
        pyqYears: JSON.parse(t.pyq_years || '[]'),
        pyqQuestions: JSON.parse(t.pyq_questions || '[]')
      }));
    }
    sub.units = units;

    res.json({ success: true, subject: sub });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 2. Notes API (Listing, Filtering, Upload, Download)
// -------------------------------------------------------------
app.get('/api/notes', (req, res) => {
  try {
    const { subjectId, unitId, format, search } = req.query;
    let query = 'SELECT * FROM notes WHERE 1=1';
    const params = [];

    if (subjectId && subjectId !== 'all') {
      query += ' AND subject_id = ?';
      params.push(subjectId);
    }
    if (unitId && unitId !== 'all') {
      query += ' AND unit_id = ?';
      params.push(unitId);
    }
    if (format && format !== 'all') {
      query += ' AND format = ?';
      params.push(format);
    }
    if (search) {
      query += ' AND (title LIKE ? OR author LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY upload_date DESC';
    const rawNotes = db.prepare(query).all(...params);

    const notes = rawNotes.map(n => ({
      id: n.id,
      title: n.title,
      author: n.author,
      authorInitials: n.author_initials,
      subjectId: n.subject_id,
      unitId: n.unit_id,
      topicIds: JSON.parse(n.topic_ids || '[]'),
      format: n.format,
      pages: n.pages,
      filePath: n.file_path,
      fileSize: n.file_size,
      mimeType: n.mime_type,
      uploadDate: n.upload_date,
      downloads: n.downloads,
      topicMatchCount: n.topic_match_count,
      totalTopics: n.total_topics,
      syllabusMatch: n.syllabus_match
    }));

    res.json({ success: true, notes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/notes/:id', (req, res) => {
  try {
    const n = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    if (!n) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const note = {
      id: n.id,
      title: n.title,
      author: n.author,
      authorInitials: n.author_initials,
      subjectId: n.subject_id,
      unitId: n.unit_id,
      topicIds: JSON.parse(n.topic_ids || '[]'),
      format: n.format,
      pages: n.pages,
      filePath: n.file_path,
      fileSize: n.file_size,
      mimeType: n.mime_type,
      uploadDate: n.upload_date,
      downloads: n.downloads,
      topicMatchCount: n.topic_match_count,
      totalTopics: n.total_topics,
      syllabusMatch: n.syllabus_match
    };

    res.json({ success: true, note });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload a real resource
app.post('/api/notes', upload.single('file'), (req, res) => {
  try {
    const { title, author, subjectId, unitId, topicIds, format, pages } = req.body;
    const file = req.file;

    if (!subjectId || !unitId) {
      return res.status(400).json({ success: false, error: 'Subject and Unit are required' });
    }

    const parsedTopicIds = typeof topicIds === 'string' ? JSON.parse(topicIds) : (topicIds || []);
    const noteId = 'n-' + Date.now();
    const currentUser = getUserFromRequest(req);
    const finalAuthor = author || currentUser?.name || 'Anonymous Scholar';
    const authorInitials = currentUser?.initials || finalAuthor.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || 'AN';
    const noteTitle = title || (file ? file.originalname.replace(/\.[^/.]+$/, '') : 'Lecture Notes');

    // Count topics in this unit for match calculation
    const unitTopics = db.prepare('SELECT id FROM topics WHERE unit_id = ?').all(unitId);
    const totalTopics = unitTopics.length || 1;
    const topicMatchCount = parsedTopicIds.length;
    const syllabusMatch = `Matches ${topicMatchCount}/${totalTopics} topics`;

    const storedFileName = file ? file.filename : 'sample_lecture_notes.pdf';
    const storedFileSize = file ? file.size : 1024000;
    const mimeType = file ? file.mimetype : 'application/pdf';

    db.prepare(`
      INSERT INTO notes (
        id, title, author, author_initials, subject_id, unit_id, topic_ids,
        format, pages, file_path, file_size, mime_type, upload_date, downloads,
        topic_match_count, total_topics, syllabus_match
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      noteId,
      noteTitle,
      finalAuthor,
      authorInitials,
      subjectId,
      unitId,
      JSON.stringify(parsedTopicIds),
      format || 'Lecture Notes',
      parseInt(pages) || 12,
      storedFileName,
      storedFileSize,
      mimeType,
      new Date().toISOString().split('T')[0],
      0,
      topicMatchCount,
      totalTopics,
      syllabusMatch
    );

    // Update topic note counts and statuses
    for (const tId of parsedTopicIds) {
      db.prepare(`
        UPDATE topics
        SET note_count = note_count + 1,
            status = 'covered'
        WHERE id = ?
      `).run(tId);
    }

    // Recalculate subject coverage
    const newCoverage = calculateCoverage(subjectId);
    db.prepare('UPDATE subjects SET coverage = ? WHERE id = ?').run(newCoverage, subjectId);

    res.status(201).json({
      success: true,
      noteId,
      message: 'Note uploaded and pinned to syllabus successfully!'
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Download note file
app.get('/api/notes/:id/download', (req, res) => {
  try {
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    if (!note) {
      return res.status(404).send('Note not found');
    }

    // Increment download count
    db.prepare('UPDATE notes SET downloads = downloads + 1 WHERE id = ?').run(note.id);

    const filePath = path.join(uploadsDir, note.file_path || 'sample_lecture_notes.pdf');
    const safeTitle = (note.title || 'note').replace(/[^a-zA-Z0-9_-]/g, '_');
    if (fs.existsSync(filePath)) {
      res.download(filePath, `${safeTitle}.pdf`);
    } else {
      const samplePath = path.join(uploadsDir, 'sample_lecture_notes.pdf');
      res.download(samplePath, `${safeTitle}.pdf`);
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// -------------------------------------------------------------
// 3. Past Year Questions (PYQs) API
// -------------------------------------------------------------
app.get('/api/pyqs', (req, res) => {
  try {
    const { subjectId } = req.query;
    let query = 'SELECT * FROM pyqs WHERE 1=1';
    const params = [];
    if (subjectId && subjectId !== 'all') {
      query += ' AND subject_id = ?';
      params.push(subjectId);
    }
    query += ' ORDER BY year DESC';

    const rawPyqs = db.prepare(query).all(...params);
    const pyqs = rawPyqs.map(p => ({
      id: p.id,
      subjectId: p.subject_id,
      year: p.year,
      month: p.month,
      questionCount: p.question_count,
      topicMapping: JSON.parse(p.topic_mapping || '[]')
    }));

    res.json({ success: true, pyqs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 4. Moderation Queue API
// -------------------------------------------------------------
app.get('/api/moderation', (_req, res) => {
  try {
    const items = db.prepare('SELECT * FROM moderation ORDER BY timestamp DESC').all();
    const moderationItems = items.map(m => ({
      id: m.id,
      resourceName: m.resource_name,
      reporter: m.reporter,
      reason: m.reason,
      timestamp: m.timestamp,
      status: m.status
    }));
    res.json({ success: true, items: moderationItems });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/moderation/:id', (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'dismissed', 'quarantined'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    db.prepare('UPDATE moderation SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true, message: `Item updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/moderation', (req, res) => {
  try {
    const { resourceName, reporter, reason } = req.body;
    const id = 'm-' + Date.now();
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    db.prepare(`
      INSERT INTO moderation (id, resource_name, reporter, reason, timestamp, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(id, resourceName, reporter || 'Student', reason || 'Out of Syllabus', timestamp);

    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 5. Dashboard Aggregation & Stats API
// -------------------------------------------------------------
app.get('/api/stats/dashboard', (_req, res) => {
  try {
    // 1. Frequent Exam Topics (aggregated from topics table)
    const topicsWithPyqs = db.prepare(`
      SELECT t.name as topicName, s.name as subjectName, t.pyq_count as appearances
      FROM topics t
      JOIN units u ON t.unit_id = u.id
      JOIN subjects s ON u.subject_id = s.id
      WHERE t.pyq_count > 0
      ORDER BY t.pyq_count DESC
      LIMIT 8
    `).all();

    const frequentExamTopics = topicsWithPyqs.map(t => ({
      topicName: t.topicName,
      subjectName: t.subjectName,
      appearances: t.appearances,
      streak: `Appeared ${t.appearances} yrs running`
    }));

    // 2. Recent Uploads
    const latestNotes = db.prepare(`
      SELECT n.id, n.title, n.author, n.format, s.name as subject, u.name as unit, n.upload_date
      FROM notes n
      JOIN subjects s ON n.subject_id = s.id
      JOIN units u ON n.unit_id = u.id
      ORDER BY n.upload_date DESC
      LIMIT 5
    `).all();

    const recentUploads = latestNotes.map(n => ({
      id: n.id,
      title: n.title,
      author: n.author,
      format: n.format,
      subject: n.subject,
      unit: n.unit.split(':')[0] || n.unit,
      timeAgo: 'Recently'
    }));

    // 3. User stats
    const totalNotes = db.prepare('SELECT COUNT(*) as count FROM notes').get().count;
    const totalSubjects = db.prepare('SELECT COUNT(*) as count FROM subjects').get().count;

    res.json({
      success: true,
      frequentExamTopics,
      recentUploads,
      stats: {
        totalNotes,
        totalSubjects
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 6. User Profile & Authentication API
// -------------------------------------------------------------
app.get('/api/user/profile', (req, res) => {
  try {
    const user = getUserFromRequest(req) || db.prepare('SELECT id, email, name, initials, role, college, department, semester, created_at FROM users LIMIT 1').get();
    res.json({ success: true, user: user || { name: 'Student', initials: 'ST', role: 'Student' } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const handleSignup = (req, res) => {
  try {
    const { email, password, name, college, department, semester } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists' });
    }

    const { salt, hash } = hashPassword(password);
    const userId = 'user-' + Date.now();
    const initials = name.trim().split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || 'ST';
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, initials, role, college, department, semester, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'student', ?, ?, ?, ?)
    `).run(
      userId,
      cleanEmail,
      hash,
      salt,
      name.trim(),
      initials,
      college || 'Apex Institute of Technology',
      department || 'Computer Science',
      parseInt(semester) || 5,
      now
    );

    // Create session token (valid 30 days)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, userId, now, expiresAt);

    const user = {
      id: userId,
      email: cleanEmail,
      name: name.trim(),
      initials,
      role: 'student',
      college: college || 'Apex Institute of Technology',
      department: department || 'Computer Science',
      semester: parseInt(semester) || 5,
      created_at: now
    };

    res.status(201).json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.post('/api/auth/signup', handleSignup);
app.post('/api/auth/register', handleSignup);

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
    if (!user || !user.password_hash || !user.salt) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isValid = verifyPassword(password, user.salt, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = generateToken();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, user.id, now, expiresAt);

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      initials: user.initials,
      role: user.role,
      college: user.college,
      department: user.department,
      semester: user.semester,
      created_at: user.created_at
    };

    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/user/profile', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const notesCount = db.prepare('SELECT COUNT(*) as count FROM notes WHERE LOWER(author) = LOWER(?)').get(user.name)?.count || 0;
    res.json({ success: true, user: { ...user, uploadedNotesCount: notesCount } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Live Notes API Server running on http://localhost:${PORT}`);
});
