// iCalendar -> по строке на событие: "SUMMARY | 2026-10-31 17:30 | LOCATION | первая строка DESCRIPTION | URL".
// Длинные отчёты о матчах в DESCRIPTION и напоминания VALARM отбрасываем.
export function isIcs(body: string): boolean {
  return body.trimStart().startsWith('BEGIN:VCALENDAR');
}

function unescape(s: string): string {
  return s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
}

function formatStart(key: string, value: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/.exec(value);
  if (!m) return value;
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  if (!m[4] || key.includes('VALUE=DATE')) return `${date} (godzina nieustalona)`;
  // Время в UTC (с суффиксом Z) оставляем с пометкой, чтобы не перепутать с местным
  return `${date} ${m[4]}:${m[5]}${value.endsWith('Z') ? ' UTC' : ''}`;
}

export function icsToText(body: string): string {
  const lines = body.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const out: string[] = [];
  let ev: Record<string, string> | null = null;
  let depth = 0;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { ev = {}; depth = 0; continue; }
    if (!ev) continue;
    if (line.startsWith('BEGIN:')) { depth++; continue; }
    if (line.startsWith('END:') && depth > 0) { depth--; continue; }
    if (line === 'END:VEVENT') {
      const desc = unescape(ev.DESCRIPTION ?? '').split('\n')[0].trim();
      out.push([unescape(ev.SUMMARY ?? ''), ev.DTSTART ?? '', unescape(ev.LOCATION ?? '') || '(brak miejsca)', desc, ev.URL ?? ''].join(' | '));
      ev = null;
      continue;
    }
    if (depth > 0) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i);
    const value = line.slice(i + 1);
    const name = key.split(';')[0];
    if (name === 'DTSTART') ev.DTSTART = formatStart(key, value);
    else if (['SUMMARY', 'LOCATION', 'DESCRIPTION', 'URL'].includes(name)) ev[name] = value;
  }
  return out.join('\n');
}
