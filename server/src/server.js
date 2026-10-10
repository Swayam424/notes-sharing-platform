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

// Helper: Format a safe public/authenticated user object
function formatSafeUser(row) {
  if (!row) return null;
  let enrolledSubjects = [];
  try {
    enrolledSubjects = typeof row.enrolled_subjects === 'string' ? JSON.parse(row.enrolled_subjects || '[]') : (row.enrolled_subjects || []);
  } catch {
    enrolledSubjects = [];
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    initials: row.initials,
    role: row.role,
    college: row.college,
    department: row.department,
    stream: row.stream || row.department || 'Computer Science & Engineering',
    degree: row.degree || 'B.Tech / B.E.',
    academicGoal: row.academic_goal || '',
    enrolledSubjects: Array.isArray(enrolledSubjects) ? enrolledSubjects : [],
    onboardingCompleted: Boolean(row.onboarding_completed),
    semester: row.semester || 1,
    created_at: row.created_at
  };
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
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id);
  return formatSafeUser(user);
}

// Helper: Check if user has administrator or moderator privileges
function isModerator(user) {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return role === 'moderator' || role === 'admin';
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
    const { subjectId, unitId, format, search, author, userId, status } = req.query;
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
    if (author) {
      query += ' AND LOWER(author) = LOWER(?)';
      params.push(author);
    }
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    } else if (!userId) {
      // In public discovery, exclude quarantined / restricted resources
      query += " AND (status != 'quarantined' OR status IS NULL)";
    }
    if (search) {
      query += ' AND (title LIKE ? OR author LIKE ? OR primary_topic LIKE ? OR description LIKE ? OR tags LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY upload_date DESC';
    const rawNotes = db.prepare(query).all(...params);

    const notes = rawNotes.map(n => {
      const sub = db.prepare('SELECT name, code FROM subjects WHERE id = ?').get(n.subject_id);
      const unit = db.prepare('SELECT name FROM units WHERE id = ?').get(n.unit_id);
      const parsedTopicIds = JSON.parse(n.topic_ids || '[]');
      let topicNames = [];
      if (parsedTopicIds.length > 0) {
        const placeholders = parsedTopicIds.map(() => '?').join(',');
        const tRows = db.prepare(`SELECT name FROM topics WHERE id IN (${placeholders})`).all(...parsedTopicIds);
        topicNames = tRows.map(r => r.name);
      }

      return {
        id: n.id,
        title: n.title,
        author: n.author,
        authorInitials: n.author_initials,
        userId: n.user_id || null,
        status: n.status || 'published',
        subjectId: n.subject_id,
        subjectName: sub?.name || '',
        subjectCode: sub?.code || '',
        unitId: n.unit_id,
        unitName: unit?.name || '',
        topicIds: parsedTopicIds,
        topicNames,
        primaryTopic: n.primary_topic || (topicNames.length > 0 ? topicNames[0] : ''),
        description: n.description || '',
        tags: JSON.parse(n.tags || '[]'),
        department: n.department || '',
        semester: n.semester || null,
        format: n.format,
        pages: n.pages,
        filePath: n.file_path,
        fileSize: n.file_size,
        mimeType: n.mime_type,
        uploadDate: n.upload_date,
        downloads: n.downloads,
        upvotes: n.upvotes || 0,
        commentCount: db.prepare('SELECT COUNT(*) as c FROM note_comments WHERE note_id = ?').get(n.id)?.c || 0,
        topicMatchCount: n.topic_match_count,
        totalTopics: n.total_topics,
        syllabusMatch: n.syllabus_match
      };
    });

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

    const sub = db.prepare('SELECT name, code FROM subjects WHERE id = ?').get(n.subject_id);
    const unit = db.prepare('SELECT name FROM units WHERE id = ?').get(n.unit_id);
    const parsedTopicIds = JSON.parse(n.topic_ids || '[]');
    let topicNames = [];
    if (parsedTopicIds.length > 0) {
      const placeholders = parsedTopicIds.map(() => '?').join(',');
      const tRows = db.prepare(`SELECT name FROM topics WHERE id IN (${placeholders})`).all(...parsedTopicIds);
      topicNames = tRows.map(r => r.name);
    }

    const reqUser = getUserFromRequest(req);
    const isUpvoted = reqUser ? !!db.prepare('SELECT 1 FROM note_upvotes WHERE user_id = ? AND note_id = ?').get(reqUser.id, n.id) : false;
    const commentCount = db.prepare('SELECT COUNT(*) as c FROM note_comments WHERE note_id = ?').get(n.id)?.c || 0;

    const note = {
      id: n.id,
      title: n.title,
      author: n.author,
      authorInitials: n.author_initials,
      userId: n.user_id || null,
      status: n.status || 'published',
      subjectId: n.subject_id,
      subjectName: sub?.name || '',
      subjectCode: sub?.code || '',
      unitId: n.unit_id,
      unitName: unit?.name || '',
      topicIds: parsedTopicIds,
      topicNames,
      primaryTopic: n.primary_topic || (topicNames.length > 0 ? topicNames[0] : ''),
      description: n.description || '',
      tags: JSON.parse(n.tags || '[]'),
      department: n.department || '',
      semester: n.semester || null,
      format: n.format,
      pages: n.pages,
      filePath: n.file_path,
      fileSize: n.file_size,
      mimeType: n.mime_type,
      uploadDate: n.upload_date,
      downloads: n.downloads,
      upvotes: n.upvotes || 0,
      isUpvoted,
      commentCount,
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
    const {
      title,
      author,
      subjectId,
      unitId,
      topicIds,
      primaryTopic,
      description,
      tags,
      department,
      semester,
      format,
      pages,
      status
    } = req.body;
    const file = req.file;

    if (!subjectId || !unitId) {
      return res.status(400).json({ success: false, error: 'Subject and Unit are required' });
    }

    let parsedTopicIds = [];
    if (typeof topicIds === 'string') {
      try {
        parsedTopicIds = JSON.parse(topicIds);
      } catch {
        parsedTopicIds = topicIds.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else if (Array.isArray(topicIds)) {
      parsedTopicIds = topicIds;
    }

    let parsedTags = [];
    if (typeof tags === 'string') {
      try {
        parsedTags = JSON.parse(tags);
      } catch {
        parsedTags = tags.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean);
      }
    } else if (Array.isArray(tags)) {
      parsedTags = tags;
    }

    const noteId = 'n-' + Date.now();
    const currentUser = getUserFromRequest(req);
    const finalAuthor = author || currentUser?.name || 'Anonymous Scholar';
    const authorInitials = currentUser?.initials || finalAuthor.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || 'AN';
    const noteTitle = title || (file ? file.originalname.replace(/\.[^/.]+$/, '') : 'Lecture Notes');

    // Resolve primary topic
    let resolvedPrimaryTopic = (primaryTopic || '').trim();
    if (!resolvedPrimaryTopic && parsedTopicIds.length > 0) {
      const firstTopicRow = db.prepare('SELECT name FROM topics WHERE id = ?').get(parsedTopicIds[0]);
      if (firstTopicRow) resolvedPrimaryTopic = firstTopicRow.name;
    }

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
        primary_topic, description, tags, department, semester, user_id, status,
        format, pages, file_path, file_size, mime_type, upload_date, downloads,
        topic_match_count, total_topics, syllabus_match
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      noteId,
      noteTitle,
      finalAuthor,
      authorInitials,
      subjectId,
      unitId,
      JSON.stringify(parsedTopicIds),
      resolvedPrimaryTopic,
      description || '',
      JSON.stringify(parsedTags),
      department || currentUser?.department || '',
      semester ? parseInt(semester) : (currentUser?.semester || null),
      currentUser?.id || null,
      status || 'published',
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
      message: 'Note uploaded and indexed successfully!',
      note: {
        id: noteId,
        title: noteTitle,
        author: finalAuthor,
        authorInitials,
        userId: currentUser?.id || null,
        status: status || 'published',
        subjectId,
        unitId,
        primaryTopic: resolvedPrimaryTopic,
        description: description || '',
        tags: parsedTags,
        format: format || 'Lecture Notes',
        pages: parseInt(pages) || 12,
        uploadDate: new Date().toISOString().split('T')[0],
        downloads: 0,
        syllabusMatch
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update note metadata
app.put('/api/notes/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const {
      title,
      primaryTopic,
      description,
      tags,
      format,
      pages,
      status,
      department,
      semester
    } = req.body;

    let parsedTags = existing.tags;
    if (tags !== undefined) {
      if (typeof tags === 'string') {
        try {
          parsedTags = JSON.stringify(JSON.parse(tags));
        } catch {
          parsedTags = JSON.stringify(tags.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean));
        }
      } else if (Array.isArray(tags)) {
        parsedTags = JSON.stringify(tags);
      }
    }

    const updatedTitle = title !== undefined ? title.trim() : existing.title;
    const updatedPrimaryTopic = primaryTopic !== undefined ? primaryTopic.trim() : existing.primary_topic;
    const updatedDesc = description !== undefined ? description.trim() : existing.description;
    const updatedFormat = format !== undefined ? format : existing.format;
    const updatedPages = pages !== undefined ? parseInt(pages) : existing.pages;
    const updatedStatus = status !== undefined ? status : (existing.status || 'published');
    const updatedDept = department !== undefined ? department : existing.department;
    const updatedSem = semester !== undefined ? parseInt(semester) : existing.semester;

    db.prepare(`
      UPDATE notes
      SET title = ?, primary_topic = ?, description = ?, tags = ?,
          format = ?, pages = ?, status = ?, department = ?, semester = ?
      WHERE id = ?
    `).run(
      updatedTitle,
      updatedPrimaryTopic,
      updatedDesc,
      parsedTags,
      updatedFormat,
      updatedPages,
      updatedStatus,
      updatedDept,
      updatedSem,
      req.params.id
    );

    // Fetch updated note
    const n = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    const sub = db.prepare('SELECT name, code FROM subjects WHERE id = ?').get(n.subject_id);
    const unit = db.prepare('SELECT name FROM units WHERE id = ?').get(n.unit_id);
    const parsedTopicIds = JSON.parse(n.topic_ids || '[]');
    let topicNames = [];
    if (parsedTopicIds.length > 0) {
      const placeholders = parsedTopicIds.map(() => '?').join(',');
      const tRows = db.prepare(`SELECT name FROM topics WHERE id IN (${placeholders})`).all(...parsedTopicIds);
      topicNames = tRows.map(r => r.name);
    }

    const note = {
      id: n.id,
      title: n.title,
      author: n.author,
      authorInitials: n.author_initials,
      userId: n.user_id || null,
      status: n.status || 'published',
      subjectId: n.subject_id,
      subjectName: sub?.name || '',
      subjectCode: sub?.code || '',
      unitId: n.unit_id,
      unitName: unit?.name || '',
      topicIds: parsedTopicIds,
      topicNames,
      primaryTopic: n.primary_topic || (topicNames.length > 0 ? topicNames[0] : ''),
      description: n.description || '',
      tags: JSON.parse(n.tags || '[]'),
      department: n.department || '',
      semester: n.semester || null,
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

    res.json({ success: true, message: 'Note updated successfully', note });
  } catch (err) {
    console.error('Update note error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete note
app.delete('/api/notes/:id', (req, res) => {
  try {
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);

    // If there is an uploaded file on disk, remove it unless it's the sample file
    if (note.file_path && note.file_path !== 'sample_lecture_notes.pdf') {
      const fullPath = path.join(uploadsDir, note.file_path);
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch (e) { /* ignore */ }
      }
    }

    // Recalculate coverage
    const newCoverage = calculateCoverage(note.subject_id);
    db.prepare('UPDATE subjects SET coverage = ? WHERE id = ?').run(newCoverage, note.subject_id);

    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (err) {
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
// 2.3 Note Upvoting & Helpful Rating API
// -------------------------------------------------------------
app.get('/api/notes/:id/upvote-status', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const note = db.prepare('SELECT upvotes FROM notes WHERE id = ?').get(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const upvoted = user ? !!db.prepare('SELECT 1 FROM note_upvotes WHERE user_id = ? AND note_id = ?').get(user.id, req.params.id) : false;
    res.json({ success: true, upvoted, upvotes: note.upvotes || 0 });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notes/:id/upvote', (req, res) => {
  try {
    const user = getUserFromRequest(req) || { id: 'user-student', name: 'Nishant Verma' };
    const note = db.prepare('SELECT id, upvotes FROM notes WHERE id = ?').get(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const existing = db.prepare('SELECT 1 FROM note_upvotes WHERE user_id = ? AND note_id = ?').get(user.id, note.id);
    let upvoted = false;
    let newCount = note.upvotes || 0;

    if (existing) {
      db.prepare('DELETE FROM note_upvotes WHERE user_id = ? AND note_id = ?').run(user.id, note.id);
      newCount = Math.max(0, newCount - 1);
      db.prepare('UPDATE notes SET upvotes = ? WHERE id = ?').run(newCount, note.id);
      upvoted = false;
    } else {
      const now = new Date().toISOString();
      db.prepare('INSERT INTO note_upvotes (user_id, note_id, created_at) VALUES (?, ?, ?)').run(user.id, note.id, now);
      newCount = newCount + 1;
      db.prepare('UPDATE notes SET upvotes = ? WHERE id = ?').run(newCount, note.id);
      upvoted = true;
    }

    res.json({ success: true, upvoted, upvotes: newCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 2.4 Note Discussion Threads & Errata Comments API
// -------------------------------------------------------------
app.get('/api/notes/:id/comments', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const comments = db.prepare(`
      SELECT * FROM note_comments 
      WHERE note_id = ? 
      ORDER BY upvotes DESC, created_at DESC
    `).all(req.params.id);

    const formatted = comments.map(c => {
      const isUpvoted = user ? !!db.prepare('SELECT 1 FROM comment_upvotes WHERE user_id = ? AND comment_id = ?').get(user.id, c.id) : false;
      return {
        id: c.id,
        noteId: c.note_id,
        userId: c.user_id,
        userName: c.user_name,
        userInitials: c.user_initials,
        userRole: c.user_role,
        category: c.category || 'General',
        content: c.content,
        createdAt: c.created_at,
        upvotes: c.upvotes || 0,
        isUpvoted
      };
    });

    res.json({ success: true, comments: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notes/:id/comments', (req, res) => {
  try {
    const user = getUserFromRequest(req) || {
      id: 'user-student',
      name: 'Nishant Verma',
      initials: 'NV',
      role: 'Student'
    };

    const { content, category } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Comment content cannot be empty' });
    }

    const commentId = 'comm-' + Date.now();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const validCategory = ['Exam Tip', 'Errata / Correction', 'Question', 'Key Takeaway', 'General'].includes(category)
      ? category
      : 'General';

    db.prepare(`
      INSERT INTO note_comments (id, note_id, user_id, user_name, user_initials, user_role, category, content, created_at, upvotes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      commentId,
      req.params.id,
      user.id,
      user.name,
      user.initials || 'ST',
      user.role || 'Student',
      validCategory,
      content.trim(),
      now
    );

    const created = {
      id: commentId,
      noteId: req.params.id,
      userId: user.id,
      userName: user.name,
      userInitials: user.initials || 'ST',
      userRole: user.role || 'Student',
      category: validCategory,
      content: content.trim(),
      createdAt: now,
      upvotes: 0,
      isUpvoted: false
    };

    res.status(201).json({ success: true, comment: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/comments/:id/upvote', (req, res) => {
  try {
    const user = getUserFromRequest(req) || { id: 'user-student' };
    const comment = db.prepare('SELECT id, upvotes FROM note_comments WHERE id = ?').get(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    const existing = db.prepare('SELECT 1 FROM comment_upvotes WHERE user_id = ? AND comment_id = ?').get(user.id, comment.id);
    let upvoted = false;
    let newCount = comment.upvotes || 0;

    if (existing) {
      db.prepare('DELETE FROM comment_upvotes WHERE user_id = ? AND comment_id = ?').run(user.id, comment.id);
      newCount = Math.max(0, newCount - 1);
      db.prepare('UPDATE note_comments SET upvotes = ? WHERE id = ?').run(newCount, comment.id);
      upvoted = false;
    } else {
      const now = new Date().toISOString();
      db.prepare('INSERT INTO comment_upvotes (user_id, comment_id, created_at) VALUES (?, ?, ?)').run(user.id, comment.id, now);
      newCount = newCount + 1;
      db.prepare('UPDATE note_comments SET upvotes = ? WHERE id = ?').run(newCount, comment.id);
      upvoted = true;
    }

    res.json({ success: true, upvoted, upvotes: newCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/comments/:id', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const comment = db.prepare('SELECT * FROM note_comments WHERE id = ?').get(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    if (user && comment.user_id !== user.id && !isModerator(user)) {
      return res.status(403).json({ success: false, error: 'Permission denied to delete this comment' });
    }

    db.prepare('DELETE FROM comment_upvotes WHERE comment_id = ?').run(req.params.id);
    db.prepare('DELETE FROM note_comments WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 2.5 Contributor Leaderboard API
// -------------------------------------------------------------
app.get('/api/contributors/leaderboard', (req, res) => {
  try {
    const { department } = req.query;
    let query = `
      SELECT 
        COALESCE(u.id, 'ext-' || LOWER(REPLACE(n.author, ' ', '-'))) as userId,
        n.author as name,
        n.author_initials as initials,
        COALESCE(u.role, 'Student') as role,
        COALESCE(u.college, 'Apex Institute of Technology') as college,
        COALESCE(n.department, u.department, 'Computer Science') as department,
        COUNT(n.id) as totalUploads,
        SUM(COALESCE(n.downloads, 0)) as totalDownloads,
        SUM(COALESCE(n.upvotes, 0)) as totalUpvotes
      FROM notes n
      LEFT JOIN users u ON (n.user_id = u.id OR LOWER(n.author) = LOWER(u.name))
    `;
    const params = [];
    if (department && department !== 'all') {
      query += ` WHERE LOWER(COALESCE(n.department, u.department, 'Computer Science')) = LOWER(?)`;
      params.push(department);
    }
    query += `
      GROUP BY n.author
      ORDER BY (SUM(COALESCE(n.upvotes, 0)) * 10 + COUNT(n.id) * 50 + SUM(COALESCE(n.downloads, 0)) * 1.5) DESC
      LIMIT 15
    `;

    const rows = db.prepare(query).all(...params);

    const leaderboard = rows.map((r, idx) => {
      const rank = idx + 1;
      const uploads = Number(r.totalUploads) || 0;
      const upvotes = Number(r.totalUpvotes) || 0;
      const downloads = Number(r.totalDownloads) || 0;
      const score = Math.round((uploads * 50) + (upvotes * 10) + (downloads * 1.5));

      let badge = 'Active Scribe';
      let tier = 'Bronze';
      if (rank === 1) {
        badge = 'Grand Scribe';
        tier = 'Diamond';
      } else if (rank === 2) {
        badge = 'Syllabus Champion';
        tier = 'Platinum';
      } else if (rank === 3) {
        badge = 'Distinguished Scholar';
        tier = 'Gold';
      } else if (rank <= 6) {
        badge = "Dean's Honor Roll";
        tier = 'Silver';
      }

      return {
        rank,
        userId: r.userId,
        name: r.name,
        initials: r.initials || r.name.slice(0, 2).toUpperCase(),
        role: r.role,
        college: r.college,
        department: r.department,
        totalUploads: uploads,
        totalDownloads: downloads,
        totalUpvotes: upvotes,
        reputationScore: score,
        badge,
        tier
      };
    });

    res.json({ success: true, leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 2.6 Saved Notes API (My Library Synchronization)
// -------------------------------------------------------------
app.get('/api/user/saved-notes', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.json({ success: true, savedNotes: [] });
    }

    const rows = db.prepare(`
      SELECT sn.note_id, sn.saved_at, sn.last_accessed_at,
             COALESCE(n.title, p.title) as title,
             COALESCE(n.author, p.author) as author,
             COALESCE(n.author_initials, 'AP') as author_initials,
             COALESCE(n.subject_id, p.subject_id) as subject_id,
             n.unit_id,
             COALESCE(n.primary_topic, p.primary_topic) as primary_topic,
             COALESCE(n.description, '') as description,
             COALESCE(n.tags, '[]') as tags,
             COALESCE(n.format, p.format) as format,
             COALESCE(n.pages, p.pages) as pages,
             COALESCE(n.file_path, p.file_path) as file_path,
             COALESCE(n.file_size, p.file_size) as file_size,
             COALESCE(n.upload_date, p.upload_date) as upload_date,
             COALESCE(n.downloads, p.downloads) as downloads,
             n.syllabus_match,
             COALESCE(sn_sub.name, sp_sub.name) as subject_name,
             COALESCE(sn_sub.code, sp_sub.code) as subject_code,
             u.name as unit_name,
             CASE WHEN p.id IS NOT NULL THEN 'pyq' ELSE 'note' END as resource_type,
             p.year as pyq_year,
             p.month as pyq_month,
             p.exam_type as pyq_exam_type,
             p.question_count as pyq_question_count
      FROM saved_notes sn
      LEFT JOIN notes n ON sn.note_id = n.id
      LEFT JOIN pyqs p ON sn.note_id = p.id
      LEFT JOIN subjects sn_sub ON n.subject_id = sn_sub.id
      LEFT JOIN subjects sp_sub ON p.subject_id = sp_sub.id
      LEFT JOIN units u ON n.unit_id = u.id
      WHERE sn.user_id = ?
      ORDER BY sn.saved_at DESC
    `).all(user.id);

    const savedNotes = rows.map(r => ({
      id: r.note_id,
      noteId: r.note_id,
      resourceType: r.resource_type || 'note',
      savedAt: r.saved_at,
      lastAccessedAt: r.last_accessed_at,
      title: r.title,
      author: r.author,
      authorInitials: r.author_initials,
      subjectId: r.subject_id,
      subjectName: r.subject_name || '',
      subjectCode: r.subject_code || '',
      unitId: r.unit_id,
      unitName: r.unit_name || (r.resource_type === 'pyq' ? 'Comprehensive Paper' : ''),
      primaryTopic: r.primary_topic || '',
      description: r.description || '',
      tags: JSON.parse(r.tags || '[]'),
      format: r.format || 'PDF',
      pages: r.pages || 4,
      filePath: r.file_path,
      fileSize: r.file_size || '1.5 MB',
      uploadDate: r.upload_date,
      downloads: r.downloads || 0,
      syllabusMatch: r.syllabus_match,
      pyqYear: r.pyq_year,
      pyqMonth: r.pyq_month,
      pyqExamType: r.pyq_exam_type,
      pyqQuestionCount: r.pyq_question_count
    }));

    res.json({ success: true, savedNotes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/user/saved-notes/:noteId', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { noteId } = req.params;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO saved_notes (user_id, note_id, saved_at, last_accessed_at)
      VALUES (?, ?, ?, COALESCE((SELECT last_accessed_at FROM saved_notes WHERE user_id = ? AND note_id = ?), NULL))
    `).run(user.id, noteId, now, user.id, noteId);

    res.json({ success: true, message: 'Note saved to library', savedAt: now });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/user/saved-notes/:noteId', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { noteId } = req.params;

    db.prepare('DELETE FROM saved_notes WHERE user_id = ? AND note_id = ?').run(user.id, noteId);

    res.json({ success: true, message: 'Note removed from library' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/user/saved-notes/:noteId/access', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.json({ success: true, message: 'Access logged locally' });
    }
    const { noteId } = req.params;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE saved_notes SET last_accessed_at = ? WHERE user_id = ? AND note_id = ?
    `).run(now, user.id, noteId);

    res.json({ success: true, lastAccessedAt: now });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 3. Past Year Questions (PYQs) API
// -------------------------------------------------------------
app.get('/api/pyqs', (req, res) => {
  try {
    const { subjectId, year, examType, semester, topic, search } = req.query;
    let query = `
      SELECT p.*, s.name as subject_name, s.code as subject_code 
      FROM pyqs p
      LEFT JOIN subjects s ON p.subject_id = s.id
      WHERE p.status != 'quarantined'
    `;
    const params = [];

    if (subjectId && subjectId !== 'all') {
      query += ' AND p.subject_id = ?';
      params.push(subjectId);
    }
    if (year && year !== 'all') {
      query += ' AND p.year = ?';
      params.push(parseInt(year, 10));
    }
    if (examType && examType !== 'all') {
      query += ' AND p.exam_type = ?';
      params.push(examType);
    }
    if (semester && semester !== 'all') {
      query += ' AND p.semester = ?';
      params.push(parseInt(semester, 10));
    }
    if (topic && topic !== 'all') {
      query += ' AND (p.primary_topic LIKE ? OR p.topic_mapping LIKE ?)';
      params.push(`%${topic}%`, `%${topic}%`);
    }
    if (search && search.trim()) {
      query += ' AND (p.title LIKE ? OR p.primary_topic LIKE ? OR p.questions LIKE ? OR s.name LIKE ? OR s.code LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }

    query += ' ORDER BY p.year DESC, p.month DESC';

    const rawPyqs = db.prepare(query).all(...params);
    const pyqs = rawPyqs.map(p => ({
      id: p.id,
      title: p.title || `${p.subject_name || 'Academic'} — ${p.month} ${p.year} Examination Paper`,
      subjectId: p.subject_id,
      subjectName: p.subject_name || '',
      subjectCode: p.subject_code || '',
      year: p.year,
      month: p.month,
      examType: p.exam_type || 'End Semester',
      semester: p.semester || 5,
      department: p.department || 'Computer Science',
      totalMarks: p.total_marks || 100,
      primaryTopic: p.primary_topic || '',
      questionCount: p.question_count || 0,
      topicMapping: JSON.parse(p.topic_mapping || '[]'),
      questions: JSON.parse(p.questions || '[]'),
      format: p.format || 'PDF',
      pages: p.pages || 4,
      fileSize: p.file_size || '1.6 MB',
      author: p.author || 'Apex Examination Board',
      uploadDate: p.upload_date || '',
      downloads: p.downloads || 0,
      status: p.status || 'published'
    }));

    res.json({ success: true, pyqs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/pyqs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const p = db.prepare(`
      SELECT p.*, s.name as subject_name, s.code as subject_code
      FROM pyqs p
      LEFT JOIN subjects s ON p.subject_id = s.id
      WHERE p.id = ?
    `).get(id);

    if (!p) {
      return res.status(404).json({ success: false, error: 'Question Paper not found' });
    }

    const pyq = {
      id: p.id,
      title: p.title || `${p.subject_name || 'Academic'} — ${p.month} ${p.year} Examination Paper`,
      subjectId: p.subject_id,
      subjectName: p.subject_name || '',
      subjectCode: p.subject_code || '',
      year: p.year,
      month: p.month,
      examType: p.exam_type || 'End Semester',
      semester: p.semester || 5,
      department: p.department || 'Computer Science',
      totalMarks: p.total_marks || 100,
      primaryTopic: p.primary_topic || '',
      questionCount: p.question_count || 0,
      topicMapping: JSON.parse(p.topic_mapping || '[]'),
      questions: JSON.parse(p.questions || '[]'),
      format: p.format || 'PDF',
      pages: p.pages || 4,
      filePath: p.file_path,
      fileSize: p.file_size || '1.6 MB',
      author: p.author || 'Apex Examination Board',
      uploadDate: p.upload_date || '',
      downloads: p.downloads || 0,
      status: p.status || 'published'
    };

    res.json({ success: true, pyq });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pyqs', upload.single('file'), (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const {
      title,
      subjectId,
      year,
      month,
      examType,
      semester,
      department,
      totalMarks,
      primaryTopic,
      questionCount,
      topicMapping,
      questions,
      pages
    } = req.body;

    if (!subjectId || !year) {
      return res.status(400).json({ success: false, error: 'Subject and Year are required.' });
    }

    const subject = db.prepare('SELECT name, code FROM subjects WHERE id = ?').get(subjectId);
    const subjectName = subject ? subject.name : 'Academic';
    const paperTitle = title && title.trim() ? title.trim() : `${subjectName} — ${month || 'Dec'} ${year} ${examType || 'End Semester'} Examination Paper`;
    const id = 'pyq-' + Date.now();
    const now = new Date().toISOString().split('T')[0];

    let mapping = [];
    if (typeof topicMapping === 'string') {
      try { mapping = JSON.parse(topicMapping); } catch { mapping = []; }
    } else if (Array.isArray(topicMapping)) {
      mapping = topicMapping;
    }

    let parsedQuestions = [];
    if (typeof questions === 'string') {
      try { parsedQuestions = JSON.parse(questions); } catch { parsedQuestions = []; }
    } else if (Array.isArray(questions)) {
      parsedQuestions = questions;
    }

    // If no questions list provided, synthesize standard question structure from mapping or defaults
    if (parsedQuestions.length === 0) {
      if (mapping.length > 0) {
        parsedQuestions = mapping.flatMap((m, mIdx) => [
          {
            id: `q-${id}-${mIdx}-1`,
            qNumber: `${mIdx + 1}(a)`,
            question: `Describe fundamental architecture, operations, and analytical principles of ${m.topicName}.`,
            marks: 7,
            unitName: `Unit ${((mIdx % 5) + 1)}`,
            topicId: m.topicId,
            topicName: m.topicName
          },
          {
            id: `q-${id}-${mIdx}-2`,
            qNumber: `${mIdx + 1}(b)`,
            question: `Critically evaluate performance parameters, design trade-offs, and failure recovery in ${m.topicName}.`,
            marks: 7,
            unitName: `Unit ${((mIdx % 5) + 1)}`,
            topicId: m.topicId,
            topicName: m.topicName
          }
        ]);
      } else {
        parsedQuestions = [
          {
            id: `q-${id}-1`,
            qNumber: '1',
            question: `Explain core theoretical concepts and standard algorithmic steps in ${primaryTopic || 'the curriculum'}.`,
            marks: 14,
            unitName: 'Unit 1',
            topicId: 't-1',
            topicName: primaryTopic || 'Course Curriculum'
          }
        ];
      }
    }

    const calculatedCount = questionCount ? parseInt(questionCount, 10) : parsedQuestions.length;
    const file = req.file;
    const storedFileName = file ? file.filename : 'sample_lecture_notes.pdf';
    const storedFileSize = file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '1.4 MB';

    db.prepare(`
      INSERT INTO pyqs (
        id, title, subject_id, year, month, exam_type, semester, department,
        total_marks, primary_topic, question_count, topic_mapping, questions,
        format, pages, file_path, file_size, author, user_id, upload_date, status, downloads
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      paperTitle,
      subjectId,
      parseInt(year, 10),
      month || 'Dec',
      examType || 'End Semester',
      semester ? parseInt(semester, 10) : 5,
      department || 'Computer Science',
      totalMarks ? parseInt(totalMarks, 10) : 100,
      primaryTopic || (mapping[0]?.topicName || 'General Curriculum'),
      calculatedCount,
      JSON.stringify(mapping),
      JSON.stringify(parsedQuestions),
      'PDF',
      pages ? parseInt(pages, 10) : 4,
      storedFileName,
      storedFileSize,
      user ? user.name : 'Student Contributor',
      user ? user.id : null,
      now,
      'published',
      0
    );

    res.json({
      success: true,
      message: 'PYQ Question Paper uploaded successfully',
      pyq: {
        id,
        title: paperTitle,
        subjectId,
        year,
        month,
        examType: examType || 'End Semester'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/pyqs/:id/download', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE pyqs SET downloads = downloads + 1 WHERE id = ?').run(id);
    const pyq = db.prepare('SELECT title, file_path FROM pyqs WHERE id = ?').get(id);
    res.json({
      success: true,
      message: 'Download registered',
      fileName: `${(pyq?.title || 'PYQ-Paper').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 4. Moderation & Reporting API
// -------------------------------------------------------------
app.get('/api/moderation', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    let query = `
      SELECT m.*, 
             COALESCE(n.title, p.title) as note_title, 
             COALESCE(n.primary_topic, p.primary_topic) as primary_topic, 
             COALESCE(n.subject_id, p.subject_id) as subject_id 
      FROM moderation m 
      LEFT JOIN notes n ON m.note_id = n.id
      LEFT JOIN pyqs p ON m.note_id = p.id
    `;
    const params = [];
    if (req.query.mine === 'true' && user) {
      query += ' WHERE m.user_id = ?';
      params.push(user.id);
    }
    query += ' ORDER BY m.timestamp DESC';
    const items = db.prepare(query).all(...params);
    const moderationItems = items.map(m => ({
      id: m.id,
      noteId: m.note_id,
      userId: m.user_id,
      resourceName: m.note_title || m.resource_name,
      primaryTopic: m.primary_topic,
      subjectId: m.subject_id,
      reporter: m.reporter,
      category: m.category,
      reason: m.reason,
      details: m.details,
      timestamp: m.timestamp,
      status: m.status,
      adminNotes: m.admin_notes,
      reviewedBy: m.reviewed_by,
      reviewedAt: m.reviewed_at,
      actionTaken: m.action_taken
    }));
    res.json({ success: true, items: moderationItems });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/user/reports', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const items = db.prepare(`
      SELECT m.*, 
             COALESCE(n.title, p.title) as note_title, 
             COALESCE(n.primary_topic, p.primary_topic) as primary_topic, 
             COALESCE(n.subject_id, p.subject_id) as subject_id 
      FROM moderation m 
      LEFT JOIN notes n ON m.note_id = n.id 
      LEFT JOIN pyqs p ON m.note_id = p.id
      WHERE m.user_id = ? 
      ORDER BY m.timestamp DESC
    `).all(user.id);

    const reports = items.map(m => ({
      id: m.id,
      noteId: m.note_id,
      userId: m.user_id,
      resourceName: m.note_title || m.resource_name,
      primaryTopic: m.primary_topic,
      subjectId: m.subject_id,
      reporter: m.reporter,
      category: m.category,
      reason: m.reason,
      details: m.details,
      timestamp: m.timestamp,
      status: m.status,
      adminNotes: m.admin_notes,
      reviewedBy: m.reviewed_by,
      reviewedAt: m.reviewed_at,
      actionTaken: m.action_taken
    }));
    res.json({ success: true, reports, items: reports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/moderation/status/:noteId', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.json({ success: true, hasReported: false });
    }
    const pending = db.prepare(`
      SELECT id, reason, details, category, timestamp, status 
      FROM moderation 
      WHERE note_id = ? AND user_id = ? AND status = 'pending'
    `).get(req.params.noteId, user.id);

    if (pending) {
      return res.json({
        success: true,
        hasReported: true,
        report: pending
      });
    }
    res.json({ success: true, hasReported: false });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/moderation/:id', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || !isModerator(user)) {
      return res.status(403).json({ success: false, error: 'Administrator access required.' });
    }

    const { status, adminNotes } = req.body;
    if (!['pending', 'under_review', 'resolved', 'dismissed', 'quarantined'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    db.prepare(`
      UPDATE moderation 
      SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = ?, action_taken = ?
      WHERE id = ?
    `).run(status, adminNotes || null, user.name, now, status, req.params.id);

    res.json({ success: true, message: `Item updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 4b. Dedicated Admin Moderation Workspace APIs
// -------------------------------------------------------------
app.get('/api/admin/moderation', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || !isModerator(user)) {
      return res.status(403).json({ success: false, error: 'Administrator access required.' });
    }

    const { status, category, search } = req.query;
    let query = `
      SELECT 
        m.*,
        COALESCE(n.title, p.title) as note_title,
        COALESCE(n.author, p.author) as note_author,
        COALESCE(n.user_id, p.user_id) as note_user_id,
        COALESCE(n.primary_topic, p.primary_topic) as note_primary_topic,
        COALESCE(n.subject_id, p.subject_id) as note_subject_id,
        n.unit_id as note_unit_id,
        COALESCE(n.upload_date, p.upload_date) as note_upload_date,
        COALESCE(n.pages, p.pages) as note_pages,
        COALESCE(n.format, p.format) as note_format,
        COALESCE(n.file_size, p.file_size) as note_file_size,
        COALESCE(n.status, p.status) as note_status,
        COALESCE(sn_sub.name, sp_sub.name) as subject_name,
        COALESCE(sn_sub.code, sp_sub.code) as subject_code,
        COALESCE(u.name, up.name) as uploader_name,
        COALESCE(u.email, up.email) as uploader_email,
        r.name as reporter_user_name,
        r.email as reporter_user_email,
        r.department as reporter_department
      FROM moderation m
      LEFT JOIN notes n ON m.note_id = n.id
      LEFT JOIN pyqs p ON m.note_id = p.id
      LEFT JOIN subjects sn_sub ON n.subject_id = sn_sub.id
      LEFT JOIN subjects sp_sub ON p.subject_id = sp_sub.id
      LEFT JOIN users u ON n.user_id = u.id
      LEFT JOIN users up ON p.user_id = up.id
      LEFT JOIN users r ON m.user_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ' AND m.status = ?';
      params.push(status);
    }
    if (category && category !== 'all') {
      query += ' AND m.category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND (m.resource_name LIKE ? OR n.title LIKE ? OR p.title LIKE ? OR m.reporter LIKE ? OR m.id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY m.timestamp DESC';
    const rows = db.prepare(query).all(...params);

    const items = rows.map(r => ({
      id: r.id,
      noteId: r.note_id,
      userId: r.user_id,
      resourceName: r.note_title || r.resource_name,
      reporter: r.reporter,
      reporterEmail: r.reporter_user_email,
      reporterDepartment: r.reporter_department,
      category: r.category,
      reason: r.reason,
      details: r.details,
      timestamp: r.timestamp,
      status: r.status,
      adminNotes: r.admin_notes,
      reviewedBy: r.reviewed_by,
      reviewedAt: r.reviewed_at,
      actionTaken: r.action_taken,
      // Attached resource context
      noteTitle: r.note_title,
      subjectId: r.note_subject_id,
      subjectName: r.subject_name,
      subjectCode: r.subject_code,
      primaryTopic: r.note_primary_topic,
      uploaderName: r.uploader_name || r.note_author || 'Student Contributor',
      uploaderId: r.note_user_id,
      uploaderEmail: r.uploader_email,
      uploadDate: r.note_upload_date,
      pages: r.note_pages,
      format: r.note_format,
      fileSize: r.note_file_size,
      noteStatus: r.note_status || 'published'
    }));

    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/moderation/:id/decision', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || !isModerator(user)) {
      return res.status(403).json({ success: false, error: 'Administrator access required.' });
    }

    const { action, adminNotes } = req.body;
    if (!['dismiss', 'quarantine', 'under_review', 'restore'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid moderation action. Must be dismiss, quarantine, under_review, or restore.' });
    }

    const report = db.prepare('SELECT * FROM moderation WHERE id = ?').get(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Moderation report not found.' });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const notesText = (adminNotes || '').trim();

    let newStatus = report.status;
    let actionTaken = action;
    let message = '';

    if (action === 'dismiss') {
      newStatus = 'dismissed';
      actionTaken = 'dismissed';
      message = 'Report dismissed. Resource verified as compliant and active in repository.';
      if (report.note_id) {
        db.prepare("UPDATE notes SET status = 'published' WHERE id = ? AND status != 'quarantined'").run(report.note_id);
        db.prepare("UPDATE pyqs SET status = 'published' WHERE id = ? AND status != 'quarantined'").run(report.note_id);
      }
    } else if (action === 'quarantine') {
      newStatus = 'quarantined';
      actionTaken = 'quarantined';
      message = 'Resource quarantined and restricted from public library.';
      if (report.note_id) {
        db.prepare("UPDATE notes SET status = 'quarantined' WHERE id = ?").run(report.note_id);
        db.prepare("UPDATE pyqs SET status = 'quarantined' WHERE id = ?").run(report.note_id);
      }
    } else if (action === 'under_review') {
      newStatus = 'under_review';
      actionTaken = 'under_review';
      message = 'Report marked under active administrative investigation.';
      if (report.note_id) {
        db.prepare("UPDATE notes SET status = 'flagged' WHERE id = ? AND status = 'published'").run(report.note_id);
        db.prepare("UPDATE pyqs SET status = 'flagged' WHERE id = ? AND status = 'published'").run(report.note_id);
      }
    } else if (action === 'restore') {
      newStatus = 'resolved';
      actionTaken = 'restored';
      message = 'Resource restored and republished to active library.';
      if (report.note_id) {
        db.prepare("UPDATE notes SET status = 'published' WHERE id = ?").run(report.note_id);
        db.prepare("UPDATE pyqs SET status = 'published' WHERE id = ?").run(report.note_id);
      }
    }

    db.prepare(`
      UPDATE moderation
      SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = ?, action_taken = ?
      WHERE id = ?
    `).run(newStatus, notesText || null, user.name, now, actionTaken, req.params.id);

    const updated = db.prepare('SELECT * FROM moderation WHERE id = ?').get(req.params.id);
    res.json({
      success: true,
      message,
      report: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/moderation', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { noteId, resourceName, reporter, reason, category, details } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'A reason for reporting is required.' });
    }

    // Determine target resource title
    let targetName = (resourceName || '').trim();
    if (noteId && !targetName) {
      const noteRecord = db.prepare('SELECT title FROM notes WHERE id = ?').get(noteId);
      if (noteRecord) {
        targetName = noteRecord.title;
      } else {
        const pyqRecord = db.prepare('SELECT title FROM pyqs WHERE id = ?').get(noteId);
        if (pyqRecord) {
          targetName = pyqRecord.title;
        }
      }
    }
    if (!targetName) targetName = 'Untitled Resource';

    const userId = user ? user.id : (req.body.userId || null);
    const reporterName = user ? user.name : (reporter || 'Student');

    // Prevent duplicate pending report from the same user for this note
    if (userId && noteId) {
      const existing = db.prepare(`
        SELECT id, timestamp FROM moderation 
        WHERE note_id = ? AND user_id = ? AND status = 'pending'
      `).get(noteId, userId);

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'You already have an active pending report for this note.',
          reportId: existing.id
        });
      }
    }

    const id = 'm-' + Date.now();
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const detailsText = details ? String(details).trim().slice(0, 500) : null;

    db.prepare(`
      INSERT INTO moderation (id, note_id, user_id, resource_name, reporter, category, reason, details, timestamp, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      id,
      noteId || null,
      userId,
      targetName,
      reporterName,
      category || null,
      reason.trim(),
      detailsText,
      timestamp
    );

    // Note remains published and accessible (reporting is purely non-destructive feedback)
    res.status(201).json({
      success: true,
      id,
      message: 'Report submitted successfully. Thank you for helping keep the library accurate.'
    });
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
    let user = getUserFromRequest(req);
    if (!user) {
      const fallbackRow = db.prepare('SELECT * FROM users LIMIT 1').get();
      user = formatSafeUser(fallbackRow);
    }
    if (!user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const notesCount = db.prepare('SELECT COUNT(*) as count FROM notes WHERE LOWER(author) = LOWER(?)').get(user.name)?.count || 0;
    res.json({ success: true, user: { ...user, uploadedNotesCount: notesCount } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const handleSignup = (req, res) => {
  try {
    const { email, password, name, college, department, semester, stream, degree } = req.body;
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
      INSERT INTO users (
        id, email, password_hash, salt, name, initials, role, college, department,
        stream, degree, academic_goal, enrolled_subjects, onboarding_completed, semester, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'student', ?, ?, ?, ?, '', '[]', 0, ?, ?)
    `).run(
      userId,
      cleanEmail,
      hash,
      salt,
      name.trim(),
      initials,
      college || 'Apex Institute of Technology',
      department || 'Computer Science',
      stream || '',
      degree || 'B.Tech / B.E.',
      parseInt(semester) || 1,
      now
    );

    // Create session token (valid 30 days)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, userId, now, expiresAt);

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const safeUser = formatSafeUser(userRow);

    res.status(201).json({ success: true, token, user: safeUser });
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

    const safeUser = formatSafeUser(user);

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

// Update student academic profile & complete onboarding
app.post('/api/user/onboarding', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const { degree, stream, college, semester, enrolledSubjects, academicGoal } = req.body;
    if (!stream || !stream.trim()) {
      return res.status(400).json({ success: false, error: 'Stream/branch is required' });
    }

    const enrolledArr = Array.isArray(enrolledSubjects) ? enrolledSubjects : [];
    const sem = parseInt(semester) || user.semester || 1;

    db.prepare(`
      UPDATE users
      SET degree = ?,
          stream = ?,
          department = ?,
          college = ?,
          semester = ?,
          enrolled_subjects = ?,
          academic_goal = ?,
          onboarding_completed = 1
      WHERE id = ?
    `).run(
      degree || user.degree || 'B.Tech / B.E.',
      stream.trim(),
      stream.trim(),
      (college && college.trim()) || user.college || 'Apex Institute of Technology',
      sem,
      JSON.stringify(enrolledArr),
      academicGoal || '',
      user.id
    );

    const updatedRaw = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    const safeUser = formatSafeUser(updatedRaw);

    res.json({ success: true, user: safeUser });
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
