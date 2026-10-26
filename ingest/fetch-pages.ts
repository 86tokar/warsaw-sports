// Шаг 1: проверить robots.txt и скачать страницы расписаний в ingest/out/pages/<id>.txt.
// Флаг --source=<id> скачивает только один источник.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fetchPage, robotsVerdict } from './fetch';
import { htmlToText } from './html';
import { icsToText, isIcs } from './ics';
import { PAGES_DIR } from './schema';
import { SOURCES } from './sources';

const ONLY = process.argv.find((a) => a.startsWith('--source='))?.split('=')[1];

async function main() {
  const sources = SOURCES.filter((s) => (!ONLY || s.id === ONLY) && !s.customFetch);
  if (!sources.length) throw new Error(ONLY ? `Источник ${ONLY} не найден в ingest/sources.ts` : 'В ingest/sources.ts нет источников');
  mkdirSync(PAGES_DIR, { recursive: true });

  for (const src of sources) {
    process.stdout.write(`• ${src.id} … `);
    const robots = await robotsVerdict(src.url);
    if (!robots.allowed) {
      console.log(`пропущен: ${robots.reason}`);
      continue;
    }
    try {
      // Несколько страниц одного источника склеиваются, каждая под своим заголовком
      const parts: string[] = [];
      for (const url of [src.url, ...(src.extraUrls ?? [])]) {
        if (url !== src.url && !(await robotsVerdict(url)).allowed) continue;
        const body = await fetchPage(url);
        const t = isIcs(body) ? icsToText(body) : htmlToText(body, url);
        parts.push(src.extraUrls?.length ? `=== ${url} ===\n${t}` : t);
      }
      const text = parts.join('\n\n');
      const header = `# source: ${src.id}\n# url: ${src.url}\n# fetchedAt: ${new Date().toISOString()}\n\n`;
      writeFileSync(`${PAGES_DIR}/${src.id}.txt`, header + text);
      const warn = text.length < 300 ? ' (почти нет текста: расписание, вероятно, грузится скриптом)' : '';
      console.log(`${text.length} символов${warn}`);
    } catch (e) {
      console.log(`ошибка: ${(e as Error).message}`);
    }
  }
  console.log(`\nТексты страниц в ${PAGES_DIR}/. Дальше матчи выписываются в ingest/out/extracted/<id>.json (см. ingest/EXTRACTION.md).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
