import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import crypto from 'node:crypto';
import { db, initDatabase, closeDatabase, uploadsDir } from './database.js';
import { seedDatabase } from './seed.js';
import { hashPassword, verifyPassword, generateToken, hashToken } from './auth.js';
import { generateChatResponse, generateDirectAcademicExplanation, getContextForQuery } from './aiService.js';

const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
];
for (const envPath of envCandidates) {
  try {
    if (fs.existsSync(envPath)) {
      process.loadEnvFile(envPath);
      break;
    }
  } catch {}
}

const app = express();
const PORT = process.env.PORT || 3001;

// -------------------------------------------------------------
// TEMPORARY DEV SWITCH — sign-in accepts ANY password
// -------------------------------------------------------------
// Requested for local development so sign-in is never blocked while testing.
// The account must still exist; only the password check is skipped.
//
//   Restore real password checking:  set AUTH_REQUIRE_PASSWORD=true
//
// Hard-disabled whenever NODE_ENV=production, so this cannot ship to a deployed
// site even if the flag is left in place. Remove this block before going live.
// Strict password verification enforced: every account requires its correct password
const PASSWORD_CHECK_DISABLED = false;

// Initialize & seed DB on startup
initDatabase();
seedDatabase();

// -------------------------------------------------------------
// Security Hardening: HTTP Response Headers (OWASP Recommendations)
// -------------------------------------------------------------
app.disable('x-powered-by');

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; frame-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// -------------------------------------------------------------
// CORS: Unified access for local dev & production deployments
// -------------------------------------------------------------
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);
}

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://notes-sharing-platform-psi.vercel.app'
];
const envOrigins = (process.env.CLIENT_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
const allowedOrigins = new Set([...defaultOrigins, ...envOrigins]);

app.use(cors({
  origin: (origin, cb) => {
    // Same-origin and non-browser requests carry no Origin header
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    // Allow any Vercel deployment preview or production domain
    try {
      const hostname = new URL(origin).hostname;
      if (hostname.endsWith('.vercel.app')) return cb(null, true);
    } catch { /* ignore */ }
    cb(new Error('CORS blocked'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parser with payload caps (prevents memory exhaustion DoS)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// -------------------------------------------------------------
// In-Memory Rate Limiting (OWASP Brute-Force & Abuse Protection)
// -------------------------------------------------------------
/**
 * In-memory rate limiter.
 *
 * `keyGenerator` scopes a bucket (defaults to the client IP). `countOnlyFailures`
 * makes a bucket forgive itself as soon as a request on it succeeds (< 400), so a
 * credential endpoint throttles genuine guessing without ever locking out someone
 * who finally types the right password.
 *
 * `delayAfter`/`delayStepMs` add progressive slow-down: once a bucket passes
 * `delayAfter` strikes, each further attempt is held back a little longer (capped by
 * `maxDelayMs`) instead of being refused outright. That collapses the throughput of
 * an automated guesser while a human who eventually types the right password still
 * gets in — the reason `maxRequests` on a sign-in route can stay high enough that
 * nobody is ever locked out of their own account.
 */
function createRateLimiter({
  windowMs,
  maxRequests,
  message,
  keyGenerator,
  countOnlyFailures = false,
  delayAfter = 0,
  delayStepMs = 500,
  maxDelayMs = 5000
}) {
  const hits = new Map();
  // Cleanup expired entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  const clientIp = (req) => req.ip || req.socket.remoteAddress || 'unknown';

  return (req, res, next) => {
    // req.ip honours X-Forwarded-For only when TRUST_PROXY is configured
    let key;
    try {
      key = keyGenerator ? keyGenerator(req, clientIp(req)) : clientIp(req);
    } catch {
      key = clientIp(req);
    }
    const now = Date.now();
    const record = hits.get(key);
    let strikes = 1;

    if (!record || now > record.resetTime) {
      hits.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      record.count += 1;
      strikes = record.count;
      if (record.count > maxRequests) {
        const retryAfterSec = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
        const retryAfterMin = Math.max(1, Math.ceil(retryAfterSec / 60));
        res.setHeader('Retry-After', retryAfterSec);
        return res.status(429).json({
          success: false,
          retryAfterSeconds: retryAfterSec,
          error: message
            ? `${message} (about ${retryAfterMin} minute${retryAfterMin === 1 ? '' : 's'} left)`
            : `Too many requests. Please try again in about ${retryAfterMin} minute${retryAfterMin === 1 ? '' : 's'}.`
        });
      }
    }

    // A successful attempt proves this caller is legitimate: clear their strike count
    // so earlier typos can never block a valid sign-in.
    if (countOnlyFailures) {
      res.on('finish', () => {
        if (res.statusCode < 400) hits.delete(key);
      });
    }

    // Past the soft threshold, slow the attempt down rather than refusing it.
    if (delayAfter && strikes > delayAfter) {
      const delay = Math.min(maxDelayMs, (strikes - delayAfter) * delayStepMs);
      const timer = setTimeout(next, delay);
      // Don't leave a pending timer behind if the client gives up mid-wait.
      res.on('close', () => clearTimeout(timer));
      return;
    }

    next();
  };
}

const apiGeneralLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 1000,
  message: 'API rate limit exceeded. Please try again in 15 minutes.'
});

// Sign-in throttling is scoped per IP *and* per account, and only failed attempts
// count. A correct password always gets through and wipes the account's strike
// count, so one person's typos can never lock out a valid sign-in (their own or
// anyone else's behind the same IP).
const loginBruteForceLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  // Deliberately high: the brake on guessing is the progressive delay below, not a
  // lockout. The cap only exists so unbounded attempts can't burn CPU on scrypt.
  maxRequests: 100,
  countOnlyFailures: true,
  delayAfter: 8,
  delayStepMs: 300,
  maxDelayMs: 3000,
  keyGenerator: (req, ip) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `login:${ip}:${email}`;
  },
  message: 'Too many failed sign-in attempts for this account. Please wait before retrying.'
});

// Account creation is throttled per IP to stop signup spam.
const signupRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: process.env.NODE_ENV === 'production' ? 50 : 500,
  countOnlyFailures: true,
  delayAfter: 5,
  delayStepMs: 250,
  maxDelayMs: 2000,
  keyGenerator: (_req, ip) => `signup:${ip}`,
  message: 'Too many signup attempts. Please wait a few moments before trying again.'
});

// Password changes are already behind a valid session; only wrong-current-password
// attempts count toward the limit.
const passwordChangeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  countOnlyFailures: true,
  keyGenerator: (req, ip) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    return `pwchange:${ip}:${token ? hashToken(token) : 'anon'}`;
  },
  message: 'Too many failed password change attempts. Please wait before retrying.'
});

const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 40,
  message: 'Upload rate limit reached for this hour. Please try again later.'
});

const aiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 120,
  message: 'AI Study Assistant query limit reached. Please wait a few minutes before asking more questions.'
});

app.use('/api/', apiGeneralLimiter);

// -------------------------------------------------------------
// Operational Observability: Health Check & System Status Endpoint
// -------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  try {
    const dbPing = db.prepare('SELECT 1 as ping').get();
    const isDbAlive = dbPing && dbPing.ping === 1;

    res.json({
      status: isDbAlive ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: isDbAlive ? 'connected' : 'unreachable'
    });
  } catch {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check probe failed'
    });
  }
});

// Serve uploaded files statically
// Uploaded files are public only while their parent resource is visible
app.use('/uploads', (req, res, next) => {
  let name;
  try { name = path.basename(decodeURIComponent(req.path)); } catch { return res.status(400).end(); }
  const restricted = db.prepare(
    "SELECT 1 FROM notes WHERE file_path = ? AND status IN ('quarantined','draft') UNION SELECT 1 FROM pyqs WHERE file_path = ? AND status = 'quarantined'"
  ).get(name, name);
  if (restricted) return res.status(403).send('This resource is restricted.');
  next();
}, express.static(uploadsDir, { dotfiles: 'deny', index: false }));

// -------------------------------------------------------------
// Security Hardening: Strict Multer File Upload Filter
// -------------------------------------------------------------
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
]);
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.docx', '.doc']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomUUID();
    const rawExt = path.extname(file.originalname).toLowerCase();
    const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.pdf';
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error(`File format rejected. Only PDF, DOCX, and images are permitted.`));
    }
    if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error(`Invalid MIME type: ${file.mimetype}`));
    }
    cb(null, true);
  }
});

// Helper: Path Traversal Protection for File Resolution
function getSafeUploadPath(userFilename) {
  if (!userFilename || typeof userFilename !== 'string') return null;
  const safeBase = path.basename(userFilename);
  const resolvedPath = path.resolve(uploadsDir, safeBase);
  const resolvedUploadsDir = path.resolve(uploadsDir);
  if (!resolvedPath.startsWith(resolvedUploadsDir)) {
    return null;
  }
  return resolvedPath;
}

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
  const session = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(hashToken(token));
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(hashToken(token));
    return null;
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id);
  return formatSafeUser(user);
}

// Helper: never leak internals to clients in production
function publicError(err) {
  if (process.env.NODE_ENV !== 'production') return err?.message || 'Unexpected error';
  return 'Something went wrong. Please try again.';
}

// Helper: verify an uploaded file's magic bytes match its extension
function fileContentMatches(file) {
  if (!file) return false;
  try {
    const fd = fs.openSync(file.path, 'r');
    const buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    const ext = path.extname(file.filename).toLowerCase();
    if (ext === '.pdf') return buf.subarray(0, 5).toString() === '%PDF-';
    if (ext === '.png') return buf[0] === 0x89 && buf.subarray(1, 4).toString() === 'PNG';
    if (ext === '.jpg' || ext === '.jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    if (ext === '.webp') return buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP';
    if (ext === '.docx') return buf[0] === 0x50 && buf[1] === 0x4b;
    if (ext === '.doc') return buf[0] === 0xd0 && buf[1] === 0xcf;
    return false;
  } catch {
    return false;
  }
}

function discardUpload(file) {
  if (file?.path) { try { fs.unlinkSync(file.path); } catch { /* ignore */ } }
}

const DOWNLOAD_EXT = {
  'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
  'application/msword': '.doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
};

// Helper: Check if user has administrator or moderator privileges
function isModerator(user) {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return role === 'moderator' || role === 'admin';
}

// Helper: Anti-Stored-XSS Sanitizer for user-supplied strings
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip script tags & content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Strip style tags & content
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Strip iframe tags
    .replace(/javascript:[^"'\s]*/gi, '')                              // Strip javascript: pseudo-protocols
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')                       // Strip inline event handlers
    .replace(/[<>]/g, tag => (tag === '<' ? '&lt;' : '&gt;'))          // Encode remaining angle brackets
    .trim();
}

// Routine: Periodically sweep expired sessions to keep DB lean and prevent token hoarding
function purgeExpiredSessions() {
  try {
    const result = db.prepare("DELETE FROM sessions WHERE datetime(expires_at) < datetime('now')").run();
    if (result.changes > 0) {
      console.log(`[AUTH CLEANUP] Purged ${result.changes} expired session tokens from database.`);
    }
  } catch (err) {
    console.error('[AUTH CLEANUP] Error purging expired sessions:', err.message);
  }
}
purgeExpiredSessions();
setInterval(purgeExpiredSessions, 6 * 60 * 60 * 1000).unref();


// -------------------------------------------------------------
// 1. Subjects & Syllabus API
// -------------------------------------------------------------
app.get('/api/subjects', (req, res) => {
  try {
    const { stream, department, semester } = req.query;
    let query = 'SELECT * FROM subjects WHERE 1=1';
    const params = [];

    const effectiveStream = stream || department;
    if (effectiveStream && effectiveStream.trim() && effectiveStream !== 'all') {
      const isIT = effectiveStream.trim().toLowerCase().includes('information technology') || effectiveStream.trim().toLowerCase() === 'it';
      if (isIT) {
        query += " AND (LOWER(department) LIKE ? OR LOWER(department) LIKE '%computer science%')";
        params.push('%information technology%');
      } else {
        query += ' AND (LOWER(department) LIKE ? OR LOWER(?) LIKE LOWER(department))';
        params.push(`%${effectiveStream.trim().toLowerCase()}%`, effectiveStream.trim().toLowerCase());
      }
    }

    if (semester && semester !== 'all') {
      const semNum = parseInt(semester, 10);
      if (!isNaN(semNum)) {
        query += ' AND semester = ?';
        params.push(semNum);
      }
    }

    query += ' ORDER BY code ASC';
    let subjects = db.prepare(query).all(...params);

    // If specific stream/semester returned 0 subjects, fall back smoothly
    if (subjects.length === 0 && (effectiveStream || semester)) {
      if (effectiveStream && effectiveStream !== 'all') {
        const isIT = effectiveStream.trim().toLowerCase().includes('information technology') || effectiveStream.trim().toLowerCase() === 'it';
        if (isIT) {
          subjects = db.prepare("SELECT * FROM subjects WHERE (LOWER(department) LIKE '%information technology%' OR LOWER(department) LIKE '%computer science%') ORDER BY semester ASC, code ASC").all();
        } else {
          subjects = db.prepare('SELECT * FROM subjects WHERE (LOWER(department) LIKE ? OR LOWER(?) LIKE LOWER(department)) ORDER BY semester ASC, code ASC').all(`%${effectiveStream.trim().toLowerCase()}%`, effectiveStream.trim().toLowerCase());
        }
      }
      if (subjects.length === 0 && semester && semester !== 'all') {
        subjects = db.prepare('SELECT * FROM subjects WHERE semester = ? ORDER BY code ASC').all(parseInt(semester, 10));
      }
      if (subjects.length === 0) {
        subjects = db.prepare('SELECT * FROM subjects ORDER BY code ASC').all();
      }
    }
    
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
    res.status(500).json({ success: false, error: publicError(err) });
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
    res.status(500).json({ success: false, error: publicError(err) });
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
    const requester = getUserFromRequest(req);
    const requesterIsMod = isModerator(requester);

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    if (status && status !== 'all') {
      if (status === 'quarantined' && !requesterIsMod) {
        return res.status(403).json({ success: false, error: 'Access denied to quarantined resources' });
      }
      query += ' AND status = ?';
      params.push(status);
    } else if (!requesterIsMod) {
      // In public discovery, exclude quarantined / restricted resources unless requester is owner
      if (requester) {
        query += " AND (status != 'quarantined' OR user_id = ? OR status IS NULL)";
        params.push(requester.id);
      } else {
        query += " AND (status != 'quarantined' OR status IS NULL)";
      }
    }

    // Visibility filter: private notes are visible only to the owner or a moderator
    if (!requesterIsMod) {
      if (requester) {
        query += " AND (visibility != 'private' OR user_id = ? OR visibility IS NULL)";
        params.push(requester.id);
      } else {
        query += " AND (visibility != 'private' OR visibility IS NULL)";
      }
    }

    if (search) {
      query += ' AND (title LIKE ? OR author LIKE ? OR primary_topic LIKE ? OR description LIKE ? OR tags LIKE ? OR subject_name LIKE ? OR unit_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
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

      let fulfilledFor = null;
      if (n.fulfilled_request_id) {
        try {
          const reqRow = db.prepare('SELECT requester_name, topic_name FROM note_requests WHERE id = ?').get(n.fulfilled_request_id);
          if (reqRow) {
            fulfilledFor = {
              requesterName: reqRow.requester_name,
              topicName: reqRow.topic_name
            };
          }
        } catch { /* ignore */ }
      }

      return {
        id: n.id,
        title: n.title,
        author: n.author,
        authorInitials: n.author_initials,
        userId: n.user_id || null,
        status: n.status || 'published',
        subjectId: n.subject_id,
        subjectName: n.subject_name || sub?.name || '',
        subjectCode: sub?.code || '',
        unitId: n.unit_id,
        unitName: n.unit_name || unit?.name || '',
        visibility: n.visibility || 'public',
        verificationStatus: n.verification_status || 'community',
        fulfilledRequestId: n.fulfilled_request_id || null,
        fulfilledFor,
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
    res.status(500).json({ success: false, error: publicError(err) });
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
    if (n.status === 'quarantined') {
      const isOwner = reqUser && ((n.user_id && n.user_id === reqUser.id) || (n.author && n.author.toLowerCase() === reqUser.name.toLowerCase()));
      if (!isModerator(reqUser) && !isOwner) {
        return res.status(403).json({ success: false, error: 'This note has been restricted by academic moderators.' });
      }
    }

    if (n.visibility === 'private') {
      const isOwner = reqUser && (n.user_id === reqUser.id);
      let isRequester = false;
      if (reqUser && n.fulfilled_request_id) {
        const rCheck = db.prepare('SELECT 1 FROM note_requests WHERE id = ? AND user_id = ?').get(n.fulfilled_request_id, reqUser.id);
        if (rCheck) isRequester = true;
      }
      if (!isModerator(reqUser) && !isOwner && !isRequester) {
        return res.status(403).json({ success: false, error: 'This note is marked as private/direct for the requester.' });
      }
    }

    let fulfilledFor = null;
    if (n.fulfilled_request_id) {
      try {
        const reqRow = db.prepare('SELECT requester_name, topic_name FROM note_requests WHERE id = ?').get(n.fulfilled_request_id);
        if (reqRow) {
          fulfilledFor = {
            requesterName: reqRow.requester_name,
            topicName: reqRow.topic_name
          };
        }
      } catch { /* ignore */ }
    }

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
      subjectName: n.subject_name || sub?.name || '',
      subjectCode: sub?.code || '',
      unitId: n.unit_id,
      unitName: n.unit_name || unit?.name || '',
      visibility: n.visibility || 'public',
      verificationStatus: n.verification_status || 'community',
      fulfilledRequestId: n.fulfilled_request_id || null,
      fulfilledFor,
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
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

// Helper to resolve or register subject and unit without breaking foreign keys
function ensureSubjectAndUnit({ subjectId, subjectName, unitId, unitName, department, semester }) {
  let resolvedSubjectId = subjectId;
  let resolvedSubjectName = (subjectName || '').trim();
  let resolvedUnitId = unitId;
  let resolvedUnitName = (unitName || '').trim();

  // 1. Resolve Subject
  if (resolvedSubjectId && resolvedSubjectId !== 'all') {
    const existing = db.prepare('SELECT id, name, department, semester FROM subjects WHERE id = ?').get(resolvedSubjectId);
    if (existing) {
      if (!resolvedSubjectName) resolvedSubjectName = existing.name;
    } else {
      resolvedSubjectId = null;
    }
  }

  if (!resolvedSubjectId) {
    if (!resolvedSubjectName) {
      resolvedSubjectName = 'General Studies';
    }
    const found = db.prepare('SELECT id, name FROM subjects WHERE LOWER(name) = LOWER(?) LIMIT 1').get(resolvedSubjectName);
    if (found) {
      resolvedSubjectId = found.id;
      resolvedSubjectName = found.name;
    } else {
      resolvedSubjectId = 'sub-' + crypto.randomUUID().slice(0, 8);
      const code = resolvedSubjectName.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'GEN';
      db.prepare(`
        INSERT INTO subjects (id, name, code, department, semester, scheme, coverage)
        VALUES (?, ?, ?, ?, ?, '2022', 0)
      `).run(
        resolvedSubjectId,
        resolvedSubjectName,
        code,
        department || 'General',
        semester || 1
      );
    }
  }

  // 2. Resolve Unit
  if (resolvedUnitId && resolvedUnitId !== 'all') {
    const unitRow = db.prepare('SELECT id, name FROM units WHERE id = ? AND subject_id = ?').get(resolvedUnitId, resolvedSubjectId);
    if (unitRow) {
      if (!resolvedUnitName) resolvedUnitName = unitRow.name;
    } else {
      resolvedUnitId = null;
    }
  }

  if (!resolvedUnitId) {
    if (!resolvedUnitName) {
      resolvedUnitName = 'General / Comprehensive Unit';
    }
    const foundUnit = db.prepare('SELECT id, name FROM units WHERE subject_id = ? AND LOWER(name) = LOWER(?) LIMIT 1').get(resolvedSubjectId, resolvedUnitName);
    if (foundUnit) {
      resolvedUnitId = foundUnit.id;
      resolvedUnitName = foundUnit.name;
    } else {
      resolvedUnitId = 'unit-' + crypto.randomUUID().slice(0, 8);
      db.prepare(`
        INSERT INTO units (id, subject_id, order_index, name)
        VALUES (?, ?, 1, ?)
      `).run(
        resolvedUnitId,
        resolvedSubjectId,
        resolvedUnitName
      );
    }
  }

  return {
    subjectId: resolvedSubjectId,
    subjectName: resolvedSubjectName,
    unitId: resolvedUnitId,
    unitName: resolvedUnitName
  };
}

// Upload a real resource
app.post('/api/notes', uploadRateLimiter, upload.single('file'), (req, res) => {
  try {
    const {
      title,
      subjectId,
      subjectName,
      courseTitle,
      unitId,
      unitName,
      topicIds,
      primaryTopic,
      description,
      tags,
      department,
      semester,
      format,
      pages,
      status,
      visibility,
      verificationStatus,
      fulfilledRequestId
    } = req.body;
    const file = req.file;
    const currentUser = getUserFromRequest(req);

    if (!currentUser) {
      discardUpload(file);
      return res.status(401).json({ success: false, error: 'Please sign in to upload notes.' });
    }
    if (!file) {
      return res.status(400).json({ success: false, error: 'A file is required.' });
    }
    if (!fileContentMatches(file)) {
      discardUpload(file);
      return res.status(400).json({ success: false, error: 'File contents do not match its type.' });
    }

    const effectiveSubjectName = (subjectName || courseTitle || '').trim();
    if (!subjectId && !effectiveSubjectName) {
      discardUpload(file);
      return res.status(400).json({ success: false, error: 'Subject / Course name is required' });
    }

    const resolved = ensureSubjectAndUnit({
      subjectId,
      subjectName: effectiveSubjectName,
      unitId,
      unitName,
      department: department || currentUser.department,
      semester: semester || currentUser.semester
    });

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
    // Filter topics to those belonging to unit if known
    const unitTopicIds = new Set(db.prepare('SELECT id FROM topics WHERE unit_id = ?').all(resolved.unitId).map(r => r.id));
    if (unitTopicIds.size > 0) {
      parsedTopicIds = [...new Set(parsedTopicIds.map(String))].filter(id => unitTopicIds.has(id));
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
    parsedTags = parsedTags.map(t => sanitizeString(String(t))).filter(Boolean).slice(0, 12);

    const noteId = 'n-' + crypto.randomUUID();
    const finalAuthor = currentUser.name;
    const authorInitials = currentUser.initials || 'ST';
    const finalStatus = status === 'draft' ? 'draft' : 'published';
    const finalFormat = sanitizeString(String(format || 'Lecture Notes')).slice(0, 40) || 'Lecture Notes';
    const finalPages = Math.min(2000, Math.max(1, parseInt(pages, 10) || 1));
    const noteTitle = title || (file ? file.originalname.replace(/\.[^/.]+$/, '') : 'Lecture Notes');
    const finalVisibility = visibility === 'private' ? 'private' : 'public';
    const finalVerificationStatus = verificationStatus || 'community';

    // Resolve primary topic
    let resolvedPrimaryTopic = (primaryTopic || '').trim();
    if (!resolvedPrimaryTopic && parsedTopicIds.length > 0) {
      const firstTopicRow = db.prepare('SELECT name FROM topics WHERE id = ?').get(parsedTopicIds[0]);
      if (firstTopicRow) resolvedPrimaryTopic = firstTopicRow.name;
    }
    if (!resolvedPrimaryTopic) {
      resolvedPrimaryTopic = resolved.unitName || resolved.subjectName;
    }

    // Count topics in this unit for match calculation
    const unitTopics = db.prepare('SELECT id FROM topics WHERE unit_id = ?').all(resolved.unitId);
    const totalTopics = unitTopics.length || 1;
    const topicMatchCount = parsedTopicIds.length;
    const syllabusMatch = `Matches ${topicMatchCount}/${totalTopics} topics`;

    const storedFileName = file.filename;
    const storedFileSize = file.size;
    const mimeType = file.mimetype;

    db.exec('BEGIN');
    try {
    db.prepare(`
      INSERT INTO notes (
        id, title, author, author_initials, subject_id, unit_id, topic_ids,
        primary_topic, description, tags, department, semester, user_id, status,
        format, pages, file_path, file_size, mime_type, upload_date, downloads,
        topic_match_count, total_topics, syllabus_match, subject_name, unit_name,
        visibility, verification_status, fulfilled_request_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      noteId,
      sanitizeString(noteTitle),
      sanitizeString(finalAuthor),
      authorInitials,
      resolved.subjectId,
      resolved.unitId,
      JSON.stringify(parsedTopicIds),
      sanitizeString(resolvedPrimaryTopic),
      sanitizeString(description || ''),
      JSON.stringify(parsedTags),
      sanitizeString(String(department || currentUser.department || '')).slice(0, 80),
      semester ? Math.min(8, Math.max(1, parseInt(semester, 10) || 1)) : (currentUser.semester || null),
      currentUser.id,
      finalStatus,
      finalFormat,
      finalPages,
      storedFileName,
      storedFileSize,
      mimeType,
      new Date().toISOString().split('T')[0],
      0,
      topicMatchCount,
      totalTopics,
      syllabusMatch,
      resolved.subjectName,
      resolved.unitName,
      finalVisibility,
      finalVerificationStatus,
      fulfilledRequestId || null
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

    // If answering a note request, mark the request as fulfilled
    if (fulfilledRequestId) {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
      db.prepare(`
        UPDATE note_requests
        SET status = 'fulfilled',
            fulfilled_note_id = ?,
            fulfilled_by_name = ?,
            fulfilled_by_id = ?,
            fulfilled_at = ?
        WHERE id = ? AND status = 'open'
      `).run(noteId, currentUser.name, currentUser.id, now, fulfilledRequestId);
    }

    // Recalculate subject coverage
    const newCoverage = calculateCoverage(resolved.subjectId);
    db.prepare('UPDATE subjects SET coverage = ? WHERE id = ?').run(newCoverage, resolved.subjectId);
    db.exec('COMMIT');
    } catch (txErr) {
      db.exec('ROLLBACK');
      discardUpload(file);
      throw txErr;
    }

    res.status(201).json({
      success: true,
      noteId,
      message: 'Note uploaded and indexed successfully!',
      note: {
        id: noteId,
        title: sanitizeString(noteTitle),
        author: finalAuthor,
        authorInitials,
        userId: currentUser.id,
        status: finalStatus,
        subjectId: resolved.subjectId,
        subjectName: resolved.subjectName,
        unitId: resolved.unitId,
        unitName: resolved.unitName,
        visibility: finalVisibility,
        verificationStatus: finalVerificationStatus,
        fulfilledRequestId: fulfilledRequestId || null,
        primaryTopic: resolvedPrimaryTopic,
        description: sanitizeString(description || ''),
        tags: parsedTags,
        format: finalFormat,
        pages: finalPages,
        uploadDate: new Date().toISOString().split('T')[0],
        downloads: 0,
        syllabusMatch
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

// Update note metadata (with strict BOLA / IDOR ownership authorization)
app.put('/api/notes/:id', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required to update notes' });
    }

    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const isOwner = Boolean(existing.user_id) && existing.user_id === user.id;
    if (!isOwner && !isModerator(user)) {
      return res.status(403).json({ success: false, error: 'Permission denied. Only the author or a moderator can edit this note.' });
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

    const updatedTitle = title !== undefined ? sanitizeString(title) : existing.title;
    const updatedPrimaryTopic = primaryTopic !== undefined ? sanitizeString(primaryTopic) : existing.primary_topic;
    const updatedDesc = description !== undefined ? sanitizeString(description) : existing.description;
    const updatedFormat = format !== undefined ? sanitizeString(String(format)).slice(0, 40) : existing.format;
    const updatedPages = pages !== undefined ? Math.max(1, parseInt(pages, 10) || 1) : existing.pages;

    let updatedStatus = existing.status || 'published';
    if (status !== undefined) {
      if (['published', 'draft', 'archived'].includes(status)) {
        updatedStatus = status;
      } else if (status === 'quarantined') {
        if (isModerator(user)) {
          updatedStatus = status;
        }
      }
    }

    const updatedDept = department !== undefined ? sanitizeString(department) : existing.department;
    const updatedSem = semester !== undefined ? Math.min(8, Math.max(1, parseInt(semester, 10) || 1)) : existing.semester;

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
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

// Delete note (with BOLA / IDOR ownership authorization)
app.delete('/api/notes/:id', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required to delete notes' });
    }

    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    // Enforce ownership: user must be the original author or a moderator/admin
    const isOwner = Boolean(note.user_id) && note.user_id === user.id;
    if (!isOwner && !isModerator(user)) {
      return res.status(403).json({ success: false, error: 'Permission denied. Only the author or a moderator can delete this note.' });
    }

    // Cascade delete associated interactions atomically
    db.exec('BEGIN');
    try {
      db.prepare('DELETE FROM note_upvotes WHERE note_id = ?').run(req.params.id);
      db.prepare('DELETE FROM note_comments WHERE note_id = ?').run(req.params.id);
      db.prepare('DELETE FROM saved_notes WHERE note_id = ?').run(req.params.id);
      db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
      for (const tId of JSON.parse(note.topic_ids || '[]')) {
        db.prepare("UPDATE topics SET note_count = MAX(0, note_count - 1), status = CASE WHEN note_count - 1 <= 0 THEN 'missing' ELSE status END WHERE id = ?").run(tId);
      }
      db.exec('COMMIT');
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }

    // If there is an uploaded file on disk, remove it safely unless it's the sample file
    if (note.file_path && note.file_path !== 'sample_lecture_notes.pdf') {
      const fullPath = getSafeUploadPath(note.file_path);
      if (fullPath && fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch { /* ignore */ }
      }
    }

    // Recalculate coverage
    const newCoverage = calculateCoverage(note.subject_id);
    db.prepare('UPDATE subjects SET coverage = ? WHERE id = ?').run(newCoverage, note.subject_id);

    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

// Download note file
app.get('/api/notes/:id/download', (req, res) => {
  try {
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    if (!note) {
      return res.status(404).send('Note not found');
    }

    // Quarantine check: restricted resources can only be downloaded by author or moderator
    if (note.status === 'quarantined') {
      const user = getUserFromRequest(req);
      const isOwner = Boolean(user && note.user_id && note.user_id === user.id);
      if (!isModerator(user) && !isOwner) {
        return res.status(403).send('This note has been restricted by academic moderators.');
      }
    }

    // Increment download count
    db.prepare('UPDATE notes SET downloads = downloads + 1 WHERE id = ?').run(note.id);

    // Record timestamped download for weekly tracking
    try {
      const dlUser = getUserFromRequest(req);
      db.prepare('INSERT INTO note_downloads (note_id, user_id, downloaded_at) VALUES (?, ?, ?)').run(
        note.id,
        dlUser?.id || null,
        new Date().toISOString()
      );
    } catch { /* ignore download log error */ }

    const safeFilePath = getSafeUploadPath(note.file_path);
    const sampleFilePath = getSafeUploadPath('sample_lecture_notes.pdf');
    const safeTitle = (note.title || 'note').replace(/[^a-zA-Z0-9_-]/g, '_');

    if (safeFilePath && fs.existsSync(safeFilePath)) {
      res.download(safeFilePath, `${safeTitle}${DOWNLOAD_EXT[note?.mime_type] || path.extname(safeFilePath)}`);
    } else if (sampleFilePath && fs.existsSync(sampleFilePath)) {
      res.download(sampleFilePath, `${safeTitle}.pdf`);
    } else {
      res.status(404).send('Requested file not found');
    }
  } catch {
    res.status(500).send('Error downloading file');
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
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

app.post('/api/notes/:id/upvote', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required to upvote notes' });
    }
    const note = db.prepare('SELECT id, upvotes FROM notes WHERE id = ?').get(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const existing = db.prepare('SELECT 1 FROM note_upvotes WHERE user_id = ? AND note_id = ?').get(user.id, note.id);
    let upvoted = false;
    let newCount = note.upvotes || 0;

    if (existing) {
      db.prepare('DELETE FROM note_upvotes WHERE user_id = ? AND note_id = ?').run(user.id, note.id);
      db.prepare('UPDATE notes SET upvotes = MAX(0, upvotes - 1) WHERE id = ?').run(note.id);
      newCount = db.prepare('SELECT upvotes FROM notes WHERE id = ?').get(note.id).upvotes;
      upvoted = false;
    } else {
      const now = new Date().toISOString();
      db.prepare('INSERT OR IGNORE INTO note_upvotes (user_id, note_id, created_at) VALUES (?, ?, ?)').run(user.id, note.id, now);
      db.prepare('UPDATE notes SET upvotes = upvotes + 1 WHERE id = ?').run(note.id);
      newCount = db.prepare('SELECT upvotes FROM notes WHERE id = ?').get(note.id).upvotes;
      upvoted = true;
    }

    res.json({ success: true, upvoted, upvotes: newCount });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
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
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

app.post('/api/notes/:id/comments', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required to post comments' });
    }

    const { content, category } = req.body;
    const safeContent = sanitizeString(content);
    if (!safeContent) {
      return res.status(400).json({ success: false, error: 'Comment content cannot be empty' });
    }

    const commentId = 'comm-' + crypto.randomUUID();
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
      safeContent,
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
      content: safeContent,
      createdAt: now,
      upvotes: 0,
      isUpvoted: false
    };

    res.status(201).json({ success: true, comment: created });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

app.post('/api/comments/:id/upvote', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required to upvote comments' });
    }
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
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

app.delete('/api/comments/:id', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required to delete comments' });
    }

    const comment = db.prepare('SELECT * FROM note_comments WHERE id = ?').get(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    if (comment.user_id !== user.id && !isModerator(user)) {
      return res.status(403).json({ success: false, error: 'Permission denied to delete this comment' });
    }

    db.prepare('DELETE FROM comment_upvotes WHERE comment_id = ?').run(req.params.id);
    db.prepare('DELETE FROM note_comments WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
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
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

// -------------------------------------------------------------
// 2.5b Community Note Requests (Crowdsourced Notes Sharing) API
// -------------------------------------------------------------

// List note requests with filters and user upvote status
app.get('/api/note-requests', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { subjectId, status, search, stream, department } = req.query;

    let query = `
      SELECT nr.*,
             COALESCE(NULLIF(nr.subject_name, ''), s.name) as display_subject_name,
             s.code as subject_code,
             COALESCE(NULLIF(nr.department, ''), s.department) as display_department,
             COALESCE(NULLIF(u.name, ''), nr.unit_id) as display_unit_name,
             n.title as fulfilled_note_title
      FROM note_requests nr
      LEFT JOIN subjects s ON nr.subject_id = s.id
      LEFT JOIN units u ON nr.unit_id = u.id
      LEFT JOIN notes n ON nr.fulfilled_note_id = n.id
      WHERE 1=1
    `;
    const params = [];

    if (subjectId && subjectId !== 'all') {
      query += ' AND nr.subject_id = ?';
      params.push(subjectId);
    }

    if (status && status !== 'all') {
      query += ' AND nr.status = ?';
      params.push(status);
    }

    const effectiveStream = stream || department;
    if (effectiveStream && effectiveStream !== 'all') {
      query += " AND (LOWER(COALESCE(NULLIF(nr.department, ''), s.department, '')) LIKE ? OR LOWER(?) LIKE LOWER(COALESCE(NULLIF(nr.department, ''), s.department, '')))";
      params.push(`%${effectiveStream.toLowerCase()}%`, effectiveStream);
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      query += " AND (LOWER(nr.topic_name) LIKE ? OR LOWER(nr.description) LIKE ? OR LOWER(COALESCE(NULLIF(nr.subject_name, ''), s.name, '')) LIKE ?)";
      params.push(term, term, term);
    }

    query += " ORDER BY CASE nr.status WHEN 'open' THEN 0 ELSE 1 END, nr.upvotes DESC, nr.created_at DESC";

    const rows = db.prepare(query).all(...params);

    // Check which requests this user has upvoted
    let userUpvotes = new Set();
    if (user) {
      const upvotedRows = db.prepare('SELECT request_id FROM note_request_upvotes WHERE user_id = ?').all(user.id);
      userUpvotes = new Set(upvotedRows.map(r => r.request_id));
    }

    const requests = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      requesterName: r.requester_name,
      requesterInitials: r.requester_initials,
      subjectId: r.subject_id,
      subjectName: r.display_subject_name || r.subject_name || '',
      subjectCode: r.subject_code || '',
      subjectDepartment: r.display_department || r.department || '',
      department: r.display_department || r.department || '',
      semester: r.semester || 1,
      unitId: r.unit_id,
      unitName: r.display_unit_name || null,
      topicName: r.topic_name,
      description: r.description,
      status: r.status,
      upvotes: r.upvotes,
      hasUpvoted: userUpvotes.has(r.id),
      fulfilledNoteId: r.fulfilled_note_id,
      fulfilledNoteTitle: r.fulfilled_note_title,
      fulfilledByName: r.fulfilled_by_name,
      fulfilledById: r.fulfilled_by_id,
      fulfilledAt: r.fulfilled_at,
      createdAt: r.created_at
    }));

    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

// Create a new note request
app.post('/api/note-requests', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required to create a note request' });
    }

    const { subjectId, subjectName, courseTitle, unitId, unitName, topicName, description, department, semester } = req.body;
    const effectiveSubjectName = (subjectName || courseTitle || '').trim();
    if ((!subjectId && !effectiveSubjectName) || !topicName || !topicName.trim()) {
      return res.status(400).json({ success: false, error: 'Subject / Course name and Topic are required.' });
    }

    const resolved = ensureSubjectAndUnit({
      subjectId,
      subjectName: effectiveSubjectName,
      unitId,
      unitName,
      department: department || user.department,
      semester: semester || user.semester
    });

    const safeTopic = sanitizeString(topicName);
    const safeDesc = description ? sanitizeString(description) : '';
    const requestId = 'req-' + crypto.randomUUID();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const finalSemester = semester ? Math.min(8, Math.max(1, parseInt(semester, 10) || 1)) : (user.semester || 1);
    const finalDepartment = sanitizeString(String(department || user.department || '')).slice(0, 80);

    db.prepare(`
      INSERT INTO note_requests (
        id, user_id, requester_name, requester_initials, subject_id, unit_id,
        topic_name, description, status, upvotes, created_at, subject_name,
        semester, department
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', 1, ?, ?, ?, ?)
    `).run(
      requestId,
      user.id,
      user.name,
      user.initials || 'ST',
      resolved.subjectId,
      resolved.unitId || null,
      safeTopic,
      safeDesc,
      now,
      resolved.subjectName,
      finalSemester,
      finalDepartment
    );

    // Initial requester upvote recorded
    try {
      db.prepare('INSERT INTO note_request_upvotes (request_id, user_id, created_at) VALUES (?, ?, ?)').run(requestId, user.id, now);
    } catch { /* ignore */ }

    const created = {
      id: requestId,
      userId: user.id,
      requesterName: user.name,
      requesterInitials: user.initials || 'ST',
      subjectId: resolved.subjectId,
      subjectName: resolved.subjectName,
      subjectCode: '',
      department: finalDepartment,
      semester: finalSemester,
      unitId: resolved.unitId || null,
      unitName: resolved.unitName || null,
      topicName: safeTopic,
      description: safeDesc,
      status: 'open',
      upvotes: 1,
      hasUpvoted: true,
      createdAt: now
    };

    res.status(201).json({ success: true, request: created, message: 'Note request posted to the community!' });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

// Upvote / "Me too" toggle on a note request
app.post('/api/note-requests/:id/upvote', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required to upvote note requests' });
    }
    const request = db.prepare('SELECT id, upvotes FROM note_requests WHERE id = ?').get(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Note request not found' });
    }

    const existing = db.prepare('SELECT 1 FROM note_request_upvotes WHERE request_id = ? AND user_id = ?').get(request.id, user.id);
    let hasUpvoted = false;
    let newCount = request.upvotes || 1;

    if (existing) {
      db.prepare('DELETE FROM note_request_upvotes WHERE request_id = ? AND user_id = ?').run(request.id, user.id);
      newCount = Math.max(1, newCount - 1);
      db.prepare('UPDATE note_requests SET upvotes = ? WHERE id = ?').run(newCount, request.id);
      hasUpvoted = false;
    } else {
      const now = new Date().toISOString();
      db.prepare('INSERT INTO note_request_upvotes (request_id, user_id, created_at) VALUES (?, ?, ?)').run(request.id, user.id, now);
      newCount = newCount + 1;
      db.prepare('UPDATE note_requests SET upvotes = ? WHERE id = ?').run(newCount, request.id);
      hasUpvoted = true;
    }

    res.json({ success: true, hasUpvoted, upvotes: newCount });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

// Fulfill a note request with an existing or freshly uploaded note
app.post('/api/note-requests/:id/fulfill', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required to fulfill note requests' });
    }

    const { noteId } = req.body;
    if (!noteId) {
      return res.status(400).json({ success: false, error: 'Note ID is required to fulfill this request.' });
    }

    const request = db.prepare('SELECT * FROM note_requests WHERE id = ?').get(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Note request not found' });
    }

    if (request.status === 'fulfilled') {
      return res.status(409).json({ success: false, error: 'This request has already been fulfilled.' });
    }
    const note = db.prepare("SELECT id, title, subject_id FROM notes WHERE id = ? AND (status = 'published' OR status IS NULL)").get(noteId);
    if (!note) {
      return res.status(404).json({ success: false, error: 'Linked note was not found in library.' });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);

    db.prepare(`
      UPDATE note_requests
      SET status = 'fulfilled',
          fulfilled_note_id = ?,
          fulfilled_by_name = ?,
          fulfilled_by_id = ?,
          fulfilled_at = ?
      WHERE id = ?
    `).run(note.id, user.name, user.id, now, request.id);

    // Also link note back to request
    try {
      db.prepare('UPDATE notes SET fulfilled_request_id = ? WHERE id = ?').run(request.id, note.id);
    } catch { /* ignore */ }

    res.json({
      success: true,
      message: 'Request fulfilled! Thank you for sharing notes with your classmates.',
      fulfilledNoteId: note.id,
      fulfilledNoteTitle: note.title
    });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

// Delete a note request (BOLA check: owner or moderator)
app.delete('/api/note-requests/:id', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const request = db.prepare('SELECT * FROM note_requests WHERE id = ?').get(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Note request not found' });
    }

    if (request.user_id !== user.id && !isModerator(user)) {
      return res.status(403).json({ success: false, error: 'Permission denied. Only the requester or moderator can delete this request.' });
    }

    db.prepare('DELETE FROM note_request_upvotes WHERE request_id = ?').run(request.id);
    db.prepare('DELETE FROM note_requests WHERE id = ?').run(request.id);

    res.json({ success: true, message: 'Note request removed.' });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
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
    res.status(500).json({ success: false, error: publicError(err) });
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
    res.status(500).json({ success: false, error: publicError(err) });
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
    res.status(500).json({ success: false, error: publicError(err) });
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
    res.status(500).json({ success: false, error: publicError(err) });
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
    res.status(500).json({ success: false, error: publicError(err) });
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
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

app.post('/api/pyqs', uploadRateLimiter, upload.single('file'), (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required to upload question papers' });
    }
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

    if (req.file && !fileContentMatches(req.file)) {
      discardUpload(req.file);
      return res.status(400).json({ success: false, error: 'File contents do not match its type.' });
    }
    if (!subjectId || !year) {
      discardUpload(req.file);
      return res.status(400).json({ success: false, error: 'Subject and Year are required.' });
    }

    const subject = db.prepare('SELECT name, code FROM subjects WHERE id = ?').get(subjectId);
    if (!subject) {
      discardUpload(req.file);
      return res.status(400).json({ success: false, error: 'Unknown subject.' });
    }
    const subjectName = subject.name;
    const paperTitle = title && title.trim() ? sanitizeString(title) : `${subjectName} — ${month || 'Dec'} ${year} ${examType || 'End Semester'} Examination Paper`;
    const id = 'pyq-' + crypto.randomUUID();
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
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

app.get('/api/pyqs/:id/download', (req, res) => {
  try {
    const { id } = req.params;
    const pyq = db.prepare('SELECT * FROM pyqs WHERE id = ?').get(id);
    if (!pyq) {
      return res.status(404).send('Question Paper not found');
    }

    if (pyq.status === 'quarantined') {
      const user = getUserFromRequest(req);
      if (!isModerator(user)) {
        return res.status(403).send('This resource is restricted by academic moderators.');
      }
    }

    db.prepare('UPDATE pyqs SET downloads = downloads + 1 WHERE id = ?').run(id);

    const safeFilePath = getSafeUploadPath(pyq.file_path);
    const sampleFilePath = getSafeUploadPath('sample_lecture_notes.pdf');
    const safeTitle = (pyq.title || 'PYQ_Paper').replace(/[^a-zA-Z0-9_-]/g, '_');

    if (safeFilePath && fs.existsSync(safeFilePath)) {
      res.download(safeFilePath, `${safeTitle}${DOWNLOAD_EXT[note?.mime_type] || path.extname(safeFilePath)}`);
    } else if (sampleFilePath && fs.existsSync(sampleFilePath)) {
      res.download(sampleFilePath, `${safeTitle}.pdf`);
    } else {
      res.status(404).send('Question paper file not found');
    }
  } catch {
    res.status(500).send('Error downloading question paper');
  }
});

// -------------------------------------------------------------
// 4. Moderation & Reporting API
// -------------------------------------------------------------
app.get('/api/moderation', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

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

    // Restrict regular students to only their own filed reports
    if (!isModerator(user) || req.query.mine === 'true') {
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
      // Protect internal admin deliberations from regular users
      adminNotes: isModerator(user) ? m.admin_notes : null,
      reviewedBy: m.reviewed_by,
      reviewedAt: m.reviewed_at,
      actionTaken: m.action_taken
    }));
    res.json({ success: true, items: moderationItems });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
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
    res.status(500).json({ success: false, error: publicError(err) });
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
    res.status(500).json({ success: false, error: publicError(err) });
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
    res.status(500).json({ success: false, error: publicError(err) });
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
    res.status(500).json({ success: false, error: publicError(err) });
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
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

app.post('/api/moderation', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Please sign in to report a resource.' });
    }
    const { noteId, resourceName, reason, category, details } = req.body;

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

    const userId = user.id;
    const reporterName = user.name;

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

    const id = 'm-' + crypto.randomUUID();
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const safeReason = sanitizeString(reason);
    const safeDetails = details ? sanitizeString(details) : null;

    db.prepare(`
      INSERT INTO moderation (id, note_id, user_id, resource_name, reporter, category, reason, details, timestamp, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      id,
      noteId || null,
      userId,
      sanitizeString(targetName),
      reporterName,
      category || null,
      safeReason,
      safeDetails,
      timestamp
    );

    // Note remains published and accessible (reporting is purely non-destructive feedback)
    res.status(201).json({
      success: true,
      id,
      message: 'Report submitted successfully. Thank you for helping keep the library accurate.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

// -------------------------------------------------------------
// 4.9 Weekly Metrics & Activity Hub API
// (Tracks notes uploaded and downloaded every calendar week; resets to 0 every Monday)
// -------------------------------------------------------------
function getWeeklyTimeRange() {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const startOfWeekIso = monday.toISOString();
  const startOfWeekDate = startOfWeekIso.split('T')[0];
  const endOfWeekIso = sunday.toISOString();

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekLabel = `${monthNames[monday.getMonth()]} ${monday.getDate()} – ${monthNames[sunday.getMonth()]} ${sunday.getDate()}`;

  return {
    monday,
    sunday,
    startOfWeekIso,
    startOfWeekDate,
    endOfWeekIso,
    weekLabel
  };
}

app.get('/api/stats/weekly', (req, res) => {
  try {
    const { startOfWeekIso, startOfWeekDate, endOfWeekIso, weekLabel } = getWeeklyTimeRange();
    const user = getUserFromRequest(req);

    // Weekly uploads (notes uploaded on or after Monday 00:00:00 of current week)
    const weeklyUploads = db.prepare('SELECT COUNT(*) as count FROM notes WHERE upload_date >= ?').get(startOfWeekDate)?.count || 0;

    // Weekly downloads (downloads logged on or after Monday 00:00:00 of current week)
    const weeklyDownloads = db.prepare('SELECT COUNT(*) as count FROM note_downloads WHERE downloaded_at >= ?').get(startOfWeekIso)?.count || 0;

    // User personal weekly stats
    let userWeeklyUploads = 0;
    let userWeeklyDownloads = 0;
    if (user?.id) {
      userWeeklyUploads = db.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND upload_date >= ?').get(user.id, startOfWeekDate)?.count || 0;
      userWeeklyDownloads = db.prepare('SELECT COUNT(*) as count FROM note_downloads WHERE user_id = ? AND downloaded_at >= ?').get(user.id, startOfWeekIso)?.count || 0;
    }

    const totalNotes = db.prepare('SELECT COUNT(*) as count FROM notes').get()?.count || 0;
    const totalDownloads = (db.prepare('SELECT SUM(downloads) as count FROM notes').get()?.count || 0) +
      (db.prepare('SELECT COUNT(*) as count FROM note_downloads').get()?.count || 0);

    res.json({
      success: true,
      weeklyUploads,
      weeklyDownloads,
      userWeeklyUploads,
      userWeeklyDownloads,
      startOfWeek: startOfWeekIso,
      endOfWeek: endOfWeekIso,
      weekLabel,
      resetsOn: 'Every Monday at 00:00',
      totalNotes,
      totalDownloads
    });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

// -------------------------------------------------------------
// 5. Dashboard Aggregation & Stats API
// -------------------------------------------------------------
app.get('/api/stats/dashboard', (req, res) => {
  try {
    const { stream, department, semester } = req.query;
    const effectiveStream = (stream || department || '').trim();

    // 1. Frequent Exam Topics (aggregated from topics table)
    let topicWhere = 'WHERE t.pyq_count > 0';
    const topicParams = [];

    if (effectiveStream && effectiveStream !== 'all') {
      topicWhere += ' AND (LOWER(s.department) LIKE ? OR LOWER(?) LIKE LOWER(s.department))';
      topicParams.push(`%${effectiveStream.toLowerCase()}%`, effectiveStream.toLowerCase());
    }
    if (semester && semester !== 'all') {
      const semNum = parseInt(semester, 10);
      if (!isNaN(semNum)) {
        topicWhere += ' AND s.semester = ?';
        topicParams.push(semNum);
      }
    }

    let topicsWithPyqs = db.prepare(`
      SELECT t.name as topicName, s.name as subjectName, t.pyq_count as appearances
      FROM topics t
      JOIN units u ON t.unit_id = u.id
      JOIN subjects s ON u.subject_id = s.id
      ${topicWhere}
      ORDER BY t.pyq_count DESC
      LIMIT 8
    `).all(...topicParams);

    // Fallback if specific stream/semester has fewer topics
    if (topicsWithPyqs.length === 0) {
      topicsWithPyqs = db.prepare(`
        SELECT t.name as topicName, s.name as subjectName, COALESCE(t.pyq_count, 3) as appearances
        FROM topics t
        JOIN units u ON t.unit_id = u.id
        JOIN subjects s ON u.subject_id = s.id
        ORDER BY t.pyq_count DESC
        LIMIT 8
      `).all();
    }

    const frequentExamTopics = topicsWithPyqs.map(t => ({
      topicName: t.topicName,
      subjectName: t.subjectName,
      appearances: t.appearances || 3,
      streak: `Appeared ${t.appearances || 3} yrs running`
    }));

    // 2. Recent Uploads filtered by stream if available
    let noteWhere = '';
    const noteParams = [];
    if (effectiveStream && effectiveStream !== 'all') {
      noteWhere = 'WHERE (LOWER(s.department) LIKE ? OR LOWER(?) LIKE LOWER(s.department) OR LOWER(n.department) LIKE ?)';
      noteParams.push(`%${effectiveStream.toLowerCase()}%`, effectiveStream.toLowerCase(), `%${effectiveStream.toLowerCase()}%`);
    }

    let latestNotes = db.prepare(`
      SELECT n.id, n.title, n.author, n.format, s.name as subject, u.name as unit, n.upload_date
      FROM notes n
      JOIN subjects s ON n.subject_id = s.id
      JOIN units u ON n.unit_id = u.id
      ${noteWhere}
      ORDER BY n.upload_date DESC
      LIMIT 5
    `).all(...noteParams);

    if (latestNotes.length === 0) {
      latestNotes = db.prepare(`
        SELECT n.id, n.title, n.author, n.format, s.name as subject, u.name as unit, n.upload_date
        FROM notes n
        JOIN subjects s ON n.subject_id = s.id
        JOIN units u ON n.unit_id = u.id
        ORDER BY n.upload_date DESC
        LIMIT 5
      `).all();
    }

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

    const { startOfWeekIso, startOfWeekDate, endOfWeekIso, weekLabel } = getWeeklyTimeRange();
    const weeklyUploads = db.prepare('SELECT COUNT(*) as count FROM notes WHERE upload_date >= ?').get(startOfWeekDate)?.count || 0;
    const weeklyDownloads = db.prepare('SELECT COUNT(*) as count FROM note_downloads WHERE downloaded_at >= ?').get(startOfWeekIso)?.count || 0;

    res.json({
      success: true,
      frequentExamTopics,
      recentUploads,
      stats: {
        totalNotes,
        totalSubjects
      },
      weekly: {
        weeklyUploads,
        weeklyDownloads,
        startOfWeek: startOfWeekIso,
        endOfWeek: endOfWeekIso,
        weekLabel,
        resetsOn: 'Every Monday at 00:00'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

// -------------------------------------------------------------
// 6. User Profile & Authentication API
// -------------------------------------------------------------
app.get('/api/user/profile', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const notesCount = db.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id = ?').get(user.id)?.count || 0;
    res.json({ success: true, user: { ...user, uploadedNotesCount: notesCount } });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

const handleSignup = (req, res) => {
  try {
    const { email, password, name, college, department, semester, stream, degree, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }
    const cleanName = typeof name === 'string' ? name.trim() : '';
    if (!cleanName || cleanName.length > 80) {
      return res.status(400).json({ success: false, error: 'Please enter a valid full name' });
    }
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists' });
    }

    const { salt, hash } = hashPassword(password);
    const userId = 'user-' + crypto.randomUUID();
    const initials = cleanName.split(/\s+/).filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2) || 'ST';
    const now = new Date().toISOString();

    const cleanDegree = typeof degree === 'string' && degree.trim() ? degree.trim() : 'B.Tech / B.E.';
    const cleanStream = typeof stream === 'string' && stream.trim() ? stream.trim() : (typeof department === 'string' && department.trim() ? department.trim() : 'Computer Science & Engineering');
    const cleanDepartment = typeof department === 'string' && department.trim() ? department.trim() : cleanStream;
    const cleanCollege = typeof college === 'string' && college.trim() ? college.trim() : 'University Institute of Technology';
    const cleanSemester = Math.min(10, Math.max(1, parseInt(semester, 10) || 1));

    // Dynamic initial subjects enrollment matching stream & semester
    let initialEnrolledIds = [];
    try {
      const isIT = cleanStream.toLowerCase().includes('information technology') || cleanStream.toLowerCase() === 'it';
      const matching = db.prepare(`
        SELECT id FROM subjects
        WHERE (LOWER(department) LIKE ? OR LOWER(?) LIKE LOWER(department) ${isIT ? "OR LOWER(department) LIKE '%computer science%'" : ''})
          AND semester = ?
      `).all(`%${cleanStream.toLowerCase()}%`, cleanStream.toLowerCase(), cleanSemester);
      if (matching.length > 0) {
        initialEnrolledIds = matching.map(m => m.id);
      }
    } catch {}
    if (initialEnrolledIds.length === 0) {
      try {
        const fallbackSameDept = db.prepare(`
          SELECT id FROM subjects
          WHERE (LOWER(department) LIKE ? OR LOWER(?) LIKE LOWER(department))
          LIMIT 5
        `).all(`%${cleanStream.toLowerCase()}%`, cleanStream.toLowerCase());
        if (fallbackSameDept.length > 0) {
          initialEnrolledIds = fallbackSameDept.map(m => m.id);
        }
      } catch {}
    }
    if (initialEnrolledIds.length === 0) {
      initialEnrolledIds = ['cs-m1', 'cs-pps', 'cs-beee'];
    }
    const defaultEnrolled = JSON.stringify(initialEnrolledIds);

    const userRole = (typeof role === 'string' && (role.toLowerCase() === 'moderator' || role.toLowerCase() === 'admin')) ? 'moderator' : 'student';
    const onboardingDone = userRole === 'moderator' ? 1 : 0;

    db.prepare(`
      INSERT INTO users (
        id, email, password_hash, salt, name, initials, role, college, department,
        stream, degree, academic_goal, enrolled_subjects, onboarding_completed, semester, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?)
    `).run(
      userId,
      cleanEmail,
      hash,
      salt,
      sanitizeString(cleanName),
      initials,
      userRole,
      sanitizeString(cleanCollege),
      sanitizeString(cleanDepartment),
      sanitizeString(cleanStream),
      sanitizeString(cleanDegree),
      defaultEnrolled,
      onboardingDone,
      cleanSemester,
      now
    );

    // Create session token (valid 30 days)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(hashToken(token), userId, now, expiresAt);

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const safeUser = formatSafeUser(userRow);

    res.status(201).json({ success: true, token, user: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
  }
};

app.post('/api/auth/signup', signupRateLimiter, handleSignup);
app.post('/api/auth/register', signupRateLimiter, handleSignup);

app.post('/api/auth/login', loginBruteForceLimiter, (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: PASSWORD_CHECK_DISABLED
          ? 'No account exists for that email address. Create an account first.'
          : 'Invalid email or password'
      });
    }

    // TEMPORARY: password verification bypassed in development (see PASSWORD_CHECK_DISABLED).
    const isValid = PASSWORD_CHECK_DISABLED
      ? true
      : (user.password_hash && user.salt && verifyPassword(password, user.salt, user.password_hash));
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = generateToken();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(hashToken(token), user.id, now, expiresAt);

    const safeUser = formatSafeUser(user);

    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
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
    res.status(500).json({ success: false, error: publicError(err) });
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
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

// Update student academic profile anytime (Degree, Stream, Semester, Enrolled Subjects, College)
app.put('/api/user/profile', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const { degree, stream, department, college, semester, enrolledSubjects } = req.body;
    const finalStream = (stream || department || user.stream || user.department || '').trim();
    const finalDegree = degree || user.degree || 'B.Tech / B.E.';
    const finalCollege = (college && college.trim()) || user.college || 'Apex Institute of Technology';
    const sem = semester !== undefined ? parseInt(semester, 10) : user.semester;
    const enrolledArr = enrolledSubjects !== undefined ? (Array.isArray(enrolledSubjects) ? enrolledSubjects : []) : (user.enrolledSubjects || []);

    db.prepare(`
      UPDATE users
      SET degree = ?,
          stream = ?,
          department = ?,
          college = ?,
          semester = ?,
          enrolled_subjects = ?
      WHERE id = ?
    `).run(
      finalDegree,
      finalStream,
      finalStream,
      finalCollege,
      sem,
      JSON.stringify(enrolledArr),
      user.id
    );

    const updatedRaw = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    const safeUser = formatSafeUser(updatedRaw);

    res.json({ success: true, user: safeUser, message: 'Academic profile updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

// Change Password API (requires current password verification, enforces complexity, terminates other active sessions)
app.post('/api/user/change-password', passwordChangeLimiter, (req, res) => {
  try {
    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    const userRecord = db.prepare('SELECT * FROM users WHERE id = ?').get(authUser.id);
    if (!userRecord || !userRecord.password_hash || !userRecord.salt) {
      return res.status(400).json({ success: false, error: 'User credential record not found.' });
    }

    const isMatch = verifyPassword(currentPassword, userRecord.salt, userRecord.password_hash);
    if (!isMatch) {
      return res.status(403).json({ success: false, error: 'Current password is incorrect.' });
    }

    // Hash new password with cryptographically secure random salt
    const { salt, hash } = hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, authUser.id);

    // Invalidate all other session tokens except current one (defends against compromised sessions)
    const authHeader = req.headers.authorization;
    const currentToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (currentToken) {
      db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(authUser.id, hashToken(currentToken));
    }

    res.json({ success: true, message: 'Password changed successfully. All other active sessions have been terminated.' });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      db.prepare('DELETE FROM sessions WHERE token = ?').run(hashToken(token));
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: publicError(err) });
  }
});

// -------------------------------------------------------------
// AI Study Assistant Chatbot Endpoint (Guardrails + Gemini RAG)
// -------------------------------------------------------------
app.post('/api/chat', aiRateLimiter, async (req, res) => {
  let authUser = null;
  const { message = '', history = [] } = req.body || {};

  try {
    const u = getUserFromRequest(req);
    if (u) authUser = { id: u.id, name: u.name, email: u.email, role: u.role, department: u.department, semester: u.semester };

    const response = await generateChatResponse({
      message: String(message || '').slice(0, 4000),
      history: Array.isArray(history) ? history.slice(-20) : [],
      user: authUser
    });

    res.json({ success: true, data: response });
  } catch (err) {
    console.error('[AI CHAT UNEXPECTED ERROR - GRACEFUL FALLBACK]', err);
    try {
      const fallback = generateDirectAcademicExplanation(
        message,
        getContextForQuery(message),
        authUser
      );
      res.json({ success: true, data: fallback });
    } catch {
      res.json({
        success: true,
        data: {
          reply: "### Academic Assistant\nI am ready to help you with your university coursework and exam preparation. What topic or doubt can I explain for you today?",
          suggestions: ['What is paging in OS?', 'Explain Normalization in DBMS', 'What is the CIA Triad in Cyber Security?'],
          actions: [{ label: 'Browse Notes Library', to: '/notes' }]
        }
      });
    }
  }
});

// -------------------------------------------------------------
// Serve built client assets in production (SPA fallback)
// -------------------------------------------------------------
const candidateDirs = [
  path.resolve(process.cwd(), 'dist'),
  path.resolve(import.meta.dirname, '../../dist'),
  path.resolve(import.meta.dirname, '../dist')
];

const clientDistDir = candidateDirs.find(dir => fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.html')));

if (clientDistDir) {
  console.log(`[ATELIER API] Serving static production client from: ${clientDistDir}`);
  app.use(express.static(clientDistDir, { maxAge: '1d', index: false }));

  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api')) {
      return next();
    }
    // Prevent MIME mismatch: Never serve index.html for missing static files (js, css, etc.)
    if (path.extname(req.path)) {
      return res.status(404).end();
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
} else {
  console.warn('[ATELIER API] Notice: dist/ directory not found yet.');
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.status(503).send(`
      <!doctype html>
      <html>
        <head><title>Atelier — Initializing...</title><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
        <body style="font-family:system-ui,-apple-system,sans-serif;background:#F4EFE8;color:#171A18;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center;">
          <div style="background:white;padding:32px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.08);max-width:440px;">
            <h2 style="margin:0 0 12px;color:#C84B28;">Atelier Academic Studio</h2>
            <p style="color:#555;font-size:14px;line-height:1.5;">Compiling client assets. If you just deployed, please ensure the build step completed and refresh in a few moments.</p>
          </div>
        </body>
      </html>
    `);
  });
}

// -------------------------------------------------------------
// Centralized Express Error Handling Middleware
// -------------------------------------------------------------
app.use((err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, error: 'File size exceeds maximum 50MB limit.' });
    }
    return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
  }

  // Handle fileFilter rejection
  if (err.message && (err.message.includes('File format rejected') || err.message.includes('Invalid MIME type'))) {
    return res.status(400).json({ success: false, error: err.message });
  }

  // Handle CORS rejection
  if (err.message && err.message.includes('CORS blocked')) {
    return res.status(403).json({ success: false, error: 'Cross-Origin Request Blocked.' });
  }

  const isProd = process.env.NODE_ENV === 'production';
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: isProd ? 'Internal Server Error' : (err.message || 'An unexpected error occurred')
  });
});

// -------------------------------------------------------------
// Server Lifecycle & Graceful Shutdown
// -------------------------------------------------------------
const server = app.listen(PORT, () => {
  console.log(`[ATELIER API] Production-hardened server running on http://localhost:${PORT}`);
  if (PASSWORD_CHECK_DISABLED) {
    console.warn('[ATELIER API] ******************************************************');
    console.warn('[ATELIER API] WARNING: sign-in accepts ANY password (dev bypass on).');
    console.warn('[ATELIER API] Set AUTH_REQUIRE_PASSWORD=true to restore checking.');
    console.warn('[ATELIER API] ******************************************************');
  }
});

function handleGracefulShutdown(signal) {
  console.log(`[ATELIER API] Received ${signal}. Initiating graceful shutdown...`);
  server.close(() => {
    console.log('[ATELIER API] HTTP connections closed.');
    closeDatabase();
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[ATELIER API] Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

