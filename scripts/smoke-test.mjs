import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = vm.createContext({ window: {} });

for (const relativePath of ['data/tiles.js', 'data/markers.js', 'data/images.js', 'data/ru.js', 'data/progress.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

const { TILES, MARKERS, IMAGES } = context.window;
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const countValues = object => Object.values(object).reduce((total, values) => total + values.length, 0);

assert(countValues(TILES) === 244, `ожидалось 244 тайла, найдено ${countValues(TILES)}`);
assert(countValues(MARKERS.points) === 244, `ожидалось 244 маркера, найдено ${countValues(MARKERS.points)}`);
assert(countValues(IMAGES) === 349, `ожидалось 349 скриншотов, найдено ${countValues(IMAGES)}`);

for (const [level, tiles] of Object.entries(TILES)) {
  for (const tile of tiles) {
    const relativePath = `img/tiles/L${level}/${tile}.webp`;
    assert(fs.existsSync(path.join(root, relativePath)), `нет тайла ${relativePath}`);
  }
}
for (const images of Object.values(IMAGES)) {
  for (const relativePath of images) assert(fs.existsSync(path.join(root, relativePath)), `нет скриншота ${relativePath}`);
}
assert(fs.existsSync(path.join(root, 'img/00890085.webp')), 'нет изображения золотой монеты');

const hangul = /[\uac00-\ud7af]/;
for (const [layer, points] of Object.entries(MARKERS.points)) {
  for (const point of points) {
    assert(!hangul.test(point.n || ''), `не переведено название ${layer}: ${point.n}`);
    assert(!hangul.test(point.a || ''), `не переведена область ${layer}: ${point.a}`);
  }
}
for (const layer of Object.values(MARKERS.meta.layers)) {
  assert(!hangul.test(layer.label || ''), `не переведён слой: ${layer.label}`);
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(html.includes('<html lang="ru">'), 'не задан язык страницы ru');
assert(html.includes('data/ru.js'), 'не подключена русская локализация');
assert(html.includes('data/progress.js'), 'не подключён совместимый импорт прогресса');
assert(html.includes('TACHYON_PROGRESS.parse'), 'импорт не использует совместимый парсер прогресса');
assert(html.includes('https://www.korbdo.co.kr/#tachyon'), 'не указана страница разработчика оригинальной карты');
assert(html.includes('Оригинальная карта принадлежит разработчику'), 'нет явного указания владельца оригинальной карты');
assert(html.includes('id="map-stage"'), 'нет центрированного контейнера карты');
assert(!html.includes('Следы и наследие Тахиона с отметками прохождения'), 'остался лишний подзаголовок');
assert(!html.includes('244 точки · 349 скриншотов'), 'остался лишний счётчик материалов');
assert(!html.includes('Русская локализация · прогресс сохраняется в этом браузере'), 'осталась лишняя подпись в подвале');
assert(html.includes('stage.clientWidth'), 'canvas не привязан к ширине контейнера');
assert(html.includes('stage.clientHeight'), 'canvas не привязан к высоте контейнера');
assert(!html.includes('cloudflareinsights.com'), 'остался внешний скрипт Cloudflare');
assert(!html.includes('rocket-loader'), 'остался Cloudflare Rocket Loader');

const validProgressKeys = ['유산-14', '흔적-4', '지식-1059420_817570'];
const koreanProgress = context.window.TACHYON_PROGRESS.parse(
  JSON.stringify({ app: 'tachyon-done', version: 1, done: ['유산-14', '흔적-4'] }),
  validProgressKeys
);
assert(koreanProgress.done.join('|') === '유산-14|흔적-4', 'не импортируются ключи корейской карты');
const russianProgress = context.window.TACHYON_PROGRESS.parse(
  JSON.stringify({ done: ['Наследие-14', 'След-4', 'Знания-1059420_817570'] }),
  validProgressKeys
);
assert(russianProgress.done.join('|') === validProgressKeys.join('|'), 'не нормализуются русские ключи прогресса');
let oversizedProgressRejected = false;
try {
  context.window.TACHYON_PROGRESS.parse(JSON.stringify(new Array(1001).fill('유산-14')), validProgressKeys);
} catch (error) {
  oversizedProgressRejected = true;
}
assert(oversizedProgressRejected, 'импорт не ограничивает чрезмерно большой список прогресса');

const workflowPath = path.join(root, '.github/workflows/pages.yml');
assert(fs.existsSync(workflowPath), 'нет workflow для GitHub Pages');
if (fs.existsSync(workflowPath)) {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assert(workflow.includes('actions/deploy-pages@v4'), 'workflow не публикует GitHub Pages');
}

if (failures.length) {
  console.error(failures.map(message => `FAIL: ${message}`).join('\n'));
  process.exit(1);
}

console.log('OK: 244 маркера, 244 тайла и 349 скриншотов; локализация и пути проверены.');
