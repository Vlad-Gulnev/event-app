// Виджет дуэлей — всплывает поверх любой страницы команды.
// Подключается одной строкой: <script src="duel-widget.js"></script>

(function() {
  'use strict';

  var params = new URLSearchParams(location.search);
  var teamId = params.get('team');
  var token = params.get('token');
  if (!teamId || !token) return;

  var overlay = null;
  var team = null;
  var shownQuestionFor = null;   // ID дуэли, для которой показан вопрос
  var shownResultFor = null;     // ID дуэли, для которой показан результат
  var myAnswer = null;
  var submitted = false;

  fetch('/api/teams/by-token?token=' + encodeURIComponent(token))
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(t) { team = t; })
    .catch(function() {});

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'duelWidgetOverlay';
    overlay.style.cssText = [
      'position:fixed', 'inset:0',
      'background:rgba(10,22,40,0.97)',
      'backdrop-filter:blur(10px)',
      'z-index:99999', 'display:none',
      'overflow-y:auto', 'color:#fff', 'font-family:inherit'
    ].join(';');
    document.body.appendChild(overlay);

    var s = document.createElement('style');
    s.id = 'dwStyles';
    s.textContent =
      '.dw-opt{display:block;padding:12px 14px;margin:6px 0;border:2px solid rgba(255,255,255,0.15);border-radius:10px;cursor:pointer;background:rgba(255,255,255,0.04);color:#fff;font-size:15px;transition:all 0.15s;}' +
      '.dw-opt:hover{background:rgba(255,255,255,0.1);}' +
      '.dw-opt.checked{background:rgba(21,127,196,0.3);border-color:#157fc4;}' +
      '.dw-opt input{margin-right:10px;}' +
      '.dw-timer-warning{color:#ff6b6b !important;animation:dwBlink 0.8s infinite;}' +
      '@keyframes dwBlink{0%,100%{opacity:1}50%{opacity:0.4}}';
    document.head.appendChild(s);
  }

  function hide() { if (overlay) overlay.style.display = 'none'; }
  function show() { if (overlay) overlay.style.display = 'block'; }

  function resetState() {
    shownQuestionFor = null;
    shownResultFor = null;
    myAnswer = null;
    submitted = false;
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function renderQuestion(duel, q, timeLeftSec) {
    var isA = String(team.id) === String(duel.teamA.id);
    var myTeam = isA ? duel.teamA : duel.teamB;
    var oppTeam = isA ? duel.teamB : duel.teamA;
    var oppAnswered = isA ? (duel.answers && duel.answers.B) : (duel.answers && duel.answers.A);

    var galleryHtml = q.images.map(function(src) {
      return '<img src="' + src + '" alt="" style="height:280px;border-radius:10px;flex-shrink:0;box-shadow:0 4px 20px rgba(0,0,0,0.5);">';
    }).join('');

    var optionsHtml = q.options.map(function(opt, j) {
      var inputType = q.multiple ? 'checkbox' : 'radio';
      var checked = myAnswer && myAnswer.indexOf(j) !== -1;
      var cls = 'dw-opt' + (checked ? ' checked' : '');
      var disabled = submitted ? ' disabled' : '';
      return '<label class="' + cls + '">' +
        '<input type="' + inputType + '" name="dwAnswer" value="' + j + '" ' + (checked ? 'checked' : '') + disabled + ' onchange="window.__dwPick(' + j + ', this)"> ' + esc(opt) +
      '</label>';
    }).join('');

    var timerWarning = timeLeftSec <= 10 ? ' dw-timer-warning' : '';

    overlay.innerHTML =
      '<div style="max-width:700px;margin:0 auto;padding:24px;">' +
        '<div style="text-align:center;margin-bottom:16px;">' +
          '<div style="font-size:13px;letter-spacing:3px;color:rgba(255,255,255,0.5);text-transform:uppercase;">⚔️ Дуэль №' + duel.id + '</div>' +
          '<div style="display:flex;justify-content:center;align-items:center;gap:14px;margin-top:10px;flex-wrap:wrap;">' +
            '<div style="display:flex;align-items:center;gap:8px;padding:6px 14px;background:rgba(255,255,255,0.08);border-radius:10px;border:2px solid ' + (isA ? myTeam.color : 'rgba(255,255,255,0.15)') + ';font-weight:800;font-size:17px;">' + myTeam.emoji + ' ' + esc(myTeam.name) + '</div>' +
            '<span style="color:#ffd700;font-weight:900;letter-spacing:2px;">VS</span>' +
            '<div style="display:flex;align-items:center;gap:8px;padding:6px 14px;background:rgba(255,255,255,0.08);border-radius:10px;border:2px solid ' + (!isA ? oppTeam.color : 'rgba(255,255,255,0.15)') + ';font-weight:800;font-size:17px;opacity:0.7;">' + oppTeam.emoji + ' ' + esc(oppTeam.name) + (oppAnswered ? ' ✓' : '') + '</div>' +
          '</div>' +
        '</div>' +

        '<div class="dw-timer' + timerWarning + '" id="dwTimer" style="text-align:center;font-size:56px;font-weight:900;font-variant-numeric:tabular-nums;margin:16px 0;letter-spacing:3px;">' + pad(Math.floor(timeLeftSec/60)) + ':' + pad(timeLeftSec % 60) + '</div>' +

        '<div style="background:rgba(255,255,255,0.04);border:2px solid rgba(255,255,255,0.1);border-radius:14px;padding:18px;margin-bottom:14px;">' +
          '<h2 style="font-size:17px;color:#7cc5f0;margin:0 0 10px;">' + esc(q.title) + '</h2>' +
          '<div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:10px;">' + galleryHtml + '</div>' +
          '<div style="font-size:18px;font-weight:700;margin:10px 0;">' + esc(q.text) + '</div>' +
          '<div id="dwOptions">' + optionsHtml + '</div>' +
          '<button id="dwSubmitBtn" onclick="window.__dwSubmit()" style="width:100%;padding:16px;font-size:17px;font-weight:700;background:#157fc4;color:#fff;border:none;border-radius:10px;cursor:pointer;font-family:inherit;margin-top:12px;" ' + (submitted ? 'disabled' : '') + '>' + (submitted ? '✓ Ответ отправлен' : 'Отправить ответ') + '</button>' +
        '</div>' +

        '<div style="text-align:center;font-size:14px;color:rgba(255,255,255,0.5);">Отвечайте быстрее — за скорость дают больше баллов!</div>' +
      '</div>';
  }

  window.__dwPick = function(val, el) {
    if (submitted) return;
    var multiple = el.type === 'checkbox';
    if (multiple) {
      if (!myAnswer) myAnswer = [];
      var i = myAnswer.indexOf(val);
      if (i === -1) myAnswer.push(val); else myAnswer.splice(i, 1);
    } else {
      myAnswer = [val];
    }
    document.querySelectorAll('.dw-opt').forEach(function(l) { l.classList.remove('checked'); });
    document.querySelectorAll('.dw-opt input:checked').forEach(function(inp) {
      inp.closest('.dw-opt').classList.add('checked');
    });
  };

  window.__dwSubmit = function() {
    if (submitted) return;
    if (!myAnswer || myAnswer.length === 0) { alert('Выберите ответ'); return; }
    submitted = true;
    var btn = document.getElementById('dwSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Отправка…';

    fetch('/api/duel/answer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: teamId, answer: myAnswer })
    })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (res.error) {
          submitted = false;
          btn.disabled = false;
          btn.textContent = 'Отправить ответ';
          alert('Ошибка: ' + res.error);
        } else {
          btn.textContent = '✓ Ответ отправлен';
        }
      })
      .catch(function() {
        submitted = false;
        btn.disabled = false;
        btn.textContent = 'Отправить ответ';
      });
  };

  window.__dwClose = function() {
    hide();
  };

  function renderFinished(duel) {
    if (!team) return;
    var isA = String(team.id) === String(duel.teamA.id);
    var r = duel.result || {};
    var myScore = isA ? (r.scoreA || 0) : (r.scoreB || 0);
    var oppScore = isA ? (r.scoreB || 0) : (r.scoreA || 0);
    var myCorrect = isA ? r.correctA : r.correctB;
    var myAnswered = isA ? r.answeredA : r.answeredB;
    var myTeam = isA ? duel.teamA : duel.teamB;

    var emoji = myScore > oppScore ? '🏆' : (myScore < oppScore ? '😔' : '🤝');
    var title = myScore > oppScore ? 'Победа!' : (myScore < oppScore ? 'Поражение' : 'Ничья');

    var correctHtml = !myAnswered
      ? '<p style="color:#ff6b6b;font-weight:700;margin-top:10px;">Вы не успели ответить</p>'
      : (myCorrect
          ? '<p style="color:#52d681;font-weight:700;margin-top:10px;">✓ Ваш ответ правильный</p>'
          : '<p style="color:#ff6b6b;font-weight:700;margin-top:10px;">✗ Ваш ответ неправильный</p>');

    overlay.innerHTML =
      '<div style="max-width:520px;margin:0 auto;padding:40px 24px;text-align:center;">' +
        '<div style="font-size:80px;margin-bottom:16px;">' + emoji + '</div>' +
        '<h2 style="font-size:28px;margin:0 0 16px;">' + title + '</h2>' +
        '<div style="font-size:64px;font-weight:900;color:#4fc3f7;font-variant-numeric:tabular-nums;margin:16px 0;">' + myScore + ' : ' + oppScore + '</div>' +
        '<div style="font-size:15px;color:rgba(255,255,255,0.7);">' + myTeam.emoji + ' ' + esc(myTeam.name) + '</div>' +
        correctHtml +
        '<p style="color:#ffd700;font-weight:700;margin-top:16px;">+ ' + myScore + ' баллов в Тур 2</p>' +
        '<button onclick="window.__dwClose()" style="margin-top:24px;padding:14px 32px;font-size:16px;font-weight:700;background:#157fc4;color:#fff;border:none;border-radius:10px;cursor:pointer;font-family:inherit;">Продолжить</button>' +
      '</div>';
  }

  function poll() {
    if (!team) return;
    fetch('/api/duel/active')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        // Нет дуэли или не наша
        if (!data.duel) { hide(); resetState(); return; }
        var duel = data.duel;
        var isMy = (String(team.id) === String(duel.teamA.id) || String(team.id) === String(duel.teamB.id));
        if (!isMy) { hide(); resetState(); return; }

        // Дуэль завершена
        if (duel.status === 'finished') {
          if (shownResultFor === duel.id) return;
          shownResultFor = duel.id;
          shownQuestionFor = null;
          show();
          renderFinished(duel);
          return;
        }

        // Активная дуэль — новая?
        if (shownQuestionFor !== duel.id) {
          shownQuestionFor = duel.id;
          shownResultFor = null;
          myAnswer = null;
          submitted = false;
        }

        // Уже ответил ранее (на случай перезагрузки страницы)
        var isA = String(team.id) === String(duel.teamA.id);
        var key = isA ? 'A' : 'B';
        if (duel.answers && duel.answers[key]) {
          submitted = true;
          if (!myAnswer) myAnswer = duel.answers[key].answer;
        }

        var q = data.question;
        if (!q) { hide(); return; }

        show();

        // Обновляем только таймер, если вопрос уже нарисован
        var existingTimer = document.getElementById('dwTimer');
        var hasOptions = overlay.querySelector('input[name="dwAnswer"]');
        if (existingTimer && hasOptions && shownQuestionFor === duel.id) {
          existingTimer.textContent = pad(Math.floor(data.timeLeftSec/60)) + ':' + pad(data.timeLeftSec % 60);
          existingTimer.classList.toggle('dw-timer-warning', data.timeLeftSec <= 10);
        } else {
          renderQuestion(duel, q, data.timeLeftSec);
        }
      })
      .catch(function() {});
  }

  function init() {
    createOverlay();
    var waitTeam = setInterval(function() {
      if (team) { clearInterval(waitTeam); poll(); setInterval(poll, 1500); }
    }, 500);
    setTimeout(function() { clearInterval(waitTeam); }, 20000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();