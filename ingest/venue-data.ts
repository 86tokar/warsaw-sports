// Реальные площадки варшавских клубов. Применить: npm run venues:sync
// Координаты из OpenStreetMap (центр объекта, id в комментарии), сверены с польской Википедией.
export type VenueSeed = {
  name: string;
  address: string;
  district: string;
  lat: number;
  lng: number;
  website?: string;
  aliases: string[];
};

export const VENUES: VenueSeed[] = [
  {
    // OSM way 24543655
    name: 'Stadion Miejski Legii Warszawa',
    address: 'ul. Łazienkowska 3, 00-449 Warszawa',
    district: 'Śródmieście',
    lat: 52.22047,
    lng: 21.04075,
    website: 'https://legia.com',
    aliases: [
      'Stadion Miejski Legii Warszawa im. Marszałka Józefa Piłsudskiego',
      'Stadion Wojska Polskiego',
      'Stadion Legii',
      'Łazienkowska 3',
      'L3',
    ],
  },
  {
    // OSM way 1466614946
    name: 'Stadion Polonii Warszawa',
    address: 'ul. Konwiktorska 6, 00-206 Warszawa',
    district: 'Śródmieście',
    lat: 52.25565,
    lng: 21.00138,
    website: 'https://kspolonia.pl',
    aliases: [
      'Stadion Miejski im. gen. Kazimierza Sosnkowskiego',
      'Stadion Polonii',
      'Konwiktorska 6',
      'Konwiktorska 6 Warszawa',
      'K6',
    ],
  },
  {
    // OSM way 117628656
    name: 'Hala OSiR Bemowo',
    address: 'ul. Obrońców Tobruku 40, Warszawa',
    district: 'Bemowo',
    lat: 52.25775,
    lng: 20.93049,
    aliases: ['OSiR Bemowo', 'Hala Bemowo', 'Hala sportowa OSiR Bemowo', 'Obrońców Tobruku 40'],
  },
  {
    // OSM way 25844922. Соседний адрес со стадионом Легии: не путать 3 и 6a
    name: 'Arena COS Torwar',
    address: 'ul. Łazienkowska 6a, 00-449 Warszawa',
    district: 'Śródmieście',
    lat: 52.22245,
    lng: 21.04217,
    aliases: ['COS Torwar', 'Torwar', 'Hala Torwar', 'Hala COS Torwar', 'Centralny Ośrodek Sportu Torwar', 'Łazienkowska 6a'],
  },
  {
    // OSM way 117628658
    name: 'Hala Koło',
    address: 'ul. Obozowa 60, 01-423 Warszawa',
    district: 'Wola',
    lat: 52.2483,
    lng: 20.95383,
    aliases: ['Hala Sportowa Koło', 'OSiR Wola Hala Koło', 'Obozowa 60'],
  },
  {
    // OSM way 1033194938
    name: 'Arena Ursynów',
    address: 'ul. Pileckiego 122, Warszawa',
    district: 'Ursynów',
    lat: 52.14337,
    lng: 21.03935,
    aliases: ['HWS Arena Ursynów', 'Hala Arena Ursynów', 'Pileckiego 122'],
  },
  {
    // OSM way 1083811026 (Ośrodek sportowy Hutnik)
    name: 'Stadion Hutnika',
    address: 'ul. Marymoncka 42, 01-977 Warszawa',
    district: 'Bielany',
    lat: 52.3001,
    lng: 20.94485,
    website: 'https://hutnikwarszawa.pl',
    aliases: ['Ośrodek Hutnik', 'Stadion SCS Aktywna Warszawa Ośrodek Hutnik', 'Marymoncka 42'],
  },
  {
    // OSM node 2012137333
    name: 'Hala OSiR Włochy',
    address: 'ul. Gładka 18, 02-172 Warszawa',
    district: 'Włochy',
    lat: 52.18781,
    lng: 20.96065,
    aliases: ['OSiR Włochy', 'Hala Sportowa OSiR Włochy', 'OSiR Włochy ul. Gładka 18', 'Gładka 18'],
  },
  {
    // OSM way 953008661
    name: 'Centrum Sportu Wilanów',
    address: 'ul. Wiertnicza 26A, 02-952 Warszawa',
    district: 'Wilanów',
    lat: 52.16923,
    lng: 21.08622,
    aliases: ['CS Wilanów', 'Hala Centrum Sportu Wilanów', 'Wiertnicza 26A'],
  },
];
