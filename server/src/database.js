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
      coverage INTEGER DEFAULT 0
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
      year INTEGER NOT NULL,
      month TEXT NOT NULL,
      question_count INTEGER NOT NULL,
      topic_mapping TEXT NOT NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS moderation (
      id TEXT PRIMARY KEY,
      resource_name TEXT NOT NULL,
      reporter TEXT NOT NULL,
      reason TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'dismissed', 'quarantined')) DEFAULT 'pending'
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
  `);

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
}
