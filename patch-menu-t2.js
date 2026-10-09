const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'docs', 'menu.html');
if (!fs.existsSync(file)) { console.error('Нет menu.html'); process.exit(1); }
let html = fs.readFileSync(file, 'utf8');
fs.copyFileSync(file, file + '.bak-t2');
let changed = 0;

const oldTour2 = `{ num: 2, title: 'Психологический иммунитет', desc: 'Разбор манипуляций + ситуационные задачи', href: 'play2.html', ready: true, resultKey: 'result2_team_' }`;
const newTour2 = `{ num: 2, title: 'Психологический иммунитет', desc: 'Играется в формате дуэлей. Ждите вызов на телефон.', href: 'play2.html', ready: false, duelOnly: true, resultKey: 'result2_team_' }`;

if (html.includes(newTour2)) { console.log('→ Тур 2 уже помечен'); }
else if (html.includes(oldTour2)) { html = html.replace(oldTour2, newTour2); changed++; console.log('✓ Тур 2 помечен как duelOnly'); }
else { console.log('✗ Не нашёл строку Тура 2'); }

const oldRender = `        var btnHtml;
        if (t.ready) {
          btnHtml = '<a class="btn btn-primary" href="' + t.href + '?team=' + team.id + '&token=' + team.token + '">' +
                    (done ? 'Открыть заново' : 'Начать') + ' →</a>';
        } else {
          btnHtml = '<button class="btn btn-secondary" disabled style="opacity:0.6; cursor:not-allowed;">Скоро</button>';
        }`;
const newRender = `        var btnHtml;
        if (t.duelOnly) {
          btnHtml = '<span style="display:inline-block;padding:10px 20px;background:#fff3cd;color:#856404;border-radius:8px;font-weight:700;font-size:14px;">⚔️ Только в дуэли</span>';
        } else if (t.ready) {
          btnHtml = '<a class="btn btn-primary" href="' + t.href + '?team=' + team.id + '&token=' + team.token + '">' +
                    (done ? 'Открыть заново' : 'Начать') + ' →</a>';
        } else {
          btnHtml = '<button class="btn btn-secondary" disabled style="opacity:0.6; cursor:not-allowed;">Скоро</button>';
        }`;

if (html.includes('t.duelOnly')) { console.log('→ Логика duelOnly уже есть'); }
else if (html.includes(oldRender)) { html = html.replace(oldRender, newRender); changed++; console.log('✓ Логика duelOnly добавлена'); }
else { console.log('✗ Не нашёл блок рендера кнопки'); }

if (changed > 0) { fs.writeFileSync(file, html, 'utf8'); console.log('\nГотово! Изменений: ' + changed + ' из 2.'); }
else { console.log('\nНичего не изменено.'); }