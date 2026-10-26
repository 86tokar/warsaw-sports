# Публикация на Vercel + Neon

Сайт работает на Vercel (хостинг Next.js), данные лежат в облачной базе Postgres на Neon. Оба сервиса бесплатны
для некоммерческого проекта такого размера. Агент сбора (`ingest/`) по-прежнему запускается на своём компьютере
и записывает в облачную базу.

## 1. Аккаунты (делаете вы)

- [GitHub](https://github.com) — хранилище кода.
- [Neon](https://neon.tech) — база Postgres. Создайте проект в регионе Europe (Frankfurt), база `neondb`.
  На странице подключения возьмите две строки: **pooled** (с `-pooler` в адресе) и **direct** (без него).
- [Vercel](https://vercel.com) — войдите через GitHub.

## 2. Переключение проекта на Postgres

В `prisma/schema.prisma` блок `datasource` становится таким:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

В `.env` (этот файл не попадает в git):

```
DATABASE_URL="<pooled-строка из Neon>"
DIRECT_URL="<direct-строка из Neon>"
```

Затем создать таблицы и перенести данные (выгрузка уже сделана командой `npm run data:export`, пока база была SQLite):

```bash
npx prisma db push
npm run data:import
```

## 3. Код на GitHub

Создайте на GitHub пустой приватный репозиторий и отправьте туда код (`git push`). Секреты (`.env`), база и выгрузка
данных исключены в `.gitignore`.

## 4. Проект на Vercel

Add New → Project → выбрать репозиторий. В Settings → Environment Variables задать:

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | pooled-строка из Neon |
| `DIRECT_URL` | direct-строка из Neon |
| `ADMIN_PASSWORD` | свой длинный пароль для `/admin` (логин `admin`) |
| `CONTACT_EMAIL` | e-mail владельца для страницы «Конфиденциальность» |

Deploy. Сайт откроется по адресу `<проект>.vercel.app`; свой домен подключается в Settings → Domains.

## Дальше

- Обновление расписания: как раньше (`npm run ingest:fetch`, `ingest:city`, `ingest:dry`, `ingest`), только `.env`
  указывает на Neon, поэтому записи сразу попадают на сайт.
- Модерация заявок из формы: `https://<сайт>/admin`.
- Изменения кода: `git push` — Vercel пересоберёт сайт сам.
