// Демо-данные. Все события и организаторы вымышленные, координаты площадок приблизительные.
import { PrismaClient } from '@prisma/client';
import { addDays, startOfWarsawDay } from '../src/lib/dates';

const prisma = new PrismaClient();

const today = startOfWarsawDay(new Date());
// День со смещением от сегодняшнего (по Варшаве) и время начала
const at = (dayOffset: number, hour: number, minute = 0) =>
  new Date(addDays(today, dayOffset).getTime() + (hour * 60 + minute) * 60_000);

async function main() {
  // Сид стирает все таблицы, поэтому не запускаем его поверх реальных данных
  const real = await prisma.event.count({ where: { source: { not: 'seed' } } });
  if (real > 0) {
    throw new Error(`В базе ${real} реальных событий, демо-данные не заливаем. Удалите их вручную, если действительно нужен сброс.`);
  }
  await prisma.event.deleteMany();
  await prisma.sport.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.organizer.deleteMany();

  const sportNames: [string, string][] = [
    ['football', 'Футбол'],
    ['basketball', 'Баскетбол'],
    ['volleyball', 'Волейбол'],
    ['running', 'Бег'],
    ['tennis', 'Теннис'],
    ['swimming', 'Плавание'],
    ['hockey', 'Хоккей'],
    ['cycling', 'Велоспорт'],
  ];
  const sport: Record<string, string> = {};
  for (const [slug, name] of sportNames) {
    sport[slug] = (await prisma.sport.create({ data: { slug, name } })).id;
  }

  const venueData = [
    { key: 'narodowy', name: 'PGE Narodowy', address: 'al. Ks. J. Poniatowskiego 1', district: 'Praga-Południe', lat: 52.2396, lng: 21.0458 },
    { key: 'legia', name: 'Стадион Легии', address: 'ul. Łazienkowska 3', district: 'Śródmieście', lat: 52.2319, lng: 21.0333 },
    { key: 'torwar', name: 'Hala Torwar', address: 'ul. Łazienkowska 6A', district: 'Śródmieście', lat: 52.2312, lng: 21.0397 },
    { key: 'ursynow', name: 'Arena Ursynów', address: 'ul. Pileckiego 122', district: 'Ursynów', lat: 52.1527, lng: 21.0553 },
    { key: 'skaryszewski', name: 'Парк Скаришевский', address: 'al. Zieleniecka', district: 'Praga-Południe', lat: 52.2433, lng: 21.0563 },
    { key: 'bulwary', name: 'Висленские бульвары', address: 'Bulwary Wiślane', district: 'Śródmieście', lat: 52.2397, lng: 21.0305 },
  ];
  const venue: Record<string, string> = {};
  for (const { key, ...data } of venueData) {
    venue[key] = (await prisma.venue.create({ data })).id;
  }

  const orgNames = ['Демо-клуб «Висла»', 'Беговое сообщество «Праги»', 'Варшавская лига волейбола', 'Городской центр спорта'];
  const org: string[] = [];
  for (const name of orgNames) org.push((await prisma.organizer.create({ data: { name } })).id);

  const D = 'Демо-событие: данные вымышленные, замените их реальными.';

  const events = [
    { title: 'Товарищеский матч по футболу', type: 'match', sport: 'football', venue: 'legia', org: 0, start: at(0, 19), end: at(0, 21), price: '60–120 zł' },
    { title: 'Утренняя пробежка 5 км', type: 'mass', sport: 'running', venue: 'skaryszewski', org: 1, start: at(1, 9), end: at(1, 10, 30), free: true },
    { title: 'Открытая тренировка по волейболу', type: 'open_training', sport: 'volleyball', venue: 'ursynow', org: 2, start: at(1, 18), end: at(1, 19, 30), free: true },
    { title: 'Любительский турнир по баскетболу 3×3', type: 'tournament', sport: 'basketball', venue: 'torwar', org: 3, start: at(2, 11), end: at(2, 17), price: '30 zł с команды' },
    { title: 'Хоккейный матч регулярного сезона', type: 'match', sport: 'hockey', venue: 'torwar', org: 0, start: at(2, 18, 30), price: 'от 45 zł' },
    { title: 'Субботний заплыв на 1 км', type: 'mass', sport: 'swimming', venue: 'ursynow', org: 3, start: at(3, 8), end: at(3, 10), price: '25 zł' },
    { title: 'Теннисный турнир для начинающих', type: 'tournament', sport: 'tennis', venue: 'skaryszewski', org: 3, start: at(3, 10), end: at(3, 18), price: '50 zł' },
    { title: 'Групповой велопробег по набережной', type: 'mass', sport: 'cycling', venue: 'bulwary', org: 1, start: at(4, 12), end: at(4, 15), free: true },
    { title: 'Футбольный матч молодёжных команд', type: 'match', sport: 'football', venue: 'narodowy', org: 0, start: at(4, 15), price: 'от 30 zł' },
    { title: 'Забег по бульварам, 10 км', type: 'mass', sport: 'running', venue: 'bulwary', org: 1, start: at(5, 10), end: at(5, 13), price: '80 zł' },
    { title: 'Открытая тренировка по баскетболу', type: 'open_training', sport: 'basketball', venue: 'ursynow', org: 3, start: at(6, 19), end: at(6, 20, 30), free: true },
    { title: 'Турнир по пляжному волейболу', type: 'tournament', sport: 'volleyball', venue: 'bulwary', org: 2, start: at(8, 10), end: at(8, 18), price: '100 zł с пары' },
    { title: 'Открытая тренировка по бегу в парке', type: 'open_training', sport: 'running', venue: 'skaryszewski', org: 1, start: at(9, 8), end: at(9, 9), free: true },
    { title: 'Любительский матч, место уточняется', type: 'match', sport: 'football', venue: null, org: 2, start: at(10, 17), note: 'Поле на Воле, адрес сообщат участникам', free: true },
  ] as const;

  for (const e of events) {
    await prisma.event.create({
      data: {
        title: e.title,
        description: D,
        type: e.type,
        startsAt: e.start,
        endsAt: 'end' in e ? e.end : null,
        isFree: 'free' in e ? e.free : false,
        priceInfo: 'price' in e ? e.price : null,
        locationNote: 'note' in e ? e.note : null,
        status: 'published',
        source: 'seed',
        sportId: sport[e.sport],
        venueId: e.venue ? venue[e.venue] : null,
        organizerId: org[e.org],
      },
    });
  }

  console.log(`Готово: ${events.length} событий, ${venueData.length} площадок, ${sportNames.length} видов спорта.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
