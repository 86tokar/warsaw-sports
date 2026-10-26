// Добавляет или обновляет реальные площадки из ingest/venue-data.ts (по полю name).
import { PrismaClient } from '@prisma/client';
import { VENUES } from './venue-data';

const prisma = new PrismaClient();

async function main() {
  for (const { aliases, ...v } of VENUES) {
    const data = { ...v, aliases: aliases.join('|') };
    const existing = await prisma.venue.findFirst({ where: { name: v.name } });
    if (existing) await prisma.venue.update({ where: { id: existing.id }, data });
    else await prisma.venue.create({ data });
    console.log(`${existing ? 'обновлена' : 'добавлена'}: ${v.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
