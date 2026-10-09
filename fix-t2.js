const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'server.js');
if (!fs.existsSync(file)) { console.error('Нет server.js'); process.exit(1); }

let html = fs.readFileSync(file, 'utf8');
fs.copyFileSync(file, file + '.bak5');

let changed = 0;

// 1. Добавить объявление tour2Total перед t1Total
const anchor1 = '  const t1Total = Math.round((quizWithK + caseScore + quizBonus + quality.t1Quiz + quality.t1Case) * 100) / 100;';
const insert1 = '  const tour2Total = tour2 + tour2Bonus + quality.t2 + duelScore;\n\n' + anchor1;

if (html.includes('const tour2Total = tour2 +')) {
  console.log('→ tour2Total уже объявлена');
} else if (html.includes(anchor1)) {
  html = html.replace(anchor1, insert1);
  changed++;
  console.log('✓ tour2Total объявлена');
} else {
  console.log('✗ Не нашёл строку t1Total');
}

// 2. Исправить grand — убрать дублирование tour2/tour2Bonus/quality.t2/duelScore
const oldGrand = 'const grand = Math.round((t1Total + tour2 + tour2Bonus + quality.t2 + tour3 + tour3Bonus + quality.t3 + tour4 + duelScore) * 100) / 100;';
const newGrand = 'const grand = Math.round((t1Total + tour2Total + tour3 + tour3Bonus + quality.t3 + tour4) * 100) / 100;';

if (html.includes(newGrand)) {
  console.log('→ grand уже исправлена');
} else if (html.includes(oldGrand)) {
  html = html.replace(oldGrand, newGrand);
  changed++;
  console.log('✓ grand пересчитана через tour2Total');
} else {
  console.log('✗ Не нашёл строку grand');
}

if (changed > 0) {
  fs.writeFileSync(file, html, 'utf8');
  console.log('\nГотово! Изменений: ' + changed + ' из 2.');
} else {
  console.log('\nНичего не изменено.');
}