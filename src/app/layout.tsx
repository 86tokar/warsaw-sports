import type { Metadata } from 'next';
import Link from 'next/link';
import { Onest, Unbounded } from 'next/font/google';
import './globals.css';

const onest = Onest({ subsets: ['latin', 'cyrillic'], variable: '--font-onest', display: 'swap' });
const unbounded = Unbounded({ subsets: ['latin', 'cyrillic'], variable: '--font-unbounded', display: 'swap' });

export const metadata: Metadata = {
  title: 'Спортивная Варшава: все события в одном списке',
  description: 'Матчи, турниры, забеги и открытые тренировки в Варшаве. Фильтры по дате, виду спорта и району.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${onest.variable} ${unbounded.variable}`}>
      <body>
        <header className="site">
          <div className="wrap site-inner">
            <Link href="/" className="logo">
              Спортивная Варшава
            </Link>
            <nav aria-label="Основное меню">
              <Link href="/">События</Link>
              <Link href="/sections">Секции</Link>
              <Link href="/venues">Площадки</Link>
              <Link href="/submit">Добавить событие</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="wrap">
            Расписание матчей взято с официальных сайтов клубов и лиг. Время может измениться, проверяйте на сайте
            источника. <Link href="/privacy">Конфиденциальность и источники</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
