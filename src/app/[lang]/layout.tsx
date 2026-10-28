import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Onest, Unbounded } from 'next/font/google';
import { LOCALES, getDict, href, isLocale, type Locale } from '@/i18n';
import LangSwitch from '@/components/LangSwitch';
import NavigationProgress from '@/components/NavigationProgress';
import '../globals.css';

const onest = Onest({ subsets: ['latin', 'latin-ext', 'cyrillic'], variable: '--font-onest', display: 'swap' });
const unbounded = Unbounded({ subsets: ['latin', 'latin-ext', 'cyrillic'], variable: '--font-unbounded', display: 'swap' });

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  if (!isLocale(params.lang)) return {};
  const t = getDict(params.lang);
  return {
    title: { default: t.meta.homeTitle, template: `%s: ${t.siteName}` },
    description: t.meta.homeDescription,
    // Ссылки на версии страницы на других языках
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, href(l)])) },
  };
}

export default function LangLayout({ children, params }: { children: React.ReactNode; params: { lang: string } }) {
  if (!isLocale(params.lang)) notFound();
  const lang: Locale = params.lang;
  const t = getDict(lang);
  return (
    <html lang={lang} className={`${onest.variable} ${unbounded.variable}`}>
      <body>
        <Suspense>
          <NavigationProgress />
        </Suspense>
        <header className="site">
          <div className="wrap site-inner">
            <Link href={href(lang)} className="logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt="" width={28} height={28} className="sport-icon" />
              {t.siteName}
            </Link>
            <nav aria-label={t.nav.aria}>
              <Link href={href(lang)}>{t.nav.events}</Link>
              <Link href={href(lang, '/sections')}>{t.nav.sections}</Link>
              <Link href={href(lang, '/venues')}>{t.nav.venues}</Link>
              <Link href={href(lang, '/submit')}>{t.nav.submit}</Link>
              <Suspense>
                <LangSwitch current={lang} label={t.langSwitch} />
              </Suspense>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="wrap">
            {t.footer.text} <Link href={href(lang, '/privacy')}>{t.footer.privacy}</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
