const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static('docs'));

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

const DB_FILE = path.join(__dirname, 'data', 'db.json');
if (!fs.existsSync(path.dirname(DB_FILE))) fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({
    teams: [], tour1: {}, tour2: {}, tour3: {}, tour4: {},
    timer: { active: false, endTime: null, totalMinutes: 0 },
    speedBonus: { tour1: [], tour2: [], tour3: [], tour4: [] }
  }, null, 2));
}

function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); }
  catch (e) { return { teams: [], tour1: {}, tour2: {}, tour3: {}, tour4: {}, timer: {}, speedBonus: {} }; }
}
function writeDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

// ============================================================
// БОНУС ЗА СКОРОСТЬ
// ============================================================
function giveSpeedBonus(db, tourKey, teamId) {
  if (!db.speedBonus) db.speedBonus = { tour1: [], tour2: [], tour3: [], tour4: [] };
  if (!db.speedBonus[tourKey]) db.speedBonus[tourKey] = [];
  var arr = db.speedBonus[tourKey];
  // Только первым двум командам в этом туре
  if (arr.indexOf(teamId) !== -1) return 0;
  if (arr.length === 0) { arr.push(teamId); return 3; }
  if (arr.length === 1) { arr.push(teamId); return 2; }
  return 0;
}

// ============================================================
// ТАЙМЕР
// ============================================================
app.post('/api/timer/start', (req, res) => {
  const minutes = Number(req.body.minutes) || 15;
  const db = readDB();
  db.timer = {
    active: true,
    endTime: Date.now() + minutes * 60 * 1000,
    totalMinutes: minutes,
    startedAt: Date.now()
  };
  writeDB(db);
  res.json({ ok: true, timer: db.timer });
});

app.get('/api/timer/state', (req, res) => {
  const db = readDB();
  const t = db.timer || {};
  if (!t.active || !t.endTime) return res.json({ active: false });
  const now = Date.now();
  const msLeft = Math.max(0, t.endTime - now);
  const minutesLeft = Math.floor(msLeft / 60000);
  const secondsLeft = Math.floor((msLeft % 60000) / 1000);
  const expired = msLeft === 0;
  res.json({
    active: !expired,
    expired: expired,
    totalMinutes: t.totalMinutes,
    minutesLeft: minutesLeft,
    secondsLeft: secondsLeft,
    msLeft: msLeft
  });
});

app.post('/api/timer/stop', (req, res) => {
  const db = readDB();
  db.timer = { active: false, endTime: null, totalMinutes: 0 };
  writeDB(db);
  res.json({ ok: true });
});

// ============================================================
// КОМАНДЫ
// ============================================================
app.get('/api/teams', (req, res) => res.json(readDB().teams));

app.get('/api/teams/by-token', (req, res) => {
  const t = String(req.query.token || '').trim();
  const db = readDB();
  const team = db.teams.find(x => String(x.token).trim() === t);
  if (!team) return res.status(404).json({ error: 'not found' });
  res.json(team);
});

app.post('/api/teams', (req, res) => {
  const db = readDB();
  const caseId = Math.floor(Math.random() * 4) + 1;
  const team = {
    id: db.teams.length + 1,
    name: (req.body.name || `Команда ${db.teams.length + 1}`).slice(0, 60),
    token: Math.random().toString(36).slice(2, 10),
    caseId: caseId,
    emoji: req.body.emoji || '🛡',
    color: req.body.color || '#157fc4',
    createdAt: new Date().toISOString()
  };
  db.teams.push(team);
  writeDB(db);
  res.json(team);
});

// ============================================================
// ТУР 1
// ============================================================
app.post('/api/tour1/quiz', (req, res) => {
  const { teamId, answers, correct, total } = req.body;
  if (!teamId) return res.status(400).json({ error: 'teamId required' });
  const db = readDB();
  if (!db.tour1[teamId]) db.tour1[teamId] = {};
  if (db.tour1[teamId].quiz) return res.json({ ok: true, bonus: 0 }); // уже сдавал

  const bonus = giveSpeedBonus(db, 'tour1', teamId);
  db.tour1[teamId].quiz = { answers, correct, total, bonus: bonus, time: new Date().toISOString() };
  writeDB(db);
  res.json({ ok: true, bonus: bonus });
});

app.post('/api/tour1/case', (req, res) => {
  const { teamId, caseTitle, answer } = req.body;
  if (!teamId) return res.status(400).json({ error: 'teamId required' });
  const db = readDB();
  if (!db.tour1[teamId]) db.tour1[teamId] = {};
  db.tour1[teamId].kase = { caseTitle, answer, time: new Date().toISOString() };
  writeDB(db);
  res.json({ ok: true });
});

app.post('/api/admin/tour1/case-score', (req, res) => {
  const { teamId, scores } = req.body;
  const db = readDB();
  if (!db.tour1[teamId]) db.tour1[teamId] = {};
  db.tour1[teamId].caseScore = scores;
  writeDB(db);
  res.json({ ok: true });
});

// ============================================================
// ТУР 2
// ============================================================
app.post('/api/tour2', (req, res) => {
  const { teamId, answers, correct, total } = req.body;
  if (!teamId) return res.status(400).json({ error: 'teamId required' });
  const db = readDB();
  if (db.tour2[teamId]) return res.json({ ok: true, bonus: 0 });
  const bonus = giveSpeedBonus(db, 'tour2', teamId);
  db.tour2[teamId] = { answers, correct, total, bonus: bonus, time: new Date().toISOString() };
  writeDB(db);
  res.json({ ok: true, bonus: bonus });
});

// ============================================================
// ТУР 3
// ============================================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, UPLOAD_DIR); },
  filename: function (req, file, cb) {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    cb(null, 'team' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + ext);
  }
});
const ALLOWED_MIMES = ['image/jpeg','image/png','image/webp','image/gif','application/pdf','video/mp4','video/webm'];
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (ALLOWED_MIMES.indexOf(file.mimetype) === -1) return cb(new Error('Недопустимый тип файла'));
    cb(null, true);
  }
});

app.post('/api/tour3/upload', upload.single('file'), (req, res) => {
  const { teamId, teamName, format, formatTitle, topic, topicTitle, description } = req.body;
  if (!teamId) return res.status(400).json({ error: 'teamId required' });
  const db = readDB();
  if (db.tour3[teamId] && db.tour3[teamId].time) {
    return res.json({ ok: true, bonus: 0, fileUrl: db.tour3[teamId].fileUrl });
  }
  const bonus = giveSpeedBonus(db, 'tour3', teamId);
  db.tour3[teamId] = {
    teamId, teamName, format, formatTitle, topic, topicTitle, description,
    fileUrl: req.file ? '/uploads/' + req.file.filename : null,
    fileName: req.file ? req.file.originalname : null,
    fileSize: req.file ? req.file.size : 0,
    bonus: bonus,
    time: new Date().toISOString()
  };
  writeDB(db);
  res.json({ ok: true, fileUrl: db.tour3[teamId].fileUrl, fileName: db.tour3[teamId].fileName, fileSize: db.tour3[teamId].fileSize, bonus: bonus });
});

app.post('/api/tour3/link', (req, res) => {
  const { teamId, teamName, format, formatTitle, topic, topicTitle, description, link } = req.body;
  if (!teamId) return res.status(400).json({ error: 'teamId required' });
  const db = readDB();
  if (db.tour3[teamId] && db.tour3[teamId].time) return res.json({ ok: true, bonus: 0 });
  const bonus = giveSpeedBonus(db, 'tour3', teamId);
  db.tour3[teamId] = { teamId, teamName, format, formatTitle, topic, topicTitle, description, link, bonus: bonus, time: new Date().toISOString() };
  writeDB(db);
  res.json({ ok: true, bonus: bonus });
});

app.post('/api/admin/tour3/score', (req, res) => {
  const { teamId, scores } = req.body;
  const db = readDB();
  if (!db.tour3[teamId]) db.tour3[teamId] = {};
  db.tour3[teamId].score = scores;
  writeDB(db);
  res.json({ ok: true });
});

// ============================================================
// ТУР 4
// ============================================================
app.post('/api/tour4/stage1', (req, res) => {
  const { teamId, teamName, stage1 } = req.body;
  if (!teamId) return res.status(400).json({ error: 'teamId required' });
  const db = readDB();
  if (!db.tour4[teamId]) db.tour4[teamId] = {};
  db.tour4[teamId].teamName = teamName;
  db.tour4[teamId].stage1 = stage1;
  db.tour4[teamId].time = new Date().toISOString();
  writeDB(db);
  res.json({ ok: true });
});

app.post('/api/tour4/stage2', (req, res) => {
  const { teamId, teamName, stage2, stage2Score } = req.body;
  if (!teamId) return res.status(400).json({ error: 'teamId required' });
  const db = readDB();
  if (!db.tour4[teamId]) db.tour4[teamId] = {};
  db.tour4[teamId].teamName = teamName;
  db.tour4[teamId].stage2 = stage2;
  db.tour4[teamId].stage2Score = stage2Score;
  const already = db.tour4[teamId].bonus !== undefined;
  const bonus = already ? 0 : giveSpeedBonus(db, 'tour4', teamId);
  db.tour4[teamId].bonus = db.tour4[teamId].bonus || bonus;
  db.tour4[teamId].time = new Date().toISOString();
  writeDB(db);
  res.json({ ok: true, bonus: bonus });
});

// ============================================================
// АДМИН — СВОДКА
// ============================================================
function computeTeamStats(t, db) {
  const t1 = db.tour1[t.id] || {};
  const t2 = db.tour2[t.id] || {};
  const t3 = db.tour3[t.id] || {};
  const t4 = db.tour4[t.id] || {};

  const quiz = (t1.quiz && t1.quiz.correct) || 0;
  const quizBonus = (t1.quiz && t1.quiz.bonus) || 0;
  const caseScore = Array.isArray(t1.caseScore) ? t1.caseScore.reduce((a, b) => a + (Number(b) || 0), 0) : 0;

  let k = 1;
  if (t1.quiz && t1.quiz.total) {
    const percent = (quiz / 30) * 100;
    if (percent < 50) k = 1.5;
    else if (percent <= 75) k = 1.25;
  }
  const quizWithK = Math.round(quiz * k * 100) / 100;

  const tour2 = t2.correct || 0;
  const tour2Bonus = t2.bonus || 0;
  const tour3 = Array.isArray(t3.score) ? t3.score.reduce((a, b) => a + (Number(b) || 0), 0) : 0;
  const tour3Bonus = t3.bonus || 0;
  const t4s1 = (t4.stage1 && t4.stage1.score) || 0;
  const t4s2 = t4.stage2Score || 0;
  const tour4Bonus = t4.bonus || 0;

  const t1Total = quizWithK + caseScore + quizBonus;
  const tour4 = t4s1 + t4s2 + tour4Bonus;
  const grand = Math.round((t1Total + tour2 + tour2Bonus + tour3 + tour3Bonus + tour4) * 100) / 100;

  return {
    id: t.id, name: t.name, token: t.token, caseId: t.caseId,
    emoji: t.emoji || '🛡', color: t.color || '#157fc4',
    t1Quiz: { correct: quiz, correctK: quizWithK, coefficient: k, total: 30, bonus: quizBonus, time: (t1.quiz && t1.quiz.time) || null },
    t1Case: { title: (t1.kase && t1.kase.caseTitle) || null, answer: (t1.kase && t1.kase.answer) || null, time: (t1.kase && t1.kase.time) || null, score: t1.caseScore || [0,0,0] },
    t1Total: Math.round(t1Total * 100) / 100,
    t2: { correct: tour2, total: 8, bonus: tour2Bonus, time: t2.time || null },
    t3: { formatTitle: t3.formatTitle, topicTitle: t3.topicTitle, description: t3.description, link: t3.link, fileUrl: t3.fileUrl, fileName: t3.fileName, time: t3.time, bonus: tour3Bonus, score: t3.score || [0,0,0,0] },
    t3Total: tour3 + tour3Bonus,
    t4: { stage1: t4.stage1 || null, stage2: t4.stage2 || null, stage2Score: t4s2, bonus: tour4Bonus, time: t4.time },
    t4Total: tour4,
    grand: grand
  };
}

app.get('/api/admin/all', (req, res) => {
  const db = readDB();
  const teams = db.teams.map(t => computeTeamStats(t, db));
  res.json({ teams });
});

app.get('/api/leaderboard', (req, res) => {
  const db = readDB();
  const teams = db.teams.map(t => {
    const s = computeTeamStats(t, db);
    return { id: s.id, name: s.name, emoji: s.emoji, color: s.color, grand: s.grand };
  });
  res.json({ teams });
});

app.post('/api/admin/reset-tour', (req, res) => {
  const tour = String(req.body.tour || '1');
  const db = readDB();
  if (tour === '1') db.tour1 = {};
  else if (tour === '2') db.tour2 = {};
  else if (tour === '3') db.tour3 = {};
  else if (tour === '4') db.tour4 = {};
  if (!db.speedBonus) db.speedBonus = {};
  db.speedBonus['tour' + tour] = [];
  writeDB(db);
  res.json({ ok: true });
});

app.post('/api/admin/clear-all', (req, res) => {
  if (req.body.confirm !== 'YES') return res.status(400).json({ error: 'confirm required' });
  writeDB({ teams: [], tour1: {}, tour2: {}, tour3: {}, tour4: {}, timer: { active: false }, speedBonus: {} });
  res.json({ ok: true });
});

app.use(function (err, req, res, next) {
  if (err) return res.status(400).json({ error: err.message || 'Ошибка загрузки' });
  next();
});

app.listen(3000, () => {
  console.log('Сервер: http://localhost:3000');
  console.log('API: http://localhost:3000/api/teams');
  console.log('Leaderboard: http://localhost:3000/leaderboard.html');
});