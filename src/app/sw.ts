/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import { NetworkOnly, Serwist, type PrecacheEntry, type RuntimeCaching } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<PrecacheEntry | string>;
};

const aiNetworkOnly: RuntimeCaching = {
  matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/api/"),
  method: "POST",
  handler: new NetworkOnly({ networkTimeoutSeconds: 50 }),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  cacheId: "bodyfitness-v1",
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [aiNetworkOnly, ...defaultCache],
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

serwist.addEventListeners();
