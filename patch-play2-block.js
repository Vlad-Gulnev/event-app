const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'docs', 'play2.html');
if (!fs.existsSync(file)) { console.error('Нет play2.html'); process.exit(1); }
let html = fs.readFileSync(file, 'utf8');
fs.copyFileSync(file, file + '.bak-t2');

if (html.includes('play2-blocked')) { console.log('→ Блокировка уже добавлена'); process.exit(0); }

const anchor = `var params = new URLSearchParams(location.search);
var teamId = params.get('team');
var token  = params.get('token');`;

const guard = `var params = new URLSearchParams(location.search);
var teamId = params.get('team');
var token  = params.get('token');

if (teamId) {
  document.body.innerHTML =
    '<div style="max-width:520px;margin:80px auto;padding:32px;text-align:center;font-family:inherit;">' +
      '<div style="font-size:72px;margin-bottom:16px;">⚔️</div>' +
      '<h1 style="color:#0f5d92;font-size:24px;margin-bottom:12px;">Тур 2 проходит в формате дуэлей</h1>' +
      '<p style="color:#5a6470;font-size:16px;line-height:1.5;">Не нужно открывать эту страницу вручную. Ведущий вызовет вашу команду — вопрос появится автоматически поверх любой страницы.</p>' +
      '<p style="margin-top:24px;"><a href="menu.html?team=' + teamId + '&token=' + token + '" style="display:inline-block;padding:14px 28px;background:#157fc4;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;">← Вернуться в меню туров</a></p>' +
    '</div>';
  throw new Error('play2-blocked');
}`;

if (html.includes(anchor)) {
  html = html.replace(anchor, guard);
  fs.writeFileSync(file, html, 'utf8');
  console.log('✓ Блокировка добавлена');
} else {
  console.log('✗ Не нашёл anchor — пришлите первые 30 строк play2.html');
}