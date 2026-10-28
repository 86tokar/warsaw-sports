// Официальные страницы расписаний домашних матчей варшавских клубов.
// Каждый источник проверен: robots.txt разрешает чтение, расписание есть в обычном HTML.
export type Source = {
  id: string;
  name: string;
  url: string;
  // Дополнительные страницы того же источника (например, по странице на вид спорта)
  extraUrls?: string[];
  // Источник собирается отдельным скриптом (например, ingest/city-catalog.ts), ingest:fetch его пропускает
  customFetch?: boolean;
  sport: keyof typeof SPORTS;
  club: string;
  organizer: string;
  organizerWebsite?: string;
  // Домашняя площадка по умолчанию (name или alias из таблицы Venue); у городских событий места разные
  homeVenue?: string;
  // Все события источника для детей
  forKids?: boolean;
  // Пол команды: мужская, женская лига или смешанное событие (показывается у событий)
  gender?: 'men' | 'women' | 'mixed';
  // Подсказка, как читать страницу: где дата, как понять, что матч домашний
  hint: string;
};

export const SPORTS = {
  football: 'Футбол',
  basketball: 'Баскетбол',
  volleyball: 'Волейбол',
  hockey: 'Хоккей',
  handball: 'Гандбол',
  running: 'Бег',
  cycling: 'Велоспорт',
  futsal: 'Футзал',
  judo: 'Дзюдо',
  rugby: 'Регби',
  table_tennis: 'Настольный теннис',
  swimming: 'Плавание',
  boxing: 'Бокс',
  kickboxing: 'Кикбоксинг',
  athletics: 'Лёгкая атлетика',
  fencing: 'Фехтование',
  taekwondo: 'Тхэквондо',
  rowing: 'Гребля',
  wrestling: 'Борьба',
  fitness: 'Фитнес',
  tennis: 'Теннис',
  gymnastics: 'Гимнастика',
  team_games: 'Командные игры',
  nordic_walking: 'Скандинавская ходьба',
  badminton: 'Бадминтон',
  squash: 'Сквош',
  padel: 'Падел',
  racket: 'Ракеточные виды',
  martial_arts: 'Единоборства',
  karate: 'Карате',
  yoga: 'Йога',
  dance: 'Танцы',
  climbing: 'Скалолазание',
  water_sports: 'Водные виды спорта',
  skating: 'Коньки',
  winter_sports: 'Зимние виды спорта',
  outdoor: 'Активность на улице',
  other: 'Другое',
} as const;

// Проверено 2026-10-24. Не подошли: ekstraklasa.org (robots.txt закрывает ClaudeBot и anthropic-ai),
// dziki.basketball и projektwarszawa.waw.pl (Cloudflare отдаёт 403 любому боту),
// rozgrywki.zprp.pl (гандбол, robots.txt: Disallow: / для всех, кроме Googlebot).
// В высших лигах по хоккею и гандболу варшавских команд в сезоне 2026/27 нет.
export const SOURCES: Source[] = [
  {
    id: 'legia-football',
    gender: 'men',
    name: 'Legia Warszawa: mecze',
    url: 'https://legia.com/mecze',
    sport: 'football',
    club: 'Legia Warszawa',
    organizer: 'Legia Warszawa',
    organizerWebsite: 'https://legia.com',
    homeVenue: 'Stadion Miejski Legii Warszawa',
    hint:
      'Матчи сгруппированы по месяцам ("Październik 2026"), у матча дата "25.10" и время "17:30"; "–" вместо времени значит, что время не объявлено. ' +
      'Хозяин указан первым. Сыгранные матчи показаны со счётом, их пропускать. Площадка у будущих матчей обычно не указана.',
  },
  {
    id: 'polonia-football',
    gender: 'men',
    name: 'Polonia Warszawa: terminarz',
    url: 'https://kspolonia.pl/terminarz/',
    sport: 'football',
    club: 'Polonia Warszawa',
    organizer: 'Polonia Warszawa',
    organizerWebsite: 'https://kspolonia.pl',
    homeVenue: 'Stadion Polonii Warszawa',
    hint:
      'Betclic 1. Liga. Матчи под заголовками месяцев ("PAŹDZIERNIK 2026"), дата "Czw 29.10", между командами время "17:30". ' +
      'Время "00:00" значит, что время не объявлено (time = null). Хозяин слева (первым), гость справа; адрес ссылки /mecze/... для этого не использовать. ' +
      'Ссылка на страницу матча стоит в тексте перед датой матча.',
  },
  {
    id: 'legia-basketball',
    gender: 'men',
    name: 'Legia Warszawa (koszykówka): kalendarz meczów domowych',
    url: 'https://legiakosz.com/calendar/games/home.ics',
    sport: 'basketball',
    club: 'Legia Warszawa',
    organizer: 'Legia Warszawa (koszykówka)',
    organizerWebsite: 'https://legiakosz.com',
    homeVenue: 'Hala OSiR Bemowo',
    hint:
      'Официальный iCalendar только с домашними матчами (PGE PLK и Basketball Champions League). ' +
      'DTSTART;TZID=Europe/Warsaw:20261025T150000 — дата и местное время; DTSTART;VALUE=DATE — время не объявлено (time = null). ' +
      'SUMMARY "Legia Warszawa - <соперник>", площадка в LOCATION ("OSiR Bemowo", "Torwar", "Hala Koło, ul. Obozowa 60"), пустой LOCATION = venueName null. ' +
      'Поле DESCRIPTION с отчётами о матчах игнорировать. evidence брать из строки SUMMARY вместе с DTSTART.',
  },
  {
    id: 'dziki-basketball',
    gender: 'men',
    name: 'PLK: Dziki Warszawa, terminarz',
    url: 'https://plk.pl/druzyny/11257/dziki-warszawa/terminarz',
    sport: 'basketball',
    club: 'Dziki Warszawa',
    organizer: 'Dziki Warszawa',
    organizerWebsite: 'https://www.dziki.basketball',
    homeVenue: 'Hala Koło',
    hint:
      'PGE Polska Liga Koszykówki. Строки таблицы: "6 kolejka", хозяин, гость, затем "07.11/17:30". Время "00:00" значит, что время не объявлено. ' +
      'Хозяин указан первым (колонка Gospodarz). Площадка в таблице не указана, на страницах матчей Дзиков: Hala Koło. ' +
      'Ссылка на страницу матча (plk.pl/mecz/...) стоит в той же строке таблицы.',
  },
  {
    id: 'projekt-volleyball',
    gender: 'men',
    name: 'TAURON Liga: terminarz',
    url: 'https://www.tauronliga.pl/games.html',
    sport: 'volleyball',
    club: 'PGE Projekt Warszawa',
    organizer: 'PGE Projekt Warszawa',
    organizerWebsite: 'https://www.projektwarszawa.waw.pl',
    homeVenue: 'Arena COS Torwar',
    hint:
      'Расписание всей лиги, брать только матчи с участием PGE Projekt Warszawa. Дата и время "05.11.2026, 20:30", только дата — время не объявлено. ' +
      'Хозяин идёт сразу после "Faza Zasadnicza", гость после "··· : ···". Ссылка "Więcej" на страницу матча стоит после матча. ' +
      'Площадка только на странице матча (обычно COS Torwar; матч 07.03.2027 с ZAKSA, id 1104963, в HWS Arena Ursynów). Сыгранные матчи со счётом пропускать.',
  },
  // Небольшие матчи: нижние лиги, женские команды, футзал (проверено 2026-10-24)
  {
    id: 'hutnik-football',
    gender: 'men',
    name: 'Hutnik Warszawa: nadchodzące mecze',
    url: 'https://hutnikwarszawa.pl/mecze/nadchodzace/',
    sport: 'football',
    club: 'Hutnik Warszawa',
    organizer: 'Hutnik Warszawa',
    organizerWebsite: 'https://hutnikwarszawa.pl',
    homeVenue: 'Stadion Hutnika',
    hint:
      'IV liga mazowiecka. Строки таблицы: "14 | Sob. | 31.10.2026 | 13:00 | KS Legionovia | vs | Hutnik Warszawa", хозяин указан первым. ' +
      'Ниже на странице таблица лиги, её не выписывать. Билеты по странице /bilety/: 10 zł, ulgowy 5 zł, вторая половина бесплатно.',
  },
  {
    id: 'legia-futsal',
    gender: 'men',
    name: 'FOGO Futsal Ekstraklasa: Legia Warszawa',
    url: 'https://futsalekstraklasa.pl/zespol/legia-warszawa',
    sport: 'futsal',
    club: 'Legia Warszawa',
    organizer: 'Legia Warszawa Futsal',
    organizerWebsite: 'https://legiafutsal.com',
    homeVenue: 'Hala OSiR Włochy',
    hint:
      'Страница команды на сайте лиги: "Piątek | 23.10.2026, 20:00 | Legia Warszawa | 3:5 | TEXOM...", хозяин первым, счёт — сыгранный матч. ' +
      'Вверху общая лента матчей всей лиги: брать только матчи Legia Warszawa. Домашний зал: OSiR Włochy, ul. Gładka 18.',
  },
  {
    id: 'skk-polonia-basketball',
    gender: 'women',
    name: 'Basket Liga Kobiet: SKK Polonia Warszawa',
    url: 'https://basketligakobiet.pl/druzyny/d/3004/skk-polonia-warszawa/1.html',
    sport: 'basketball',
    club: 'SKK Polonia Warszawa',
    organizer: 'SKK Polonia Warszawa',
    homeVenue: 'Centrum Sportu Wilanów',
    hint:
      'Женская высшая лига. Строки таблицы: "25.10.2026 14:00 | SKK Polonia Warszawa | - | MB Zagłębie Sosnowiec | -- : --", хозяин первым; ' +
      '"-- : --" значит, что матч ещё не сыгран. Домашняя арена: Centrum Sportu Wilanów, ul. Wiertnicza 26A.',
  },
  {
    id: 'ksg-volleyball',
    gender: 'women',
    name: 'TAURON 1. Liga Kobiet: terminarz',
    url: 'https://www.tauron1ligakobiet.pl/games.html',
    sport: 'volleyball',
    club: 'KSG Warszawa',
    organizer: 'KSG Warszawa',
    homeVenue: 'Hala OSiR Bemowo',
    hint:
      'Женская 1-я лига, расписание всей лиги: брать только матчи KSG Warszawa. Как в TAURON Liga: дата "31.10.2026, 15:00", "Faza Zasadnicza", хозяин, "··· : ···", гость; ссылка "Więcej" после матча. Время "00:00" или только дата — время не объявлено. ' +
      'Домашний зал: Hala OSiR Bemowo, ul. Obrońców Tobruku 40. Сыгранные матчи со счётом пропускать.',
  },
  // Городские события: календарь города Варшавы и районных центров спорта (проверено 2026-10-24).
  // robots.txt разрешает чтение; явного запрета TDM нет, но тексты защищены авторским правом,
  // поэтому берём только факты (название, дата, место) и ссылку на страницу события.
  {
    id: 'warszawa-sport',
    name: 'Urząd m.st. Warszawy: kalendarz, sport',
    url: 'https://um.warszawa.pl/kalendarz?kategoria=Sport&delta=75',
    sport: 'running',
    club: 'Miasto Stołeczne Warszawa',
    organizer: 'Urząd m.st. Warszawy',
    organizerWebsite: 'https://um.warszawa.pl',
    hint:
      'Городской календарь: элементы списка с заголовком-ссылкой на страницу события, датой "25.10.2026 11:00" (пометка "(W trakcie)" — идёт сейчас, такие пропускать), адресом и коротким описанием. ' +
      'Брать только спортивные события, которые можно посмотреть или в которых можно участвовать; собрания, курсы и многодневные серии без конкретной даты пропускать. ' +
      'kind: mass для забегов и праздников, tournament для турниров, open_training для открытых занятий. Место писать в venueName, если это известная площадка, иначе в locationNote как на странице. ' +
      'isFree только при "wstęp wolny", "bezpłatn", "darmow"; forKids при "dla dzieci", возрастах U-7…U-14 и т.п. Описание с сайта не переписывать: только факты и ссылка. ' +
      'У повторяющихся серий ("Następne wydarzenia") выписывать только ближайшую дату. Матчи лиг пропускать: они приходят из клубных источников. Шахматы, бридж и подобное не спорт для нашего сайта.',
  },
  {
    id: 'osir-wawer',
    name: 'OSiR Wawer: kalendarz',
    url: 'https://sport.um.warszawa.pl/waw/osir-wawer/kalendarz?delta=75',
    sport: 'running',
    club: 'OSiR Wawer',
    organizer: 'OSiR Wawer',
    organizerWebsite: 'https://sport.um.warszawa.pl/waw/osir-wawer',
    hint:
      'Городской календарь: элементы списка с заголовком-ссылкой на страницу события, датой "25.10.2026 11:00" (пометка "(W trakcie)" — идёт сейчас, такие пропускать), адресом и коротким описанием. ' +
      'Брать только спортивные события, которые можно посмотреть или в которых можно участвовать; собрания, курсы и многодневные серии без конкретной даты пропускать. ' +
      'kind: mass для забегов и праздников, tournament для турниров, open_training для открытых занятий. Место писать в venueName, если это известная площадка, иначе в locationNote как на странице. ' +
      'isFree только при "wstęp wolny", "bezpłatn", "darmow"; forKids при "dla dzieci", возрастах U-7…U-14 и т.п. Описание с сайта не переписывать: только факты и ссылка. ' +
      'У повторяющихся серий ("Następne wydarzenia") выписывать только ближайшую дату. Матчи лиг пропускать: они приходят из клубных источников. Шахматы, бридж и подобное не спорт для нашего сайта.',
  },
  {
    id: 'osir-targowek',
    name: 'OSiR Targówek: kalendarz',
    url: 'https://sport.um.warszawa.pl/waw/osir-targowek/kalendarz?delta=75',
    sport: 'running',
    club: 'OSiR Targówek',
    organizer: 'OSiR Targówek',
    organizerWebsite: 'https://sport.um.warszawa.pl/waw/osir-targowek',
    hint:
      'Городской календарь: элементы списка с заголовком-ссылкой на страницу события, датой "25.10.2026 11:00" (пометка "(W trakcie)" — идёт сейчас, такие пропускать), адресом и коротким описанием. ' +
      'Брать только спортивные события, которые можно посмотреть или в которых можно участвовать; собрания, курсы и многодневные серии без конкретной даты пропускать. ' +
      'kind: mass для забегов и праздников, tournament для турниров, open_training для открытых занятий. Место писать в venueName, если это известная площадка, иначе в locationNote как на странице. ' +
      'isFree только при "wstęp wolny", "bezpłatn", "darmow"; forKids при "dla dzieci", возрастах U-7…U-14 и т.п. Описание с сайта не переписывать: только факты и ссылка. ' +
      'У повторяющихся серий ("Następne wydarzenia") выписывать только ближайшую дату. Матчи лиг пропускать: они приходят из клубных источников. Шахматы, бридж и подобное не спорт для нашего сайта.',
  },
  {
    id: 'bos-bialoleka',
    name: 'Białołęcki Ośrodek Sportu: kalendarz',
    url: 'https://sport.um.warszawa.pl/waw/bos/kalendarz?delta=75',
    sport: 'running',
    club: 'Białołęcki Ośrodek Sportu',
    organizer: 'Białołęcki Ośrodek Sportu',
    organizerWebsite: 'https://sport.um.warszawa.pl/waw/bos',
    hint:
      'Городской календарь: элементы списка с заголовком-ссылкой на страницу события, датой "25.10.2026 11:00" (пометка "(W trakcie)" — идёт сейчас, такие пропускать), адресом и коротким описанием. ' +
      'Брать только спортивные события, которые можно посмотреть или в которых можно участвовать; собрания, курсы и многодневные серии без конкретной даты пропускать. ' +
      'kind: mass для забегов и праздников, tournament для турниров, open_training для открытых занятий. Место писать в venueName, если это известная площадка, иначе в locationNote как на странице. ' +
      'isFree только при "wstęp wolny", "bezpłatn", "darmow"; forKids при "dla dzieci", возрастах U-7…U-14 и т.п. Описание с сайта не переписывать: только факты и ссылка. ' +
      'У повторяющихся серий ("Następne wydarzenia") выписывать только ближайшую дату. Матчи лиг пропускать: они приходят из клубных источников. Шахматы, бридж и подобное не спорт для нашего сайта.',
  },
  {
    id: 'osir-praga-poludnie',
    name: 'OSiR Praga-Południe: kalendarz',
    url: 'https://sport.um.warszawa.pl/waw/osir-pragapld/kalendarz?delta=75',
    sport: 'running',
    club: 'OSiR Praga-Południe',
    organizer: 'OSiR Praga-Południe',
    organizerWebsite: 'https://sport.um.warszawa.pl/waw/osir-pragapld',
    hint:
      'Городской календарь: элементы списка с заголовком-ссылкой на страницу события, датой "25.10.2026 11:00" (пометка "(W trakcie)" — идёт сейчас, такие пропускать), адресом и коротким описанием. ' +
      'Брать только спортивные события, которые можно посмотреть или в которых можно участвовать; собрания, курсы и многодневные серии без конкретной даты пропускать. ' +
      'kind: mass для забегов и праздников, tournament для турниров, open_training для открытых занятий. Место писать в venueName, если это известная площадка, иначе в locationNote как на странице. ' +
      'isFree только при "wstęp wolny", "bezpłatn", "darmow"; forKids при "dla dzieci", возрастах U-7…U-14 и т.п. Описание с сайта не переписывать: только факты и ссылка. ' +
      'У повторяющихся серий ("Następne wydarzenia") выписывать только ближайшую дату. Матчи лиг пропускать: они приходят из клубных источников. Шахматы, бридж и подобное не спорт для нашего сайта.',
  },
  {
    id: 'osir-bemowo',
    name: 'OSiR Bemowo: kalendarz',
    url: 'https://sport.um.warszawa.pl/waw/osir-bemowo/kalendarz?delta=75',
    sport: 'running',
    club: 'OSiR Bemowo',
    organizer: 'OSiR Bemowo',
    organizerWebsite: 'https://sport.um.warszawa.pl/waw/osir-bemowo',
    hint:
      'Городской календарь: элементы списка с заголовком-ссылкой на страницу события, датой "25.10.2026 11:00" (пометка "(W trakcie)" — идёт сейчас, такие пропускать), адресом и коротким описанием. ' +
      'Брать только спортивные события, которые можно посмотреть или в которых можно участвовать; собрания, курсы и многодневные серии без конкретной даты пропускать. ' +
      'kind: mass для забегов и праздников, tournament для турниров, open_training для открытых занятий. Место писать в venueName, если это известная площадка, иначе в locationNote как на странице. ' +
      'isFree только при "wstęp wolny", "bezpłatn", "darmow"; forKids при "dla dzieci", возрастах U-7…U-14 и т.п. Описание с сайта не переписывать: только факты и ссылка. ' +
      'У повторяющихся серий ("Następne wydarzenia") выписывать только ближайшую дату. Матчи лиг пропускать: они приходят из клубных источников. Шахматы, бридж и подобное не спорт для нашего сайта.',
  },
  // Секции (проверено 2026-10-24): школы Легии и AZS AWF. robots.txt разрешает чтение.
  // Городской каталог sport.um.warszawa.pl/zajecia-sportowe (626 занятий) подключается отдельно.
  {
    id: 'legia-soccer-schools',
    name: 'Legia Soccer Schools: harmonogram treningów',
    url: 'https://soccer.legia.com/harmonogram-treningow/',
    sport: 'football',
    club: 'Legia Soccer Schools',
    organizer: 'Legia Soccer Schools',
    organizerWebsite: 'https://soccer.legia.com',
    hint:
      'Секции (activities, не события): каждая группа — отдельная запись с возрастом, днями и временем, адресом в locationNote и районом в district. ' +
      'Телефоны и e-mail тренеров не выписывать. ' +
      'Программы: Przedszkola 3–7 лет, Szkoły piłkarskie 6–17, Legia Ladies 6–17 (девочки), Szkoły techniki / bramkarzy / motoryki, Piłkarski Rodzic (взрослые). Цен на странице нет.',
  },
  {
    id: 'legia-basket-schools',
    name: 'Legia Basket Schools: lokalizacje',
    url: 'https://akademia.legiakosz.com/i/lokalizacje/2',
    sport: 'basketball',
    club: 'Legia Basket Schools',
    organizer: 'Legia Basket Schools',
    organizerWebsite: 'https://akademia.legiakosz.com',
    hint:
      'Секции (activities, не события): каждая группа — отдельная запись с возрастом, днями и временем, адресом в locationNote и районом в district. ' +
      'Телефоны и e-mail тренеров не выписывать. ' +
      'Список локаций школы баскетбола с районом, адресом, днями и часами; возраст на странице может не указываться (тогда null), audience kids.',
  },
  {
    id: 'legia-swimming-schools',
    name: 'Legia Swimming Schools: harmonogram treningów',
    url: 'https://legiaswimmingschools.pl/harmonogram-treningow/',
    sport: 'swimming',
    club: 'Legia Swimming Schools',
    organizer: 'Legia Swimming Schools',
    organizerWebsite: 'https://legiaswimmingschools.pl',
    hint:
      'Секции (activities, не события): каждая группа — отдельная запись с возрастом, днями и временем, адресом в locationNote и районом в district. ' +
      'Телефоны и e-mail тренеров не выписывать. ' +
      'Возрастные группы (3–6, 6–9 и т.д.), бассейны с адресами, дни и время.',
  },
  {
    id: 'legia-table-tennis',
    name: 'Legia Table Tennis: harmonogram treningów',
    url: 'https://legiatabletenis.pl/harmonogram-treningow-17',
    sport: 'table_tennis',
    club: 'Legia Table Tennis',
    organizer: 'Legia Table Tennis',
    organizerWebsite: 'https://legiatabletenis.pl',
    hint:
      'Секции (activities, не события): каждая группа — отдельная запись с возрастом, днями и временем, адресом в locationNote и районом в district. ' +
      'Телефоны и e-mail тренеров не выписывать. ' +
      'Группы 3–7 и 8–15 лет, залы с адресами, дни и время.',
  },
  {
    id: 'legia-volley-schools',
    name: 'Legia Volley Schools: harmonogram treningów',
    url: 'https://legiavolleyschools.pl/harmonogram-treningow-76',
    sport: 'volleyball',
    club: 'Legia Volley Schools',
    organizer: 'Legia Volley Schools',
    organizerWebsite: 'https://legiavolleyschools.pl',
    hint:
      'Секции (activities, не события): каждая группа — отдельная запись с возрастом, днями и временем, адресом в locationNote и районом в district. ' +
      'Телефоны и e-mail тренеров не выписывать. ' +
      'Группы 3–6 и 7–12 лет, залы с адресами, дни и время.',
  },
  {
    id: 'azs-awf-kids',
    name: 'AZS AWF Warszawa: sekcje dla dzieci',
    url: 'https://azsawf.com/sekcje-dzieci/boks-2/',
    extraUrls: [
      'https://azsawf.com/sekcje-dzieci/judo/',
      'https://azsawf.com/sekcje-dzieci/kickboxing/',
      'https://azsawf.com/sekcje-dzieci/lekka-atletyka/',
      'https://azsawf.com/sekcje-dzieci/pilka-reczna-dzeci/',
      'https://azsawf.com/sekcje-dzieci/pilka-siatkowa/',
      'https://azsawf.com/sekcje-dzieci/rugby/',
      'https://azsawf.com/sekcje-dzieci/szermierka/',
      'https://azsawf.com/sekcje-dzieci/taekwondo-2/',
      'https://azsawf.com/sekcje-dzieci/wioslarstwo/',
      'https://azsawf.com/sekcje-dzieci/zapasy/',
    ],
    sport: 'judo',
    club: 'AZS AWF Warszawa',
    organizer: 'AZS AWF Warszawa',
    organizerWebsite: 'https://azsawf.com',
    hint:
      'Секции (activities, не события): каждая группа — отдельная запись с возрастом, днями и временем, адресом в locationNote и районом в district. ' +
      'Телефоны и e-mail тренеров не выписывать. ' +
      'Страницы по видам спорта (заголовок "=== URL ==="): sport ставить по странице. Возраст или годы рождения групп, дни и часы, цена в месяц. ' +
      'Все занятия на кампусе AWF, ul. Marymoncka 34 (Bielany), если не указано иное; годы рождения переводить в возраст на 2026 год.',
  },
  {
    id: 'azs-awf-adults',
    name: 'AZS AWF Warszawa: Aktywny Warszawiak',
    url: 'https://azsawf.com/aktywny-warszawiak/',
    sport: 'fitness',
    club: 'AZS AWF Warszawa',
    organizer: 'AZS AWF Warszawa',
    organizerWebsite: 'https://azsawf.com',
    hint:
      'Секции (activities, не события): каждая группа — отдельная запись с возрастом, днями и временем, адресом в locationNote и районом в district. ' +
      'Телефоны и e-mail тренеров не выписывать. ' +
      'Программа для взрослых "Aktywny Warszawiak" (софинансирует город): вид спорта, день, время, место. audience adults, если не сказано иное.',
  },
  // Городской каталог секций (626 занятий районных центров спорта). Собирается скриптом ingest/city-catalog.ts
  // (npm run ingest:city): каталог строго структурирован, поэтому разбирается программой. robots.txt разрешает чтение;
  // те же данные город публикует как открытые данные под CC BY 4.0. Контакты не сохраняем.
  {
    id: 'warszawa-zajecia',
    name: 'Urząd m.st. Warszawy: zajęcia sportowe',
    url: 'https://sport.um.warszawa.pl/zajecia-sportowe',
    customFetch: true,
    sport: 'other',
    club: 'Miasto Stołeczne Warszawa',
    organizer: 'Urząd m.st. Warszawy (ośrodki sportu)',
    organizerWebsite: 'https://sport.um.warszawa.pl',
    hint: 'Собирается программой ingest/city-catalog.ts по подписанным полям каталога.',
  },
];
