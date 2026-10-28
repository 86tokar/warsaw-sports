import { NextResponse, type NextRequest } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from '@/i18n/config';

// Язык посетителя: сохранённый выбор, иначе первый подходящий из настроек браузера, иначе польский
function preferredLocale(req: NextRequest): Locale {
  const saved = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  const accepted = (req.headers.get('accept-language') ?? '')
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { lang: tag.toLowerCase().split('-')[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { lang } of accepted) if (isLocale(lang)) return lang;
  return DEFAULT_LOCALE;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Админка доступна только с логином и паролем; браузер покажет стандартное окно входа
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (isAdminAuthorized(req.headers.get('authorization'))) return NextResponse.next();
    return new NextResponse('Нужен вход в админку', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="admin", charset="UTF-8"' },
    });
  }

  // Адрес уже с языком: запоминаем выбор, чтобы следующий заход открылся на нём же
  const first = pathname.split('/')[1];
  if (isLocale(first)) {
    const res = NextResponse.next();
    if (req.cookies.get(LOCALE_COOKIE)?.value !== first) {
      res.cookies.set(LOCALE_COOKIE, first, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
    }
    return res;
  }

  // Старые адреса без языка (/sections, /events/…) ведут на ту же страницу на нужном языке
  const url = req.nextUrl.clone();
  url.pathname = `/${preferredLocale(req)}${pathname === '/' ? '' : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  // Всё, кроме служебных файлов Next.js, иконок сайта (icon.svg, apple-icon) и файлов с расширением
  matcher: ['/((?!_next|apple-icon|icon|.*\\..*).*)'],
};

