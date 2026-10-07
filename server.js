const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const DB_FILE = path.join(__dirname, 'data', 'db.json');

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ teams: [], answers: [] }, null, 2));
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/teams', (req, res) => {
  res.json(readDB().teams);
});

app.post('/api/teams', (req, res) => {
  const db = readDB();
  const team = {
    id: db.teams.length + 1,
    name: req.body.name || `Команда ${db.teams.length + 1}`,
    token: Math.random().toString(36).slice(2, 10)
  };
  db.teams.push(team);
  writeDB(db);
  res.json(team);
});

app.post('/api/answer', (req, res) => {
  const { teamId, tour, questionId, answer } = req.body;
  const db = readDB();
  db.answers.push({ teamId, tour, questionId, answer, at: new Date().toISOString() });
  writeDB(db);
  res.json({ ok: true });
});

app.get('/api/answers', (req, res) => {
  res.json(readDB().answers);
});

// сводка для админки: команды + сколько правильных ответов
app.get('/api/admin/summary', (req, res) => {
  const db = readDB();
  const tour = Number(req.query.tour || 1);

  // правильные ответы для тура 1 (совпадают с play.html)
  const correctByTour = {
    1: [0,1,1,0,2,3,1,0,1,1,1,1,0,1,1,0,2,1,0,2,1,0,2,1,0,2,1,1,1,1]
  };

  const correct = correctByTour[tour] || [];

  const summary = db.teams.map(t => {
    const answers = db.answers.filter(a =>
      String(a.teamId) === String(t.id) && Number(a.tour) === tour
    );
    let points = 0;
    const answered = {};
    answers.forEach(a => {
      answered[a.questionId] = a.answer;
    });
    correct.forEach((c, i) => {
      if (answered[i + 1] === c) points++;
    });
    return {
      id: t.id,
      name: t.name,
      token: t.token,
      answered: answers.length,
      points: points,
      maxPoints: correct.length
    };
  });

  res.json({ tour: tour, teams: summary });
});

// сброс ответов по туру (на случай перезапуска)
app.post('/api/admin/reset', (req, res) => {
  const tour = Number(req.body.tour || 1);
  const db = readDB();
  db.answers = db.answers.filter(a => Number(a.tour) !== tour);
  writeDB(db);
  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log('Сервер: http://localhost:3000');
  console.log('Проверка API: http://localhost:3000/api/teams');
});