// Языки сайта, словари и помощники для текстов интерфейса.
// Данные (названия матчей, занятий, адреса) показываются на языке источника — обычно польском.
import { notFound } from 'next/navigation';
import ru from './ru';
import uk from './uk';
import pl from './pl';
import en from './en';

import { LOCALES, isLocale, type Locale } from './config';
export * from './config';

// Локаль для дат и чисел (Intl)
export const INTL_LOCALE: Record<Locale, string> = { ru: 'ru-RU', uk: 'uk-UA', pl: 'pl-PL', en: 'en-GB' };
// Подписи в переключателе языков
export const LOCALE_LABEL: Record<Locale, { short: string; name: string }> = {
  ru: { short: 'RU', name: 'Русский' },
  uk: { short: 'UA', name: 'Українська' },
  pl: { short: 'PL', name: 'Polski' },
  en: { short: 'EN', name: 'English' },
};

// Формы множественного числа по Intl.PluralRules: в польском, русском, украинском — one/few/many, в английском — one/other
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

type DeepPlural<T> = {
  [K in keyof T]: T[K] extends { one: string } ? PluralForms : T[K] extends object ? DeepPlural<T[K]> : T[K];
};
export type Dict = DeepPlural<typeof ru>;

const DICTS: Record<Locale, Dict> = { ru, uk, pl, en };
export const getDict = (lang: Locale): Dict => DICTS[lang];

export function plural(n: number, forms: PluralForms, lang: Locale): string {
  return forms[new Intl.PluralRules(INTL_LOCALE[lang]).select(n)] ?? forms.other;
}

// "Страница {page} из {pages}" + { page: 1, pages: 15 }
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}

export const sportName = (dict: Dict, slug: string, fallback: string) => dict.sports[slug] ?? fallback;

export function ageLabel(dict: Dict, min: number | null, max: number | null): string | null {
  if (min != null && max != null) return fill(dict.sections.ageRange, { min, max });
  if (min != null) return fill(dict.sections.ageFrom, { min });
  if (max != null) return fill(dict.sections.ageTo, { max });
  return null;
}

// Заглушка «адрес на странице занятия» хранится в данных по-польски и переводится при показе
export const ADDRESS_ON_PAGE = 'adres na stronie zajęć';
export function placeText(dict: Dict, note: string | null): string | null {
  if (!note) return null;
  return note.endsWith(ADDRESS_ON_PAGE) ? note.slice(0, -ADDRESS_ON_PAGE.length) + dict.sections.addressOnPage : note;
}

// Путь с языком: href(lang, '/sections') -> '/pl/sections'
export const href = (lang: Locale, path = '/') => `/${lang}${path === '/' ? '' : path}`;

// Язык из адреса страницы; для неизвестного языка — страница 404 (макет и страница строятся параллельно,
// поэтому проверяет каждая страница, а не только макет)
export function pageLang(value: string): Locale {
  if (!isLocale(value)) notFound();
  return value;
}
