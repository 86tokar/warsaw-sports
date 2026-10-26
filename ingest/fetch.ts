// Загрузка страниц: проверка robots.txt, понятный User-Agent, пауза между запросами к одному хосту.
export const USER_AGENT = 'WarsawSportsBot/0.1 (+local MVP aggregator of Warsaw sports events)';

// Своё имя бота плюс боты, которые сайты закрывают от передачи текста в ИИ.
// Тексты страниц разбирает Claude, поэтому запрет для любого из них считаем запретом для нас.
const AGENTS = ['warsawsportsbot', 'claudebot', 'anthropic-ai', 'claude-web'];

const MIN_DELAY_MS = 3_000;
const lastHit = new Map<string, number>();
const robotsCache = new Map<string, RobotsRules | null>();

type Rule = { allow: boolean; path: string };
type RobotsRules = { groups: { agents: string[]; rules: Rule[] }[] };

async function politeFetch(url: string): Promise<Response> {
  const host = new URL(url).host;
  const wait = (lastHit.get(host) ?? 0) + MIN_DELAY_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHit.set(host, Date.now());
  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'pl,en;q=0.8' },
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  });
}

function parseRobots(text: string): RobotsRules {
  const groups: RobotsRules['groups'] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === 'allow' || key === 'disallow') && current) {
      // Пустой Disallow означает «можно всё»
      if (value) current.rules.push({ allow: key === 'allow', path: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return { groups };
}

function ruleMatches(rulePath: string, path: string): boolean {
  const anchored = rulePath.endsWith('$');
  const body = (anchored ? rulePath.slice(0, -1) : rulePath)
    .split('*')
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp('^' + body + (anchored ? '$' : '')).test(path);
}

// Самое длинное совпавшее правило побеждает, при равной длине Allow (как у Google)
function allowedFor(rules: Rule[], path: string): boolean {
  let best: Rule | null = null;
  for (const r of rules) {
    if (!ruleMatches(r.path, path)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return best ? best.allow : true;
}

export async function robotsVerdict(url: string): Promise<{ allowed: boolean; reason: string }> {
  const u = new URL(url);
  if (!robotsCache.has(u.origin)) {
    try {
      const res = await politeFetch(`${u.origin}/robots.txt`);
      if (res.status >= 500) {
        robotsCache.set(u.origin, { groups: [{ agents: ['*'], rules: [{ allow: false, path: '/' }] }] });
      } else {
        robotsCache.set(u.origin, res.ok ? parseRobots(await res.text()) : null);
      }
    } catch {
      return { allowed: false, reason: 'robots.txt недоступен, пропускаем на всякий случай' };
    }
  }
  const rules = robotsCache.get(u.origin);
  if (!rules) return { allowed: true, reason: 'robots.txt отсутствует' };

  const path = u.pathname + u.search;
  for (const agent of AGENTS) {
    const group = rules.groups.find((g) => g.agents.includes(agent));
    if (group && !allowedFor(group.rules, path)) return { allowed: false, reason: `robots.txt запрещает ${agent}` };
  }
  const own = rules.groups.find((g) => g.agents.includes('warsawsportsbot'));
  const star = rules.groups.find((g) => g.agents.includes('*'));
  if (!own && star && !allowedFor(star.rules, path)) return { allowed: false, reason: 'robots.txt запрещает User-agent: *' };
  return { allowed: true, reason: 'разрешено robots.txt' };
}

export async function fetchPage(url: string): Promise<string> {
  const res = await politeFetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} для ${url}`);
  return res.text();
}
