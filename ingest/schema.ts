// Формат файла ingest/out/extracted/<id>.json: события, выписанные из текста страницы.
// Правила заполнения: ingest/EXTRACTION.md.
import { z } from 'zod';

export const EVENT_KINDS = ['match', 'tournament', 'mass', 'open_training'] as const;

export const ExtractedEvent = z.object({
  // match: матч двух команд; tournament, mass (забег, велогонка, праздник), open_training
  kind: z.enum(EVENT_KINDS).default('match'),
  // Для матчей название собирается из команд, для остальных событий обязательно
  title: z.string().nullable().default(null),
  homeTeam: z.string().nullable().default(null),
  awayTeam: z.string().nullable().default(null),
  competition: z.string().nullable(),
  // Вид спорта, если у источника он разный (slug из SPORTS в sources.ts); иначе берётся sport источника
  sport: z.string().nullable().default(null),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().nullable(),
  endTime: z.string().nullable().default(null),
  // Для матчей: хозяин — отслеживаемый клуб. Для остальных событий не используется
  isHome: z.boolean().default(true),
  venueName: z.string().nullable(),
  // Место, которого нет в таблице Venue (парк, улица): показывается текстом
  locationNote: z.string().nullable().default(null),
  matchUrl: z.string().nullable(),
  priceInfo: z.string().nullable(),
  // true — вход или участие бесплатно по словам страницы; null — не сказано
  isFree: z.boolean().nullable().default(null),
  forKids: z.boolean().default(false),
  evidence: z.string(),
});

// Секция (регулярные занятия): ingest/EXTRACTION.md, раздел «Секции»
export const AUDIENCES = ['kids', 'adults', 'seniors', 'all'] as const;

export const ExtractedActivity = z.object({
  // Постоянный ключ записи, если у источника он есть (например, адрес страницы занятия)
  key: z.string().nullable().default(null),
  name: z.string(),
  sport: z.string().nullable().default(null),
  audience: z.enum(AUDIENCES),
  ageMin: z.number().int().nullable().default(null),
  ageMax: z.number().int().nullable().default(null),
  schedule: z.string().nullable().default(null),
  venueName: z.string().nullable().default(null),
  locationNote: z.string().nullable().default(null),
  // Район (dzielnica), если место указано текстом
  district: z.string().nullable().default(null),
  url: z.string().nullable().default(null),
  priceInfo: z.string().nullable().default(null),
  isFree: z.boolean().nullable().default(null),
  evidence: z.string(),
});

export const Extraction = z.object({
  source: z.string(),
  pageFetchedAt: z.string(),
  matches: z.array(ExtractedEvent).default([]),
  activities: z.array(ExtractedActivity).default([]),
  warnings: z.array(z.string()),
});

export type ExtractedEvent = z.infer<typeof ExtractedEvent>;
export type ExtractedActivity = z.infer<typeof ExtractedActivity>;
export type Extraction = z.infer<typeof Extraction>;

export const PAGES_DIR = 'ingest/out/pages';
export const EXTRACTED_DIR = 'ingest/out/extracted';
