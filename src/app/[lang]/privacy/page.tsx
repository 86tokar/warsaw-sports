import type { Metadata } from 'next';
import { SOURCES } from '../../../../ingest/sources';
import { getDict, isLocale, pageLang } from '@/i18n';
import { PICTOGRAM_CREDITS } from '@/lib/pictograms';

// Динамическая: CONTACT_EMAIL читается при открытии страницы, а не при сборке
export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  return isLocale(params.lang) ? { title: getDict(params.lang).privacy.title } : {};
}

// Контакт владельца сайта задаётся переменной окружения CONTACT_EMAIL (на Vercel — в настройках проекта)
export default function PrivacyPage({ params }: { params: { lang: string } }) {
  const t = getDict(pageLang(params.lang)).privacy;
  const contact = process.env.CONTACT_EMAIL;
  const hosts = Array.from(new Set(SOURCES.map((s) => new URL(s.url).host))).sort();

  return (
    <main className="wrap page">
      <h1 className="page-title">{t.title}</h1>

      <section className="prose">
        <h2>{t.whoTitle}</h2>
        <p>
          {t.who}{' '}
          {contact ? (
            <>
              {t.contact} <a href={`mailto:${contact}`}>{contact}</a>
            </>
          ) : (
            t.contactLater
          )}
        </p>

        <h2>{t.dataTitle}</h2>
        <p>{t.data}</p>
        <p>{t.rights}</p>

        <h2>{t.sourcesTitle}</h2>
        <p>{t.sources}</p>
        <p>
          {t.cityData}{' '}
          <a href="https://sport.um.warszawa.pl/zajecia-sportowe" target="_blank" rel="noopener noreferrer">
            sport.um.warszawa.pl
          </a>
          ,{' '}
          <a href="https://um.warszawa.pl/kalendarz" target="_blank" rel="noopener noreferrer">
            um.warszawa.pl
          </a>
          .
        </p>
        <p>
          {t.sites} {hosts.join(', ')}.
        </p>
        <p>{t.clubs}</p>
        <p>{t.pictograms}</p>
        <ul>
          {PICTOGRAM_CREDITS.filter((c) => !/public domain|^pd|cc0/i.test(c.license)).map((c) => (
            <li key={c.file}>
              <a href={c.page} target="_blank" rel="noopener noreferrer">
                {c.file}
              </a>
              : {c.artist}, {c.license}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
