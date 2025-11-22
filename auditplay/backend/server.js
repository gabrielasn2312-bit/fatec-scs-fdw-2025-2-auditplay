const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const PORT = process.env.PORT || 3000;
const DB_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DB_DIR, 'auditplay.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
  // Garante que o campo perfil existe na tabela users
  db.run(`PRAGMA table_info(users)`, [], function(err) {
    if (!err && this && this.length > 0 && !this.some(col => col.name === 'perfil')) {
      db.run(`ALTER TABLE users ADD COLUMN perfil TEXT DEFAULT 'auditado'`);
    }
  });
  db.run(`CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    answer TEXT,
    justification TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, key)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    category TEXT PRIMARY KEY,
    status TEXT DEFAULT 'pendente',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // seed default categories if not present
  const defaults = ['organizacional','pessoas','fisicos','tecnologicos'];
  const insertCat = db.prepare('INSERT OR IGNORE INTO categories (category, status) VALUES (?, ?)');
  defaults.forEach(c => insertCat.run(c, 'pendente'));
  insertCat.finalize();
  // users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    company TEXT,
    role TEXT,
    perfil TEXT DEFAULT 'auditado',
    password_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // Cria tabela user_responses para armazenar respostas por usuário
  db.run(`CREATE TABLE IF NOT EXISTS user_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    answer TEXT,
    justification TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category, key)
  )`);

  // Avaliações realizadas por auditores sobre as respostas do usuário
  db.run(`CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_response_id INTEGER,
    auditor_id INTEGER,
    verdict TEXT,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // Status por usuário para cada categoria (progresso pessoal)
  db.run(`CREATE TABLE IF NOT EXISTS user_categories (
    user_id INTEGER,
    category TEXT,
    status TEXT DEFAULT 'pendente',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, category)
  )`);
});

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend estático a partir da pasta ../frontend
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));
// rota raiz aponta para o menu
app.get('/', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'menu.html')));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Auth: signup and login
const bcrypt = require('bcryptjs');

// Signup: create new user
app.post('/api/auth/signup', (req, res) => {
  const { nome, email, empresa, cargo, senha, perfil } = req.body || {};
  if (!email || !senha || !nome) return res.status(400).json({ error: 'nome, email e senha são obrigatórios' });

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(senha, salt);

  db.run('INSERT INTO users (name, email, company, role, perfil, password_hash) VALUES (?, ?, ?, ?, ?, ?)', [nome, email, empresa || '', cargo || '', perfil || 'auditado', hash], function(err){
    if (err) {
      if (err.message && err.message.indexOf('UNIQUE') !== -1) return res.status(409).json({ error: 'E-mail já cadastrado' });
      return res.status(500).json({ error: err.message });
    }
    res.json({ ok: true, user: { id: this.lastID, nome, email, perfil: perfil || 'auditado' } });
  });
});

// Login: verify credentials
app.post('/api/auth/login', (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return res.status(400).json({ error: 'email e senha são obrigatórios' });

  db.get('SELECT id, name, email, perfil, password_hash FROM users WHERE email = ?', [email], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Credenciais inválidas' });
    if (!bcrypt.compareSync(senha, row.password_hash)) return res.status(401).json({ error: 'Credenciais inválidas' });
    // sucesso - retornar info mínima
    res.json({ ok: true, user: { id: row.id, nome: row.name, email: row.email, perfil: row.perfil } });
  });
});

// Get all responses for a category
app.get('/api/audits/:category', (req, res) => {
  const category = req.params.category;
  db.all('SELECT key, answer, justification, updated_at FROM responses WHERE category = ?', [category], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const out = {};
    rows.forEach(r => { out[r.key] = { answer: r.answer, justification: r.justification, updated_at: r.updated_at }; });
    res.json({ category, data: out });
  });
});

// Save multiple responses for a category (replace existing)
// Body: { data: { key: { answer, justification }, ... } }
app.post('/api/audits/:category', (req, res) => {
  const category = req.params.category;
  const payload = req.body && req.body.data;
  if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'Invalid payload, expected { data: { ... } }' });

  const keys = Object.keys(payload);
  const stmtInsert = db.prepare(`INSERT OR REPLACE INTO responses (id, category, key, answer, justification, updated_at)
    VALUES ((SELECT id FROM responses WHERE category = ? AND key = ?), ?, ?, ?, ?, CURRENT_TIMESTAMP)`);

  db.serialize(() => {
    keys.forEach(k => {
      const { answer, justification } = payload[k] || {};
      stmtInsert.run(category, k, category, k, answer || null, justification || null);
    });
    stmtInsert.finalize(err => {
      if (err) return res.status(500).json({ error: err.message });
      console.log(`[api] Saved ${keys.length} items for category=${category}`);
      // mark category as responded
      db.run('INSERT OR REPLACE INTO categories (category, status, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [category, 'respondida'], function(err2){
        if (err2) return res.status(500).json({ error: err2.message });
        console.log(`[api] Category '${category}' marked as respondida`);
        res.json({ ok: true, saved: keys.length });
      });
    });
  });
});

// return list of categories and status
app.get('/api/categories', (req, res) => {
  const userId = req.query.userId;
  if (userId) {
    // return per-user statuses, falling back to global categories when missing
    db.all('SELECT category, status, updated_at FROM user_categories WHERE user_id = ?', [userId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const out = {};
      // fill with defaults
      const defaults = ['organizacional','pessoas','fisicos','tecnologicos'];
      defaults.forEach(c => { out[c] = { status: 'pendente' }; });
      rows.forEach(r => { out[r.category] = { status: r.status, updated_at: r.updated_at }; });
      return res.json({ data: out });
    });
    return;
  }
  // global categories
  db.all('SELECT category, status, updated_at FROM categories', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || rows.length === 0) {
      const defaults = ['organizacional','pessoas','fisicos','tecnologicos'];
      const out = {};
      defaults.forEach(c => { out[c] = { status: 'pendente' }; });
      return res.json({ data: out });
    }
    const out = {};
    rows.forEach(r => { out[r.category] = { status: r.status, updated_at: r.updated_at }; });
    res.json({ data: out });
  });
});

// Reset status de uma categoria
app.post('/api/categories/:category/reset', (req, res) => {
  const category = req.params.category;
  db.run('UPDATE categories SET status = "pendente", updated_at = CURRENT_TIMESTAMP WHERE category = ?', [category], function(err){
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, category });
  });
});

// Resetar todas as categorias
app.post('/api/categories/resetAll', (req, res) => {
  db.run('UPDATE categories SET status = "pendente", updated_at = CURRENT_TIMESTAMP', [], function(err){
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

// List users who have responses for a category (summary)
app.get('/api/user_audits/:category/list', (req, res) => {
  const category = req.params.category;
  db.all(`SELECT DISTINCT ur.user_id AS user_id, u.name, u.email, u.company
          FROM user_responses ur
          JOIN users u ON u.id = ur.user_id
          WHERE ur.category = ?`, [category], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ data: rows });
  });
});

// Get responses for a specific user and category
app.get('/api/user_audits/:category/:userId', (req, res) => {
  const category = req.params.category;
  const userId = req.params.userId;
  db.all('SELECT id AS user_response_id, key, answer, justification, updated_at FROM user_responses WHERE category = ? AND user_id = ?', [category, userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ category, userId, data: rows });
  });
});

// Save multiple responses for a specific user and category
// Body: { userId, data: { key: { answer, justification }, ... } }
app.post('/api/user_audits/:category', (req, res) => {
  const category = req.params.category;
  const payload = req.body && req.body.data;
  const userId = req.body && req.body.userId;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'Invalid payload, expected { userId, data: { ... } }' });

  const keys = Object.keys(payload);
  const stmt = db.prepare(`INSERT OR REPLACE INTO user_responses (id, user_id, category, key, answer, justification, updated_at)
    VALUES ((SELECT id FROM user_responses WHERE user_id = ? AND category = ? AND key = ?), ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`);

  db.serialize(() => {
    keys.forEach(k => {
      const { answer, justification } = payload[k] || {};
      stmt.run(userId, category, k, userId, category, k, answer || null, justification || null);
    });
    stmt.finalize(err => {
      if (err) return res.status(500).json({ error: err.message });
      console.log(`[api] Saved ${keys.length} user_responses for user=${userId} category=${category}`);
      // Marca progresso do usuário para esta categoria
      db.run('INSERT OR REPLACE INTO user_categories (user_id, category, status, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)', [userId, category, 'respondida'], function(err2){
        if (err2) return res.status(500).json({ error: err2.message });
        console.log(`[api] Marked user=${userId} category=${category} as respondida`);
        res.json({ ok: true, saved: keys.length });
      });
    });
  });
});

// List users with pending evaluations for a given auditor and category
app.get('/api/user_audits/pending_for_auditor/:auditorId/:category', (req, res) => {
  const auditorId = req.params.auditorId;
  const category = req.params.category;
  db.all(`SELECT DISTINCT ur.user_id AS user_id, u.name, u.email
          FROM user_responses ur
          JOIN users u ON u.id = ur.user_id
          WHERE ur.category = ?
            AND NOT EXISTS (
              SELECT 1 FROM evaluations ev
              JOIN user_responses ur2 ON ev.user_response_id = ur2.id
              WHERE ev.auditor_id = ?
                AND ur2.user_id = ur.user_id
                AND ur2.category = ur.category
            )`, [category, auditorId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ data: rows });
  });
});

// Save an evaluation by an auditor for a specific user_response
// Body: { auditorId, userResponseId, verdict, comment }
app.post('/api/evaluations', (req, res) => {
  const { auditorId, userResponseId, verdict, comment } = req.body || {};
  if (!auditorId || !userResponseId || !verdict) return res.status(400).json({ error: 'auditorId, userResponseId and verdict are required' });
  db.run('INSERT INTO evaluations (user_response_id, auditor_id, verdict, comment) VALUES (?, ?, ?, ?)', [userResponseId, auditorId, verdict, comment || null], function(err){
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, id: this.lastID });
  });
});

// Get evaluations for a user and category (all auditors)
app.get('/api/evaluations/user/:userId/:category', (req, res) => {
  const userId = req.params.userId;
  const category = req.params.category;
  db.all(`SELECT ev.id, ev.user_response_id, ev.auditor_id, ev.verdict, ev.comment, ev.created_at, ur.key
          FROM evaluations ev
          JOIN user_responses ur ON ur.id = ev.user_response_id
          WHERE ur.user_id = ? AND ur.category = ?`, [userId, category], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ data: rows });
  });
});

app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
