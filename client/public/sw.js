/**
 * FitTrack Pro - Service Worker
 * 전략: Network First (API), Cache First (정적 자산)
 */

const CACHE_NAME = "fittrack-v1";
const STATIC_ASSETS = [
  "/",
  "/exercises",
  "/routines",
  "/history",
  "/ai-coach",
];

// 설치 이벤트 - 정적 자산 사전 캐싱
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // 일부 실패해도 설치 계속
      });
    })
  );
  self.skipWaiting();
});

// 활성화 이벤트 - 이전 캐시 정리
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch 이벤트 - 요청 가로채기
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API 요청: Network First
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: "오프라인 상태입니다. 인터넷 연결을 확인해주세요." }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // 외부 이미지(GitHub raw): Network Only (캐싱 안 함)
  if (url.hostname === "raw.githubusercontent.com") {
    event.respondWith(fetch(request).catch(() => new Response("", { status: 404 })));
    return;
  }

  // 정적 자산: Cache First, Network Fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // 성공한 GET 요청만 캐싱
        if (response.ok && request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // 오프라인 fallback: 루트 페이지 반환
        if (request.destination === "document") {
          return caches.match("/");
        }
        return new Response("", { status: 404 });
      });
    })
  );
});
