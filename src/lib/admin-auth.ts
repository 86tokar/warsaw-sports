// Простая защита админки паролем (HTTP Basic). Логин и пароль задаются переменными окружения
// ADMIN_USER (по умолчанию "admin") и ADMIN_PASSWORD. Без ADMIN_PASSWORD админка закрыта совсем.
export function isAdminAuthorized(authorization: string | null): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !authorization?.startsWith('Basic ')) return false;
  let decoded: string;
  try {
    decoded = atob(authorization.slice(6));
  } catch {
    return false;
  }
  const i = decoded.indexOf(':');
  const user = decoded.slice(0, i);
  const pass = decoded.slice(i + 1);
  return safeEqual(user, process.env.ADMIN_USER || 'admin') && safeEqual(pass, password);
}

// Сравнение без раннего выхода, чтобы по времени ответа нельзя было подбирать пароль
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
