// Превращаем HTML в компактный текст для модели: без скриптов и стилей,
// с alt картинок (логотипы команд часто подписаны только так) и разбивкой таблиц на строки.
const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
  oacute: 'ó', Oacute: 'Ó', eacute: 'é', bull: '•', middot: '·', laquo: '«', raquo: '»', bdquo: '„',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', copy: '©', reg: '®', deg: '°', times: '×',
};

function decode(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code] ?? ENTITIES[code.toLowerCase()] ?? m;
  });
}

// Ссылки на страницы матчей и билеты сохраняем в тексте как "(ссылка: https://...)"
// "/-/" — страницы событий в календаре города (um.warszawa.pl/-/<slug>)
const MATCH_LINK = /mecz|games\/action\/show|bilet|ticket|kup|\/-\//i;

export function htmlToText(html: string, baseUrl: string): string {
  // JSON-LD (schema.org SportsEvent) оставляем: это самые надёжные данные на странице
  const jsonLd: string[] = [];
  html.replace(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi, (_, body: string) => {
    jsonLd.push(body.trim());
    return '';
  });

  let s = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|head|template|iframe)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<img\b[^>]*?\balt\s*=\s*"([^"]*)"[^>]*>/gi, ' [$1] ')
    .replace(/<img\b[^>]*?\balt\s*=\s*'([^']*)'[^>]*>/gi, ' [$1] ')
    .replace(/<a\b[^>]*?\bhref\s*=\s*"([^"]+)"[^>]*>/gi, (tag, href: string) => {
      if (!MATCH_LINK.test(href)) return ' ';
      try {
        return ` (ссылка: ${new URL(decode(href), baseUrl).href}) `;
      } catch {
        return ' ';
      }
    })
    .replace(/<(td|th)\b[^>]*>/gi, ' | ')
    .replace(/<\/?(br|p|div|li|tr|h[1-6]|section|article|header|footer|ul|ol|table|time|dt|dd)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  // Дважды: некоторые сайты кодируют сущности повторно ("&amp;oacute;")
  s = decode(decode(s))
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();

  return jsonLd.length ? `${s}\n\n=== JSON-LD ===\n${jsonLd.join('\n')}` : s;
}

// Нормализация для сравнения строк: без диакритики, регистра и пунктуации
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9а-яё]+/g, ' ')
    .trim();
}
