// Удаление демо-данных из prisma/seed.ts. Без --yes только показывает, что будет удалено.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const YES = process.argv.includes('--yes');

async function main() {
  const events = await prisma.event.findMany({ where: { source: 'seed' }, select: { id: true, title: true } });
  // Площадки и организаторы демо-данных: без aliases и без единого не-демо события
  const venues = await prisma.venue.findMany({
    where: { aliases: null, events: { none: { source: { not: 'seed' } } } },
    select: { id: true, name: true },
  });
  const organizers = await prisma.organizer.findMany({
    where: { events: { every: { source: 'seed' } } },
    select: { id: true, name: true },
  });

  console.log(`Демо-событий: ${events.length}`);
  console.log(`Площадок без aliases и реальных событий: ${venues.map((v) => v.name).join(', ') || 'нет'}`);
  console.log(`Организаторов только с демо-событиями: ${organizers.map((o) => o.name).join(', ') || 'нет'}`);
  if (!YES) {
    console.log('\nНичего не удалено. Для удаления: npm run ingest:clear-demo -- --yes');
    return;
  }
  await prisma.event.deleteMany({ where: { source: 'seed' } });
  await prisma.venue.deleteMany({ where: { id: { in: venues.map((v) => v.id) } } });
  await prisma.organizer.deleteMany({ where: { id: { in: organizers.map((o) => o.id) } } });
  console.log('\nДемо-данные удалены.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
