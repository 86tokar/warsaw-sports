// Значения типов событий и аудиторий секций. Подписи на разных языках — в src/i18n.
export const EVENT_TYPES = ['match', 'tournament', 'mass', 'open_training'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export function isEventType(slug: string): slug is EventType {
  return (EVENT_TYPES as readonly string[]).includes(slug);
}

// Для кого секция. «all» показывается и в детском, и во взрослом фильтре
export const AUDIENCES = ['kids', 'adults', 'seniors', 'all'] as const;
export type Audience = (typeof AUDIENCES)[number];
export const isAudience = (s: string): s is Audience => (AUDIENCES as readonly string[]).includes(s);
