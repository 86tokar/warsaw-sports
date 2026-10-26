import { NextResponse, type NextRequest } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';

// Админка доступна только с логином и паролем; браузер покажет стандартное окно входа
export function middleware(req: NextRequest) {
  if (isAdminAuthorized(req.headers.get('authorization'))) return NextResponse.next();
  return new NextResponse('Нужен вход в админку', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="admin", charset="UTF-8"' },
  });
}

export const config = { matcher: ['/admin/:path*'] };
