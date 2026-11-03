// Security regression tests: boots the real server against a throwaway database.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://127.0.0.1:${PORT}`;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-test-'));
let proc;

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('server did not start');
}

async function json(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function signup(name) {
  const email = `${name.toLowerCase().replace(/\s/g, '')}-${Math.random().toString(36).slice(2)}@test.edu`;
  const r = await json('POST', '/api/auth/signup', { name, email, password: 'longenough1' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}

function pdfForm(fields) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  fd.append('file', new Blob(['%PDF-1.4\n%test\n'], { type: 'application/pdf' }), 'notes.pdf');
  return fd;
}

before(async () => {
  proc = spawn(process.execPath, ['server/src/server.js'], {
    env: { ...process.env, PORT: String(PORT), DATABASE_PATH: path.join(tmpDir, 'db.sqlite'), NODE_ENV: 'test', GEMINI_API_KEY: '' },
    stdio: 'ignore',
  });
  await waitForServer();
});

after(() => {
  proc?.kill();
});

test('anonymous uploads are rejected', async () => {
  const res = await fetch(`${BASE}/api/notes`, { method: 'POST', body: pdfForm({ subjectId: 'os', unitId: 'os-u1' }) });
  assert.equal(res.status, 401);
});

test('upload author comes from the session, not the request', async () => {
  const { token } = await signup('Real Uploader');
  const res = await fetch(`${BASE}/api/notes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: pdfForm({ subjectId: 'os', unitId: 'os-u1', title: 'Paging', author: 'Someone Else', status: 'quarantined' }),
  });
  const body = await res.json();
  assert.equal(res.status, 201, JSON.stringify(body));
  assert.equal(body.note.author, 'Real Uploader');
  assert.equal(body.note.status, 'published');
});

test('files whose bytes do not match their extension are rejected', async () => {
  const { token } = await signup('Sneaky');
  const fd = new FormData();
  fd.append('subjectId', 'os');
  fd.append('unitId', 'os-u1');
  fd.append('file', new Blob(['<html>not a pdf</html>'], { type: 'application/pdf' }), 'x.pdf');
  const res = await fetch(`${BASE}/api/notes`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  assert.equal(res.status, 400);
});

test('a user with the same display name cannot edit or delete another user\'s note', async () => {
  const owner = await signup('Shared Name');
  const up = await fetch(`${BASE}/api/notes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${owner.token}` },
    body: pdfForm({ subjectId: 'os', unitId: 'os-u1', title: 'Mine' }),
  }).then(r => r.json());
  const impostor = await signup('Shared Name');
  const edit = await json('PUT', `/api/notes/${up.noteId}`, { title: 'pwned' }, impostor.token);
  assert.equal(edit.status, 403);
  const del = await json('DELETE', `/api/notes/${up.noteId}`, null, impostor.token);
  assert.equal(del.status, 403);
});

test('anonymous reports are rejected', async () => {
  const r = await json('POST', '/api/moderation', { reason: 'spam', userId: 'user-student', reporter: 'Fake' });
  assert.equal(r.status, 401);
});

test('weak passwords are rejected', async () => {
  const r = await json('POST', '/api/auth/signup', { name: 'Weak', email: 'weak@test.edu', password: 'abc' });
  assert.equal(r.status, 400);
});

test('cross-origin requests from unknown sites are blocked', async () => {
  const res = await fetch(`${BASE}/api/subjects`, { headers: { Origin: 'https://evil.example' } });
  assert.equal(res.status, 403);
});

test('logout invalidates the token', async () => {
  const { token } = await signup('Logout Tester');
  assert.equal((await json('GET', '/api/auth/me', null, token)).status, 200);
  await json('POST', '/api/auth/logout', null, token);
  assert.equal((await json('GET', '/api/auth/me', null, token)).status, 401);
});
