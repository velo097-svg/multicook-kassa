/*
  СЕРВИС-ВОРКЕР — включает "режим приложения" (PWA): значок на рабочем
  столе телефона, открытие без адресной строки браузера, и кэш самой
  страницы (HTML/CSS/JS), чтобы приложение открывалось мгновенно и даже
  без интернета — а данные (сохранение отчётов и т.п.) при этом всё
  равно продолжают уходить на сервер как обычно, через обычные запросы
  (их этот файл не трогает и не кэширует).

  Трогать не нужно. Если меняете версию сайта — просто увеличьте
  CACHE_NAME ниже (например 'kassa-v2') хотя бы одной цифрой, чтобы
  браузер точно подхватил новую версию кэша, а не старую.
*/

const CACHE_NAME = 'kassa-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// При установке — заранее сохраняем в кэш саму страницу и иконки.
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// При включении новой версии — удаляем старые кэши прошлых версий.
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Отдаём запросы: для самой страницы — "сеть, а если не вышло — кэш"
// (так при обновлении сайта подтягивается свежая версия, а если
// интернета нет — открывается последняя сохранённая). Запросы на
// сохранение данных (POST на прокси/Apps Script) сервис-воркер вообще
// не трогает — они идут напрямую, как обычно.
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return; // не наш случай — пропускаем как есть

  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        return response;
      })
      .catch(function () {
        return caches.match(event.request).then(function (cached) {
          return cached || caches.match('./index.html');
        });
      })
  );
});
