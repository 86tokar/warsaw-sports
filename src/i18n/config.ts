// Языки сайта. Отдельный модуль без словарей: его подключает middleware.
export const LOCALES = ['ru', 'uk', 'pl', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
// Язык для посетителей, браузер которых не просит ни один из наших языков
export const DEFAULT_LOCALE: Locale = 'pl';
export const LOCALE_COOKIE = 'lang';

export const isLocale = (s: string | undefined | null): s is Locale => !!s && (LOCALES as readonly string[]).includes(s);
