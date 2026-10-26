// Городской каталог секций sport.um.warszawa.pl/zajecia-sportowe (Urząd m.st. Warszawy).
// Каталог строго структурирован (подписанные поля), поэтому разбирается программой, а не вручную.
// Скачивает страницы списка и страницы занятий (с кэшем), пишет текст в ingest/out/pages/warszawa-zajecia.txt
// и выписанные секции в ingest/out/extracted/warszawa-zajecia.json. Дальше — обычный npm run ingest:dry.
// Флаги: --max-pages=N (только первые N страниц списка, для проверки), --refresh (игнорировать кэш).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fetchPage, robotsVerdict } from './fetch';
import { htmlToText } from './html';
import { EXTRACTED_DIR, PAGES_DIR, type ExtractedActivity } from './schema';
import { SPORTS } from './sources';

export const SOURCE_ID = 'warszawa-zajecia';
export const LIST_URL = 'https://sport.um.warszawa.pl/zajecia-sportowe';
const PAGE_PARAM = '_AssetPublisher_hz0eN6CDK828_cur';
const CACHE_DIR = 'ingest/out/cache';
const CACHE_DAYS = 7;

const args = process.argv.slice(2);
const MAX_PAGES = Number(args.find((a) => a.startsWith('--max-pages='))?.split('=')[1] ?? 200);
const REFRESH = args.includes('--refresh');

type Card = {
  url: string;
  title: string;
  addressee: string[];
  categories: string[];
  district: string;
  days: string[];
  dates: string[];
  time: string | null;
  cardText: string;
};

// Скачивание с кэшем: повторный запуск в течение недели не нагружает сайт
async function cached(url: string, maxAgeDays: number): Promise<string> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const file = `${CACHE_DIR}/${createHash('sha1').update(url).digest('hex')}.html`;
  if (!REFRESH && existsSync(file) && (Date.now() - statSync(file).mtimeMs) / 86_400_000 < maxAgeDays) {
    return readFileSync(file, 'utf8');
  }
  const html = await fetchPage(url);
  writeFileSync(file, html);
  return html;
}

const FIELDS = ['Adresat oferty', 'Kategoria', 'Lokalizacja', 'Dzień tygodnia', 'Termin', 'Godzina'] as const;
const list = (s: string | undefined) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

// Карточки списка: "(ссылка: url) Название", затем подписанные поля "Adresat oferty:" … "Godzina:"
function parseCards(text: string): Card[] {
  const L = text.split('\n').map((s) => s.trim());
  const cards: Card[] = [];
  for (let i = 0; i < L.length; i++) {
    // Ссылки на занятия: sport.um.warszawa.pl[/waw/<ośrodek>]/-/<slug> или районные порталы <dzielnica>.um.warszawa.pl/-/<slug>
    const m = /^\(ссылка: (https:\/\/[a-z-]+\.um\.warszawa\.pl(?:\/\S*)?\/-\/\S+)\) (.+)$/.exec(L[i]);
    if (!m || /\?_AssetPublisher/.test(m[1])) continue;
    const f: Record<string, string> = {};
    let j = i + 1;
    for (; j < L.length && !L[j].startsWith('(ссылка:') && !/^Wyświetlanie/.test(L[j]); j++) {
      const key = FIELDS.find((k) => L[j] === `${k}:`);
      if (key) f[key] = L[j + 1] ?? '';
    }
    if (!f['Adresat oferty'] && !f['Kategoria']) continue;
    cards.push({
      url: m[1],
      title: m[2].replace(/ Link otwiera się w nowej karcie$/, ''),
      addressee: list(f['Adresat oferty']),
      categories: list(f['Kategoria']),
      district: f['Lokalizacja'] ?? '',
      days: list(f['Dzień tygodnia']),
      dates: list(f['Termin']),
      time: /^\d{1,2}:\d{2}$/.test(f['Godzina'] ?? '') ? f['Godzina'] : null,
      cardText: L.slice(i, j).filter((l) => l && !l.startsWith('[')).join('\n'),
    });
  }
  return cards;
}

// Основной блок страницы занятия: от кнопок «Pobierz jako plik PDF» до «Pozostałe zajęcia sportowe».
// E-mail и телефоны вырезаем: контакты не храним, на сайте только ссылка на страницу.
function detailBlock(text: string): { body: string; address: string | null; isoDates: string[] } {
  const start = text.indexOf('Pobierz jako plik PDF');
  const end = text.indexOf('Pozostałe zajęcia sportowe', start);
  const block = text.slice(start < 0 ? 0 : start, end < 0 ? undefined : end);
  const lines = block
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/otwiera się w nowej karcie|^\[|^Pobierz jako/.test(l));
  const body = lines
    .join('\n')
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[e-mail]')
    .replace(/(\+48[\s-]?)?\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/g, '[telefon]');
  const ai = lines.lastIndexOf('Adres');
  // После поля "Adres" идут строки адреса. Отбрасываем текст виджета карты и контакты:
  // строки и части через запятую с телефоном, e-mail или ссылкой
  const CONTACT = /telefon|tel\.|e-mail|@|https?:\/\/|\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b|\b\d{2}[\s-]\d{3}[\s-]\d{2}[\s-]\d{2}\b/i;
  const addrParts =
    ai >= 0
      ? lines
          .slice(ai + 1)
          .filter((l) => !/lokalizację na mapie|wczytywanie mapy|ciasteczka/i.test(l))
          .flatMap((l) => l.split(/,\s*/))
          .map((p) => p.trim())
          .filter((p) => p && p !== 'Warszawa' && !/^\d{2}-\d{3}$/.test(p) && !CONTACT.test(p))
      : [];
  const isoDates = /^Termin$/m.test(body) ? (body.match(/\b20\d\d-\d\d-\d\d\b/g) ?? []) : [];
  return { body, address: addrParts.length ? addrParts.join(', ') : null, isoDates };
}

const DAYS: Record<string, string> = {
  Poniedziałek: 'pn', Wtorek: 'wt', Środa: 'śr', Czwartek: 'czw', Piątek: 'pt', Sobota: 'sob', Niedziela: 'nd',
};

// Вид спорта: сначала по словам в названии, потом по категории каталога
const TITLE_SPORT: [RegExp, keyof typeof SPORTS][] = [
  [/tenis(a)? stołow|ping[- ]?pong/i, 'table_tennis'], [/badminton/i, 'badminton'], [/squash/i, 'squash'], [/padel/i, 'padel'],
  // "Pływalnia X" — название здания, а не вид спорта, поэтому плавание только по "pływanie", "aqua"
  [/tenis/i, 'tennis'], [/pływani|nauka pływ|aqua|wodny aerobik/i, 'swimming'], [/piłk\w* nożn|futbol|football|orlik/i, 'football'],
  [/koszyk/i, 'basketball'], [/siatk/i, 'volleyball'], [/ręczn/i, 'handball'], [/judo/i, 'judo'], [/karate/i, 'karate'],
  [/boks|bokser/i, 'boxing'], [/kickbox/i, 'kickboxing'], [/taekwondo/i, 'taekwondo'], [/zapas/i, 'wrestling'], [/szerm/i, 'fencing'],
  [/samoobron|krav|mma|jiu|sztuk\w* walk/i, 'martial_arts'], [/jog[aię]\b|joga/i, 'yoga'], [/nordic/i, 'nordic_walking'],
  [/bieg|biegow|run/i, 'running'], [/rower|kolarstw/i, 'cycling'], [/łyżw|ślizgaw|lodowisk/i, 'skating'], [/wspin|ścianka/i, 'climbing'],
  [/tan(ie)?c|zumba|salsa|balet/i, 'dance'], [/gimnast|akrobat/i, 'gymnastics'], [/lekkoatlet|lekka atletyka/i, 'athletics'],
  [/kajak|wiośl|żegl|sup\b/i, 'water_sports'], [/fitness|pilates|aerobik|tbc|stretch|zdrowy kręgosłup|crossfit|crosstrening|siłown/i, 'fitness'],
];
const CATEGORY_SPORT: Record<string, keyof typeof SPORTS> = {
  'Aktywności w wodzie': 'swimming', Bieganie: 'running', Fitness: 'fitness', Gimnastyka: 'gymnastics', 'Gry zespołowe': 'team_games',
  'Jazda na rowerze': 'cycling', Lekkoatletyka: 'athletics', 'Nordic walking': 'nordic_walking', 'Sporty rakietowe': 'racket',
  'Sporty walki': 'martial_arts', 'Sporty wodne': 'water_sports', 'Sporty zimowe': 'winter_sports', Taniec: 'dance', Wspinaczka: 'climbing',
  'Aktywności parkowe i miejskie': 'outdoor', Inne: 'other', Warsztaty: 'other',
};

function sportOf(c: Card): keyof typeof SPORTS {
  for (const [re, s] of TITLE_SPORT) if (re.test(c.title)) return s;
  for (const cat of c.categories) if (CATEGORY_SPORT[cat]) return CATEGORY_SPORT[cat];
  return 'other';
}

// Для кого: Dzieci — дети; Młodzież без взрослых меток — тоже дети; дети вместе со взрослыми — все возрасты
function audienceOf(a: string[]): ExtractedActivity['audience'] {
  const kids = a.includes('Dzieci');
  const youth = a.includes('Młodzież');
  const adults = a.includes('Kobiety') || a.includes('Mężczyźni');
  const seniors = a.includes('Seniorzy');
  if (kids && (adults || seniors)) return 'all';
  if (kids || (youth && !adults && !seniors)) return 'kids';
  if (adults) return 'adults';
  if (seniors) return 'seniors';
  return 'all';
}

function ageOf(text: string): { ageMin: number | null; ageMax: number | null } {
  const range = /(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(lat|r\.\s*ż)/i.exec(text);
  if (range) return { ageMin: Number(range[1]), ageMax: Number(range[2]) };
  const plus = /\b(\d{1,2})\s*\+/.exec(text);
  if (plus) return { ageMin: Number(plus[1]), ageMax: null };
  if (/pełnolet/i.test(text)) return { ageMin: 18, ageMax: null };
  return { ageMin: null, ageMax: null };
}

function priceOf(body: string): string | null {
  const m = /[^.\n]{0,40}\b\d+([,.]\d{2})?\s*zł[^.\n]{0,30}/i.exec(body);
  return m ? m[0].trim().replace(/\s+/g, ' ') : null;
}

function scheduleOf(c: Card, body: string, lastDate: string | null): string | null {
  const days = c.days.map((d) => DAYS[d] ?? d.toLowerCase()).join(', ');
  let time = c.time;
  if (!time) {
    // В карточке нет времени, но в описании есть "godz. 10.00-11.30" / "w godzinach 18:15 - 19:15"
    const t = /godz\w*\.?\s*(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/i.exec(body);
    if (t) return withDates(`${days} ${t[1]}:${t[2]}–${t[3]}:${t[4]}`.trim(), lastDate);
  }
  if (time) {
    // Время окончания из описания: "11:00-12:00", "19.00 - 20.00"
    const [h, mm] = time.split(':');
    const end = new RegExp(`\\b0?${Number(h)}[:.]${mm}\\s*[-–]\\s*(\\d{1,2})[:.](\\d{2})`).exec(body);
    if (end) time = `${time}–${end[1]}:${end[2]}`;
  }
  return withDates([days, time].filter(Boolean).join(' '), lastDate);
}

// "ср 11:00 (до 23.12.2026)": последняя дата цикла, если она известна
function withDates(parts: string, lastDate: string | null): string | null {
  if (!parts) return null;
  return lastDate ? `${parts} (до ${lastDate.slice(8, 10)}.${lastDate.slice(5, 7)}.${lastDate.slice(0, 4)})` : parts;
}

async function main() {
  const robots = await robotsVerdict(LIST_URL);
  if (!robots.allowed) throw new Error(`Каталог недоступен: ${robots.reason}`);

  // 1. Страницы списка, пока появляются новые карточки
  const cards = new Map<string, Card>();
  for (let p = 1; p <= MAX_PAGES; p++) {
    const url = p === 1 ? LIST_URL : `${LIST_URL}?${PAGE_PARAM}=${p}`;
    const found = parseCards(htmlToText(await cached(url, 1), url));
    const before = cards.size;
    for (const c of found) if (!cards.has(c.url)) cards.set(c.url, c);
    process.stdout.write(`\rсписок: страница ${p}, занятий ${cards.size}   `);
    if (!found.length || cards.size === before) break;
  }
  console.log();

  // 2. Страницы занятий
  const today = new Date().toISOString().slice(0, 10);
  const pageParts: string[] = [];
  const activities: ExtractedActivity[] = [];
  const skipped: Record<string, number> = {};
  const skip = (why: string) => (skipped[why] = (skipped[why] ?? 0) + 1);
  let n = 0;
  for (const c of cards.values()) {
    n++;
    process.stdout.write(`\rзанятия: ${n}/${cards.size}   `);
    if (c.categories.length === 1 && c.categories[0] === 'Sauna') { skip('сауна'); continue; }
    if (/\bzawod|turniej|mistrzostw|olimpiad/i.test(c.title)) { skip('разовые соревнования (это события, не секции)'); continue; }
    if ((await robotsVerdict(c.url)).allowed === false) { skip('robots.txt запрещает страницу'); continue; }
    let detail;
    try {
      detail = detailBlock(htmlToText(await cached(c.url, CACHE_DAYS), c.url));
    } catch {
      skip('страница занятия не скачалась');
      continue;
    }
    const dates = [...detail.isoDates, ...c.dates.map((d) => d.split('.').reverse().join('-'))].sort();
    const lastDate = dates.length ? dates[dates.length - 1] : null;
    if (lastDate && lastDate < today) { skip('все даты уже прошли'); continue; }

    pageParts.push(`=== ${c.url} ===\n${c.cardText}\n${detail.body}`);
    const text = `${c.title}\n${detail.body}`;
    activities.push({
      key: c.url.replace(/^https:\/\/sport\.um\.warszawa\.pl/, ''),
      name: c.title,
      sport: sportOf(c),
      audience: audienceOf(c.addressee),
      // Возраст из названия важнее описания: в описаниях бывают куски от других программ
      ...(() => {
        const fromTitle = ageOf(c.title);
        return fromTitle.ageMin != null || fromTitle.ageMax != null ? fromTitle : ageOf(detail.body);
      })(),
      schedule: scheduleOf(c, detail.body, lastDate),
      venueName: null,
      // Без поля "Adres" берём объект из названия ("… - sala fitness Pływalnia "Szuwarek""), иначе только район
      locationNote:
        detail.address ??
        c.title.split(/ [-–] /).slice(1).find((s) => /pływalni|hala|ośrod|osir|stadion|kort|park|ul\./i.test(s))?.trim() ??
        (c.district.includes(",") ? `${c.district}: адрес на странице занятия` : "адрес на странице занятия"),
      // Несколько районов ("Mokotów, Ochota") фильтру по району не подходят: тогда район не указываем
      district: c.district && !c.district.includes(',') ? c.district : null,
      url: c.url,
      priceInfo: /bezpłat|nieodpłat|darmow|wstęp wolny/i.test(text) ? null : priceOf(detail.body),
      isFree: /bezpłat|nieodpłat|darmow|wstęp wolny/i.test(text) ? true : null,
      // Цитата — начало карточки списка: название и подписанные поля
      evidence: c.cardText.split('\n').slice(0, 5).join(' '),
    });
  }
  console.log();

  mkdirSync(PAGES_DIR, { recursive: true });
  mkdirSync(EXTRACTED_DIR, { recursive: true });
  const fetchedAt = new Date().toISOString();
  writeFileSync(`${PAGES_DIR}/${SOURCE_ID}.txt`, `# source: ${SOURCE_ID}\n# url: ${LIST_URL}\n# fetchedAt: ${fetchedAt}\n\n${pageParts.join('\n\n')}`);
  const warnings = [
    `В каталоге ${cards.size} занятий, выписано ${activities.length}.`,
    ...Object.entries(skipped).map(([why, k]) => `Пропущено (${why}): ${k}.`),
    'Разобрано программой по подписанным полям каталога; контакты (e-mail, телефоны) не сохранены. Źródło: m.st. Warszawa.',
  ];
  writeFileSync(
    `${EXTRACTED_DIR}/${SOURCE_ID}.json`,
    JSON.stringify({ source: SOURCE_ID, pageFetchedAt: fetchedAt, matches: [], activities, warnings }, null, 2),
  );
  console.log(warnings.join('\n'));
  // Для проверки распределения
  const by = (f: (a: ExtractedActivity) => string) => activities.reduce<Record<string, number>>((m, a) => ((m[f(a)] = (m[f(a)] ?? 0) + 1), m), {});
  console.log('для кого:', by((a) => a.audience));
  console.log('виды спорта:', by((a) => a.sport ?? ''));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
