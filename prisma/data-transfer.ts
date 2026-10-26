// Перенос данных между базами (например, SQLite -> Postgres при публикации).
//   npm run data:export   — выгрузить все таблицы в prisma/data-export.json (текущая база из DATABASE_URL)
//   npm run data:import   — загрузить prisma/data-export.json в пустую базу из DATABASE_URL
// id сохраняются, поэтому связи между таблицами не ломаются.
import { readFileSync, writeFileSync } from 'node:fs';
import { PrismaClient, type Prisma } from '@prisma/client';

const FILE = 'prisma/data-export.json';
const prisma = new PrismaClient();

type Dump = {
  exportedAt: string;
  sports: object[];
  venues: object[];
  organizers: object[];
  events: object[];
  activities: object[];
};

// JSON превращает даты в строки: возвращаем их обратно
const DATE_FIELDS = ['startsAt', 'endsAt', 'createdAt', 'lastSeenAt'];
function revive<T extends object>(rows: object[]): T[] {
  return rows.map((r) => {
    const o: Record<string, unknown> = { ...r };
    for (const f of DATE_FIELDS) if (typeof o[f] === 'string') o[f] = new Date(o[f] as string);
    return o as T;
  });
}

async function exportData() {
  const dump: Dump = {
    exportedAt: new Date().toISOString(),
    sports: await prisma.sport.findMany(),
    venues: await prisma.venue.findMany(),
    organizers: await prisma.organizer.findMany(),
    events: await prisma.event.findMany(),
    activities: await prisma.activity.findMany(),
  };
  writeFileSync(FILE, JSON.stringify(dump, null, 1));
  console.log(
    `Выгружено в ${FILE}: видов спорта ${dump.sports.length}, площадок ${dump.venues.length}, ` +
      `организаторов ${dump.organizers.length}, событий ${dump.events.length}, секций ${dump.activities.length}.`,
  );
}

async function importData() {
  const existing = (await prisma.event.count()) + (await prisma.activity.count()) + (await prisma.sport.count());
  if (existing > 0) throw new Error('База не пустая: импорт делается только в новую пустую базу.');
  const d: Dump = JSON.parse(readFileSync(FILE, 'utf8'));
  // Порядок важен: сначала справочники, потом события и секции, которые на них ссылаются
  await prisma.sport.createMany({ data: revive<Prisma.SportCreateManyInput>(d.sports) });
  await prisma.venue.createMany({ data: revive<Prisma.VenueCreateManyInput>(d.venues) });
  await prisma.organizer.createMany({ data: revive<Prisma.OrganizerCreateManyInput>(d.organizers) });
  await prisma.event.createMany({ data: revive<Prisma.EventCreateManyInput>(d.events) });
  await prisma.activity.createMany({ data: revive<Prisma.ActivityCreateManyInput>(d.activities) });
  console.log(`Загружено из ${FILE} (выгрузка от ${d.exportedAt}).`);
}

const cmd = process.argv[2];
(cmd === 'export' ? exportData() : cmd === 'import' ? importData() : Promise.reject(new Error('Укажите export или import')))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
