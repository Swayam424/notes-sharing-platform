import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const serverDir = path.resolve(process.cwd(), 'server');
const dataDir = path.join(serverDir, 'data');
export const uploadsDir = path.join(serverDir, 'uploads');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
export const db = new DatabaseSync(dbPath);

export function initDatabase() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      semester INTEGER NOT NULL,
      scheme TEXT NOT NULL,
      coverage INTEGER DEFAULT 0,
      department TEXT DEFAULT 'Computer Science & Engineering'
    );

    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      name TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      unit_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT CHECK(status IN ('covered', 'partial', 'missing')) DEFAULT 'missing',
      note_count INTEGER DEFAULT 0,
      pyq_count INTEGER DEFAULT 0,
      pyq_years TEXT DEFAULT '[]',
      pyq_questions TEXT DEFAULT '[]',
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      author_initials TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      topic_ids TEXT NOT NULL,
      primary_topic TEXT,
      description TEXT,
      tags TEXT DEFAULT '[]',
      department TEXT,
      semester INTEGER,
      user_id TEXT,
      status TEXT DEFAULT 'published',
      format TEXT NOT NULL,
      pages INTEGER DEFAULT 1,
      file_path TEXT,
      file_size INTEGER DEFAULT 0,
      mime_type TEXT,
      upload_date TEXT NOT NULL,
      downloads INTEGER DEFAULT 0,
      topic_match_count INTEGER DEFAULT 0,
      total_topics INTEGER DEFAULT 0,
      syllabus_match TEXT,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pyqs (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      title TEXT,
      exam_type TEXT DEFAULT 'End Semester',
      semester INTEGER DEFAULT 5,
      department TEXT DEFAULT 'Computer Science',
      year INTEGER NOT NULL,
      month TEXT NOT NULL,
      total_marks INTEGER DEFAULT 100,
      question_count INTEGER NOT NULL,
      primary_topic TEXT,
      topic_mapping TEXT NOT NULL,
      questions TEXT DEFAULT '[]',
      format TEXT DEFAULT 'PDF',
      pages INTEGER DEFAULT 4,
      file_path TEXT,
      file_size TEXT DEFAULT '1.4 MB',
      author TEXT DEFAULT 'Apex Examination Board',
      user_id TEXT,
      upload_date TEXT,
      status TEXT DEFAULT 'published',
      downloads INTEGER DEFAULT 0,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS moderation (
      id TEXT PRIMARY KEY,
      note_id TEXT,
      user_id TEXT,
      resource_name TEXT NOT NULL,
      reporter TEXT NOT NULL,
      category TEXT,
      reason TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'under_review', 'resolved', 'dismissed', 'quarantined')) DEFAULT 'pending',
      admin_notes TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      action_taken TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      salt TEXT,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      college TEXT NOT NULL,
      department TEXT NOT NULL,
      stream TEXT,
      degree TEXT DEFAULT 'B.Tech / B.E.',
      academic_goal TEXT,
      enrolled_subjects TEXT DEFAULT '[]',
      onboarding_completed INTEGER DEFAULT 0,
      semester INTEGER NOT NULL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS saved_notes (
      user_id TEXT NOT NULL,
      note_id TEXT NOT NULL,
      saved_at TEXT NOT NULL,
      last_accessed_at TEXT,
      PRIMARY KEY (user_id, note_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS note_upvotes (
      user_id TEXT NOT NULL,
      note_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, note_id)
    );

    CREATE TABLE IF NOT EXISTS note_comments (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_initials TEXT NOT NULL,
      user_role TEXT DEFAULT 'Student',
      category TEXT DEFAULT 'General',
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      upvotes INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS comment_upvotes (
      user_id TEXT NOT NULL,
      comment_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, comment_id)
    );
  `);

  // Ensure saved_notes allows both notes and pyqs
  const savedNotesSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='saved_notes'").get()?.sql || '';
  if (savedNotesSql && savedNotesSql.includes('REFERENCES notes')) {
    db.exec(`
      CREATE TABLE saved_notes_new (
        user_id TEXT NOT NULL,
        note_id TEXT NOT NULL,
        saved_at TEXT NOT NULL,
        last_accessed_at TEXT,
        PRIMARY KEY (user_id, note_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      INSERT INTO saved_notes_new (user_id, note_id, saved_at, last_accessed_at)
      SELECT user_id, note_id, saved_at, last_accessed_at FROM saved_notes;
      DROP TABLE saved_notes;
      ALTER TABLE saved_notes_new RENAME TO saved_notes;
    `);
  }

  // Migrate existing users table if columns don't exist
  const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  if (!cols.includes('email')) {
    // SQLite cannot add UNIQUE columns via ALTER TABLE, so add without constraint
    // The CREATE TABLE above already defines it as UNIQUE for new databases
    db.exec('ALTER TABLE users ADD COLUMN email TEXT;');
  }
  if (!cols.includes('password_hash')) {
    db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT;');
  }
  if (!cols.includes('salt')) {
    db.exec('ALTER TABLE users ADD COLUMN salt TEXT;');
  }
  if (!cols.includes('created_at')) {
    db.exec('ALTER TABLE users ADD COLUMN created_at TEXT;');
  }
  if (!cols.includes('stream')) {
    db.exec('ALTER TABLE users ADD COLUMN stream TEXT;');
  }
  if (!cols.includes('degree')) {
    db.exec('ALTER TABLE users ADD COLUMN degree TEXT DEFAULT \'B.Tech / B.E.\';');
  }
  if (!cols.includes('academic_goal')) {
    db.exec('ALTER TABLE users ADD COLUMN academic_goal TEXT;');
  }
  if (!cols.includes('enrolled_subjects')) {
    db.exec('ALTER TABLE users ADD COLUMN enrolled_subjects TEXT DEFAULT \'[]\';');
  }
  if (!cols.includes('onboarding_completed')) {
    db.exec('ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0;');
  }

  // Migrate existing subjects table if department column doesn't exist
  const subCols = db.prepare('PRAGMA table_info(subjects)').all().map(c => c.name);
  if (!subCols.includes('department')) {
    db.exec("ALTER TABLE subjects ADD COLUMN department TEXT DEFAULT 'Computer Science & Engineering';");
  }

  // Migrate existing notes table if columns don't exist
  const noteCols = db.prepare('PRAGMA table_info(notes)').all().map(c => c.name);
  if (!noteCols.includes('primary_topic')) {
    db.exec('ALTER TABLE notes ADD COLUMN primary_topic TEXT;');
  }
  if (!noteCols.includes('description')) {
    db.exec('ALTER TABLE notes ADD COLUMN description TEXT;');
  }
  if (!noteCols.includes('tags')) {
    db.exec('ALTER TABLE notes ADD COLUMN tags TEXT DEFAULT \'[]\';');
  }
  if (!noteCols.includes('department')) {
    db.exec('ALTER TABLE notes ADD COLUMN department TEXT;');
  }
  if (!noteCols.includes('semester')) {
    db.exec('ALTER TABLE notes ADD COLUMN semester INTEGER;');
  }
  if (!noteCols.includes('user_id')) {
    db.exec('ALTER TABLE notes ADD COLUMN user_id TEXT;');
  }
  if (!noteCols.includes('status')) {
    db.exec('ALTER TABLE notes ADD COLUMN status TEXT DEFAULT \'published\';');
  }
  if (!noteCols.includes('upvotes')) {
    db.exec('ALTER TABLE notes ADD COLUMN upvotes INTEGER DEFAULT 0;');
  }

  // Migrate existing moderation table if columns don't exist
  const modCols = db.prepare('PRAGMA table_info(moderation)').all().map(c => c.name);
  if (!modCols.includes('note_id')) {
    db.exec('ALTER TABLE moderation ADD COLUMN note_id TEXT;');
  }
  if (!modCols.includes('user_id')) {
    db.exec('ALTER TABLE moderation ADD COLUMN user_id TEXT;');
  }
  if (!modCols.includes('details')) {
    db.exec('ALTER TABLE moderation ADD COLUMN details TEXT;');
  }
  if (!modCols.includes('category')) {
    db.exec('ALTER TABLE moderation ADD COLUMN category TEXT;');
  }
  if (!modCols.includes('admin_notes')) {
    db.exec('ALTER TABLE moderation ADD COLUMN admin_notes TEXT;');
  }
  if (!modCols.includes('reviewed_by')) {
    db.exec('ALTER TABLE moderation ADD COLUMN reviewed_by TEXT;');
  }
  if (!modCols.includes('reviewed_at')) {
    db.exec('ALTER TABLE moderation ADD COLUMN reviewed_at TEXT;');
  }
  if (!modCols.includes('action_taken')) {
    db.exec('ALTER TABLE moderation ADD COLUMN action_taken TEXT;');
  }

  // Ensure status CHECK constraint supports 'under_review' and 'resolved'
  const tableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='moderation'").get()?.sql || '';
  if (tableSql && !tableSql.includes('under_review')) {
    db.exec(`
      CREATE TABLE moderation_new (
        id TEXT PRIMARY KEY,
        note_id TEXT,
        user_id TEXT,
        resource_name TEXT NOT NULL,
        reporter TEXT NOT NULL,
        category TEXT,
        reason TEXT NOT NULL,
        details TEXT,
        timestamp TEXT NOT NULL,
        status TEXT CHECK(status IN ('pending', 'under_review', 'resolved', 'dismissed', 'quarantined')) DEFAULT 'pending',
        admin_notes TEXT,
        reviewed_by TEXT,
        reviewed_at TEXT,
        action_taken TEXT
      );
      INSERT INTO moderation_new (id, note_id, user_id, resource_name, reporter, category, reason, details, timestamp, status, admin_notes, reviewed_by, reviewed_at, action_taken)
      SELECT id, note_id, user_id, resource_name, reporter, category, reason, details, timestamp, status, admin_notes, reviewed_by, reviewed_at, action_taken FROM moderation;
      DROP TABLE moderation;
      ALTER TABLE moderation_new RENAME TO moderation;
    `);
  }

  // Migrate existing pyqs table if columns don't exist
  const pyqCols = db.prepare('PRAGMA table_info(pyqs)').all().map(c => c.name);
  if (!pyqCols.includes('title')) db.exec('ALTER TABLE pyqs ADD COLUMN title TEXT;');
  if (!pyqCols.includes('exam_type')) db.exec('ALTER TABLE pyqs ADD COLUMN exam_type TEXT DEFAULT \'End Semester\';');
  if (!pyqCols.includes('semester')) db.exec('ALTER TABLE pyqs ADD COLUMN semester INTEGER DEFAULT 5;');
  if (!pyqCols.includes('department')) db.exec('ALTER TABLE pyqs ADD COLUMN department TEXT DEFAULT \'Computer Science\';');
  if (!pyqCols.includes('total_marks')) db.exec('ALTER TABLE pyqs ADD COLUMN total_marks INTEGER DEFAULT 100;');
  if (!pyqCols.includes('primary_topic')) db.exec('ALTER TABLE pyqs ADD COLUMN primary_topic TEXT;');
  if (!pyqCols.includes('questions')) db.exec('ALTER TABLE pyqs ADD COLUMN questions TEXT DEFAULT \'[]\';');
  if (!pyqCols.includes('format')) db.exec('ALTER TABLE pyqs ADD COLUMN format TEXT DEFAULT \'PDF\';');
  if (!pyqCols.includes('pages')) db.exec('ALTER TABLE pyqs ADD COLUMN pages INTEGER DEFAULT 4;');
  if (!pyqCols.includes('file_path')) db.exec('ALTER TABLE pyqs ADD COLUMN file_path TEXT;');
  if (!pyqCols.includes('file_size')) db.exec('ALTER TABLE pyqs ADD COLUMN file_size TEXT DEFAULT \'1.4 MB\';');
  if (!pyqCols.includes('author')) db.exec('ALTER TABLE pyqs ADD COLUMN author TEXT DEFAULT \'Apex Examination Board\';');
  if (!pyqCols.includes('user_id')) db.exec('ALTER TABLE pyqs ADD COLUMN user_id TEXT;');
  if (!pyqCols.includes('upload_date')) db.exec('ALTER TABLE pyqs ADD COLUMN upload_date TEXT;');
  if (!pyqCols.includes('status')) db.exec('ALTER TABLE pyqs ADD COLUMN status TEXT DEFAULT \'published\';');
  if (!pyqCols.includes('downloads')) db.exec('ALTER TABLE pyqs ADD COLUMN downloads INTEGER DEFAULT 0;');

  // Backfill existing seeded pyqs if title is null
  const untitledPyqs = db.prepare('SELECT p.*, s.name as subject_name FROM pyqs p LEFT JOIN subjects s ON p.subject_id = s.id WHERE p.title IS NULL').all();
  for (const up of untitledPyqs) {
    const paperTitle = `${up.subject_name || 'Academic'} — ${up.month} ${up.year} Examination Paper`;
    const mapping = JSON.parse(up.topic_mapping || '[]');
    const primaryTopic = mapping.length > 0 ? mapping[0].topicName : 'Course Curriculum';
    
    // Generate realistic questions based on topic mapping
    const sampleQuestions = mapping.flatMap((m, mIdx) => {
      return [
        {
          id: `q-${up.id}-${mIdx}-1`,
          qNumber: `${mIdx + 1}(a)`,
          question: `Explain fundamental principles of ${m.topicName} with architectural diagrams and standard operational flow.`,
          marks: 7,
          unitName: `Unit ${((mIdx % 5) + 1)}`,
          topicId: m.topicId,
          topicName: m.topicName
        },
        {
          id: `q-${up.id}-${mIdx}-2`,
          qNumber: `${mIdx + 1}(b)`,
          question: `Analyze comparative performance, trade-offs, and critical edge cases for ${m.topicName}.`,
          marks: 7,
          unitName: `Unit ${((mIdx % 5) + 1)}`,
          topicId: m.topicId,
          topicName: m.topicName
        }
      ];
    });

    db.prepare(`
      UPDATE pyqs
      SET title = ?,
          exam_type = 'End Semester',
          semester = 5,
          department = 'Computer Science',
          total_marks = 100,
          primary_topic = ?,
          questions = ?,
          format = 'PDF',
          pages = 4,
          file_size = '1.6 MB',
          author = 'Apex Examination Board',
          upload_date = '2025-08-15',
          status = 'published',
          downloads = 42
      WHERE id = ?
    `).run(paperTitle, primaryTopic, JSON.stringify(sampleQuestions), up.id);
  }

  // Backfill realistic upvotes for notes if not set
  db.exec(`
    UPDATE notes SET upvotes = CASE id
      WHEN 'n1' THEN 42
      WHEN 'n2' THEN 28
      WHEN 'n3' THEN 64
      WHEN 'n4' THEN 15
      WHEN 'n5' THEN 53
      WHEN 'n6' THEN 38
      WHEN 'n7' THEN 47
      ELSE 14
    END
    WHERE upvotes IS NULL OR upvotes = 0;
  `);

  // Seed sample discussion threads & comments if empty
  const commentCount = db.prepare('SELECT COUNT(*) as count FROM note_comments').get()?.count || 0;
  if (commentCount === 0) {
    const seedComments = [
      {
        id: 'comm-1',
        note_id: 'n1',
        user_id: 'user-student',
        user_name: 'Arjun Mehta',
        user_initials: 'AM',
        user_role: 'Student',
        category: 'Exam Tip',
        content: 'Crucial tip: Unit 1 microkernel vs monolithic comparison is asked almost every year in end-sem. The diagrams on Page 4 match what the professors look for!',
        created_at: '2025-09-16 11:20',
        upvotes: 14
      },
      {
        id: 'comm-2',
        note_id: 'n1',
        user_id: 'user-kn',
        user_name: 'Kavya Nair',
        user_initials: 'KN',
        user_role: 'Student',
        category: 'Errata / Correction',
        content: 'On Page 8, under process state transitions, Waiting to Ready is triggered by I/O event completion (not scheduling dispatch). Worth keeping in mind for viva and MCQs!',
        created_at: '2025-09-17 14:45',
        upvotes: 9
      },
      {
        id: 'comm-3',
        note_id: 'n1',
        user_id: 'user-moderator',
        user_name: 'Priya Sharma',
        user_initials: 'PS',
        user_role: 'Moderator',
        category: 'Key Takeaway',
        content: 'Verified syllabus alignment for 2022–2026 Scheme. All 4 topics in Unit 1 are thoroughly covered with structured diagrams.',
        created_at: '2025-09-17 18:30',
        upvotes: 21
      },
      {
        id: 'comm-4',
        note_id: 'n3',
        user_id: 'user-rd',
        user_name: 'Rohan Das',
        user_initials: 'RD',
        user_role: 'Student',
        category: 'Question',
        content: 'Does anyone have a step-by-step example for Banker\'s Algorithm with 4 resources? The matrix layout here is great but a solved numerical would be awesome.',
        created_at: '2025-09-19 09:12',
        upvotes: 7
      },
      {
        id: 'comm-5',
        note_id: 'n3',
        user_id: 'user-kn',
        user_name: 'Kavya Nair',
        user_initials: 'KN',
        user_role: 'Student',
        category: 'Exam Tip',
        content: 'The 4 necessary conditions for deadlock (Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait) are on Page 12. Must memorize for 7-mark question!',
        created_at: '2025-09-19 16:04',
        upvotes: 18
      },
      {
        id: 'comm-6',
        note_id: 'n6',
        user_id: 'user-mp',
        user_name: 'Meera Patel',
        user_initials: 'MP',
        user_role: 'Student',
        category: 'Key Takeaway',
        content: 'The BCNF vs 3NF lossless join & dependency preservation breakdown on Page 15 saved my mid-terms. Super clean reference tables.',
        created_at: '2025-09-16 20:10',
        upvotes: 12
      }
    ];

    const insertComment = db.prepare(`
      INSERT INTO note_comments (id, note_id, user_id, user_name, user_initials, user_role, category, content, created_at, upvotes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const c of seedComments) {
      insertComment.run(c.id, c.note_id, c.user_id, c.user_name, c.user_initials, c.user_role, c.category, c.content, c.created_at, c.upvotes);
    }
  }
}


