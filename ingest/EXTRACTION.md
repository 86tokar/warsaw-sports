# Как выписывать события из страниц

После `npm run ingest:fetch` тексты страниц лежат в `ingest/out/pages/<id>.txt`.
Для каждого источника события выписываются в `ingest/out/extracted/<id>.json` (формат: `ingest/schema.ts`).
Делать это можно вручную или попросить Claude в чате.

```json
{
  "source": "legia-football",
  "pageFetchedAt": "<значение fetchedAt из шапки txt>",
  "matches": [
    {
      "homeTeam": "Legia Warszawa",
      "awayTeam": "Lech Poznań",
      "competition": "PKO BP Ekstraklasa",
      "date": "2026-11-08",
      "time": "17:30",
      "isHome": true,
      "venueName": null,
      "matchUrl": null,
      "priceInfo": null,
      "evidence": "08.11.2026 17:30 Legia Warszawa Lech Poznań"
    }
  ],
  "warnings": []
}
```

## Правила

- Только то, что прямо есть в тексте. Не додумывать соперников, даты, время и цены.
- Сыгранные матчи (со счётом или пометкой о завершении) пропускать.
- `date`: полный YYYY-MM-DD. Если год не указан, брать ближайшую дату не раньше дня скачивания с учётом сезона
  (сентябрь–декабрь относятся к первому году сезона, январь–июнь ко второму).
- `time`: HH:MM по Варшаве как на странице; "TBA", "do ustalenia" или отсутствие времени дают `null`. Типичное время не подставлять.
- `isHome`: `true`, только если отслеживаемый клуб указан хозяином (см. `hint` источника в `ingest/sources.ts`).
  Выездные матчи можно не выписывать; если выписаны, то с `false`, и проверка их отбросит.
- `venueName`: только если площадка прямо названа у этого матча на странице или на официальной странице матча (`matchUrl`).
  Название города площадкой не считается. Если `null`, берётся домашняя площадка источника (`homeVenue`).
- `matchUrl`: ссылка на страницу матча или билеты на официальном сайте, если она есть в тексте.
- Названия команд копировать как на странице, без перевода.
- `evidence`: дословный фрагмент текста страницы (до 200 символов), где видны дата и соперник.
  `npm run ingest:dry` проверяет, что фрагмент действительно есть на странице, и отбрасывает матч, если нет.
- Если что-то непонятно или противоречиво, записать в `warnings`.

## Не только матчи

Поле `kind`: `match` (по умолчанию), `tournament`, `mass` (забег, велогонка, праздник), `open_training`.
Для событий, которые не матч, команды не нужны, зато обязательно `title` — название как на странице.

```json
{
  "kind": "mass",
  "title": "Bieg Niepodległości",
  "sport": "running",
  "competition": null,
  "date": "2026-11-11",
  "time": "11:00",
  "endTime": null,
  "venueName": null,
  "locationNote": "Start: pl. Piłsudskiego",
  "matchUrl": null,
  "priceInfo": null,
  "isFree": true,
  "forKids": false,
  "evidence": "11.11.2026, godz. 11:00 Bieg Niepodległości, start pl. Piłsudskiego"
}
```

- `sport`: slug из `SPORTS` в `ingest/sources.ts`, если у источника разные виды спорта; иначе `null`.
- `endTime`: время окончания, только если указано.
- `locationNote`: место текстом, если его нет в таблице Venue (парк, улица, старт забега). Так событие можно записать без площадки.
- `isFree`: `true` только если страница прямо говорит, что вход или участие бесплатно ("bezpłatny", "wstęp wolny", "darmowy"); иначе `null`.
- `forKids`: `true`, если событие для детей (детский забег, турнир для детей, "dla dzieci", возрастные категории до 14 лет).
- `gender`: `men`, `women` или `mixed` (для всех), только если это прямо видно на странице ("kobiet", "mężczyzn", "dla wszystkich", "dorośli, młodzież oraz dzieci"); иначе `null`. У клубных источников пол задан в `sources.ts` (`gender`), его не нужно повторять у каждого матча.
- `evidence` для таких событий должен содержать дату и хотя бы одно слово из названия.

## Секции

Регулярные занятия (секции, школы, группы) выписываются в тот же файл, в список `activities`:

```json
{
  "name": "Pływanie dla dzieci – nauka pływania",
  "sport": "swimming",
  "audience": "kids",
  "ageMin": 6,
  "ageMax": 10,
  "schedule": "wt, czw 17:00–17:45",
  "venueName": "Hala OSiR Bemowo",
  "locationNote": null,
  "url": "https://...",
  "priceInfo": "120 zł / miesiąc",
  "isFree": null,
  "evidence": "Nauka pływania dla dzieci 6–10 lat, wtorek i czwartek 17:00–17:45"
}
```

- `audience`: `kids` (дети и подростки), `adults`, `seniors` (60+, "Aktywny Senior"), `all` (без ограничения возраста, семейные).
- `ageMin` / `ageMax`: только если возраст прямо указан (лет). "U-12" означает `ageMax: 12`.
- `schedule`: дни и время как на странице, коротко. Если расписания нет, `null`.
- `venueName` или `locationNote` обязательны: без места секция не записывается.
- `isFree`: `true` только при "bezpłatne", "darmowe", "wstęp wolny".
- Одна запись на группу, отличающуюся аудиторией или местом; разные часы одной группы — в одном `schedule`.
- `evidence`: дословный фрагмент со словом из названия секции.

## Язык текстов в данных

Сайт четырёхъязычный (ru, uk, pl, en), поэтому всё, что попадает в базу (`priceInfo`, `schedule`, `locationNote`, названия),
пишется на языке источника — обычно по-польски, без перевода и без русских пояснений. Подписи интерфейса переводятся
словарями в `src/i18n`.
