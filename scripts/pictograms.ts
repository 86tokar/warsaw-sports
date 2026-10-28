// Скачивает спортивные пиктограммы с Wikimedia Commons, проверяет лицензию каждого файла и кладёт их
// в public/sports/<имя>.svg — белая фигура на тёмном скруглённом квадрате (сама фигура не меняется).
// Заодно пишет src/lib/pictograms.ts: какой вид спорта какой пиктограммой и авторы для страницы источников.
// Запуск: npx tsx scripts/pictograms.ts
import { mkdirSync, writeFileSync } from 'node:fs';

// Вид спорта (slug из SPORTS) -> файл на Commons. Для йоги, скандинавской ходьбы, «на улице» и «другое»
// подходящих пиктограмм в открытых наборах нет — у них значка не будет.
const MAP: Record<string, string> = {
  football: 'Football pictogram.svg',
  futsal: 'Football pictogram.svg',
  basketball: 'Basketball pictogram.svg',
  volleyball: 'Volleyball pictogram.svg',
  handball: 'Handball pictogram.svg',
  team_games: 'Handball pictogram.svg',
  hockey: 'Ice hockey pictogram.svg',
  running: 'Athletics pictogram.svg',
  athletics: 'Athletics pictogram.svg',
  swimming: 'Swimming pictogram.svg',
  rowing: 'Rowing pictogram.svg',
  water_sports: 'Canoeing (flatwater) pictogram.svg',
  cycling: 'Cycling (road) pictogram.svg',
  tennis: 'Tennis pictogram.svg',
  padel: 'Tennis pictogram.svg',
  table_tennis: 'Table tennis pictogram.svg',
  badminton: 'Badminton pictogram.svg',
  squash: 'Squash pictogram.svg',
  racket: 'Racquets pictogram.svg',
  rugby: 'Rugby Sevens pictogram.svg',
  boxing: 'Boxing pictogram.svg',
  kickboxing: 'Savate pictogram.svg',
  judo: 'Judo pictogram.svg',
  karate: 'Karate pictogram.svg',
  taekwondo: 'Taekwondo pictogram.svg',
  wrestling: 'Wrestling pictogram.svg',
  martial_arts: 'Wushu pictogram.svg',
  fencing: 'Fencing pictogram.svg',
  gymnastics: 'Gymnastics pictogram.svg',
  fitness: 'Weightlifting pictogram.svg',
  dance: 'Dancesport pictogram.svg',
  climbing: 'Sport climbing pictogram.svg',
  skating: 'Figure skating pictogram.svg',
  winter_sports: 'Alpine skiing pictogram.svg',
};

// Только открытые лицензии: общественное достояние, CC0, CC BY, CC BY-SA
const OPEN = /^(public domain|pd|cc0|cc by(-sa)? \d)/i;
const UA = 'WarsawSportsBot/0.1 (https://warsaw-sports.vercel.app; non-commercial sports aggregator)';
const BG = '#0f1b26';
const FG = '#ffffff';

type Info = { title: string; url: string; license: string; artist: string; page: string };

async function fetchInfo(titles: string[]): Promise<Map<string, Info>> {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.search = new URLSearchParams({
    action: 'query',
    titles: titles.map((t) => `File:${t}`).join('|'),
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiextmetadatafilter: 'LicenseShortName|Artist',
    redirects: '1',
    format: 'json',
  }).toString();
  const data = await (await fetch(api, { headers: { 'User-Agent': UA } })).json();
  // Перенаправления: запрошенное имя -> настоящее имя файла
  const alias = new Map<string, string>();
  for (const r of [...(data.query.normalized ?? []), ...(data.query.redirects ?? [])]) alias.set(r.to, r.from);
  const out = new Map<string, Info>();
  for (const page of Object.values<any>(data.query.pages)) {
    const ii = page.imageinfo?.[0];
    if (!ii) continue;
    let asked = page.title as string;
    while (alias.has(asked)) asked = alias.get(asked)!;
    // Текст без HTML-тегов и сущностей ("Original: Parutakupiu<br>Vector: …", "&amp;")
    const strip = (s = '') =>
      s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
    out.set(asked.replace(/^File:/, ''), {
      title: page.title.replace(/^File:/, ''),
      url: ii.url,
      license: strip(ii.extmetadata?.LicenseShortName?.value),
      artist: strip(ii.extmetadata?.Artist?.value),
      page: ii.descriptionurl,
    });
  }
  return out;
}

// Оборачиваем исходный SVG: тёмный квадрат, внутри — исходная картинка как вложенный <svg>.
// Чёрное становится белым, белое (просветы в фигуре) — цветом фона.
// rounded=false — квадрат без скругления (для иконки iOS: углы скругляет система)
function wrap(svg: string, rounded = true): string {
  // Файлы из Illustrator объявляют сущности в DOCTYPE (<!ENTITY ns_ai "…">) и ссылаются на них (&ns_ai;):
  // подставляем значения и убираем DOCTYPE целиком
  const entities = [...svg.matchAll(/<!ENTITY\s+(\w+)\s+"([^"]*)"\s*>/g)].map((m) => [m[1], m[2]] as const);
  let s = svg
    .replace(/<\?xml[^>]*>/g, '')
    .replace(/<!DOCTYPE[^[>]*(\[[\s\S]*?\])?\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
  for (const [name, value] of entities) s = s.split(`&${name};`).join(value);
  const open = /<svg\b[^>]*>/i.exec(s)?.[0];
  if (!open) throw new Error('нет <svg>');
  const num = (name: string) => Number(new RegExp(`\\b${name}="([\\d.]+)`).exec(open)?.[1]);
  const viewBox = /viewBox="([^"]+)"/.exec(open)?.[1] ?? `0 0 ${num('width') || 300} ${num('height') || 300}`;
  const newOpen = open
    .replace(/\s(width|height|x|y|viewBox|fill)="[^"]*"/g, '')
    .replace(/<svg/i, `<svg x="6" y="6" width="36" height="36" viewBox="${viewBox}" fill="__FIGURE__"`);
  s = s.replace(open, newOpen);
  // По яркости: тёмное (фигура, в том числе «почти чёрное» вроде #0c0808) — белым, светлое (просветы) — цветом фона
  const swap = (c: string) => {
    const v = c.toLowerCase();
    if (v === 'black') return FG;
    if (v === 'white') return BG;
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v)?.[1];
    if (!hex) return c;
    const full = hex.length === 3 ? hex.replace(/./g, (x) => x + x) : hex;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum < 0.35 ? FG : lum > 0.75 ? BG : c;
  };
  s = s.replace(/\b(fill|stroke)="([^"]+)"/g, (_, a, c) => `${a}="${swap(c)}"`);
  s = s.replace(/\b(fill|stroke):\s*([#\w]+)/g, (_, a, c) => `${a}:${swap(c)}`);
  // Цвет фигуры по умолчанию ставим после замены цветов, иначе замена перекрасила бы его обратно
  s = s.replace('fill="__FIGURE__"', `fill="${FG}"`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="${rounded ? 9 : 0}" fill="${BG}"/>${s}</svg>\n`;
}

const fileKey = (title: string) => title.replace(/ pictogram\.svg$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Иконка сайта — бегун из того же набора
const FAVICON_SPORT = 'running';

async function main() {
  let favicon = '';
  const titles = Array.from(new Set(Object.values(MAP)));
  const info = await fetchInfo(titles);
  mkdirSync('public/sports', { recursive: true });
  const icons: Record<string, string> = {};
  const credits: { file: string; page: string; license: string; artist: string }[] = [];
  const done = new Map<string, string>();
  for (const [slug, title] of Object.entries(MAP)) {
    if (done.has(title)) { icons[slug] = done.get(title)!; continue; }
    const i = info.get(title);
    if (!i) { console.log(`✗ ${slug}: файл «${title}» не найден`); continue; }
    if (!OPEN.test(i.license)) { console.log(`✗ ${slug}: лицензия «${i.license}» не открытая — пропущено`); continue; }
    const svg = await (await fetch(i.url, { headers: { 'User-Agent': UA } })).text();
    const key = fileKey(title);
    writeFileSync(`public/sports/${key}.svg`, wrap(svg));
    if (slug === FAVICON_SPORT) favicon = svg;
    done.set(title, key);
    icons[slug] = key;
    credits.push({ file: i.title, page: i.page, license: i.license, artist: i.artist });
    console.log(`✓ ${slug} -> ${key}.svg (${i.license}; ${i.artist})`);
    await new Promise((r) => setTimeout(r, 300));
  }
  writeFileSync(
    'src/lib/pictograms.ts',
    `// Сгенерировано scripts/pictograms.ts — не править вручную.\n` +
      `// Пиктограммы видов спорта из Wikimedia Commons (открытые лицензии), файлы в public/sports/.\n` +
      `export const SPORT_PICTOGRAM: Record<string, string> = ${JSON.stringify(icons, null, 2)};\n\n` +
      `export const PICTOGRAM_CREDITS = ${JSON.stringify(credits, null, 2)};\n`,
  );
  if (favicon) {
    writeFileSync('src/app/icon.svg', wrap(favicon));
    writeFileSync(
      'src/lib/favicon-svg.ts',
      `// Сгенерировано scripts/pictograms.ts: иконка сайта без скругления (для apple-icon)\n` +
        `export const FAVICON_SQUARE_SVG = ${JSON.stringify(wrap(favicon, false).trim())};\n`,
    );
  }
  console.log(`\nГотово: ${credits.length} файлов, ${Object.keys(icons).length} видов спорта со значком.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
